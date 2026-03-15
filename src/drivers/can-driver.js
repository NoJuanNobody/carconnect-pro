'use strict';

const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'can-driver' },
  transports: [new winston.transports.Console({ silent: true })],
});

const DRIVER_STATES = {
  UNLOADED: 'unloaded',
  LOADED: 'loaded',
  ACTIVE: 'active',
  ERROR: 'error',
};

/**
 * Simulated CAN bus driver (JS implementation).
 * In production, this would interface with SocketCAN or a native CAN library.
 */
class CanDriver {
  constructor(options = {}) {
    this.id = uuidv4();
    this.state = DRIVER_STATES.UNLOADED;
    this.interface = options.interface || 'vcan0';
    this.bitrate = options.bitrate || 500000;
    this._txQueue = [];
    this._rxQueue = [];
    this._rxCallback = null;
    this._listeners = new Map();
    this._loopbackEnabled = options.loopback !== false;
    this._txCount = 0;
    this._rxCount = 0;
    this._errorCount = 0;
  }

  async load() {
    if (this.state !== DRIVER_STATES.UNLOADED) {
      throw new Error('Driver already loaded');
    }
    logger.info('Loading CAN driver', { interface: this.interface, bitrate: this.bitrate });
    this.state = DRIVER_STATES.LOADED;
    this._emit('loaded', { interface: this.interface });
  }

  async unload() {
    logger.info('Unloading CAN driver', { interface: this.interface });
    this._txQueue = [];
    this._rxQueue = [];
    this._rxCallback = null;
    this.state = DRIVER_STATES.UNLOADED;
    this._emit('unloaded', { interface: this.interface });
  }

  async activate() {
    if (this.state !== DRIVER_STATES.LOADED) {
      throw new Error('Driver must be loaded before activation');
    }
    this.state = DRIVER_STATES.ACTIVE;
    logger.info('CAN driver activated', { interface: this.interface });
    this._emit('activated', { interface: this.interface });
  }

  send(frame) {
    if (this.state !== DRIVER_STATES.ACTIVE) {
      throw new Error('Driver not active');
    }

    const txFrame = {
      id: frame.id,
      data: Buffer.isBuffer(frame.data) ? frame.data : Buffer.from(frame.data),
      dlc: frame.data.length,
      timestamp: Date.now(),
      interface: this.interface,
    };

    this._txQueue.push(txFrame);
    this._txCount++;

    // Loopback for simulation
    if (this._loopbackEnabled) {
      this._rxQueue.push(txFrame);
      this._rxCount++;
      if (this._rxCallback) {
        this._rxCallback(txFrame);
      }
      this._emit('rx', txFrame);
    }

    this._emit('tx', txFrame);
    return txFrame;
  }

  receive() {
    if (this.state !== DRIVER_STATES.ACTIVE) {
      throw new Error('Driver not active');
    }
    return this._rxQueue.shift() || null;
  }

  injectFrame(frame) {
    if (this.state !== DRIVER_STATES.ACTIVE) {
      throw new Error('Driver not active');
    }
    const rxFrame = {
      id: frame.id,
      data: Buffer.isBuffer(frame.data) ? frame.data : Buffer.from(frame.data),
      dlc: frame.data.length,
      timestamp: Date.now(),
      interface: this.interface,
    };
    this._rxQueue.push(rxFrame);
    this._rxCount++;
    if (this._rxCallback) {
      this._rxCallback(rxFrame);
    }
    this._emit('rx', rxFrame);
    return rxFrame;
  }

  setReceiveCallback(callback) {
    this._rxCallback = callback;
  }

  getStatistics() {
    return {
      txCount: this._txCount,
      rxCount: this._rxCount,
      errorCount: this._errorCount,
      txQueueLength: this._txQueue.length,
      rxQueueLength: this._rxQueue.length,
    };
  }

  getStatus() {
    return {
      id: this.id,
      state: this.state,
      interface: this.interface,
      bitrate: this.bitrate,
      loopback: this._loopbackEnabled,
      statistics: this.getStatistics(),
    };
  }

  simulateError(errorType) {
    this._errorCount++;
    logger.warn('CAN driver error simulated', { errorType, count: this._errorCount });
    this._emit('error', { type: errorType, count: this._errorCount });
    if (errorType === 'bus_off') {
      this.state = DRIVER_STATES.ERROR;
    }
  }

  async recover() {
    if (this.state !== DRIVER_STATES.ERROR) {
      return true;
    }
    logger.info('Attempting CAN driver recovery');
    this._errorCount = 0;
    this.state = DRIVER_STATES.UNLOADED;
    await this.load();
    await this.activate();
    return this.state === DRIVER_STATES.ACTIVE;
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

module.exports = { CanDriver, DRIVER_STATES };
