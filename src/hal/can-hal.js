'use strict';

const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'can-hal' },
  transports: [new winston.transports.Console({ silent: true })],
});

const CAN_HAL_STATES = {
  UNINITIALIZED: 'uninitialized',
  INITIALIZING: 'initializing',
  READY: 'ready',
  ACTIVE: 'active',
  BUS_OFF: 'bus_off',
  ERROR: 'error',
  SHUTDOWN: 'shutdown',
};

class CanHal {
  constructor(options = {}) {
    this.id = uuidv4();
    this.state = CAN_HAL_STATES.UNINITIALIZED;
    this.bitrate = options.bitrate || 500000;
    this.busName = options.busName || 'can0';
    this._filters = [];
    this._faultCount = 0;
    this._maxFaults = options.maxFaults || 5;
    this._txCount = 0;
    this._rxCount = 0;
    this._errorCount = 0;
    this._listeners = new Map();
    this._messageHandler = null;
  }

  async init() {
    if (this.state !== CAN_HAL_STATES.UNINITIALIZED && this.state !== CAN_HAL_STATES.SHUTDOWN) {
      throw new Error('CanHal already initialized');
    }
    this.state = CAN_HAL_STATES.INITIALIZING;
    logger.info('Initializing CAN HAL', { id: this.id, busName: this.busName });

    try {
      this.state = CAN_HAL_STATES.READY;
      this._faultCount = 0;
      this._txCount = 0;
      this._rxCount = 0;
      this._errorCount = 0;
      logger.info('CAN HAL initialized', { id: this.id });
      this._emit('stateChange', { state: this.state });
    } catch (err) {
      this.state = CAN_HAL_STATES.ERROR;
      logger.error('CAN HAL init failed', { error: err.message });
      throw err;
    }
  }

  async shutdown() {
    logger.info('Shutting down CAN HAL', { id: this.id });
    this._filters = [];
    this._messageHandler = null;
    this.state = CAN_HAL_STATES.SHUTDOWN;
    this._emit('stateChange', { state: this.state });
  }

  getStatus() {
    return {
      id: this.id,
      state: this.state,
      busName: this.busName,
      bitrate: this.bitrate,
      txCount: this._txCount,
      rxCount: this._rxCount,
      errorCount: this._errorCount,
      filterCount: this._filters.length,
    };
  }

  getCapabilities() {
    return {
      type: 'can',
      protocols: ['CAN 2.0A', 'CAN 2.0B'],
      bitrates: [125000, 250000, 500000, 1000000],
      maxFilters: 32,
      maxDataLength: 8,
      extendedFrameSupport: true,
      errorFrameDetection: true,
      busOffRecovery: true,
    };
  }

  sendMessage(arbitrationId, data) {
    this._ensureReady();
    if (typeof arbitrationId !== 'number' || arbitrationId < 0 || arbitrationId > 0x7FF) {
      throw new Error('Invalid arbitration ID (must be 0x000-0x7FF for standard CAN)');
    }
    if (!Buffer.isBuffer(data) && !Array.isArray(data)) {
      throw new Error('Data must be a Buffer or Array');
    }
    if (data.length > 8) {
      throw new Error('CAN data cannot exceed 8 bytes');
    }

    const frame = {
      id: arbitrationId,
      data: Buffer.isBuffer(data) ? data : Buffer.from(data),
      timestamp: Date.now(),
      dlc: data.length,
    };

    this._txCount++;
    this.state = CAN_HAL_STATES.ACTIVE;
    logger.debug('CAN TX', { arbitrationId: `0x${arbitrationId.toString(16)}`, dlc: frame.dlc });
    this._emit('tx', frame);
    return frame;
  }

  receiveMessage(frame) {
    this._ensureReady();
    this._rxCount++;
    this.state = CAN_HAL_STATES.ACTIVE;

    if (this._filters.length > 0) {
      const matches = this._filters.some(
        (f) => (frame.id & f.mask) === (f.id & f.mask),
      );
      if (!matches) {return null;}
    }

    logger.debug('CAN RX', { arbitrationId: `0x${frame.id.toString(16)}` });
    this._emit('rx', frame);

    if (this._messageHandler) {
      this._messageHandler(frame);
    }

    return frame;
  }

  addFilter(id, mask) {
    if (this._filters.length >= 32) {
      throw new Error('Maximum filter count reached');
    }
    const filter = { id, mask: mask || 0x7FF };
    this._filters.push(filter);
    return filter;
  }

  removeFilter(id) {
    this._filters = this._filters.filter((f) => f.id !== id);
  }

  clearFilters() {
    this._filters = [];
  }

  setMessageHandler(handler) {
    this._messageHandler = handler;
  }

  handleBusError(error) {
    this._errorCount++;
    this._faultCount++;
    logger.warn('CAN bus error', { error, count: this._errorCount });

    if (this._faultCount >= this._maxFaults) {
      this.state = CAN_HAL_STATES.BUS_OFF;
      this._emit('busOff', { errorCount: this._errorCount });
      return false;
    }

    this._emit('error', { error, count: this._errorCount });
    return true;
  }

  async recover() {
    if (this.state !== CAN_HAL_STATES.BUS_OFF && this.state !== CAN_HAL_STATES.ERROR) {
      return true;
    }
    logger.info('Attempting CAN HAL recovery');
    this._faultCount = 0;
    this._errorCount = 0;
    this.state = CAN_HAL_STATES.UNINITIALIZED;
    await this.init();
    return this.state === CAN_HAL_STATES.READY;
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
    const validStates = [CAN_HAL_STATES.READY, CAN_HAL_STATES.ACTIVE];
    if (!validStates.includes(this.state)) {
      throw new Error(`CAN HAL not ready, current state: ${this.state}`);
    }
  }
}

module.exports = { CanHal, CAN_HAL_STATES };
