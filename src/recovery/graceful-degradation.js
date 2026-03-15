'use strict';

const { EventEmitter } = require('events');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'graceful-degradation' },
  transports: [
    new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' }),
  ],
});

const DegradationLevel = {
  NORMAL: 'normal',
  REDUCED: 'reduced',
  MINIMAL: 'minimal',
  EMERGENCY: 'emergency',
};

/**
 * Feature categories for degradation management
 */
const FeatureCategory = {
  CRITICAL: 'critical',     // Safety functions - never disabled
  IMPORTANT: 'important',   // Core functionality - disabled last
  STANDARD: 'standard',     // Normal features - disabled under stress
  OPTIONAL: 'optional',     // Nice-to-have - disabled first
};

/**
 * GracefulDegradation - Manages system degradation when failures occur
 * Ensures critical safety functions are always maintained
 */
class GracefulDegradation extends EventEmitter {
  constructor(options = {}) {
    super();
    this._level = DegradationLevel.NORMAL;
    this._features = new Map();
    this._disabledFeatures = new Set();
    this._notifications = [];
    this._maxNotifications = options.maxNotifications || 200;
    this._recoveryHandlers = new Map();
  }

  /**
   * Register a feature with its category
   */
  registerFeature(name, category, options = {}) {
    this._features.set(name, {
      name,
      category,
      enabled: true,
      fallback: options.fallback || null,
      description: options.description || '',
    });
  }

  /**
   * Get current degradation level
   */
  getLevel() {
    return this._level;
  }

  /**
   * Set degradation level and disable features accordingly
   */
  setLevel(level) {
    const previousLevel = this._level;
    this._level = level;

    this._applyDegradation(level);

    this.emit('levelChanged', { previous: previousLevel, current: level });
    this._addNotification(
      `System degradation level changed from ${previousLevel} to ${level}`,
      level === DegradationLevel.EMERGENCY ? 'critical' : 'warning',
    );
    logger.warn('Degradation level changed', { previous: previousLevel, current: level });
  }

  /**
   * Check if a feature is currently available
   */
  isFeatureAvailable(name) {
    const feature = this._features.get(name);
    if (!feature) return false;
    return feature.enabled;
  }

  /**
   * Get fallback for a disabled feature
   */
  getFeatureFallback(name) {
    const feature = this._features.get(name);
    if (!feature) return null;
    return feature.fallback;
  }

  /**
   * Disable a specific feature
   */
  disableFeature(name) {
    const feature = this._features.get(name);
    if (!feature) return false;

    if (feature.category === FeatureCategory.CRITICAL) {
      logger.warn('Attempted to disable critical feature - denied', { feature: name });
      return false;
    }

    feature.enabled = false;
    this._disabledFeatures.add(name);
    this.emit('featureDisabled', { name, category: feature.category });
    this._addNotification(
      `Feature "${name}" has been disabled due to system limitations`,
      'info',
    );
    return true;
  }

  /**
   * Enable a specific feature
   */
  enableFeature(name) {
    const feature = this._features.get(name);
    if (!feature) return false;

    feature.enabled = true;
    this._disabledFeatures.delete(name);
    this.emit('featureEnabled', { name, category: feature.category });
    return true;
  }

  /**
   * Get all disabled features
   */
  getDisabledFeatures() {
    return Array.from(this._disabledFeatures);
  }

  /**
   * Get features by category
   */
  getFeaturesByCategory(category) {
    const result = [];
    for (const feature of this._features.values()) {
      if (feature.category === category) {
        result.push({ ...feature });
      }
    }
    return result;
  }

  /**
   * Get user notifications about system limitations
   */
  getNotifications(limit = 20) {
    return this._notifications.slice(-limit);
  }

  /**
   * Clear notifications
   */
  clearNotifications() {
    this._notifications = [];
  }

  /**
   * Register a recovery handler
   */
  registerRecoveryHandler(level, handler) {
    if (!this._recoveryHandlers.has(level)) {
      this._recoveryHandlers.set(level, []);
    }
    this._recoveryHandlers.get(level).push(handler);
  }

  /**
   * Attempt recovery to a better degradation level
   */
  async attemptRecovery() {
    const handlers = this._recoveryHandlers.get(this._level) || [];
    let recovered = true;

    for (const handler of handlers) {
      try {
        const result = await handler();
        if (!result) recovered = false;
      } catch (err) {
        logger.error('Recovery handler failed', { error: err.message });
        recovered = false;
      }
    }

    if (recovered && this._level !== DegradationLevel.NORMAL) {
      const levels = [
        DegradationLevel.EMERGENCY,
        DegradationLevel.MINIMAL,
        DegradationLevel.REDUCED,
        DegradationLevel.NORMAL,
      ];
      const currentIdx = levels.indexOf(this._level);
      if (currentIdx < levels.length - 1) {
        this.setLevel(levels[currentIdx + 1]);
      }
    }

    return recovered;
  }

  /**
   * Get status summary
   */
  getStatus() {
    return {
      level: this._level,
      disabledFeatures: Array.from(this._disabledFeatures),
      totalFeatures: this._features.size,
      enabledFeatures: this._features.size - this._disabledFeatures.size,
      notifications: this._notifications.slice(-5),
    };
  }

  _applyDegradation(level) {
    switch (level) {
      case DegradationLevel.NORMAL:
        this._enableAll();
        break;
      case DegradationLevel.REDUCED:
        this._disableByCategory(FeatureCategory.OPTIONAL);
        break;
      case DegradationLevel.MINIMAL:
        this._disableByCategory(FeatureCategory.OPTIONAL);
        this._disableByCategory(FeatureCategory.STANDARD);
        break;
      case DegradationLevel.EMERGENCY:
        this._disableByCategory(FeatureCategory.OPTIONAL);
        this._disableByCategory(FeatureCategory.STANDARD);
        this._disableByCategory(FeatureCategory.IMPORTANT);
        break;
    }
  }

  _enableAll() {
    for (const [name, feature] of this._features) {
      feature.enabled = true;
    }
    this._disabledFeatures.clear();
  }

  _disableByCategory(category) {
    for (const [name, feature] of this._features) {
      if (feature.category === category) {
        feature.enabled = false;
        this._disabledFeatures.add(name);
      }
    }
  }

  _addNotification(message, severity = 'info') {
    this._notifications.push({
      message,
      severity,
      timestamp: Date.now(),
    });
    if (this._notifications.length > this._maxNotifications) {
      this._notifications = this._notifications.slice(-this._maxNotifications);
    }
    this.emit('notification', { message, severity });
  }
}

module.exports = { GracefulDegradation, DegradationLevel, FeatureCategory };
