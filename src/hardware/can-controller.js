'use strict';

const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'can-controller' },
  transports: [new winston.transports.Console({ silent: true })],
});

// Hyundai Elantra GT 2013 CAN arbitration IDs
const CAN_IDS = {
  ENGINE_RPM: 0x0C0,
  VEHICLE_SPEED: 0x0C4,
  STEERING_ANGLE: 0x0C8,
  GEAR_POSITION: 0x191,
  IGNITION_STATUS: 0x260,
  PARKING_BRAKE: 0x264,
  BATTERY_VOLTAGE: 0x2A0,
  STEERING_WHEEL_BUTTONS: 0x2B0,
  DIAGNOSTIC_REQUEST: 0x7DF,
  DIAGNOSTIC_RESPONSE: 0x7E8,
  DOOR_STATUS: 0x300,
  TURN_SIGNALS: 0x304,
  HEADLIGHTS: 0x308,
};

const GEAR_POSITIONS = {
  0: 'park',
  1: 'reverse',
  2: 'neutral',
  3: 'drive',
  4: 'sport',
};

const STEERING_BUTTONS = {
  0x01: 'volume_up',
  0x02: 'volume_down',
  0x04: 'seek_forward',
  0x08: 'seek_backward',
  0x10: 'mode',
  0x20: 'voice',
  0x40: 'phone',
  0x80: 'mute',
};

const CONTROLLER_STATES = {
  STOPPED: 'stopped',
  STARTING: 'starting',
  RUNNING: 'running',
  ERROR: 'error',
};

class CanController {
  constructor(options = {}) {
    this.id = uuidv4();
    this.state = CONTROLLER_STATES.STOPPED;
    this._vehicleState = {
      ignition: false,
      speed: 0,
      rpm: 0,
      gear: 'park',
      parkingBrake: true,
      steeringAngle: 0,
      batteryVoltage: 12.6,
      doors: { fl: false, fr: false, rl: false, rr: false },
      turnSignals: { left: false, right: false },
      headlights: false,
    };
    this._dtcCodes = [];
    this._listeners = new Map();
    this._simulationInterval = null;
    this._simulationRate = options.simulationRate || 50;
    this._errorCount = 0;
    this._maxErrors = options.maxErrors || 10;
    this._lastUpdateTime = 0;
  }

  async start() {
    if (this.state === CONTROLLER_STATES.RUNNING) {
      return;
    }
    this.state = CONTROLLER_STATES.STARTING;
    logger.info('Starting CAN controller', { id: this.id });

    this._errorCount = 0;
    this.state = CONTROLLER_STATES.RUNNING;
    this._lastUpdateTime = Date.now();
    logger.info('CAN controller running', { id: this.id });
    this._emit('started', { id: this.id });
  }

  async stop() {
    logger.info('Stopping CAN controller', { id: this.id });
    if (this._simulationInterval) {
      clearInterval(this._simulationInterval);
      this._simulationInterval = null;
    }
    this.state = CONTROLLER_STATES.STOPPED;
    this._emit('stopped', { id: this.id });
  }

  getVehicleState() {
    return { ...this._vehicleState };
  }

  getLatency() {
    if (this._lastUpdateTime === 0) {return -1;}
    return Date.now() - this._lastUpdateTime;
  }

  processFrame(frame) {
    if (this.state !== CONTROLLER_STATES.RUNNING) {
      throw new Error('CAN controller not running');
    }

    const startTime = Date.now();

    try {
      switch (frame.id) {
        case CAN_IDS.IGNITION_STATUS:
          this._processIgnition(frame.data);
          break;
        case CAN_IDS.VEHICLE_SPEED:
          this._processSpeed(frame.data);
          break;
        case CAN_IDS.ENGINE_RPM:
          this._processRpm(frame.data);
          break;
        case CAN_IDS.GEAR_POSITION:
          this._processGear(frame.data);
          break;
        case CAN_IDS.PARKING_BRAKE:
          this._processParkingBrake(frame.data);
          break;
        case CAN_IDS.STEERING_ANGLE:
          this._processSteeringAngle(frame.data);
          break;
        case CAN_IDS.BATTERY_VOLTAGE:
          this._processBatteryVoltage(frame.data);
          break;
        case CAN_IDS.STEERING_WHEEL_BUTTONS:
          this._processSteeringButtons(frame.data);
          break;
        case CAN_IDS.DIAGNOSTIC_RESPONSE:
          this._processDiagnosticResponse(frame.data);
          break;
        case CAN_IDS.DOOR_STATUS:
          this._processDoorStatus(frame.data);
          break;
        case CAN_IDS.TURN_SIGNALS:
          this._processTurnSignals(frame.data);
          break;
        case CAN_IDS.HEADLIGHTS:
          this._processHeadlights(frame.data);
          break;
        default:
          logger.debug('Unknown CAN ID', { id: `0x${frame.id.toString(16)}` });
      }

      this._lastUpdateTime = Date.now();
      const latency = this._lastUpdateTime - startTime;

      if (latency > 50) {
        logger.warn('CAN processing latency exceeded 50ms', { latency });
      }

      return { processed: true, latency };
    } catch (err) {
      this._handleError(err);
      return { processed: false, error: err.message };
    }
  }

  requestDiagnostics() {
    if (this.state !== CONTROLLER_STATES.RUNNING) {
      throw new Error('CAN controller not running');
    }
    const frame = {
      id: CAN_IDS.DIAGNOSTIC_REQUEST,
      data: Buffer.from([0x01, 0x00]),
      timestamp: Date.now(),
    };
    this._emit('txFrame', frame);
    return frame;
  }

  getDtcCodes() {
    return [...this._dtcCodes];
  }

  clearDtcCodes() {
    this._dtcCodes = [];
    this._emit('dtcCleared', {});
  }

  simulateFrame(canId, data) {
    const frame = {
      id: canId,
      data: Buffer.isBuffer(data) ? data : Buffer.from(data),
      timestamp: Date.now(),
      dlc: data.length,
    };
    return this.processFrame(frame);
  }

  _processIgnition(data) {
    const prev = this._vehicleState.ignition;
    this._vehicleState.ignition = data[0] === 0x01;
    if (prev !== this._vehicleState.ignition) {
      this._emit('ignitionChange', { ignition: this._vehicleState.ignition });
    }
  }

  _processSpeed(data) {
    const speed = (data[0] << 8 | data[1]) / 100;
    this._vehicleState.speed = speed;
    this._emit('speedChange', { speed });
  }

  _processRpm(data) {
    const rpm = (data[0] << 8 | data[1]) / 4;
    this._vehicleState.rpm = rpm;
    this._emit('rpmChange', { rpm });
  }

  _processGear(data) {
    const gearNum = data[0] & 0x0F;
    const gear = GEAR_POSITIONS[gearNum] || 'unknown';
    const prev = this._vehicleState.gear;
    this._vehicleState.gear = gear;
    if (prev !== gear) {
      this._emit('gearChange', { gear, previous: prev });
    }
  }

  _processParkingBrake(data) {
    const prev = this._vehicleState.parkingBrake;
    this._vehicleState.parkingBrake = data[0] === 0x01;
    if (prev !== this._vehicleState.parkingBrake) {
      this._emit('parkingBrakeChange', { engaged: this._vehicleState.parkingBrake });
    }
  }

  _processSteeringAngle(data) {
    const angle = ((data[0] << 8 | data[1]) - 32768) / 10;
    this._vehicleState.steeringAngle = angle;
  }

  _processBatteryVoltage(data) {
    const voltage = (data[0] << 8 | data[1]) / 100;
    this._vehicleState.batteryVoltage = voltage;

    if (voltage < 11.5) {
      this._emit('lowBattery', { voltage });
      logger.warn('Low battery voltage', { voltage });
    }
  }

  _processSteeringButtons(data) {
    const buttonByte = data[0];
    for (const [mask, action] of Object.entries(STEERING_BUTTONS)) {
      if (buttonByte & parseInt(mask)) {
        this._emit('steeringButton', { button: action });
      }
    }
  }

  _processDiagnosticResponse(data) {
    if (data[0] === 0x43) {
      const dtcCount = data[1];
      for (let i = 0; i < dtcCount && (2 + i * 2 + 1) < data.length; i++) {
        const dtcHigh = data[2 + i * 2];
        const dtcLow = data[3 + i * 2];
        const code = `P${dtcHigh.toString(16).padStart(2, '0')}${dtcLow.toString(16).padStart(2, '0')}`;
        if (!this._dtcCodes.includes(code)) {
          this._dtcCodes.push(code);
        }
      }
      this._emit('dtcReceived', { codes: this._dtcCodes });
    }
  }

  _processDoorStatus(data) {
    this._vehicleState.doors = {
      fl: !!(data[0] & 0x01),
      fr: !!(data[0] & 0x02),
      rl: !!(data[0] & 0x04),
      rr: !!(data[0] & 0x08),
    };
    this._emit('doorChange', { doors: this._vehicleState.doors });
  }

  _processTurnSignals(data) {
    this._vehicleState.turnSignals = {
      left: !!(data[0] & 0x01),
      right: !!(data[0] & 0x02),
    };
  }

  _processHeadlights(data) {
    this._vehicleState.headlights = data[0] === 0x01;
  }

  _handleError(err) {
    this._errorCount++;
    logger.error('CAN controller error', { error: err.message, count: this._errorCount });
    this._emit('error', { error: err.message, count: this._errorCount });

    if (this._errorCount >= this._maxErrors) {
      this.state = CONTROLLER_STATES.ERROR;
      this._emit('busError', { errorCount: this._errorCount });
    }
  }

  async recover() {
    if (this.state !== CONTROLLER_STATES.ERROR) {
      return true;
    }
    logger.info('Attempting CAN controller recovery');
    this._errorCount = 0;
    this.state = CONTROLLER_STATES.STOPPED;
    await this.start();
    return this.state === CONTROLLER_STATES.RUNNING;
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

module.exports = {
  CanController,
  CAN_IDS,
  GEAR_POSITIONS,
  STEERING_BUTTONS,
  CONTROLLER_STATES,
};
