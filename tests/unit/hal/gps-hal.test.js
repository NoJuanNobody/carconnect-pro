'use strict';

const { GpsHal, GPS_HAL_STATES } = require('../../../src/hal/gps-hal');

describe('GpsHal', () => {
  let hal;

  beforeEach(async () => {
    hal = new GpsHal();
    await hal.init();
  });

  afterEach(async () => {
    await hal.shutdown();
  });

  describe('initialization', () => {
    it('should start uninitialized', () => {
      const h = new GpsHal();
      expect(h.state).toBe(GPS_HAL_STATES.UNINITIALIZED);
    });

    it('should be searching after init', () => {
      expect(hal.state).toBe(GPS_HAL_STATES.SEARCHING);
    });

    it('should throw if already initialized', async () => {
      await expect(hal.init()).rejects.toThrow('already initialized');
    });
  });

  describe('shutdown', () => {
    it('should enter shutdown state', async () => {
      await hal.shutdown();
      expect(hal.state).toBe(GPS_HAL_STATES.SHUTDOWN);
    });

    it('should clear position on shutdown', async () => {
      hal.updatePosition({ latitude: 37.0, longitude: -122.0 });
      await hal.shutdown();
      expect(hal.getPosition()).toBeNull();
    });
  });

  describe('position', () => {
    it('should update position', () => {
      const pos = hal.updatePosition({
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 100,
        speed: 60,
        heading: 180,
      });
      expect(pos.latitude).toBe(37.7749);
      expect(pos.longitude).toBe(-122.4194);
    });

    it('should emit position event', () => {
      const handler = jest.fn();
      hal.on('position', handler);
      hal.updatePosition({ latitude: 37.0, longitude: -122.0 });
      expect(handler).toHaveBeenCalled();
    });

    it('should reject invalid latitude', () => {
      expect(() => hal.updatePosition({ latitude: 91, longitude: 0 }))
        .toThrow('Invalid latitude');
    });

    it('should reject invalid longitude', () => {
      expect(() => hal.updatePosition({ latitude: 0, longitude: 181 }))
        .toThrow('Invalid longitude');
    });

    it('should get position copy', () => {
      hal.updatePosition({ latitude: 37.0, longitude: -122.0 });
      const p1 = hal.getPosition();
      const p2 = hal.getPosition();
      expect(p1).not.toBe(p2);
      expect(p1).toEqual(p2);
    });

    it('should return null when no position', () => {
      expect(hal.getPosition()).toBeNull();
    });
  });

  describe('satellites', () => {
    it('should update to 3D fix with 4+ satellites', () => {
      hal.updateSatellites(8, 1.2);
      expect(hal.state).toBe(GPS_HAL_STATES.FIX_3D);
    });

    it('should update to 2D fix with 3 satellites', () => {
      hal.updateSatellites(3, 5.0);
      expect(hal.state).toBe(GPS_HAL_STATES.FIX_2D);
    });

    it('should stay searching with less than 3 satellites', () => {
      hal.updateSatellites(2, 99.99);
      expect(hal.state).toBe(GPS_HAL_STATES.SEARCHING);
    });

    it('should emit satellites event', () => {
      const handler = jest.fn();
      hal.on('satellites', handler);
      hal.updateSatellites(6, 2.0);
      expect(handler).toHaveBeenCalledWith({
        count: 6,
        hdop: 2.0,
        fixType: GPS_HAL_STATES.FIX_3D,
      });
    });
  });

  describe('status and capabilities', () => {
    it('should return status', () => {
      const status = hal.getStatus();
      expect(status.id).toBeDefined();
      expect(status.state).toBe(GPS_HAL_STATES.SEARCHING);
      expect(status.satellites).toBe(0);
      expect(status.updateRate).toBe(1);
    });

    it('should return capabilities', () => {
      const caps = hal.getCapabilities();
      expect(caps.type).toBe('gps');
      expect(caps.constellations).toContain('GPS');
      expect(caps.assistedGps).toBe(true);
    });
  });

  describe('fault handling', () => {
    it('should handle faults', () => {
      expect(hal.handleFault('antenna_error')).toBe(true);
    });

    it('should enter error after max faults', () => {
      const h = new GpsHal({ maxFaults: 2 });
      h.state = GPS_HAL_STATES.SEARCHING;
      h.handleFault('fault1');
      h.handleFault('fault2');
      expect(h.state).toBe(GPS_HAL_STATES.ERROR);
    });

    it('should recover from error', async () => {
      hal.state = GPS_HAL_STATES.ERROR;
      const recovered = await hal.recover();
      expect(recovered).toBe(true);
      expect(hal.state).toBe(GPS_HAL_STATES.SEARCHING);
    });
  });

  describe('state checks', () => {
    it('should throw when not ready', async () => {
      await hal.shutdown();
      expect(() => hal.updatePosition({ latitude: 0, longitude: 0 }))
        .toThrow('not ready');
    });
  });
});
