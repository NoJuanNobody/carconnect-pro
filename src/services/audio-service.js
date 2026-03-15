'use strict';

const { v4: uuidv4 } = require('uuid');

const AUDIO_SOURCES = [
  { id: 'radio', name: 'Radio', type: 'built-in' },
  { id: 'bluetooth', name: 'Bluetooth', type: 'wireless' },
  { id: 'usb', name: 'USB', type: 'wired' },
  { id: 'aux', name: 'AUX', type: 'wired' },
  { id: 'android_auto', name: 'Android Auto', type: 'integration' },
  { id: 'apple_carplay', name: 'Apple CarPlay', type: 'integration' },
];

class AudioService {
  constructor() {
    this.sources = AUDIO_SOURCES.map((s) => ({
      ...s,
      connected: true,
      available: true,
    }));
    this.activeSourceId = 'radio';
    this.controls = {
      volume: 50,
      balance: 0,
      fade: 0,
      bass: 0,
      treble: 0,
    };
    this._listeners = new Map();
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
      fn(data);
    }
  }

  getSources() {
    return this.sources.map((s) => ({
      ...s,
      active: s.id === this.activeSourceId,
    }));
  }

  getSourceById(sourceId) {
    return this.sources.find((s) => s.id === sourceId) || null;
  }

  async switchSource(sourceId, fadeTime = 200) {
    const source = this.getSourceById(sourceId);
    if (!source) {
      const error = new Error(`Audio source not found: ${sourceId}`);
      error.code = 'SOURCE_NOT_FOUND';
      throw error;
    }

    if (!source.connected) {
      const error = new Error(`Audio source not connected: ${sourceId}`);
      error.code = 'SOURCE_NOT_CONNECTED';
      throw error;
    }

    const startTime = Date.now();

    // Simulate fade transition (capped to stay within 500ms)
    const simulatedDelay = Math.min(fadeTime, 400);
    await new Promise((resolve) => setTimeout(resolve, simulatedDelay));

    const previousSourceId = this.activeSourceId;
    this.activeSourceId = sourceId;

    const elapsed = Date.now() - startTime;

    const result = {
      previousSource: previousSourceId,
      currentSource: this.activeSourceId,
      fadeTime: simulatedDelay,
      switchTime: elapsed,
      transactionId: uuidv4(),
    };

    this._emit('audioSourceChange', result);
    return result;
  }

  getControls() {
    return { ...this.controls };
  }

  updateControls(updates) {
    const updatedFields = {};

    for (const [key, value] of Object.entries(updates)) {
      if (this.controls[key] !== undefined) {
        this.controls[key] = value;
        updatedFields[key] = value;
      }
    }

    const result = {
      controls: { ...this.controls },
      updatedFields,
    };

    this._emit('audioControlsChange', result);
    return result;
  }

  setSourceConnected(sourceId, connected) {
    const source = this.sources.find((s) => s.id === sourceId);
    if (source) {
      source.connected = connected;
    }
  }

  reset() {
    this.activeSourceId = 'radio';
    this.controls = {
      volume: 50,
      balance: 0,
      fade: 0,
      bass: 0,
      treble: 0,
    };
    this.sources.forEach((s) => {
      s.connected = true;
      s.available = true;
    });
  }
}

module.exports = AudioService;
