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
  defaultMeta: { service: 'system-watchdog' },
  transports: [
    new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' }),
  ],
});

/**
 * SystemWatchdog - Watches for system hangs and unresponsive components
 */
class SystemWatchdog extends EventEmitter {
  constructor(options = {}) {
    super();
    this._watchers = new Map();
    this._defaultTimeout = options.defaultTimeout || 30000;
    this._checkInterval = options.checkInterval || 5000;
    this._checkTimer = null;
    this._started = false;
    this._hangLog = [];
    this._maxLogSize = options.maxLogSize || 500;
    this._onHangCallback = options.onHang || null;
  }

  /**
   * Register a component for watchdog monitoring
   */
  register(name, options = {}) {
    const watcher = {
      id: uuidv4(),
      name,
      timeout: options.timeout || this._defaultTimeout,
      lastPing: Date.now(),
      active: true,
      hungCount: 0,
      critical: options.critical || false,
      restartFn: options.restartFn || null,
    };
    this._watchers.set(name, watcher);
    logger.info('Watchdog registered component', { name, timeout: watcher.timeout });
    return watcher.id;
  }

  /**
   * Unregister a component
   */
  unregister(name) {
    this._watchers.delete(name);
  }

  /**
   * Signal that a component is still alive (kick the watchdog)
   */
  ping(name) {
    const watcher = this._watchers.get(name);
    if (!watcher) return false;
    watcher.lastPing = Date.now();
    return true;
  }

  /**
   * Start the watchdog
   */
  start() {
    if (this._started) return;
    this._started = true;
    this._checkTimer = setInterval(() => this._checkAll(), this._checkInterval);
    if (this._checkTimer.unref) this._checkTimer.unref();
    logger.info('System watchdog started');
  }

  /**
   * Stop the watchdog
   */
  stop() {
    this._started = false;
    if (this._checkTimer) {
      clearInterval(this._checkTimer);
      this._checkTimer = null;
    }
    logger.info('System watchdog stopped');
  }

  /**
   * Get status of a watched component
   */
  getStatus(name) {
    const watcher = this._watchers.get(name);
    if (!watcher) return null;
    const timeSincePing = Date.now() - watcher.lastPing;
    return {
      name: watcher.name,
      active: watcher.active,
      lastPing: watcher.lastPing,
      timeSincePing,
      timeout: watcher.timeout,
      isResponsive: timeSincePing < watcher.timeout,
      hungCount: watcher.hungCount,
      critical: watcher.critical,
    };
  }

  /**
   * Get status of all watched components
   */
  getAllStatuses() {
    const statuses = {};
    for (const [name] of this._watchers) {
      statuses[name] = this.getStatus(name);
    }
    return statuses;
  }

  /**
   * Get hang log
   */
  getHangLog(limit = 50) {
    return this._hangLog.slice(-limit);
  }

  /**
   * Get all unresponsive components
   */
  getUnresponsiveComponents() {
    const result = [];
    for (const [name] of this._watchers) {
      const status = this.getStatus(name);
      if (!status.isResponsive) {
        result.push(status);
      }
    }
    return result;
  }

  /**
   * Temporarily disable watching for a component
   */
  suspend(name) {
    const watcher = this._watchers.get(name);
    if (watcher) {
      watcher.active = false;
    }
  }

  /**
   * Re-enable watching for a component
   */
  resume(name) {
    const watcher = this._watchers.get(name);
    if (watcher) {
      watcher.active = true;
      watcher.lastPing = Date.now();
    }
  }

  _checkAll() {
    const now = Date.now();

    for (const [name, watcher] of this._watchers) {
      if (!watcher.active) continue;

      const elapsed = now - watcher.lastPing;
      if (elapsed > watcher.timeout) {
        watcher.hungCount++;

        const hangEvent = {
          name,
          elapsed,
          timeout: watcher.timeout,
          hungCount: watcher.hungCount,
          critical: watcher.critical,
          timestamp: now,
        };

        this._hangLog.push(hangEvent);
        if (this._hangLog.length > this._maxLogSize) {
          this._hangLog = this._hangLog.slice(-this._maxLogSize);
        }

        this.emit('hang', hangEvent);
        logger.error('Component appears hung', {
          name,
          elapsed,
          timeout: watcher.timeout,
        });

        if (this._onHangCallback) {
          try {
            this._onHangCallback(hangEvent);
          } catch (err) {
            logger.error('Hang callback error', { error: err.message });
          }
        }

        // Attempt restart if available
        if (watcher.restartFn) {
          this._attemptRestart(name, watcher);
        }
      }
    }
  }

  async _attemptRestart(name, watcher) {
    try {
      logger.info('Attempting to restart hung component', { name });
      await watcher.restartFn();
      watcher.lastPing = Date.now();
      this.emit('restarted', { name });
      logger.info('Hung component restarted', { name });
    } catch (err) {
      this.emit('restartFailed', { name, error: err.message });
      logger.error('Failed to restart hung component', {
        name,
        error: err.message,
      });
    }
  }
}

module.exports = SystemWatchdog;
