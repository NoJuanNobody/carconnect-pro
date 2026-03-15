'use strict';

const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'audio-hal' },
  transports: [new winston.transports.Console({ silent: true })],
});

const AUDIO_STATES = {
  UNINITIALIZED: 'uninitialized',
  INITIALIZING: 'initializing',
  READY: 'ready',
  PLAYING: 'playing',
  ERROR: 'error',
  SHUTDOWN: 'shutdown',
};

class AudioHal {
  constructor(options = {}) {
    this.id = uuidv4();
    this.state = AUDIO_STATES.UNINITIALIZED;
    this.volume = options.defaultVolume || 50;
    this.maxVolume = options.maxVolume || 100;
    this.minVolume = options.minVolume || 0;
    this.muted = false;
    this.balance = 0;
    this.fade = 0;
    this.equalizer = { bass: 0, mid: 0, treble: 0 };
    this.activeSource = null;
    this.sampleRate = options.sampleRate || 44100;
    this.channels = options.channels || 6;
    this.bitDepth = options.bitDepth || 16;
    this._faultCount = 0;
    this._maxFaults = options.maxFaults || 3;
    this._listeners = new Map();
  }

  async init() {
    if (this.state !== AUDIO_STATES.UNINITIALIZED && this.state !== AUDIO_STATES.SHUTDOWN) {
      throw new Error('AudioHal already initialized');
    }
    this.state = AUDIO_STATES.INITIALIZING;
    logger.info('Initializing audio HAL', { id: this.id });

    try {
      // Simulate DSP initialization
      this._dspReady = true;
      this._codecReady = true;
      this.state = AUDIO_STATES.READY;
      this._faultCount = 0;
      logger.info('Audio HAL initialized', { id: this.id });
      this._emit('stateChange', { state: this.state });
    } catch (err) {
      this.state = AUDIO_STATES.ERROR;
      logger.error('Audio HAL init failed', { error: err.message });
      throw err;
    }
  }

  async shutdown() {
    logger.info('Shutting down audio HAL', { id: this.id });
    this.activeSource = null;
    this._dspReady = false;
    this._codecReady = false;
    this.state = AUDIO_STATES.SHUTDOWN;
    this._emit('stateChange', { state: this.state });
  }

  getStatus() {
    return {
      id: this.id,
      state: this.state,
      volume: this.volume,
      muted: this.muted,
      balance: this.balance,
      fade: this.fade,
      equalizer: { ...this.equalizer },
      activeSource: this.activeSource,
      sampleRate: this.sampleRate,
      channels: this.channels,
      bitDepth: this.bitDepth,
      dspReady: !!this._dspReady,
      codecReady: !!this._codecReady,
    };
  }

  getCapabilities() {
    return {
      type: 'audio',
      maxVolume: this.maxVolume,
      minVolume: this.minVolume,
      sampleRates: [44100, 48000, 96000],
      channelConfigs: [2, 4, 6],
      bitDepths: [16, 24],
      sources: ['radio', 'bluetooth', 'usb', 'aux', 'streaming'],
      equalizerBands: ['bass', 'mid', 'treble'],
      dspEffects: ['loudness', 'surround', 'speed-compensation'],
    };
  }

  setVolume(level) {
    this._ensureReady();
    if (typeof level !== 'number' || level < this.minVolume || level > this.maxVolume) {
      throw new Error(`Volume must be between ${this.minVolume} and ${this.maxVolume}`);
    }
    this.volume = level;
    this.muted = false;
    logger.info('Volume set', { volume: level });
    this._emit('volumeChange', { volume: level });
    return this.volume;
  }

  mute() {
    this._ensureReady();
    this.muted = true;
    this._emit('muteChange', { muted: true });
  }

  unmute() {
    this._ensureReady();
    this.muted = false;
    this._emit('muteChange', { muted: false });
  }

  setBalance(value) {
    this._ensureReady();
    if (typeof value !== 'number' || value < -100 || value > 100) {
      throw new Error('Balance must be between -100 and 100');
    }
    this.balance = value;
    this._emit('balanceChange', { balance: value });
  }

  setFade(value) {
    this._ensureReady();
    if (typeof value !== 'number' || value < -100 || value > 100) {
      throw new Error('Fade must be between -100 and 100');
    }
    this.fade = value;
    this._emit('fadeChange', { fade: value });
  }

  setEqualizer(band, value) {
    this._ensureReady();
    if (!['bass', 'mid', 'treble'].includes(band)) {
      throw new Error('Invalid equalizer band');
    }
    if (typeof value !== 'number' || value < -10 || value > 10) {
      throw new Error('Equalizer value must be between -10 and 10');
    }
    this.equalizer[band] = value;
    this._emit('equalizerChange', { band, value });
  }

  setSource(source) {
    this._ensureReady();
    const validSources = ['radio', 'bluetooth', 'usb', 'aux', 'streaming'];
    if (!validSources.includes(source)) {
      throw new Error(`Invalid source: ${source}`);
    }
    this.activeSource = source;
    this.state = AUDIO_STATES.PLAYING;
    this._emit('sourceChange', { source });
  }

  handleFault(fault) {
    this._faultCount++;
    logger.warn('Audio fault detected', { fault, count: this._faultCount });
    if (this._faultCount >= this._maxFaults) {
      this.state = AUDIO_STATES.ERROR;
      this._emit('error', { fault, count: this._faultCount });
      return false;
    }
    return true;
  }

  async recover() {
    if (this.state !== AUDIO_STATES.ERROR) {
      return true;
    }
    logger.info('Attempting audio HAL recovery');
    this._faultCount = 0;
    this.state = AUDIO_STATES.UNINITIALIZED;
    await this.init();
    return this.state === AUDIO_STATES.READY;
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
    if (this.state !== AUDIO_STATES.READY && this.state !== AUDIO_STATES.PLAYING) {
      throw new Error(`Audio HAL not ready, current state: ${this.state}`);
    }
  }
}

module.exports = { AudioHal, AUDIO_STATES };
