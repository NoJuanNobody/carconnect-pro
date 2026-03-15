'use strict';

const MetricsCollector = require('../../src/utils/metrics-collector');
const PerformanceMonitor = require('../../src/monitoring/performance-monitor');
const { performanceMiddleware, metricsEndpoint } = require('../../src/middleware/performance-middleware');

describe('MetricsCollector', () => {
  let collector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  afterEach(() => {
    collector.stop();
  });

  test('should record timing metrics', () => {
    collector.timing('api.response_time', 50);
    collector.timing('api.response_time', 100);
    collector.timing('api.response_time', 150);

    const stats = collector.getStats('api.response_time');
    expect(stats).not.toBeNull();
    expect(stats.count).toBe(3);
    expect(stats.avg).toBe(100);
    expect(stats.min).toBe(50);
    expect(stats.max).toBe(150);
  });

  test('should record counter metrics', () => {
    collector.increment('requests.count');
    collector.increment('requests.count');
    collector.increment('requests.count', 5);

    const stats = collector.getStats('requests.count');
    expect(stats.count).toBe(3);
    expect(stats.sum).toBe(7);
  });

  test('should record gauge metrics', () => {
    collector.gauge('system.memory', 75.5);
    collector.gauge('system.memory', 80.2);

    const stats = collector.getStats('system.memory');
    expect(stats.last).toBe(80.2);
  });

  test('should calculate p95 and p99 correctly', () => {
    for (let i = 1; i <= 100; i++) {
      collector.timing('latency', i);
    }

    const stats = collector.getStats('latency');
    expect(stats.p95).toBeGreaterThanOrEqual(95);
    expect(stats.p99).toBeGreaterThanOrEqual(99);
  });

  test('should start and stop timer', () => {
    const stop = collector.startTimer('operation.duration');
    const duration = stop();
    expect(duration).toBeGreaterThanOrEqual(0);

    const stats = collector.getStats('operation.duration');
    expect(stats).not.toBeNull();
    expect(stats.count).toBe(1);
  });

  test('should return null for unknown metrics', () => {
    expect(collector.getStats('nonexistent')).toBeNull();
  });

  test('should list all metric names', () => {
    collector.timing('a', 1);
    collector.timing('b', 2);
    collector.gauge('c', 3);

    const names = collector.getMetricNames();
    expect(names).toEqual(expect.arrayContaining(['a', 'b', 'c']));
  });

  test('should get all stats', () => {
    collector.timing('x', 10);
    collector.gauge('y', 20);

    const all = collector.getAllStats();
    expect(all).toHaveProperty('x');
    expect(all).toHaveProperty('y');
  });

  test('should reset specific metric', () => {
    collector.timing('temp', 100);
    collector.reset('temp');
    expect(collector.getStats('temp')).toBeNull();
  });

  test('should reset all metrics', () => {
    collector.timing('a', 1);
    collector.gauge('b', 2);
    collector.resetAll();
    expect(collector.getMetricNames()).toHaveLength(0);
  });

  test('should emit metric events', () => {
    const handler = jest.fn();
    collector.on('metric', handler);
    collector.timing('test', 42);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'test', value: 42, type: 'timing' }),
    );
  });

  test('should start and stop flush timer', () => {
    collector.start();
    expect(collector._started).toBe(true);
    collector.stop();
    expect(collector._started).toBe(false);
  });
});

describe('PerformanceMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({ monitorInterval: 60000 });
  });

  afterEach(() => {
    monitor.stop();
  });

  test('should record API response times', () => {
    monitor.recordResponseTime('/api/test', 'GET', 150, 200);
    const stats = monitor.collector.getStats('api.response_time');
    expect(stats).not.toBeNull();
    expect(stats.count).toBe(1);
    expect(stats.avg).toBe(150);
  });

  test('should record safety-critical operation latency', () => {
    monitor.recordSafetyLatency('brake_check', 30);
    const stats = monitor.collector.getStats('safety.operation_latency');
    expect(stats.avg).toBe(30);
  });

  test('should alert when safety latency exceeds 100ms threshold', (done) => {
    monitor.on('alert', (alert) => {
      expect(alert.level).toBe('critical');
      expect(alert.metric).toBe('safety.operation_latency');
      done();
    });
    monitor.recordSafetyLatency('slow_operation', 150);
  });

  test('should record audio switch time', () => {
    monitor.recordAudioSwitchTime('fm', 'bluetooth', 250);
    const stats = monitor.collector.getStats('audio.switch_time');
    expect(stats.avg).toBe(250);
  });

  test('should alert when audio switch exceeds 500ms threshold', (done) => {
    monitor.on('alert', (alert) => {
      expect(alert.level).toBe('critical');
      expect(alert.metric).toBe('audio.switch_time');
      done();
    });
    monitor.recordAudioSwitchTime('fm', 'usb', 600);
  });

  test('should record CAN bus message latency', () => {
    monitor.recordCanLatency('speed', 10);
    const stats = monitor.collector.getStats('can.message_latency');
    expect(stats.avg).toBe(10);
  });

  test('should alert when CAN latency exceeds 50ms threshold', (done) => {
    monitor.on('alert', (alert) => {
      expect(alert.level).toBe('critical');
      expect(alert.metric).toBe('can.message_latency');
      done();
    });
    monitor.recordCanLatency('engine_data', 60);
  });

  test('should record GPS update frequency', () => {
    monitor.recordGpsUpdate(1.0);
    const stats = monitor.collector.getStats('gps.update_frequency');
    expect(stats.last).toBe(1.0);
  });

  test('should provide dashboard data', () => {
    monitor.recordResponseTime('/api/test', 'GET', 50, 200);
    monitor.recordSafetyLatency('check', 20);

    const dashboard = monitor.getDashboardData();
    expect(dashboard).toHaveProperty(['api.response_time']);
    expect(dashboard['api.response_time'].status).toBe('healthy');
  });

  test('should detect performance regression', () => {
    monitor.setBaseline('api.response_time', { avg: 50 });

    // Record values that are >20% higher than baseline
    monitor.recordResponseTime('/test', 'GET', 100, 200);
    monitor.recordResponseTime('/test', 'GET', 120, 200);

    const result = monitor.checkRegression('api.response_time');
    expect(result).not.toBeNull();
    expect(result.regressed).toBe(true);
    expect(result.degradation).toBeGreaterThan(20);
  });

  test('should not detect regression when within threshold', () => {
    monitor.setBaseline('api.response_time', { avg: 50 });
    monitor.recordResponseTime('/test', 'GET', 55, 200);

    const result = monitor.checkRegression('api.response_time');
    expect(result.regressed).toBe(false);
  });

  test('should track and return alerts', () => {
    monitor.recordSafetyLatency('op', 200); // exceeds 100ms critical
    const alerts = monitor.getAlerts();
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts[0].metric).toBe('safety.operation_latency');
  });

  test('should clear alerts', () => {
    monitor.recordSafetyLatency('op', 200);
    monitor.clearAlerts();
    expect(monitor.getAlerts()).toHaveLength(0);
  });

  test('should manage thresholds', () => {
    const thresholds = monitor.getThresholds();
    expect(thresholds).toHaveProperty(['api.response_time']);

    monitor.setThreshold('custom.metric', { warn: 10, critical: 20, unit: 'ms' });
    expect(monitor.getThresholds()['custom.metric']).toBeDefined();
  });

  test('should start and stop', () => {
    monitor.start();
    expect(monitor._started).toBe(true);
    monitor.stop();
    expect(monitor._started).toBe(false);
  });
});

describe('performanceMiddleware', () => {
  let monitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({ monitorInterval: 60000 });
  });

  afterEach(() => {
    monitor.stop();
  });

  test('should throw if no monitor provided', () => {
    expect(() => performanceMiddleware(null)).toThrow('PerformanceMonitor instance is required');
  });

  test('should track request response time', (done) => {
    const middleware = performanceMiddleware(monitor);

    const req = { originalUrl: '/api/test', method: 'GET' };
    const res = {
      statusCode: 200,
      setHeader: jest.fn(),
      end: function () {
        const stats = monitor.collector.getStats('api.response_time');
        expect(stats).not.toBeNull();
        expect(stats.count).toBe(1);
        expect(res.setHeader).toHaveBeenCalledWith(
          'X-Response-Time',
          expect.stringMatching(/^\d+\.\d+ms$/),
        );
        done();
      },
    };

    middleware(req, res, () => {
      res.end();
    });
  });
});

describe('metricsEndpoint', () => {
  let monitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({ monitorInterval: 60000 });
  });

  afterEach(() => {
    monitor.stop();
  });

  test('should throw if no monitor provided', () => {
    expect(() => metricsEndpoint(null)).toThrow('PerformanceMonitor instance is required');
  });

  test('should return dashboard data', () => {
    const handler = metricsEndpoint(monitor);
    monitor.recordResponseTime('/api/test', 'GET', 50, 200);

    const req = { query: {} };
    const res = {
      json: jest.fn(),
    };

    handler(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        metrics: expect.any(Object),
        alerts: expect.any(Array),
        thresholds: expect.any(Object),
        timestamp: expect.any(String),
      }),
    );
  });
});
