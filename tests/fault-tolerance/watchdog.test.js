'use strict';

const SystemWatchdog = require('../../src/watchdog/system-watchdog');

describe('SystemWatchdog', () => {
  let watchdog;

  beforeEach(() => {
    watchdog = new SystemWatchdog({
      defaultTimeout: 100,
      checkInterval: 50,
    });
  });

  afterEach(() => {
    watchdog.stop();
  });

  test('should register components for monitoring', () => {
    const id = watchdog.register('gps-module');
    expect(id).toBeDefined();

    const status = watchdog.getStatus('gps-module');
    expect(status).not.toBeNull();
    expect(status.name).toBe('gps-module');
    expect(status.isResponsive).toBe(true);
  });

  test('should accept pings from components', () => {
    watchdog.register('audio-service');
    const result = watchdog.ping('audio-service');
    expect(result).toBe(true);
  });

  test('should return false for ping from unknown component', () => {
    expect(watchdog.ping('unknown')).toBe(false);
  });

  test('should detect hung components', (done) => {
    watchdog.register('slow-service', { timeout: 50 });

    watchdog.on('hang', (event) => {
      expect(event.name).toBe('slow-service');
      expect(event.elapsed).toBeGreaterThan(50);
      done();
    });

    watchdog.start();
    // Don't ping - let it timeout
  });

  test('should not report hung if component pings in time', (done) => {
    watchdog.register('active-service', { timeout: 200 });

    const hangHandler = jest.fn();
    watchdog.on('hang', hangHandler);

    const pingInterval = setInterval(() => {
      watchdog.ping('active-service');
    }, 30);

    watchdog.start();

    setTimeout(() => {
      clearInterval(pingInterval);
      watchdog.stop();
      expect(hangHandler).not.toHaveBeenCalled();
      done();
    }, 150);
  });

  test('should track hung count', (done) => {
    watchdog.register('stuck', { timeout: 40 });
    watchdog.start();

    setTimeout(() => {
      watchdog.stop();
      const status = watchdog.getStatus('stuck');
      expect(status.hungCount).toBeGreaterThanOrEqual(1);
      done();
    }, 200);
  });

  test('should maintain hang log', (done) => {
    watchdog.register('logtest', { timeout: 40 });
    watchdog.start();

    setTimeout(() => {
      watchdog.stop();
      const log = watchdog.getHangLog();
      expect(log.length).toBeGreaterThanOrEqual(1);
      expect(log[0].name).toBe('logtest');
      done();
    }, 200);
  });

  test('should get all statuses', () => {
    watchdog.register('a');
    watchdog.register('b');

    const statuses = watchdog.getAllStatuses();
    expect(Object.keys(statuses)).toHaveLength(2);
  });

  test('should get unresponsive components', (done) => {
    watchdog.register('responsive', { timeout: 500 });
    watchdog.register('unresponsive', { timeout: 30 });

    watchdog.ping('responsive');

    setTimeout(() => {
      const unresponsive = watchdog.getUnresponsiveComponents();
      expect(unresponsive.length).toBeGreaterThanOrEqual(1);
      expect(unresponsive.some((c) => c.name === 'unresponsive')).toBe(true);
      done();
    }, 50);
  });

  test('should suspend and resume watching', () => {
    watchdog.register('pausable', { timeout: 50 });
    watchdog.suspend('pausable');

    const status = watchdog.getStatus('pausable');
    expect(status.active).toBe(false);

    watchdog.resume('pausable');
    const resumed = watchdog.getStatus('pausable');
    expect(resumed.active).toBe(true);
  });

  test('should unregister component', () => {
    watchdog.register('temp');
    watchdog.unregister('temp');
    expect(watchdog.getStatus('temp')).toBeNull();
  });

  test('should attempt restart of hung component', (done) => {
    const restartFn = jest.fn().mockResolvedValue(undefined);

    watchdog.register('restartable', {
      timeout: 40,
      restartFn,
    });

    watchdog.on('restarted', (event) => {
      expect(event.name).toBe('restartable');
      expect(restartFn).toHaveBeenCalled();
      done();
    });

    watchdog.start();
  });

  test('should handle restart failure', (done) => {
    const restartFn = jest.fn().mockRejectedValue(new Error('restart failed'));

    watchdog.register('broken', {
      timeout: 40,
      restartFn,
    });

    watchdog.on('restartFailed', (event) => {
      expect(event.name).toBe('broken');
      expect(event.error).toBe('restart failed');
      done();
    });

    watchdog.start();
  });

  test('should call onHang callback', (done) => {
    const onHang = jest.fn();
    const wd = new SystemWatchdog({
      defaultTimeout: 40,
      checkInterval: 30,
      onHang,
    });

    wd.register('test');
    wd.start();

    setTimeout(() => {
      wd.stop();
      expect(onHang).toHaveBeenCalled();
      done();
    }, 150);
  });

  test('should register critical components', () => {
    watchdog.register('safety-controller', { critical: true });
    const status = watchdog.getStatus('safety-controller');
    expect(status.critical).toBe(true);
  });

  test('should start and stop', () => {
    watchdog.start();
    expect(watchdog._started).toBe(true);
    watchdog.stop();
    expect(watchdog._started).toBe(false);
  });
});
