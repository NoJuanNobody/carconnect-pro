'use strict';

const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'display-hal' },
  transports: [new winston.transports.Console({ silent: true })],
});

const DISPLAY_STATES = {
  UNINITIALIZED: 'uninitialized',
  INITIALIZING: 'initializing',
  READY: 'ready',
  ACTIVE: 'active',
  DIMMED: 'dimmed',
  OFF: 'off',
  ERROR: 'error',
  SHUTDOWN: 'shutdown',
};

class DisplayHal {
  constructor(options = {}) {
    this.id = uuidv4();
    this.state = DISPLAY_STATES.UNINITIALIZED;
    this.brightness = options.defaultBrightness || 80;
    this.maxBrightness = options.maxBrightness || 100;
    this.minBrightness = options.minBrightness || 0;
    this.resolution = options.resolution || { width: 1024, height: 600 };
    this.touchEnabled = options.touchEnabled !== false;
    this.nightMode = false;
    this._faultCount = 0;
    this._maxFaults = options.maxFaults || 3;
    this._listeners = new Map();
    this._framebufferReady = false;
    this._touchControllerReady = false;
  }

  async init() {
    if (this.state !== DISPLAY_STATES.UNINITIALIZED && this.state !== DISPLAY_STATES.SHUTDOWN) {
      throw new Error('DisplayHal already initialized');
    }
    this.state = DISPLAY_STATES.INITIALIZING;
    logger.info('Initializing display HAL', { id: this.id });

    try {
      this._framebufferReady = true;
      this._touchControllerReady = this.touchEnabled;
      this.state = DISPLAY_STATES.READY;
      this._faultCount = 0;
      logger.info('Display HAL initialized', { id: this.id });
      this._emit('stateChange', { state: this.state });
    } catch (err) {
      this.state = DISPLAY_STATES.ERROR;
      logger.error('Display HAL init failed', { error: err.message });
      throw err;
    }
  }

  async shutdown() {
    logger.info('Shutting down display HAL', { id: this.id });
    this._framebufferReady = false;
    this._touchControllerReady = false;
    this.state = DISPLAY_STATES.SHUTDOWN;
    this._emit('stateChange', { state: this.state });
  }

  getStatus() {
    return {
      id: this.id,
      state: this.state,
      brightness: this.brightness,
      resolution: { ...this.resolution },
      touchEnabled: this.touchEnabled,
      nightMode: this.nightMode,
      framebufferReady: this._framebufferReady,
      touchControllerReady: this._touchControllerReady,
    };
  }

  getCapabilities() {
    return {
      type: 'display',
      maxBrightness: this.maxBrightness,
      minBrightness: this.minBrightness,
      resolutions: [
        { width: 800, height: 480 },
        { width: 1024, height: 600 },
        { width: 1280, height: 720 },
      ],
      touchSupport: true,
      multiTouch: true,
      maxTouchPoints: 5,
      colorDepth: 24,
      nightModeSupport: true,
      autoBrightness: true,
    };
  }

  setBrightness(level) {
    this._ensureReady();
    if (typeof level !== 'number' || level < this.minBrightness || level > this.maxBrightness) {
      throw new Error(`Brightness must be between ${this.minBrightness} and ${this.maxBrightness}`);
    }
    this.brightness = level;
    if (level === 0) {
      this.state = DISPLAY_STATES.OFF;
    } else if (level < 30) {
      this.state = DISPLAY_STATES.DIMMED;
    } else {
      this.state = DISPLAY_STATES.ACTIVE;
    }
    logger.info('Brightness set', { brightness: level });
    this._emit('brightnessChange', { brightness: level });
  }

  setNightMode(enabled) {
    this._ensureReady();
    this.nightMode = enabled;
    if (enabled && this.brightness > 50) {
      this.setBrightness(40);
    }
    this._emit('nightModeChange', { nightMode: enabled });
  }

  handleTouchEvent(event) {
    this._ensureReady();
    if (!this.touchEnabled || !this._touchControllerReady) {
      return null;
    }
    const { x, y, type } = event;
    if (x < 0 || x > this.resolution.width || y < 0 || y > this.resolution.height) {
      return null;
    }
    const touchEvent = { x, y, type: type || 'tap', timestamp: Date.now() };
    this._emit('touch', touchEvent);
    return touchEvent;
  }

  handleFault(fault) {
    this._faultCount++;
    logger.warn('Display fault detected', { fault, count: this._faultCount });
    if (this._faultCount >= this._maxFaults) {
      this.state = DISPLAY_STATES.ERROR;
      this._emit('error', { fault, count: this._faultCount });
      return false;
    }
    return true;
  }

  async recover() {
    if (this.state !== DISPLAY_STATES.ERROR) {
      return true;
    }
    logger.info('Attempting display HAL recovery');
    this._faultCount = 0;
    this.state = DISPLAY_STATES.UNINITIALIZED;
    await this.init();
    return this.state === DISPLAY_STATES.READY;
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
      if (idx !== -1) listeners.splice(idx, 1);
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
      DISPLAY_STATES.READY,
      DISPLAY_STATES.ACTIVE,
      DISPLAY_STATES.DIMMED,
    ];
    if (!validStates.includes(this.state)) {
      throw new Error(`Display HAL not ready, current state: ${this.state}`);
    }
  }
}

module.exports = { DisplayHal, DISPLAY_STATES };
