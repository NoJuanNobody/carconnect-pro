'use strict';

const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'gps-hal' },
  transports: [new winston.transports.Console({ silent: true })],
});

const GPS_HAL_STATES = {
  UNINITIALIZED: 'uninitialized',
  INITIALIZING: 'initializing',
  SEARCHING: 'searching',
  FIX_2D: 'fix_2d',
  FIX_3D: 'fix_3d',
  ERROR: 'error',
  SHUTDOWN: 'shutdown',
};

class GpsHal {
  constructor(options = {}) {
    this.id = uuidv4();
    this.state = GPS_HAL_STATES.UNINITIALIZED;
    this.updateRate = options.updateRate || 1;
    this._position = null;
    this._satellites = 0;
    this._hdop = 99.99;
    this._faultCount = 0;
    this._maxFaults = options.maxFaults || 3;
    this._listeners = new Map();
    this._updateInterval = null;
  }

  async init() {
    if (this.state !== GPS_HAL_STATES.UNINITIALIZED && this.state !== GPS_HAL_STATES.SHUTDOWN) {
      throw new Error('GpsHal already initialized');
    }
    this.state = GPS_HAL_STATES.INITIALIZING;
    logger.info('Initializing GPS HAL', { id: this.id });

    try {
      this.state = GPS_HAL_STATES.SEARCHING;
      this._faultCount = 0;
      logger.info('GPS HAL initialized, searching for satellites', { id: this.id });
      this._emit('stateChange', { state: this.state });
    } catch (err) {
      this.state = GPS_HAL_STATES.ERROR;
      logger.error('GPS HAL init failed', { error: err.message });
      throw err;
    }
  }

  async shutdown() {
    logger.info('Shutting down GPS HAL', { id: this.id });
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
      this._updateInterval = null;
    }
    this._position = null;
    this._satellites = 0;
    this.state = GPS_HAL_STATES.SHUTDOWN;
    this._emit('stateChange', { state: this.state });
  }

  getStatus() {
    return {
      id: this.id,
      state: this.state,
      position: this._position ? { ...this._position } : null,
      satellites: this._satellites,
      hdop: this._hdop,
      updateRate: this.updateRate,
    };
  }

  getCapabilities() {
    return {
      type: 'gps',
      protocols: ['NMEA 0183', 'UBX'],
      constellations: ['GPS', 'GLONASS', 'Galileo'],
      updateRates: [1, 5, 10],
      assistedGps: true,
      deadReckoning: false,
      maxChannels: 72,
      accuracyMeters: 2.5,
    };
  }

  updatePosition(position) {
    this._ensureReady();
    const { latitude, longitude, altitude, speed, heading } = position;

    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      throw new Error('Invalid latitude');
    }
    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      throw new Error('Invalid longitude');
    }

    this._position = {
      latitude,
      longitude,
      altitude: altitude || 0,
      speed: speed || 0,
      heading: heading || 0,
      timestamp: Date.now(),
    };

    this._emit('position', this._position);
    return this._position;
  }

  updateSatellites(count, hdop) {
    this._satellites = count;
    this._hdop = hdop || 99.99;

    if (count >= 4) {
      this.state = GPS_HAL_STATES.FIX_3D;
    } else if (count >= 3) {
      this.state = GPS_HAL_STATES.FIX_2D;
    } else {
      this.state = GPS_HAL_STATES.SEARCHING;
    }

    this._emit('satellites', { count, hdop: this._hdop, fixType: this.state });
  }

  getPosition() {
    return this._position ? { ...this._position } : null;
  }

  handleFault(fault) {
    this._faultCount++;
    logger.warn('GPS fault detected', { fault, count: this._faultCount });
    if (this._faultCount >= this._maxFaults) {
      this.state = GPS_HAL_STATES.ERROR;
      this._emit('error', { fault, count: this._faultCount });
      return false;
    }
    return true;
  }

  async recover() {
    if (this.state !== GPS_HAL_STATES.ERROR) {
      return true;
    }
    logger.info('Attempting GPS HAL recovery');
    this._faultCount = 0;
    this.state = GPS_HAL_STATES.UNINITIALIZED;
    await this.init();
    return this.state === GPS_HAL_STATES.SEARCHING;
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

  _ensureReady() {
    const validStates = [
      GPS_HAL_STATES.SEARCHING,
      GPS_HAL_STATES.FIX_2D,
      GPS_HAL_STATES.FIX_3D,
    ];
    if (!validStates.includes(this.state)) {
      throw new Error(`GPS HAL not ready, current state: ${this.state}`);
    }
  }
}

module.exports = { GpsHal, GPS_HAL_STATES };
