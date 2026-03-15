'use strict';

const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'linux-adapter' },
  transports: [new winston.transports.Console({ silent: true })],
});

const ADAPTER_STATES = {
  UNINITIALIZED: 'uninitialized',
  READY: 'ready',
  ERROR: 'error',
};

/**
 * Linux OS integration layer.
 * Provides abstracted access to Linux-specific system interfaces
 * used in automotive infotainment (ALSA, framebuffer, SocketCAN, gpsd).
 * All methods are simulated for portability.
 */
class LinuxAdapter {
  constructor(options = {}) {
    this.id = uuidv4();
    this.state = ADAPTER_STATES.UNINITIALIZED;
    this._platform = options.platform || process.platform;
    this._listeners = new Map();
    this._services = {
      alsa: { available: false, state: 'unknown' },
      framebuffer: { available: false, state: 'unknown' },
      socketcan: { available: false, state: 'unknown' },
      gpsd: { available: false, state: 'unknown' },
      i2c: { available: false, state: 'unknown' },
      spi: { available: false, state: 'unknown' },
      gpio: { available: false, state: 'unknown' },
    };
  }

  async init() {
    if (this.state === ADAPTER_STATES.READY) {
      return;
    }
    logger.info('Initializing Linux adapter', { platform: this._platform });

    // Simulate service discovery
    for (const service of Object.keys(this._services)) {
      this._services[service] = { available: true, state: 'simulated' };
    }

    this.state = ADAPTER_STATES.READY;
    logger.info('Linux adapter ready');
    this._emit('ready', { platform: this._platform });
  }

  async shutdown() {
    logger.info('Shutting down Linux adapter');
    for (const service of Object.keys(this._services)) {
      this._services[service] = { available: false, state: 'shutdown' };
    }
    this.state = ADAPTER_STATES.UNINITIALIZED;
  }

  getStatus() {
    return {
      id: this.id,
      state: this.state,
      platform: this._platform,
      services: { ...this._services },
    };
  }

  getPlatformInfo() {
    return {
      os: this._platform,
      kernel: 'simulated',
      arch: process.arch,
      hostname: 'carconnect',
      uptime: process.uptime(),
      memory: {
        total: 1024 * 1024 * 1024,
        free: 512 * 1024 * 1024,
      },
      cpu: {
        model: 'ARM Cortex-A53',
        cores: 4,
        frequency: 1400,
      },
    };
  }

  isServiceAvailable(serviceName) {
    const service = this._services[serviceName];
    return service ? service.available : false;
  }

  getServiceState(serviceName) {
    return this._services[serviceName] || null;
  }

  // ALSA audio interface
  getAudioDevices() {
    this._ensureReady();
    return [
      { id: 'hw:0,0', name: 'Primary Output', type: 'playback', channels: 6 },
      { id: 'hw:0,1', name: 'Bluetooth Audio', type: 'playback', channels: 2 },
      { id: 'hw:1,0', name: 'Microphone', type: 'capture', channels: 1 },
    ];
  }

  // Framebuffer display interface
  getDisplayDevices() {
    this._ensureReady();
    return [
      { id: '/dev/fb0', name: 'Main Display', width: 1024, height: 600, bpp: 32 },
    ];
  }

  // SocketCAN interface
  getCanInterfaces() {
    this._ensureReady();
    return [
      { id: 'can0', name: 'Vehicle CAN', bitrate: 500000, state: 'up' },
      { id: 'vcan0', name: 'Virtual CAN', bitrate: 500000, state: 'up' },
    ];
  }

  // GPS interface
  getGpsDevices() {
    this._ensureReady();
    return [
      { id: '/dev/ttyUSB0', name: 'GPS Module', protocol: 'NMEA', baudrate: 9600 },
    ];
  }

  // GPIO interface
  getGpioPins() {
    this._ensureReady();
    return [
      { pin: 17, name: 'IGNITION_SENSE', direction: 'in' },
      { pin: 18, name: 'AMP_ENABLE', direction: 'out' },
      { pin: 27, name: 'DISPLAY_BACKLIGHT', direction: 'out' },
      { pin: 22, name: 'CAN_STANDBY', direction: 'out' },
    ];
  }

  setGpioPin(pin, value) {
    this._ensureReady();
    logger.info('GPIO pin set', { pin, value });
    this._emit('gpioChange', { pin, value });
  }

  readGpioPin(pin) {
    this._ensureReady();
    // Simulated GPIO read
    return 0;
  }

  // System power management
  getSystemPowerState() {
    this._ensureReady();
    return {
      state: 'running',
      batteryVoltage: 12.6,
      ignitionOn: true,
      suspendAllowed: false,
    };
  }

  async requestSuspend() {
    this._ensureReady();
    logger.info('Suspend requested');
    this._emit('suspendRequest', {});
    return { success: true, message: 'Suspend simulated' };
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
    if (this.state !== ADAPTER_STATES.READY) {
      throw new Error('Linux adapter not initialized');
    }
  }
}

module.exports = { LinuxAdapter, ADAPTER_STATES };
