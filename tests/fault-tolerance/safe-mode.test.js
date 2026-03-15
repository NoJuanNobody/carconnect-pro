'use strict';

const { SafeMode, SafeModeState } = require('../../src/safety/safe-mode');

describe('SafeMode', () => {
  let safeMode;

  beforeEach(() => {
    safeMode = new SafeMode({ criticalThreshold: 3, autoActivate: true });
  });

  test('should start in normal state', () => {
    expect(safeMode.getState()).toBe(SafeModeState.NORMAL);
    expect(safeMode.isActive()).toBe(false);
  });

  test('should activate safe mode', async () => {
    const result = await safeMode.activate('Critical hardware failure');
    expect(result).toBe(true);
    expect(safeMode.isActive()).toBe(true);
    expect(safeMode.getState()).toBe(SafeModeState.ACTIVE);
  });

  test('should not activate if already active', async () => {
    await safeMode.activate('first');
    const result = await safeMode.activate('second');
    expect(result).toBe(false);
  });

  test('should deactivate safe mode', async () => {
    await safeMode.activate('test');
    const result = await safeMode.deactivate('All clear');
    expect(result).toBe(true);
    expect(safeMode.getState()).toBe(SafeModeState.NORMAL);
    expect(safeMode.isActive()).toBe(false);
  });

  test('should not deactivate if not active', async () => {
    const result = await safeMode.deactivate('No reason');
    expect(result).toBe(false);
  });

  test('should deny deactivation if checks fail', async () => {
    safeMode.registerDeactivationCheck('system-ok', async () => false);
    await safeMode.activate('test');

    const result = await safeMode.deactivate('try');
    expect(result).toBe(false);
    expect(safeMode.isActive()).toBe(true);
  });

  test('should allow deactivation if all checks pass', async () => {
    safeMode.registerDeactivationCheck('check-a', async () => true);
    safeMode.registerDeactivationCheck('check-b', async () => true);
    await safeMode.activate('test');

    const result = await safeMode.deactivate('resolved');
    expect(result).toBe(true);
  });

  test('should auto-activate after critical fault threshold', async () => {
    await safeMode.reportCriticalFault('engine', {});
    expect(safeMode.isActive()).toBe(false);

    await safeMode.reportCriticalFault('brakes', {});
    expect(safeMode.isActive()).toBe(false);

    await safeMode.reportCriticalFault('steering', {});
    expect(safeMode.isActive()).toBe(true);
  });

  test('should not auto-activate when disabled', async () => {
    const noAutoSafe = new SafeMode({ autoActivate: false, criticalThreshold: 1 });
    await noAutoSafe.reportCriticalFault('test', {});
    expect(noAutoSafe.isActive()).toBe(false);
  });

  test('should emit events on activation', async () => {
    const activatingHandler = jest.fn();
    const activatedHandler = jest.fn();
    safeMode.on('activating', activatingHandler);
    safeMode.on('activated', activatedHandler);

    await safeMode.activate('test');
    expect(activatingHandler).toHaveBeenCalled();
    expect(activatedHandler).toHaveBeenCalled();
  });

  test('should emit events on deactivation', async () => {
    const handler = jest.fn();
    safeMode.on('deactivated', handler);

    await safeMode.activate('test');
    await safeMode.deactivate('resolved');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'resolved' }),
    );
  });

  test('should register and verify safety functions', async () => {
    const fn = jest.fn().mockResolvedValue(true);
    safeMode.registerSafetyFunction('brake-assist', fn);

    const result = await safeMode.checkSafetyFunction('brake-assist');
    expect(result).toBe(true);
    expect(fn).toHaveBeenCalled();
  });

  test('should detect failed safety functions', async () => {
    safeMode.registerSafetyFunction('abs', async () => {
      throw new Error('ABS module offline');
    });

    const result = await safeMode.checkSafetyFunction('abs');
    expect(result).toBe(false);
  });

  test('should verify safety functions during activation', async () => {
    const fn = jest.fn().mockResolvedValue(true);
    safeMode.registerSafetyFunction('stability-control', fn);

    await safeMode.activate('test');
    expect(fn).toHaveBeenCalled();
  });

  test('should maintain activation log', async () => {
    await safeMode.activate('reason1');
    await safeMode.deactivate('resolved');

    const log = safeMode.getActivationLog();
    expect(log).toHaveLength(2);
    expect(log[0].action).toBe('activated');
    expect(log[1].action).toBe('deactivated');
  });

  test('should provide status information', async () => {
    safeMode.registerSafetyFunction('test-fn', async () => true);
    await safeMode.activate('critical error');

    const status = safeMode.getStatus();
    expect(status.state).toBe(SafeModeState.ACTIVE);
    expect(status.isActive).toBe(true);
    expect(status.activationReason).toBe('critical error');
    expect(status.activatedAt).not.toBeNull();
    expect(status.safetyFunctions).toHaveProperty('test-fn');
  });

  test('should reset fault count', () => {
    safeMode.resetFaultCount();
    expect(safeMode.getStatus().criticalFaultCount).toBe(0);
  });

  test('should emit criticalFault event', async () => {
    const handler = jest.fn();
    safeMode.on('criticalFault', handler);

    await safeMode.reportCriticalFault('sensor', { value: 'invalid' });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'sensor', count: 1 }),
    );
  });

  test('should return null for unknown safety function', async () => {
    const result = await safeMode.checkSafetyFunction('unknown');
    expect(result).toBeNull();
  });

  test('should emit deactivationDenied event', async () => {
    const handler = jest.fn();
    safeMode.on('deactivationDenied', handler);
    safeMode.registerDeactivationCheck('blocker', async () => false);

    await safeMode.activate('test');
    await safeMode.deactivate('try');

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ failedChecks: ['blocker'] }),
    );
  });
});
