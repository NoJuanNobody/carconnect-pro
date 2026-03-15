'use strict';

const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'performance-middleware' },
  transports: [
    new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' }),
  ],
});

/**
 * Creates Express middleware that tracks response time for all API endpoints.
 *
 * @param {PerformanceMonitor} monitor - The performance monitor instance
 * @returns {Function} Express middleware
 */
function performanceMiddleware(monitor) {
  if (!monitor || !monitor.collector) {
    throw new Error('PerformanceMonitor instance is required');
  }

  return (req, res, next) => {
    const start = process.hrtime.bigint();
    const endpoint = req.originalUrl || req.url;
    const method = req.method;

    const originalEnd = res.end;
    res.end = function (...args) {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1e6;
      const statusCode = res.statusCode;

      monitor.recordResponseTime(endpoint, method, durationMs, statusCode);

      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);

      logger.debug('Request completed', {
        endpoint,
        method,
        statusCode,
        durationMs: durationMs.toFixed(2),
      });

      originalEnd.apply(this, args);
    };

    next();
  };
}

/**
 * Creates a metrics endpoint handler
 *
 * @param {PerformanceMonitor} monitor - The performance monitor instance
 * @returns {Function} Express route handler
 */
function metricsEndpoint(monitor) {
  if (!monitor) {
    throw new Error('PerformanceMonitor instance is required');
  }

  return (req, res) => {
    const dashboard = monitor.getDashboardData();
    const alerts = monitor.getAlerts(parseInt(req.query.alertLimit, 10) || 50);

    res.json({
      timestamp: new Date().toISOString(),
      metrics: dashboard,
      alerts,
      thresholds: monitor.getThresholds(),
    });
  };
}

module.exports = {
  performanceMiddleware,
  metricsEndpoint,
};
