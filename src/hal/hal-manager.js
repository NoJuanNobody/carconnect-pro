'use strict';

const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const { AudioHal } = require('./audio-hal');
const { DisplayHal } = require('./display-hal');
const { CanHal } = require('./can-hal');
const { GpsHal } = require('./gps-hal');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'hal-manager' },
  transports: [new winston.transports.Console({ silent: true })],
});

const MANAGER_STATES = {
  UNINITIALIZED: 'uninitialized',
  INITIALIZING: 'initializing',
  READY: 'ready',
  DEGRADED: 'degraded',
  ERROR: 'error',
  SHUTDOWN: 'shutdown',
};

class HalManager {
  constructor(options = {}) {
    this.id = uuidv4();
    this.state = MANAGER_STATES.UNINITIALIZED;
    this._modules = new Map();
    this._listeners = new Map();
    this._options = options;
    this._healthCheckInterval = null;
    this._healthCheckMs = options.healthCheckMs || 5000;
  }

  async init() {
    if (this.state !== MANAGER_STATES.UNINITIALIZED && this.state !== MANAGER_STATES.SHUTDOWN) {
      throw new Error('HalManager already initialized');
    }
    this.state = MANAGER_STATES.INITIALIZING;
    logger.info('Initializing HAL Manager', { id: this.id });

    try {
      const audio = new AudioHal(this._options.audio || {});
      const display = new DisplayHal(this._options.display || {});
      const can = new CanHal(this._options.can || {});
      const gps = new GpsHal(this._options.gps || {});

      this._modules.set('audio', audio);
      this._modules.set('display', display);
      this._modules.set('can', can);
      this._modules.set('gps', gps);

      const results = await Promise.allSettled([
        audio.init(),
        display.init(),
        can.init(),
        gps.init(),
      ]);

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length === results.length) {
        this.state = MANAGER_STATES.ERROR;
        throw new Error('All HAL modules failed to initialize');
      } else if (failures.length > 0) {
        this.state = MANAGER_STATES.DEGRADED;
        logger.warn('Some HAL modules failed', {
          failedCount: failures.length,
        });
      } else {
        this.state = MANAGER_STATES.READY;
      }

      this._startHealthCheck();
      logger.info('HAL Manager initialized', { state: this.state });
      this._emit('stateChange', { state: this.state });
    } catch (err) {
      this.state = MANAGER_STATES.ERROR;
      logger.error('HAL Manager init failed', { error: err.message });
      throw err;
    }
  }

  async shutdown() {
    logger.info('Shutting down HAL Manager', { id: this.id });
    this._stopHealthCheck();

    const shutdownPromises = [];
    for (const [name, module] of this._modules) {
      shutdownPromises.push(
        module.shutdown().catch((err) => {
          logger.error(`Failed to shutdown ${name}`, { error: err.message });
        }),
      );
    }
    await Promise.allSettled(shutdownPromises);

    this._modules.clear();
    this.state = MANAGER_STATES.SHUTDOWN;
    this._emit('stateChange', { state: this.state });
  }

  getModule(name) {
    const module = this._modules.get(name);
    if (!module) {
      throw new Error(`HAL module not found: ${name}`);
    }
    return module;
  }

  getStatus() {
    const moduleStatuses = {};
    for (const [name, module] of this._modules) {
      moduleStatuses[name] = module.getStatus();
    }
    return {
      id: this.id,
      state: this.state,
      modules: moduleStatuses,
      moduleCount: this._modules.size,
    };
  }

  getCapabilities() {
    const capabilities = {};
    for (const [name, module] of this._modules) {
      capabilities[name] = module.getCapabilities();
    }
    return capabilities;
  }

  discoverHardware() {
    const discovered = [];
    for (const [name, module] of this._modules) {
      discovered.push({
        name,
        type: module.getCapabilities().type,
        status: module.getStatus().state,
        id: module.id,
      });
    }
    return discovered;
  }

  async recoverModule(name) {
    const module = this.getModule(name);
    logger.info('Attempting module recovery', { module: name });
    const recovered = await module.recover();
    if (recovered) {
      logger.info('Module recovered', { module: name });
      this._updateManagerState();
    }
    return recovered;
  }

  async recoverAll() {
    const results = {};
    for (const [name, module] of this._modules) {
      const status = module.getStatus();
      if (status.state === 'error' || status.state === 'bus_off') {
        results[name] = await module.recover();
      } else {
        results[name] = true;
      }
    }
    this._updateManagerState();
    return results;
  }

  _startHealthCheck() {
    this._healthCheckInterval = setInterval(() => {
      this._performHealthCheck();
    }, this._healthCheckMs);
    // Prevent the interval from keeping the process alive
    if (this._healthCheckInterval.unref) {
      this._healthCheckInterval.unref();
    }
  }

  _stopHealthCheck() {
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
      this._healthCheckInterval = null;
    }
  }

  _performHealthCheck() {
    let hasError = false;
    const hasDegraded = false;

    for (const [name, module] of this._modules) {
      const status = module.getStatus();
      if (status.state === 'error' || status.state === 'bus_off') {
        hasError = true;
        logger.warn('Module in error state', { module: name, state: status.state });
      }
    }

    const prevState = this.state;
    if (hasError) {
      this.state = MANAGER_STATES.DEGRADED;
    } else if (!hasDegraded && this.state === MANAGER_STATES.DEGRADED) {
      this.state = MANAGER_STATES.READY;
    }

    if (prevState !== this.state) {
      this._emit('stateChange', { state: this.state, previousState: prevState });
    }
  }

  _updateManagerState() {
    let errorCount = 0;
    for (const [, module] of this._modules) {
      const status = module.getStatus();
      if (status.state === 'error' || status.state === 'bus_off') {
        errorCount++;
      }
    }

    if (errorCount === this._modules.size) {
      this.state = MANAGER_STATES.ERROR;
    } else if (errorCount > 0) {
      this.state = MANAGER_STATES.DEGRADED;
    } else {
      this.state = MANAGER_STATES.READY;
    }
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

module.exports = { HalManager, MANAGER_STATES };
