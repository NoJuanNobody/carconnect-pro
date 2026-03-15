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
  defaultMeta: { service: 'health-check' },
  transports: [
    new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' }),
  ],
});

const ComponentStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  UNKNOWN: 'unknown',
};

/**
 * HealthCheckService - Manages health checks for all system components
 */
class HealthCheckService extends EventEmitter {
  constructor(options = {}) {
    super();
    this._components = new Map();
    this._checkInterval = options.checkInterval || 10000;
    this._checkTimer = null;
    this._started = false;
    this._history = new Map();
    this._maxHistory = options.maxHistory || 100;
  }

  /**
   * Register a component for health checking
   */
  registerComponent(name, checkFn, options = {}) {
    const component = {
      id: uuidv4(),
      name,
      checkFn,
      critical: options.critical || false,
      timeout: options.timeout || 5000,
      status: ComponentStatus.UNKNOWN,
      lastCheck: null,
      lastError: null,
      consecutiveFailures: 0,
      metadata: options.metadata || {},
    };
    this._components.set(name, component);
    this._history.set(name, []);
    logger.info('Component registered for health checking', { name, critical: component.critical });
    return component.id;
  }

  /**
   * Unregister a component
   */
  unregisterComponent(name) {
    this._components.delete(name);
    this._history.delete(name);
  }

  /**
   * Run health check for a specific component
   */
  async checkComponent(name) {
    const component = this._components.get(name);
    if (!component) {
      throw new Error(`Component not found: ${name}`);
    }
    return this._runCheck(component);
  }

  /**
   * Run health checks for all components
   */
  async checkAll() {
    const results = {};
    const promises = [];

    for (const [name, component] of this._components) {
      promises.push(
        this._runCheck(component).then((result) => {
          results[name] = result;
        }),
      );
    }

    await Promise.all(promises);

    const overallStatus = this._calculateOverallStatus(results);
    this.emit('checkComplete', { results, overallStatus });

    return { results, overallStatus };
  }

  /**
   * Get current status of a component
   */
  getComponentStatus(name) {
    const component = this._components.get(name);
    if (!component) {return null;}
    return {
      name: component.name,
      status: component.status,
      lastCheck: component.lastCheck,
      lastError: component.lastError,
      consecutiveFailures: component.consecutiveFailures,
      critical: component.critical,
    };
  }

  /**
   * Get status of all components
   */
  getAllStatuses() {
    const statuses = {};
    for (const [name] of this._components) {
      statuses[name] = this.getComponentStatus(name);
    }
    return statuses;
  }

  /**
   * Get health history for a component
   */
  getHistory(name) {
    return this._history.get(name) || [];
  }

  /**
   * Get list of registered component names
   */
  getRegisteredComponents() {
    return Array.from(this._components.keys());
  }

  /**
   * Start periodic health checks
   */
  start() {
    if (this._started) {return;}
    this._started = true;
    this._checkTimer = setInterval(() => this.checkAll(), this._checkInterval);
    if (this._checkTimer.unref) {this._checkTimer.unref();}
    logger.info('Health check service started');
  }

  /**
   * Stop periodic health checks
   */
  stop() {
    this._started = false;
    if (this._checkTimer) {
      clearInterval(this._checkTimer);
      this._checkTimer = null;
    }
    logger.info('Health check service stopped');
  }

  async _runCheck(component) {
    const startTime = Date.now();
    let result;

    try {
      const checkPromise = component.checkFn();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timed out')), component.timeout),
      );

      await Promise.race([checkPromise, timeoutPromise]);

      component.status = ComponentStatus.HEALTHY;
      component.lastError = null;
      component.consecutiveFailures = 0;

      result = {
        status: ComponentStatus.HEALTHY,
        responseTime: Date.now() - startTime,
        timestamp: Date.now(),
      };
    } catch (err) {
      component.consecutiveFailures++;
      component.lastError = err.message;

      if (component.consecutiveFailures >= 3) {
        component.status = ComponentStatus.UNHEALTHY;
      } else {
        component.status = ComponentStatus.DEGRADED;
      }

      result = {
        status: component.status,
        error: err.message,
        responseTime: Date.now() - startTime,
        consecutiveFailures: component.consecutiveFailures,
        timestamp: Date.now(),
      };

      this.emit('componentUnhealthy', {
        name: component.name,
        status: component.status,
        error: err.message,
        critical: component.critical,
        consecutiveFailures: component.consecutiveFailures,
      });

      logger.warn('Component health check failed', {
        name: component.name,
        error: err.message,
        consecutiveFailures: component.consecutiveFailures,
      });
    }

    component.lastCheck = Date.now();

    const history = this._history.get(component.name);
    if (history) {
      history.push(result);
      if (history.length > this._maxHistory) {
        history.splice(0, history.length - this._maxHistory);
      }
    }

    return result;
  }

  _calculateOverallStatus(results) {
    let hasUnhealthy = false;
    let hasDegraded = false;

    for (const [name, result] of Object.entries(results)) {
      const component = this._components.get(name);
      if (result.status === ComponentStatus.UNHEALTHY && component && component.critical) {
        return ComponentStatus.UNHEALTHY;
      }
      if (result.status === ComponentStatus.UNHEALTHY) {hasUnhealthy = true;}
      if (result.status === ComponentStatus.DEGRADED) {hasDegraded = true;}
    }

    if (hasUnhealthy) {return ComponentStatus.DEGRADED;}
    if (hasDegraded) {return ComponentStatus.DEGRADED;}
    return ComponentStatus.HEALTHY;
  }
}

module.exports = { HealthCheckService, ComponentStatus };
