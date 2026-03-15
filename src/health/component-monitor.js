'use strict';

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'component-monitor' },
  transports: [
    new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' }),
  ],
});

const ComponentState = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  RESTARTING: 'restarting',
  FAILED: 'failed',
  DEGRADED: 'degraded',
};

/**
 * ComponentMonitor - Monitors individual component health and provides
 * restart capabilities without full system reboot
 */
class ComponentMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this._components = new Map();
    this._maxRestartAttempts = options.maxRestartAttempts || 3;
    this._restartCooldown = options.restartCooldown || 5000;
    this._monitorInterval = options.monitorInterval || 5000;
    this._monitorTimer = null;
    this._started = false;
  }

  /**
   * Register a component for monitoring
   */
  register(name, component) {
    const entry = {
      id: uuidv4(),
      name,
      component,
      state: ComponentState.RUNNING,
      restartCount: 0,
      lastRestart: null,
      errors: [],
      registeredAt: Date.now(),
      critical: component.critical || false,
      startFn: component.start || null,
      stopFn: component.stop || null,
      healthFn: component.healthCheck || null,
    };
    this._components.set(name, entry);
    logger.info('Component registered', { name, critical: entry.critical });
    return entry.id;
  }

  /**
   * Unregister a component
   */
  unregister(name) {
    this._components.delete(name);
  }

  /**
   * Get state of a component
   */
  getState(name) {
    const entry = this._components.get(name);
    if (!entry) return null;
    return {
      name: entry.name,
      state: entry.state,
      restartCount: entry.restartCount,
      lastRestart: entry.lastRestart,
      errors: entry.errors.slice(-10),
      critical: entry.critical,
    };
  }

  /**
   * Get state of all components
   */
  getAllStates() {
    const states = {};
    for (const [name] of this._components) {
      states[name] = this.getState(name);
    }
    return states;
  }

  /**
   * Restart a specific component without rebooting the whole system
   */
  async restartComponent(name) {
    const entry = this._components.get(name);
    if (!entry) {
      throw new Error(`Component not found: ${name}`);
    }

    if (entry.restartCount >= this._maxRestartAttempts) {
      entry.state = ComponentState.FAILED;
      this.emit('componentFailed', {
        name,
        reason: 'Max restart attempts exceeded',
        restartCount: entry.restartCount,
        critical: entry.critical,
      });
      logger.error('Component exceeded max restart attempts', { name });
      return false;
    }

    entry.state = ComponentState.RESTARTING;
    entry.restartCount++;
    entry.lastRestart = Date.now();
    this.emit('componentRestarting', { name, attempt: entry.restartCount });

    try {
      if (entry.stopFn) {
        await entry.stopFn.call(entry.component);
      }

      await new Promise((resolve) => setTimeout(resolve, this._restartCooldown));

      if (entry.startFn) {
        await entry.startFn.call(entry.component);
      }

      entry.state = ComponentState.RUNNING;
      this.emit('componentRestarted', { name, attempt: entry.restartCount });
      logger.info('Component restarted successfully', { name, attempt: entry.restartCount });
      return true;
    } catch (err) {
      entry.state = ComponentState.FAILED;
      entry.errors.push({ message: err.message, timestamp: Date.now() });
      this.emit('componentFailed', {
        name,
        reason: err.message,
        restartCount: entry.restartCount,
        critical: entry.critical,
      });
      logger.error('Component restart failed', { name, error: err.message });
      return false;
    }
  }

  /**
   * Report an error for a component
   */
  reportError(name, error) {
    const entry = this._components.get(name);
    if (!entry) return;
    entry.errors.push({
      message: error.message || error,
      timestamp: Date.now(),
    });
    entry.state = ComponentState.DEGRADED;
    this.emit('componentError', {
      name,
      error: error.message || error,
      critical: entry.critical,
    });
  }

  /**
   * Reset restart counter for a component
   */
  resetRestartCount(name) {
    const entry = this._components.get(name);
    if (entry) {
      entry.restartCount = 0;
    }
  }

  /**
   * Mark a component as running
   */
  markRunning(name) {
    const entry = this._components.get(name);
    if (entry) {
      entry.state = ComponentState.RUNNING;
    }
  }

  /**
   * Get all failed components
   */
  getFailedComponents() {
    const failed = [];
    for (const [name, entry] of this._components) {
      if (entry.state === ComponentState.FAILED) {
        failed.push(this.getState(name));
      }
    }
    return failed;
  }

  /**
   * Get all critical components
   */
  getCriticalComponents() {
    const critical = [];
    for (const [name, entry] of this._components) {
      if (entry.critical) {
        critical.push(this.getState(name));
      }
    }
    return critical;
  }

  /**
   * Start periodic monitoring
   */
  start() {
    if (this._started) return;
    this._started = true;
    this._monitorTimer = setInterval(() => this._runHealthChecks(), this._monitorInterval);
    if (this._monitorTimer.unref) this._monitorTimer.unref();
    logger.info('Component monitor started');
  }

  /**
   * Stop periodic monitoring
   */
  stop() {
    this._started = false;
    if (this._monitorTimer) {
      clearInterval(this._monitorTimer);
      this._monitorTimer = null;
    }
    logger.info('Component monitor stopped');
  }

  async _runHealthChecks() {
    for (const [name, entry] of this._components) {
      if (entry.healthFn && entry.state === ComponentState.RUNNING) {
        try {
          await entry.healthFn.call(entry.component);
        } catch (err) {
          this.reportError(name, err);
        }
      }
    }
  }
}

module.exports = { ComponentMonitor, ComponentState };
