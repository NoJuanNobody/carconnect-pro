'use strict';

const { v4: uuidv4 } = require('uuid');
const { EventEmitter } = require('events');

/**
 * MetricsCollector - Collects and aggregates system metrics
 * Supports timing, counters, gauges with statistical aggregation
 */
class MetricsCollector extends EventEmitter {
  constructor(options = {}) {
    super();
    this._metrics = new Map();
    this._timers = new Map();
    this._retentionMs = options.retentionMs || 60 * 60 * 1000; // 1 hour
    this._flushInterval = options.flushInterval || 30000; // 30s
    this._flushTimer = null;
    this._started = false;
  }

  start() {
    if (this._started) return;
    this._started = true;
    this._flushTimer = setInterval(() => this._flush(), this._flushInterval);
    if (this._flushTimer.unref) this._flushTimer.unref();
  }

  stop() {
    this._started = false;
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = null;
    }
  }

  /**
   * Record a timing metric (in ms)
   */
  timing(name, value, tags = {}) {
    this._record(name, 'timing', value, tags);
  }

  /**
   * Increment a counter
   */
  increment(name, value = 1, tags = {}) {
    this._record(name, 'counter', value, tags);
  }

  /**
   * Set a gauge value
   */
  gauge(name, value, tags = {}) {
    this._record(name, 'gauge', value, tags);
  }

  /**
   * Start a timer, returns a function to stop it
   */
  startTimer(name, tags = {}) {
    const timerId = uuidv4();
    const start = process.hrtime.bigint();
    this._timers.set(timerId, { name, tags, start });
    return () => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1e6;
      this._timers.delete(timerId);
      this.timing(name, durationMs, tags);
      return durationMs;
    };
  }

  /**
   * Get aggregated stats for a metric
   */
  getStats(name) {
    const metric = this._metrics.get(name);
    if (!metric || metric.values.length === 0) {
      return null;
    }
    return this._aggregate(metric);
  }

  /**
   * Get all metric names
   */
  getMetricNames() {
    return Array.from(this._metrics.keys());
  }

  /**
   * Get all metrics with stats
   */
  getAllStats() {
    const result = {};
    for (const [name, metric] of this._metrics) {
      if (metric.values.length > 0) {
        result[name] = this._aggregate(metric);
      }
    }
    return result;
  }

  /**
   * Reset a specific metric
   */
  reset(name) {
    this._metrics.delete(name);
  }

  /**
   * Reset all metrics
   */
  resetAll() {
    this._metrics.clear();
    this._timers.clear();
  }

  _record(name, type, value, tags) {
    if (!this._metrics.has(name)) {
      this._metrics.set(name, {
        type,
        values: [],
        tags: [],
        timestamps: [],
      });
    }
    const metric = this._metrics.get(name);
    const now = Date.now();
    metric.values.push(value);
    metric.tags.push(tags);
    metric.timestamps.push(now);

    this.emit('metric', { name, type, value, tags, timestamp: now });
  }

  _aggregate(metric) {
    const values = metric.values.slice();
    if (values.length === 0) return null;

    const sorted = values.slice().sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length;
    const avg = sum / count;
    const min = sorted[0];
    const max = sorted[count - 1];
    const p95 = this._percentile(sorted, 95);
    const p99 = this._percentile(sorted, 99);
    const last = values[values.length - 1];

    return {
      type: metric.type,
      count,
      sum,
      avg,
      min,
      max,
      p95,
      p99,
      last,
      firstTimestamp: metric.timestamps[0],
      lastTimestamp: metric.timestamps[metric.timestamps.length - 1],
    };
  }

  _percentile(sorted, pct) {
    if (sorted.length === 0) return 0;
    if (sorted.length === 1) return sorted[0];
    const idx = (pct / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    const weight = idx - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  _flush() {
    const cutoff = Date.now() - this._retentionMs;
    for (const [name, metric] of this._metrics) {
      const keepFrom = metric.timestamps.findIndex((t) => t >= cutoff);
      if (keepFrom === -1) {
        this._metrics.delete(name);
      } else if (keepFrom > 0) {
        metric.values = metric.values.slice(keepFrom);
        metric.tags = metric.tags.slice(keepFrom);
        metric.timestamps = metric.timestamps.slice(keepFrom);
      }
    }
    this.emit('flush');
  }
}

module.exports = MetricsCollector;
