'use strict';

const winston = require('winston');
const { Elm327Driver } = require('../drivers/elm327-driver');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'obd-data-provider' },
  transports: [new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })],
});

const MODES = {
  AUTO: 'auto',
  ELM327: 'elm327',
  SIMULATION: 'simulation',
};

const HIGH_PRIORITY_PIDS = ['0C', '0D']; // RPM, Speed
const LOW_PRIORITY_PIDS = ['05', '2F', '11', '04']; // Coolant, Fuel, Throttle, Load

class OBDDataProvider {
  constructor(options = {}) {
    this._mode = options.mode || MODES.AUTO;
    this._serialPort = options.serialPort || null;
    this._pollInterval = options.pollIntervalMs || 500;
    this._baudRate = options.baudRate || 38400;
    this._driver = null;
    this._pollTimer = null;
    this._lowPriorityIndex = 0;
    this._started = false;
    this._activeMode = null;
    this._listeners = new Map();

    this._state = {
      speed: 0,
      rpm: 0,
      coolantTemp: 0,
      fuelLevel: 0,
      throttle: 0,
      engineLoad: 0,
    };

    // Simulation state
    this._simTime = 0;
    this._simDriving = false;
    this._simAccelerating = false;
  }

  get state() {
    return { ...this._state };
  }

  get activeMode() {
    return this._activeMode;
  }

  get connected() {
    return this._started && (this._activeMode === MODES.ELM327 || this._activeMode === MODES.SIMULATION);
  }

  on(event, fn) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(fn);
  }

  off(event, fn) {
    const fns = this._listeners.get(event);
    if (fns) {
      this._listeners.set(event, fns.filter((f) => f !== fn));
    }
  }

  _emit(event, data) {
    const fns = this._listeners.get(event) || [];
    for (const fn of fns) {
      try {
        fn(data);
      } catch (e) {
        logger.error('Event listener error', { event, error: e.message });
      }
    }
  }

  async start() {
    if (this._started) {
      return;
    }

    if (this._mode === MODES.ELM327 || this._mode === MODES.AUTO) {
      try {
        this._driver = new Elm327Driver({
          serialPort: this._serialPort,
          baudRate: this._baudRate,
        });
        await this._driver.connect();
        this._activeMode = MODES.ELM327;
        logger.info('Connected to ELM327 OBD-II dongle');
      } catch (err) {
        logger.warn('ELM327 connection failed', { error: err.message });
        if (this._mode === MODES.ELM327) {
          throw err;
        }
        // Auto mode: fall back to simulation
        this._driver = null;
        this._activeMode = MODES.SIMULATION;
        logger.info('Falling back to OBD simulation mode');
      }
    } else {
      this._activeMode = MODES.SIMULATION;
      logger.info('Starting in OBD simulation mode');
    }

    this._started = true;
    this._emit('modeChange', this._activeMode);
    this._startPolling();
  }

  async stop() {
    this._started = false;
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    if (this._driver) {
      await this._driver.destroy();
      this._driver = null;
    }
    this._activeMode = null;
  }

  async requestDTCs() {
    if (this._activeMode === MODES.ELM327 && this._driver) {
      return this._driver.requestDTCs();
    }
    // Simulation: return empty
    return [];
  }

  getConnectionStatus() {
    return {
      mode: this._activeMode,
      configured: this._mode,
      connected: this.connected,
      serialPort: this._serialPort,
    };
  }

  _startPolling() {
    this._pollTimer = setInterval(() => {
      if (this._activeMode === MODES.ELM327) {
        this._pollELM327().catch((err) => {
          logger.error('ELM327 poll error', { error: err.message });
        });
      } else {
        this._pollSimulation();
      }
    }, this._pollInterval);
  }

  async _pollELM327() {
    // High priority: speed + RPM every cycle
    for (const pid of HIGH_PRIORITY_PIDS) {
      try {
        const result = await this._driver.requestPID(pid);
        if (result) {
          this._updateValue(result.name, result.value);
        }
      } catch (_err) {
        // Skip this PID on error
      }
    }

    // Low priority: one per cycle, rotating
    const lowPid = LOW_PRIORITY_PIDS[this._lowPriorityIndex];
    this._lowPriorityIndex = (this._lowPriorityIndex + 1) % LOW_PRIORITY_PIDS.length;

    try {
      const result = await this._driver.requestPID(lowPid);
      if (result) {
        this._updateValue(result.name, result.value);
      }
    } catch (_err) {
      // Skip
    }

    this._emit('vehicleDataUpdate', this.state);
  }

  _pollSimulation() {
    this._simTime += this._pollInterval / 1000;

    // Simulate driving pattern: idle → accelerate → cruise → decelerate → idle
    const cycle = this._simTime % 60; // 60-second cycle

    let targetRpm, targetSpeed;

    if (cycle < 5) {
      // Idle
      targetRpm = 780 + Math.sin(this._simTime * 2) * 30;
      targetSpeed = 0;
    } else if (cycle < 15) {
      // Accelerating
      const t = (cycle - 5) / 10;
      targetRpm = 780 + t * 3200;
      targetSpeed = t * 80;
    } else if (cycle < 35) {
      // Cruising
      targetRpm = 2200 + Math.sin(this._simTime * 0.5) * 200;
      targetSpeed = 60 + Math.sin(this._simTime * 0.3) * 15;
    } else if (cycle < 45) {
      // Decelerating
      const t = 1 - (cycle - 35) / 10;
      targetRpm = 780 + t * 1400;
      targetSpeed = t * 60;
    } else {
      // Idle
      targetRpm = 780 + Math.sin(this._simTime * 2) * 30;
      targetSpeed = 0;
    }

    // Smooth transitions
    this._state.rpm = this._lerp(this._state.rpm, targetRpm, 0.15);
    this._state.speed = this._lerp(this._state.speed, Math.max(0, targetSpeed), 0.12);

    // Slow-changing values
    this._state.coolantTemp = this._lerp(this._state.coolantTemp,
      85 + Math.sin(this._simTime * 0.05) * 10, 0.02);
    this._state.fuelLevel = Math.max(0, 72 - this._simTime * 0.01);
    this._state.throttle = this._state.speed > 0
      ? 15 + (this._state.rpm - 780) / 3200 * 75
      : 0;
    this._state.engineLoad = this._state.speed > 0
      ? 20 + (this._state.rpm / 4000) * 60
      : 12;

    // Emit individual events
    this._emit('speedChange', { speed: Math.round(this._state.speed) });
    this._emit('rpmChange', { rpm: Math.round(this._state.rpm) });
    this._emit('coolantTempChange', { coolantTemp: Math.round(this._state.coolantTemp) });
    this._emit('fuelLevelChange', { fuelLevel: Math.round(this._state.fuelLevel) });
    this._emit('throttleChange', { throttle: Math.round(this._state.throttle) });
    this._emit('engineLoadChange', { engineLoad: Math.round(this._state.engineLoad) });

    // Consolidated update
    this._emit('vehicleDataUpdate', {
      speed: Math.round(this._state.speed),
      rpm: Math.round(this._state.rpm),
      coolantTemp: Math.round(this._state.coolantTemp),
      fuelLevel: Math.round(this._state.fuelLevel),
      throttle: Math.round(this._state.throttle),
      engineLoad: Math.round(this._state.engineLoad),
    });
  }

  _updateValue(name, value) {
    const prev = this._state[name];
    this._state[name] = value;
    if (prev !== value) {
      this._emit(`${name}Change`, { [name]: value });
    }
  }

  _lerp(current, target, factor) {
    return current + (target - current) * factor;
  }
}

module.exports = { OBDDataProvider, MODES };
