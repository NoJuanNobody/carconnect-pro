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
  defaultMeta: { service: 'safe-mode' },
  transports: [
    new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' }),
  ],
});

const SafeModeState = {
  NORMAL: 'normal',
  ACTIVATING: 'activating',
  ACTIVE: 'active',
  DEACTIVATING: 'deactivating',
};

/**
 * SafeMode - Manages safe mode activation/deactivation for critical failures
 * Ensures critical safety functions are always maintained
 */
class SafeMode extends EventEmitter {
  constructor(options = {}) {
    super();
    this._state = SafeModeState.NORMAL;
    this._activationLog = [];
    this._safetyFunctions = new Map();
    this._activationReason = null;
    this._activatedAt = null;
    this._activationId = null;
    this._criticalThreshold = options.criticalThreshold || 3;
    this._criticalFaultCount = 0;
    this._autoActivate = options.autoActivate !== false;
    this._deactivationChecks = [];
  }

  /**
   * Get current safe mode state
   */
  getState() {
    return this._state;
  }

  /**
   * Check if safe mode is active
   */
  isActive() {
    return this._state === SafeModeState.ACTIVE;
  }

  /**
   * Register a critical safety function that must always remain operational
   */
  registerSafetyFunction(name, fn) {
    this._safetyFunctions.set(name, {
      name,
      fn,
      operational: true,
      lastCheck: null,
    });
  }

  /**
   * Register a check that must pass before deactivation is allowed
   */
  registerDeactivationCheck(name, checkFn) {
    this._deactivationChecks.push({ name, checkFn });
  }

  /**
   * Activate safe mode
   */
  async activate(reason = 'Manual activation') {
    if (this._state === SafeModeState.ACTIVE) {
      logger.warn('Safe mode already active');
      return false;
    }

    this._state = SafeModeState.ACTIVATING;
    this._activationReason = reason;
    this._activationId = uuidv4();
    this.emit('activating', { reason, id: this._activationId });
    logger.warn('Safe mode activating', { reason });

    // Verify all critical safety functions are operational
    await this._verifySafetyFunctions();

    this._state = SafeModeState.ACTIVE;
    this._activatedAt = Date.now();

    const logEntry = {
      id: this._activationId,
      action: 'activated',
      reason,
      timestamp: this._activatedAt,
    };
    this._activationLog.push(logEntry);

    this.emit('activated', {
      id: this._activationId,
      reason,
      timestamp: this._activatedAt,
    });
    logger.warn('Safe mode activated', { reason, id: this._activationId });

    return true;
  }

  /**
   * Deactivate safe mode (with safety checks)
   */
  async deactivate(reason = 'Manual deactivation') {
    if (this._state !== SafeModeState.ACTIVE) {
      logger.warn('Safe mode is not active');
      return false;
    }

    this._state = SafeModeState.DEACTIVATING;
    this.emit('deactivating', { reason });

    // Run deactivation checks
    const checkResults = await this._runDeactivationChecks();
    const allPassed = checkResults.every((r) => r.passed);

    if (!allPassed) {
      this._state = SafeModeState.ACTIVE;
      const failedChecks = checkResults.filter((r) => !r.passed).map((r) => r.name);
      logger.warn('Safe mode deactivation denied - checks failed', { failedChecks });
      this.emit('deactivationDenied', { failedChecks });
      return false;
    }

    this._state = SafeModeState.NORMAL;
    this._criticalFaultCount = 0;

    const logEntry = {
      id: this._activationId,
      action: 'deactivated',
      reason,
      timestamp: Date.now(),
      duration: Date.now() - this._activatedAt,
    };
    this._activationLog.push(logEntry);

    this._activationReason = null;
    this._activatedAt = null;
    this._activationId = null;

    this.emit('deactivated', { reason, duration: logEntry.duration });
    logger.info('Safe mode deactivated', { reason });

    return true;
  }

  /**
   * Report a critical fault (may auto-activate safe mode)
   */
  async reportCriticalFault(source, details = {}) {
    this._criticalFaultCount++;

    logger.error('Critical fault reported', {
      source,
      count: this._criticalFaultCount,
      threshold: this._criticalThreshold,
    });

    this.emit('criticalFault', {
      source,
      details,
      count: this._criticalFaultCount,
    });

    if (this._autoActivate && this._criticalFaultCount >= this._criticalThreshold) {
      await this.activate(
        `Auto-activated: ${this._criticalFaultCount} critical faults (source: ${source})`,
      );
    }
  }

  /**
   * Check if a safety function is operational
   */
  async checkSafetyFunction(name) {
    const sf = this._safetyFunctions.get(name);
    if (!sf) return null;

    try {
      await sf.fn();
      sf.operational = true;
      sf.lastCheck = Date.now();
      return true;
    } catch (err) {
      sf.operational = false;
      sf.lastCheck = Date.now();
      logger.error('Safety function check failed', { name, error: err.message });
      return false;
    }
  }

  /**
   * Get activation log
   */
  getActivationLog() {
    return this._activationLog.slice();
  }

  /**
   * Get current status
   */
  getStatus() {
    const safetyFunctions = {};
    for (const [name, sf] of this._safetyFunctions) {
      safetyFunctions[name] = {
        operational: sf.operational,
        lastCheck: sf.lastCheck,
      };
    }

    return {
      state: this._state,
      isActive: this.isActive(),
      activationReason: this._activationReason,
      activatedAt: this._activatedAt,
      criticalFaultCount: this._criticalFaultCount,
      criticalThreshold: this._criticalThreshold,
      safetyFunctions,
    };
  }

  /**
   * Reset critical fault counter
   */
  resetFaultCount() {
    this._criticalFaultCount = 0;
  }

  async _verifySafetyFunctions() {
    for (const [name, sf] of this._safetyFunctions) {
      try {
        await sf.fn();
        sf.operational = true;
        sf.lastCheck = Date.now();
      } catch (err) {
        sf.operational = false;
        sf.lastCheck = Date.now();
        logger.error('Critical safety function not operational during safe mode activation', {
          name,
          error: err.message,
        });
        this.emit('safetyFunctionFailure', { name, error: err.message });
      }
    }
  }

  async _runDeactivationChecks() {
    const results = [];
    for (const check of this._deactivationChecks) {
      try {
        const passed = await check.checkFn();
        results.push({ name: check.name, passed: !!passed });
      } catch (err) {
        results.push({ name: check.name, passed: false, error: err.message });
      }
    }
    return results;
  }
}

module.exports = { SafeMode, SafeModeState };
