'use strict';

const { HalManager, MANAGER_STATES } = require('../../../src/hal/hal-manager');

describe('HalManager', () => {
  let manager;

  beforeEach(async () => {
    manager = new HalManager({ healthCheckMs: 60000 });
    await manager.init();
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('initialization', () => {
    it('should start uninitialized', () => {
      const m = new HalManager();
      expect(m.state).toBe(MANAGER_STATES.UNINITIALIZED);
    });

    it('should be ready after init', () => {
      expect(manager.state).toBe(MANAGER_STATES.READY);
    });

    it('should throw if already initialized', async () => {
      await expect(manager.init()).rejects.toThrow('already initialized');
    });

    it('should create all HAL modules', () => {
      const status = manager.getStatus();
      expect(status.moduleCount).toBe(4);
      expect(status.modules.audio).toBeDefined();
      expect(status.modules.display).toBeDefined();
      expect(status.modules.can).toBeDefined();
      expect(status.modules.gps).toBeDefined();
    });
  });

  describe('shutdown', () => {
    it('should enter shutdown state', async () => {
      await manager.shutdown();
      expect(manager.state).toBe(MANAGER_STATES.SHUTDOWN);
    });

    it('should allow re-init after shutdown', async () => {
      await manager.shutdown();
      await manager.init();
      expect(manager.state).toBe(MANAGER_STATES.READY);
    });
  });

  describe('getModule', () => {
    it('should return audio module', () => {
      const audio = manager.getModule('audio');
      expect(audio).toBeDefined();
      expect(audio.getCapabilities().type).toBe('audio');
    });

    it('should return display module', () => {
      const display = manager.getModule('display');
      expect(display).toBeDefined();
      expect(display.getCapabilities().type).toBe('display');
    });

    it('should return can module', () => {
      const can = manager.getModule('can');
      expect(can).toBeDefined();
      expect(can.getCapabilities().type).toBe('can');
    });

    it('should return gps module', () => {
      const gps = manager.getModule('gps');
      expect(gps).toBeDefined();
      expect(gps.getCapabilities().type).toBe('gps');
    });

    it('should throw for unknown module', () => {
      expect(() => manager.getModule('unknown')).toThrow('not found');
    });
  });

  describe('status', () => {
    it('should return complete status', () => {
      const status = manager.getStatus();
      expect(status.id).toBeDefined();
      expect(status.state).toBe(MANAGER_STATES.READY);
      expect(status.moduleCount).toBe(4);
    });
  });

  describe('capabilities', () => {
    it('should return all module capabilities', () => {
      const caps = manager.getCapabilities();
      expect(caps.audio).toBeDefined();
      expect(caps.display).toBeDefined();
      expect(caps.can).toBeDefined();
      expect(caps.gps).toBeDefined();
    });
  });

  describe('hardware discovery', () => {
    it('should discover all hardware modules', () => {
      const discovered = manager.discoverHardware();
      expect(discovered).toHaveLength(4);
      const names = discovered.map((d) => d.name);
      expect(names).toContain('audio');
      expect(names).toContain('display');
      expect(names).toContain('can');
      expect(names).toContain('gps');
    });

    it('should include type and status', () => {
      const discovered = manager.discoverHardware();
      const audio = discovered.find((d) => d.name === 'audio');
      expect(audio.type).toBe('audio');
      expect(audio.id).toBeDefined();
    });
  });

  describe('recovery', () => {
    it('should recover a specific module', async () => {
      const audio = manager.getModule('audio');
      audio.state = 'error';
      const recovered = await manager.recoverModule('audio');
      expect(recovered).toBe(true);
    });

    it('should recover all modules', async () => {
      const results = await manager.recoverAll();
      expect(results.audio).toBe(true);
      expect(results.display).toBe(true);
      expect(results.can).toBe(true);
      expect(results.gps).toBe(true);
    });
  });

  describe('event management', () => {
    it('should emit stateChange events', async () => {
      const handler = jest.fn();
      const m = new HalManager({ healthCheckMs: 60000 });
      m.on('stateChange', handler);
      await m.init();
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ state: MANAGER_STATES.READY }));
      await m.shutdown();
    });
  });
});
