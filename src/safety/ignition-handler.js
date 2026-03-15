'use strict';

const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'ignition-handler' },
  transports: [new winston.transports.Console({ silent: true })],
});

const IGNITION_STATES = {
  OFF: 'off',
  ACCESSORY: 'accessory',
  ON: 'on',
  STARTING: 'starting',
};

const SAFETY_MODES = {
  PARKED: 'parked',
  DRIVING: 'driving',
};

class IgnitionHandler {
  constructor(options = {}) {
    this.id = uuidv4();
    this._ignitionState = IGNITION_STATES.OFF;
    this._safetyMode = SAFETY_MODES.PARKED;
    this._vehicleSpeed = 0;
    this._parkingBrake = true;
    this._gear = 'park';
    this._batteryVoltage = 12.6;
    this._lowVoltageThreshold = options.lowVoltageThreshold || 11.5;
    this._criticalVoltageThreshold = options.criticalVoltageThreshold || 10.5;
    this._speedThreshold = options.speedThreshold || 5;
    this._listeners = new Map();
    this._shutdownCallbacks = [];
    this._restrictedOperations = new Set([
      'video_playback',
      'text_input',
      'complex_settings',
      'software_update',
    ]);
  }

  getIgnitionState() {
    return this._ignitionState;
  }

  getSafetyMode() {
    return this._safetyMode;
  }

  setIgnitionState(state) {
    if (!Object.values(IGNITION_STATES).includes(state)) {
      throw new Error(`Invalid ignition state: ${state}`);
    }

    const prev = this._ignitionState;
    this._ignitionState = state;
    logger.info('Ignition state changed', { from: prev, to: state });

    if (state === IGNITION_STATES.OFF && prev !== IGNITION_STATES.OFF) {
      this._handleShutdown();
    }

    if (state === IGNITION_STATES.ON && prev === IGNITION_STATES.OFF) {
      this._handleStartup();
    }

    this._emit('ignitionChange', { state, previous: prev });
  }

  updateVehicleSpeed(speed) {
    this._vehicleSpeed = speed;
    const prevMode = this._safetyMode;

    if (speed > this._speedThreshold) {
      this._safetyMode = SAFETY_MODES.DRIVING;
    } else if (speed === 0 && this._parkingBrake) {
      this._safetyMode = SAFETY_MODES.PARKED;
    }

    if (prevMode !== this._safetyMode) {
      logger.info('Safety mode changed', { from: prevMode, to: this._safetyMode });
      this._emit('safetyModeChange', { mode: this._safetyMode, previous: prevMode });
    }
  }

  updateParkingBrake(engaged) {
    this._parkingBrake = engaged;
    if (engaged && this._vehicleSpeed === 0) {
      this._safetyMode = SAFETY_MODES.PARKED;
      this._emit('safetyModeChange', { mode: SAFETY_MODES.PARKED });
    }
  }

  updateGear(gear) {
    this._gear = gear;
  }

  updateBatteryVoltage(voltage) {
    const prev = this._batteryVoltage;
    this._batteryVoltage = voltage;

    if (voltage < this._criticalVoltageThreshold) {
      logger.error('Critical battery voltage', { voltage });
      this._emit('criticalBattery', { voltage });
      this._handleEmergencyShutdown();
    } else if (voltage < this._lowVoltageThreshold && prev >= this._lowVoltageThreshold) {
      logger.warn('Low battery voltage', { voltage });
      this._emit('lowBattery', { voltage });
    }
  }

  isOperationAllowed(operation) {
    if (this._safetyMode === SAFETY_MODES.PARKED) {
      return true;
    }

    if (this._restrictedOperations.has(operation)) {
      logger.info('Operation blocked by safety interlock', { operation, mode: this._safetyMode });
      return false;
    }

    return true;
  }

  isDriving() {
    return this._safetyMode === SAFETY_MODES.DRIVING;
  }

  isParked() {
    return this._safetyMode === SAFETY_MODES.PARKED;
  }

  registerShutdownCallback(callback) {
    this._shutdownCallbacks.push(callback);
  }

  getStatus() {
    return {
      id: this.id,
      ignitionState: this._ignitionState,
      safetyMode: this._safetyMode,
      vehicleSpeed: this._vehicleSpeed,
      parkingBrake: this._parkingBrake,
      gear: this._gear,
      batteryVoltage: this._batteryVoltage,
      isDriving: this.isDriving(),
      isParked: this.isParked(),
    };
  }

  _handleStartup() {
    logger.info('Vehicle startup sequence');
    this._emit('startup', { timestamp: Date.now() });
  }

  _handleShutdown() {
    logger.info('Vehicle shutdown sequence');
    for (const callback of this._shutdownCallbacks) {
      try {
        callback();
      } catch (err) {
        logger.error('Shutdown callback error', { error: err.message });
      }
    }
    this._emit('shutdown', { timestamp: Date.now() });
  }

  _handleEmergencyShutdown() {
    logger.error('Emergency shutdown due to critical battery');
    this._ignitionState = IGNITION_STATES.OFF;
    this._handleShutdown();
    this._emit('emergencyShutdown', { reason: 'critical_battery', voltage: this._batteryVoltage });
  }

  on(event, listener) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(listener);
  }

  off(event, listener) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) {listeners.splice(idx, 1);}
    }
  }

  _emit(event, data) {
    const listeners = this._listeners.get(event) || [];
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (err) {
        logger.error('Event listener error', { event, error: err.message });
      }
    }
  }
}

module.exports = { IgnitionHandler, IGNITION_STATES, SAFETY_MODES };
