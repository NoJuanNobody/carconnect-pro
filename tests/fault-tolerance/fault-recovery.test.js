'use strict';

const { FaultManager, FaultSeverity, FaultState } = require('../../src/services/fault-manager');
const { HealthCheckService, ComponentStatus } = require('../../src/services/health-check');
const { GracefulDegradation, DegradationLevel, FeatureCategory } = require('../../src/recovery/graceful-degradation');
const { ComponentMonitor, ComponentState } = require('../../src/health/component-monitor');

describe('FaultManager', () => {
  let manager;

  beforeEach(() => {
    manager = new FaultManager();
  });

  test('should report a fault and return an id', async () => {
    const id = await manager.reportFault('hardware.failure', {
      severity: FaultSeverity.HIGH,
      component: 'can-bus',
      message: 'CAN bus communication lost',
    });

    expect(id).toBeDefined();
    const fault = manager.getFault(id);
    expect(fault.type).toBe('hardware.failure');
    expect(fault.severity).toBe(FaultSeverity.HIGH);
    expect(fault.state).toBe(FaultState.ACTIVE);
  });

  test('should emit fault event on report', async () => {
    const handler = jest.fn();
    manager.on('fault', handler);

    await manager.reportFault('test.fault', { component: 'test' });
    expect(handler).toHaveBeenCalled();
  });

  test('should acknowledge a fault', async () => {
    const id = await manager.reportFault('test', {});
    expect(manager.acknowledgeFault(id)).toBe(true);
    expect(manager.getFault(id).state).toBe(FaultState.ACKNOWLEDGED);
  });

  test('should resolve a fault', async () => {
    const id = await manager.reportFault('test', {});
    expect(manager.resolveFault(id, { action: 'reset' })).toBe(true);
    expect(manager.getFault(id).state).toBe(FaultState.RESOLVED);
    expect(manager.getFault(id).resolvedAt).not.toBeNull();
  });

  test('should get active faults', async () => {
    await manager.reportFault('a', { component: 'x' });
    const id2 = await manager.reportFault('b', { component: 'y' });
    manager.resolveFault(id2);

    const active = manager.getActiveFaults();
    expect(active).toHaveLength(1);
    expect(active[0].type).toBe('a');
  });

  test('should get faults by severity', async () => {
    await manager.reportFault('low', { severity: FaultSeverity.LOW });
    await manager.reportFault('critical', { severity: FaultSeverity.CRITICAL });

    const critical = manager.getFaultsBySeverity(FaultSeverity.CRITICAL);
    expect(critical).toHaveLength(1);
    expect(critical[0].type).toBe('critical');
  });

  test('should get faults by component', async () => {
    await manager.reportFault('err1', { component: 'audio' });
    await manager.reportFault('err2', { component: 'gps' });

    const audioFaults = manager.getFaultsByComponent('audio');
    expect(audioFaults).toHaveLength(1);
  });

  test('should execute fault handlers', async () => {
    const handler = jest.fn();
    manager.registerHandler('test.error', handler);

    await manager.reportFault('test.error', { message: 'test' });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'test.error' }));
  });

  test('should execute wildcard handlers', async () => {
    const handler = jest.fn();
    manager.registerHandler('*', handler);

    await manager.reportFault('any.type', {});
    expect(handler).toHaveBeenCalled();
  });

  test('should generate diagnostic report', async () => {
    await manager.reportFault('err', { component: 'gps', severity: FaultSeverity.CRITICAL });
    const report = manager.getDiagnosticReport();

    expect(report.totalFaults).toBe(1);
    expect(report.activeFaults).toBe(1);
    expect(report.criticalFaults).toBe(1);
    expect(report.componentSummary).toHaveProperty('gps');
  });

  test('should detect critical faults', async () => {
    expect(manager.hasCriticalFaults()).toBe(false);
    await manager.reportFault('err', { severity: FaultSeverity.CRITICAL });
    expect(manager.hasCriticalFaults()).toBe(true);
  });

  test('should clear resolved faults', async () => {
    const id = await manager.reportFault('test', {});
    manager.resolveFault(id);
    manager.clearResolvedFaults();

    expect(manager.getFault(id)).toBeNull();
  });

  test('should maintain fault log', async () => {
    await manager.reportFault('a', {});
    await manager.reportFault('b', {});

    const log = manager.getFaultLog();
    expect(log).toHaveLength(2);
  });
});

describe('HealthCheckService', () => {
  let service;

  beforeEach(() => {
    service = new HealthCheckService({ checkInterval: 60000 });
  });

  afterEach(() => {
    service.stop();
  });

  test('should register and check a healthy component', async () => {
    service.registerComponent('test-service', async () => true);
    const result = await service.checkComponent('test-service');
    expect(result.status).toBe(ComponentStatus.HEALTHY);
  });

  test('should detect unhealthy component after consecutive failures', async () => {
    service.registerComponent('failing-service', async () => {
      throw new Error('Connection refused');
    });

    await service.checkComponent('failing-service');
    await service.checkComponent('failing-service');
    await service.checkComponent('failing-service');

    const status = service.getComponentStatus('failing-service');
    expect(status.status).toBe(ComponentStatus.UNHEALTHY);
    expect(status.consecutiveFailures).toBe(3);
  });

  test('should mark component as degraded on first failure', async () => {
    service.registerComponent('flaky', async () => {
      throw new Error('Timeout');
    });

    await service.checkComponent('flaky');
    const status = service.getComponentStatus('flaky');
    expect(status.status).toBe(ComponentStatus.DEGRADED);
  });

  test('should check all components', async () => {
    service.registerComponent('a', async () => true);
    service.registerComponent('b', async () => true);

    const { results, overallStatus } = await service.checkAll();
    expect(Object.keys(results)).toHaveLength(2);
    expect(overallStatus).toBe(ComponentStatus.HEALTHY);
  });

  test('should report unhealthy overall when critical component fails', async () => {
    service.registerComponent('critical-svc', async () => {
      throw new Error('down');
    }, { critical: true });

    // Need 3 failures for UNHEALTHY status
    await service.checkAll();
    await service.checkAll();
    await service.checkAll();

    const { overallStatus } = await service.checkAll();
    expect(overallStatus).toBe(ComponentStatus.UNHEALTHY);
  });

  test('should emit componentUnhealthy event', async () => {
    const handler = jest.fn();
    service.on('componentUnhealthy', handler);
    service.registerComponent('bad', async () => { throw new Error('fail'); });

    await service.checkComponent('bad');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'bad' }),
    );
  });

  test('should track history', async () => {
    service.registerComponent('test', async () => true);
    await service.checkComponent('test');
    await service.checkComponent('test');

    const history = service.getHistory('test');
    expect(history).toHaveLength(2);
  });

  test('should return registered components', () => {
    service.registerComponent('a', async () => true);
    service.registerComponent('b', async () => true);
    expect(service.getRegisteredComponents()).toEqual(['a', 'b']);
  });

  test('should unregister component', () => {
    service.registerComponent('temp', async () => true);
    service.unregisterComponent('temp');
    expect(service.getRegisteredComponents()).toHaveLength(0);
  });

  test('should throw when checking unknown component', async () => {
    await expect(service.checkComponent('unknown')).rejects.toThrow('Component not found');
  });

  test('should start and stop periodic checks', () => {
    service.start();
    expect(service._started).toBe(true);
    service.stop();
    expect(service._started).toBe(false);
  });
});

describe('GracefulDegradation', () => {
  let degradation;

  beforeEach(() => {
    degradation = new GracefulDegradation();
    degradation.registerFeature('navigation', FeatureCategory.CRITICAL);
    degradation.registerFeature('backup-camera', FeatureCategory.CRITICAL);
    degradation.registerFeature('audio-streaming', FeatureCategory.IMPORTANT);
    degradation.registerFeature('weather-display', FeatureCategory.STANDARD);
    degradation.registerFeature('app-store', FeatureCategory.OPTIONAL);
  });

  test('should start in normal mode', () => {
    expect(degradation.getLevel()).toBe(DegradationLevel.NORMAL);
  });

  test('should disable optional features in reduced mode', () => {
    degradation.setLevel(DegradationLevel.REDUCED);
    expect(degradation.isFeatureAvailable('app-store')).toBe(false);
    expect(degradation.isFeatureAvailable('weather-display')).toBe(true);
    expect(degradation.isFeatureAvailable('navigation')).toBe(true);
  });

  test('should disable standard and optional in minimal mode', () => {
    degradation.setLevel(DegradationLevel.MINIMAL);
    expect(degradation.isFeatureAvailable('app-store')).toBe(false);
    expect(degradation.isFeatureAvailable('weather-display')).toBe(false);
    expect(degradation.isFeatureAvailable('audio-streaming')).toBe(true);
    expect(degradation.isFeatureAvailable('navigation')).toBe(true);
  });

  test('should keep critical features in emergency mode', () => {
    degradation.setLevel(DegradationLevel.EMERGENCY);
    expect(degradation.isFeatureAvailable('app-store')).toBe(false);
    expect(degradation.isFeatureAvailable('weather-display')).toBe(false);
    expect(degradation.isFeatureAvailable('audio-streaming')).toBe(false);
    expect(degradation.isFeatureAvailable('navigation')).toBe(true);
    expect(degradation.isFeatureAvailable('backup-camera')).toBe(true);
  });

  test('should not allow disabling critical features manually', () => {
    const result = degradation.disableFeature('navigation');
    expect(result).toBe(false);
    expect(degradation.isFeatureAvailable('navigation')).toBe(true);
  });

  test('should allow disabling non-critical features', () => {
    const result = degradation.disableFeature('app-store');
    expect(result).toBe(true);
    expect(degradation.isFeatureAvailable('app-store')).toBe(false);
  });

  test('should re-enable features', () => {
    degradation.disableFeature('app-store');
    degradation.enableFeature('app-store');
    expect(degradation.isFeatureAvailable('app-store')).toBe(true);
  });

  test('should return disabled features list', () => {
    degradation.setLevel(DegradationLevel.REDUCED);
    const disabled = degradation.getDisabledFeatures();
    expect(disabled).toContain('app-store');
  });

  test('should generate user notifications', () => {
    degradation.setLevel(DegradationLevel.REDUCED);
    const notifications = degradation.getNotifications();
    expect(notifications.length).toBeGreaterThan(0);
  });

  test('should emit level change events', () => {
    const handler = jest.fn();
    degradation.on('levelChanged', handler);
    degradation.setLevel(DegradationLevel.REDUCED);
    expect(handler).toHaveBeenCalledWith({
      previous: DegradationLevel.NORMAL,
      current: DegradationLevel.REDUCED,
    });
  });

  test('should restore all features on return to normal', () => {
    degradation.setLevel(DegradationLevel.EMERGENCY);
    degradation.setLevel(DegradationLevel.NORMAL);
    expect(degradation.getDisabledFeatures()).toHaveLength(0);
  });

  test('should provide feature fallbacks', () => {
    degradation.registerFeature('map-3d', FeatureCategory.OPTIONAL, {
      fallback: 'map-2d',
    });
    expect(degradation.getFeatureFallback('map-3d')).toBe('map-2d');
  });

  test('should get features by category', () => {
    const critical = degradation.getFeaturesByCategory(FeatureCategory.CRITICAL);
    expect(critical).toHaveLength(2);
  });

  test('should provide status summary', () => {
    const status = degradation.getStatus();
    expect(status.level).toBe(DegradationLevel.NORMAL);
    expect(status.totalFeatures).toBe(5);
    expect(status.enabledFeatures).toBe(5);
  });

  test('should attempt recovery', async () => {
    degradation.setLevel(DegradationLevel.REDUCED);
    degradation.registerRecoveryHandler(DegradationLevel.REDUCED, async () => true);

    const recovered = await degradation.attemptRecovery();
    expect(recovered).toBe(true);
    expect(degradation.getLevel()).toBe(DegradationLevel.NORMAL);
  });
});

describe('ComponentMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new ComponentMonitor({
      maxRestartAttempts: 2,
      restartCooldown: 10,
      monitorInterval: 60000,
    });
  });

  afterEach(() => {
    monitor.stop();
  });

  test('should register and track components', () => {
    monitor.register('audio', { critical: false });
    const state = monitor.getState('audio');
    expect(state.state).toBe(ComponentState.RUNNING);
  });

  test('should restart a component', async () => {
    const stopFn = jest.fn().mockResolvedValue(undefined);
    const startFn = jest.fn().mockResolvedValue(undefined);

    monitor.register('test-svc', {
      stop: stopFn,
      start: startFn,
    });

    const result = await monitor.restartComponent('test-svc');
    expect(result).toBe(true);
    expect(stopFn).toHaveBeenCalled();
    expect(startFn).toHaveBeenCalled();

    const state = monitor.getState('test-svc');
    expect(state.state).toBe(ComponentState.RUNNING);
    expect(state.restartCount).toBe(1);
  });

  test('should fail after max restart attempts', async () => {
    monitor.register('flaky', {
      stop: jest.fn().mockResolvedValue(undefined),
      start: jest.fn().mockResolvedValue(undefined),
    });

    await monitor.restartComponent('flaky');
    await monitor.restartComponent('flaky');
    const result = await monitor.restartComponent('flaky');

    expect(result).toBe(false);
    expect(monitor.getState('flaky').state).toBe(ComponentState.FAILED);
  });

  test('should report errors', () => {
    monitor.register('comp', {});
    monitor.reportError('comp', new Error('something broke'));

    const state = monitor.getState('comp');
    expect(state.state).toBe(ComponentState.DEGRADED);
    expect(state.errors).toHaveLength(1);
  });

  test('should emit events on restart', async () => {
    const handler = jest.fn();
    monitor.on('componentRestarted', handler);
    monitor.register('svc', {
      stop: jest.fn().mockResolvedValue(undefined),
      start: jest.fn().mockResolvedValue(undefined),
    });

    await monitor.restartComponent('svc');
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ name: 'svc' }));
  });

  test('should get failed components', async () => {
    monitor.register('bad', {
      stop: jest.fn().mockResolvedValue(undefined),
      start: jest.fn().mockResolvedValue(undefined),
    });

    await monitor.restartComponent('bad');
    await monitor.restartComponent('bad');
    await monitor.restartComponent('bad');

    const failed = monitor.getFailedComponents();
    expect(failed).toHaveLength(1);
  });

  test('should get critical components', () => {
    monitor.register('critical-svc', { critical: true });
    monitor.register('normal-svc', { critical: false });

    const critical = monitor.getCriticalComponents();
    expect(critical).toHaveLength(1);
    expect(critical[0].name).toBe('critical-svc');
  });

  test('should reset restart count', async () => {
    monitor.register('svc', {
      stop: jest.fn().mockResolvedValue(undefined),
      start: jest.fn().mockResolvedValue(undefined),
    });
    await monitor.restartComponent('svc');
    monitor.resetRestartCount('svc');
    expect(monitor.getState('svc').restartCount).toBe(0);
  });

  test('should throw when restarting unknown component', async () => {
    await expect(monitor.restartComponent('nope')).rejects.toThrow('Component not found');
  });

  test('should get all states', () => {
    monitor.register('a', {});
    monitor.register('b', {});
    const states = monitor.getAllStates();
    expect(Object.keys(states)).toHaveLength(2);
  });

  test('should start and stop', () => {
    monitor.start();
    expect(monitor._started).toBe(true);
    monitor.stop();
    expect(monitor._started).toBe(false);
  });
});
