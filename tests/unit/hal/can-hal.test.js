'use strict';

const { CanHal, CAN_HAL_STATES } = require('../../../src/hal/can-hal');

describe('CanHal', () => {
  let hal;

  beforeEach(async () => {
    hal = new CanHal();
    await hal.init();
  });

  afterEach(async () => {
    await hal.shutdown();
  });

  describe('initialization', () => {
    it('should start uninitialized', () => {
      const h = new CanHal();
      expect(h.state).toBe(CAN_HAL_STATES.UNINITIALIZED);
    });

    it('should be ready after init', () => {
      expect(hal.state).toBe(CAN_HAL_STATES.READY);
    });

    it('should throw if already initialized', async () => {
      await expect(hal.init()).rejects.toThrow('already initialized');
    });

    it('should use custom bitrate', () => {
      const h = new CanHal({ bitrate: 250000 });
      expect(h.bitrate).toBe(250000);
    });
  });

  describe('shutdown', () => {
    it('should enter shutdown state', async () => {
      await hal.shutdown();
      expect(hal.state).toBe(CAN_HAL_STATES.SHUTDOWN);
    });

    it('should clear filters on shutdown', async () => {
      hal.addFilter(0x100, 0x7FF);
      await hal.shutdown();
      expect(hal.getStatus().filterCount).toBe(0);
    });
  });

  describe('sendMessage', () => {
    it('should send a CAN message', () => {
      const frame = hal.sendMessage(0x100, Buffer.from([0x01, 0x02]));
      expect(frame.id).toBe(0x100);
      expect(frame.dlc).toBe(2);
      expect(hal.state).toBe(CAN_HAL_STATES.ACTIVE);
    });

    it('should accept array data', () => {
      const frame = hal.sendMessage(0x100, [0x01, 0x02]);
      expect(Buffer.isBuffer(frame.data)).toBe(true);
    });

    it('should reject invalid arbitration ID', () => {
      expect(() => hal.sendMessage(-1, [0x01])).toThrow('Invalid arbitration ID');
      expect(() => hal.sendMessage(0x800, [0x01])).toThrow('Invalid arbitration ID');
    });

    it('should reject data exceeding 8 bytes', () => {
      expect(() => hal.sendMessage(0x100, [1, 2, 3, 4, 5, 6, 7, 8, 9]))
        .toThrow('cannot exceed 8 bytes');
    });

    it('should increment tx count', () => {
      hal.sendMessage(0x100, [0x01]);
      hal.sendMessage(0x100, [0x02]);
      expect(hal.getStatus().txCount).toBe(2);
    });

    it('should emit tx event', () => {
      const handler = jest.fn();
      hal.on('tx', handler);
      hal.sendMessage(0x100, [0x01]);
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('receiveMessage', () => {
    it('should receive a message', () => {
      const frame = { id: 0x100, data: Buffer.from([0x01]) };
      const result = hal.receiveMessage(frame);
      expect(result).not.toBeNull();
      expect(hal.getStatus().rxCount).toBe(1);
    });

    it('should filter messages', () => {
      hal.addFilter(0x100, 0x7FF);
      const match = hal.receiveMessage({ id: 0x100, data: Buffer.from([0x01]) });
      const noMatch = hal.receiveMessage({ id: 0x200, data: Buffer.from([0x01]) });
      expect(match).not.toBeNull();
      expect(noMatch).toBeNull();
    });

    it('should call message handler', () => {
      const handler = jest.fn();
      hal.setMessageHandler(handler);
      hal.receiveMessage({ id: 0x100, data: Buffer.from([0x01]) });
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('filters', () => {
    it('should add filter', () => {
      hal.addFilter(0x100, 0x7FF);
      expect(hal.getStatus().filterCount).toBe(1);
    });

    it('should remove filter', () => {
      hal.addFilter(0x100, 0x7FF);
      hal.removeFilter(0x100);
      expect(hal.getStatus().filterCount).toBe(0);
    });

    it('should clear all filters', () => {
      hal.addFilter(0x100, 0x7FF);
      hal.addFilter(0x200, 0x7FF);
      hal.clearFilters();
      expect(hal.getStatus().filterCount).toBe(0);
    });

    it('should reject when max filters reached', () => {
      for (let i = 0; i < 32; i++) {
        hal.addFilter(i, 0x7FF);
      }
      expect(() => hal.addFilter(0x100, 0x7FF)).toThrow('Maximum filter count');
    });
  });

  describe('status and capabilities', () => {
    it('should return status', () => {
      const status = hal.getStatus();
      expect(status.id).toBeDefined();
      expect(status.state).toBe(CAN_HAL_STATES.READY);
      expect(status.busName).toBe('can0');
      expect(status.bitrate).toBe(500000);
    });

    it('should return capabilities', () => {
      const caps = hal.getCapabilities();
      expect(caps.type).toBe('can');
      expect(caps.protocols).toContain('CAN 2.0A');
      expect(caps.maxDataLength).toBe(8);
    });
  });

  describe('error handling', () => {
    it('should handle bus errors', () => {
      expect(hal.handleBusError('crc_error')).toBe(true);
      expect(hal.getStatus().errorCount).toBe(1);
    });

    it('should go bus_off after max faults', () => {
      const h = new CanHal({ maxFaults: 2 });
      h.state = CAN_HAL_STATES.READY;
      h.handleBusError('error1');
      h.handleBusError('error2');
      expect(h.state).toBe(CAN_HAL_STATES.BUS_OFF);
    });

    it('should recover from bus_off', async () => {
      hal.state = CAN_HAL_STATES.BUS_OFF;
      const recovered = await hal.recover();
      expect(recovered).toBe(true);
      expect(hal.state).toBe(CAN_HAL_STATES.READY);
    });
  });

  describe('state checks', () => {
    it('should throw when not ready', async () => {
      await hal.shutdown();
      expect(() => hal.sendMessage(0x100, [0x01])).toThrow('not ready');
    });
  });
});
