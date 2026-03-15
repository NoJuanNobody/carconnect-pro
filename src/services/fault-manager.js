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
  defaultMeta: { service: 'fault-manager' },
  transports: [
    new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' }),
  ],
});

const FaultSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const FaultState = {
  ACTIVE: 'active',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
};

/**
 * FaultManager - Manages fault detection, logging, and response coordination
 */
class FaultManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this._faults = new Map();
    this._faultLog = [];
    this._maxLogSize = options.maxLogSize || 5000;
    this._handlers = new Map();
    this._started = false;
  }

  /**
   * Register a fault handler for a specific fault type
   */
  registerHandler(faultType, handler) {
    if (!this._handlers.has(faultType)) {
      this._handlers.set(faultType, []);
    }
    this._handlers.get(faultType).push(handler);
  }

  /**
   * Report a new fault
   */
  async reportFault(faultType, details = {}) {
    const fault = {
      id: uuidv4(),
      type: faultType,
      severity: details.severity || FaultSeverity.MEDIUM,
      state: FaultState.ACTIVE,
      component: details.component || 'unknown',
      message: details.message || '',
      data: details.data || {},
      timestamp: Date.now(),
      resolvedAt: null,
      diagnostics: null,
    };

    this._faults.set(fault.id, fault);
    this._addToLog(fault);

    this.emit('fault', fault);
    logger.error('Fault reported', {
      id: fault.id,
      type: faultType,
      severity: fault.severity,
      component: fault.component,
    });

    await this._executeHandlers(fault);

    return fault.id;
  }

  /**
   * Acknowledge a fault
   */
  acknowledgeFault(faultId) {
    const fault = this._faults.get(faultId);
    if (!fault) {return false;}
    fault.state = FaultState.ACKNOWLEDGED;
    this.emit('faultAcknowledged', fault);
    return true;
  }

  /**
   * Resolve a fault
   */
  resolveFault(faultId, resolution = {}) {
    const fault = this._faults.get(faultId);
    if (!fault) {return false;}
    fault.state = FaultState.RESOLVED;
    fault.resolvedAt = Date.now();
    fault.resolution = resolution;
    this.emit('faultResolved', fault);
    logger.info('Fault resolved', { id: faultId, type: fault.type });
    return true;
  }

  /**
   * Get a specific fault
   */
  getFault(faultId) {
    return this._faults.get(faultId) || null;
  }

  /**
   * Get all active faults
   */
  getActiveFaults() {
    const active = [];
    for (const fault of this._faults.values()) {
      if (fault.state === FaultState.ACTIVE) {
        active.push(fault);
      }
    }
    return active;
  }

  /**
   * Get faults by severity
   */
  getFaultsBySeverity(severity) {
    const result = [];
    for (const fault of this._faults.values()) {
      if (fault.severity === severity && fault.state !== FaultState.RESOLVED) {
        result.push(fault);
      }
    }
    return result;
  }

  /**
   * Get faults by component
   */
  getFaultsByComponent(component) {
    const result = [];
    for (const fault of this._faults.values()) {
      if (fault.component === component) {
        result.push(fault);
      }
    }
    return result;
  }

  /**
   * Generate a diagnostic report
   */
  getDiagnosticReport() {
    const activeFaults = this.getActiveFaults();
    const criticalFaults = this.getFaultsBySeverity(FaultSeverity.CRITICAL);

    const componentSummary = {};
    for (const fault of this._faults.values()) {
      if (!componentSummary[fault.component]) {
        componentSummary[fault.component] = { total: 0, active: 0, resolved: 0 };
      }
      componentSummary[fault.component].total++;
      if (fault.state === FaultState.RESOLVED) {
        componentSummary[fault.component].resolved++;
      } else {
        componentSummary[fault.component].active++;
      }
    }

    return {
      timestamp: Date.now(),
      totalFaults: this._faults.size,
      activeFaults: activeFaults.length,
      criticalFaults: criticalFaults.length,
      componentSummary,
      recentFaults: this._faultLog.slice(-20),
    };
  }

  /**
   * Get fault log
   */
  getFaultLog(limit = 100) {
    return this._faultLog.slice(-limit);
  }

  /**
   * Clear resolved faults
   */
  clearResolvedFaults() {
    for (const [id, fault] of this._faults) {
      if (fault.state === FaultState.RESOLVED) {
        this._faults.delete(id);
      }
    }
  }

  /**
   * Check if there are any critical active faults
   */
  hasCriticalFaults() {
    for (const fault of this._faults.values()) {
      if (fault.severity === FaultSeverity.CRITICAL && fault.state === FaultState.ACTIVE) {
        return true;
      }
    }
    return false;
  }

  async _executeHandlers(fault) {
    const handlers = this._handlers.get(fault.type) || [];
    const globalHandlers = this._handlers.get('*') || [];
    const allHandlers = [...handlers, ...globalHandlers];

    for (const handler of allHandlers) {
      try {
        await handler(fault);
      } catch (err) {
        logger.error('Fault handler error', {
          faultId: fault.id,
          error: err.message,
        });
      }
    }
  }

  _addToLog(fault) {
    this._faultLog.push({
      id: fault.id,
      type: fault.type,
      severity: fault.severity,
      component: fault.component,
      message: fault.message,
      timestamp: fault.timestamp,
    });
    if (this._faultLog.length > this._maxLogSize) {
      this._faultLog = this._faultLog.slice(-this._maxLogSize);
    }
  }
}

module.exports = { FaultManager, FaultSeverity, FaultState };
