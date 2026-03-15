'use strict';

const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const { CanController } = require('../hardware/can-controller');
const { GpsController } = require('../hardware/gps-controller');
const { IgnitionHandler } = require('../safety/ignition-handler');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'vehicle-service' },
  transports: [new winston.transports.Console({ silent: true })],
});

const SERVICE_STATES = {
  STOPPED: 'stopped',
  STARTING: 'starting',
  RUNNING: 'running',
  ERROR: 'error',
};

class VehicleService {
  constructor(options = {}) {
    this.id = uuidv4();
    this.state = SERVICE_STATES.STOPPED;
    this._canController = options.canController || new CanController(options.can || {});
    this._gpsController = options.gpsController || new GpsController(options.gps || {});
    this._ignitionHandler = options.ignitionHandler || new IgnitionHandler(options.ignition || {});
    this._listeners = new Map();
    this._steeringButtonHandlers = new Map();
    this._setupEventForwarding();
  }

  async start() {
    if (this.state === SERVICE_STATES.RUNNING) {
      return;
    }
    this.state = SERVICE_STATES.STARTING;
    logger.info('Starting vehicle service', { id: this.id });

    try {
      await this._canController.start();
      await this._gpsController.start();
      this.state = SERVICE_STATES.RUNNING;
      logger.info('Vehicle service running');
      this._emit('started', { id: this.id });
    } catch (err) {
      this.state = SERVICE_STATES.ERROR;
      logger.error('Vehicle service start failed', { error: err.message });
      throw err;
    }
  }

  async stop() {
    logger.info('Stopping vehicle service');
    await this._canController.stop();
    await this._gpsController.stop();
    this.state = SERVICE_STATES.STOPPED;
    this._emit('stopped', { id: this.id });
  }

  getVehicleState() {
    const canState = this._canController.getVehicleState();
    const gpsPosition = this._gpsController.getPosition();
    const ignitionStatus = this._ignitionHandler.getStatus();

    return {
      ...canState,
      position: gpsPosition,
      ignitionState: ignitionStatus.ignitionState,
      safetyMode: ignitionStatus.safetyMode,
      isDriving: ignitionStatus.isDriving,
      isParked: ignitionStatus.isParked,
      timestamp: Date.now(),
    };
  }

  isOperationAllowed(operation) {
    return this._ignitionHandler.isOperationAllowed(operation);
  }

  isDriving() {
    return this._ignitionHandler.isDriving();
  }

  isParked() {
    return this._ignitionHandler.isParked();
  }

  getCanController() {
    return this._canController;
  }

  getGpsController() {
    return this._gpsController;
  }

  getIgnitionHandler() {
    return this._ignitionHandler;
  }

  getDtcCodes() {
    return this._canController.getDtcCodes();
  }

  requestDiagnostics() {
    return this._canController.requestDiagnostics();
  }

  registerSteeringButtonHandler(button, handler) {
    this._steeringButtonHandlers.set(button, handler);
  }

  processCanFrame(frame) {
    if (this.state !== SERVICE_STATES.RUNNING) {
      throw new Error('Vehicle service not running');
    }
    return this._canController.processFrame(frame);
  }

  simulateCanFrame(canId, data) {
    if (this.state !== SERVICE_STATES.RUNNING) {
      throw new Error('Vehicle service not running');
    }
    return this._canController.simulateFrame(canId, data);
  }

  updateGpsPosition(position) {
    if (this.state !== SERVICE_STATES.RUNNING) {
      throw new Error('Vehicle service not running');
    }
    return this._gpsController.updatePosition(position);
  }

  getStatus() {
    return {
      id: this.id,
      state: this.state,
      can: this._canController.getVehicleState(),
      gps: this._gpsController.getStatus(),
      ignition: this._ignitionHandler.getStatus(),
    };
  }

  _setupEventForwarding() {
    this._canController.on('ignitionChange', (data) => {
      if (data.ignition) {
        this._ignitionHandler.setIgnitionState('on');
      } else {
        this._ignitionHandler.setIgnitionState('off');
      }
    });

    this._canController.on('speedChange', (data) => {
      this._ignitionHandler.updateVehicleSpeed(data.speed);
      this._emit('speedChange', data);
    });

    this._canController.on('parkingBrakeChange', (data) => {
      this._ignitionHandler.updateParkingBrake(data.engaged);
    });

    this._canController.on('gearChange', (data) => {
      this._ignitionHandler.updateGear(data.gear);
      this._emit('gearChange', data);
    });

    this._canController.on('lowBattery', (data) => {
      this._ignitionHandler.updateBatteryVoltage(data.voltage);
      this._emit('lowBattery', data);
    });

    this._canController.on('steeringButton', (data) => {
      const handler = this._steeringButtonHandlers.get(data.button);
      if (handler) {
        try {
          handler(data);
        } catch (err) {
          logger.error('Steering button handler error', { button: data.button, error: err.message });
        }
      }
      this._emit('steeringButton', data);
    });

    this._canController.on('dtcReceived', (data) => {
      this._emit('dtcReceived', data);
    });

    this._canController.on('error', (data) => {
      this._emit('canError', data);
    });

    this._gpsController.on('position', (data) => {
      this._emit('positionUpdate', data);
    });
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

module.exports = { VehicleService, SERVICE_STATES };
