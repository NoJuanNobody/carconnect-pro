'use strict';

const { EventEmitter } = require('events');
const winston = require('winston');
const MetricsCollector = require('../utils/metrics-collector');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'performance-monitor' },
  transports: [
    new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' }),
  ],
});

/**
 * Default performance thresholds for automotive systems
 */
const DEFAULT_THRESHOLDS = {
  'api.response_time': { warn: 200, critical: 500, unit: 'ms' },
  'safety.operation_latency': { warn: 50, critical: 100, unit: 'ms' },
  'audio.switch_time': { warn: 300, critical: 500, unit: 'ms' },
  'can.message_latency': { warn: 25, critical: 50, unit: 'ms' },
  'gps.update_frequency': { warn: 0.5, critical: 0.2, unit: 'hz', inverted: true },
  'system.memory_usage': { warn: 75, critical: 90, unit: 'percent' },
  'system.cpu_usage': { warn: 80, critical: 95, unit: 'percent' },
};

/**
 * PerformanceMonitor - Monitors system performance against thresholds
 */
class PerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this._collector = options.collector || new MetricsCollector();
    this._thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };
    this._alerts = [];
    this._maxAlerts = options.maxAlerts || 1000;
    this._monitorInterval = options.monitorInterval || 5000;
    this._monitorTimer = null;
    this._started = false;
    this._regressionBaselines = new Map();
    this._regressionThreshold = options.regressionThreshold || 0.2; // 20% degradation

    this._collector.on('metric', (data) => this._checkThreshold(data));
  }

  get collector() {
    return this._collector;
  }

  start() {
    if (this._started) return;
    this._started = true;
    this._collector.start();
    this._monitorTimer = setInterval(() => this._collectSystemMetrics(), this._monitorInterval);
    if (this._monitorTimer.unref) this._monitorTimer.unref();
    logger.info('Performance monitor started');
  }

  stop() {
    this._started = false;
    this._collector.stop();
    if (this._monitorTimer) {
      clearInterval(this._monitorTimer);
      this._monitorTimer = null;
    }
    logger.info('Performance monitor stopped');
  }

  /**
   * Record a timing for an API response
   */
  recordResponseTime(endpoint, method, durationMs, statusCode) {
    this._collector.timing('api.response_time', durationMs, {
      endpoint,
      method,
      statusCode,
    });
  }

  /**
   * Record safety-critical operation latency
   */
  recordSafetyLatency(operation, durationMs) {
    this._collector.timing('safety.operation_latency', durationMs, {
      operation,
    });
  }

  /**
   * Record audio switching time
   */
  recordAudioSwitchTime(fromSource, toSource, durationMs) {
    this._collector.timing('audio.switch_time', durationMs, {
      fromSource,
      toSource,
    });
  }

  /**
   * Record CAN bus message processing latency
   */
  recordCanLatency(messageType, durationMs) {
    this._collector.timing('can.message_latency', durationMs, {
      messageType,
    });
  }

  /**
   * Record GPS update
   */
  recordGpsUpdate(frequencyHz) {
    this._collector.gauge('gps.update_frequency', frequencyHz);
  }

  /**
   * Set a performance baseline for regression detection
   */
  setBaseline(metricName, stats) {
    this._regressionBaselines.set(metricName, stats);
  }

  /**
   * Check for performance regression against baseline
   */
  checkRegression(metricName) {
    const baseline = this._regressionBaselines.get(metricName);
    const current = this._collector.getStats(metricName);
    if (!baseline || !current) return null;

    const baselineAvg = baseline.avg;
    const currentAvg = current.avg;
    if (baselineAvg === 0) return null;

    const degradation = (currentAvg - baselineAvg) / baselineAvg;
    const regressed = degradation > this._regressionThreshold;

    if (regressed) {
      const alert = {
        type: 'regression',
        metric: metricName,
        baselineAvg,
        currentAvg,
        degradation: Math.round(degradation * 100),
        timestamp: Date.now(),
      };
      this._addAlert(alert);
      this.emit('regression', alert);
      logger.warn('Performance regression detected', alert);
    }

    return {
      regressed,
      degradation: Math.round(degradation * 100),
      baselineAvg,
      currentAvg,
    };
  }

  /**
   * Get dashboard data for all metrics
   */
  getDashboardData() {
    const allStats = this._collector.getAllStats();
    const dashboard = {};

    for (const [name, stats] of Object.entries(allStats)) {
      const threshold = this._thresholds[name];
      let status = 'healthy';
      if (threshold) {
        const value = threshold.inverted ? stats.last : stats.avg;
        if (threshold.inverted) {
          if (value <= threshold.critical) status = 'critical';
          else if (value <= threshold.warn) status = 'warning';
        } else {
          if (value >= threshold.critical) status = 'critical';
          else if (value >= threshold.warn) status = 'warning';
        }
      }
      dashboard[name] = {
        ...stats,
        status,
        threshold: threshold || null,
      };
    }

    return dashboard;
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit = 50) {
    return this._alerts.slice(-limit);
  }

  /**
   * Clear alerts
   */
  clearAlerts() {
    this._alerts = [];
  }

  /**
   * Get threshold configuration
   */
  getThresholds() {
    return { ...this._thresholds };
  }

  /**
   * Update a threshold
   */
  setThreshold(metricName, threshold) {
    this._thresholds[metricName] = threshold;
  }

  _checkThreshold(data) {
    const { name, value } = data;
    const threshold = this._thresholds[name];
    if (!threshold) return;

    let level = null;
    if (threshold.inverted) {
      if (value <= threshold.critical) level = 'critical';
      else if (value <= threshold.warn) level = 'warning';
    } else {
      if (value >= threshold.critical) level = 'critical';
      else if (value >= threshold.warn) level = 'warning';
    }

    if (level) {
      const alert = {
        type: 'threshold',
        level,
        metric: name,
        value,
        threshold: level === 'critical' ? threshold.critical : threshold.warn,
        unit: threshold.unit,
        timestamp: Date.now(),
      };
      this._addAlert(alert);
      this.emit('alert', alert);

      if (level === 'critical') {
        logger.error('Critical threshold violation', alert);
      } else {
        logger.warn('Threshold warning', alert);
      }
    }
  }

  _addAlert(alert) {
    this._alerts.push(alert);
    if (this._alerts.length > this._maxAlerts) {
      this._alerts = this._alerts.slice(-this._maxAlerts);
    }
  }

  _collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const usedPercent = (memUsage.rss / totalMem) * 100;
    this._collector.gauge('system.memory_usage', usedPercent);
    this._collector.gauge('system.memory_rss', memUsage.rss);
    this._collector.gauge('system.memory_heap_used', memUsage.heapUsed);
    this._collector.gauge('system.memory_heap_total', memUsage.heapTotal);

    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1e6;
    this._collector.gauge('system.cpu_usage', cpuPercent);
  }
}

module.exports = PerformanceMonitor;
