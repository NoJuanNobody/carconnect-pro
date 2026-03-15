'use strict';

const { GpsController, GPS_CONTROLLER_STATES } = require('../../../src/hardware/gps-controller');

describe('GpsController', () => {
  let controller;

  beforeEach(async () => {
    controller = new GpsController();
    await controller.start();
  });

  afterEach(async () => {
    await controller.stop();
  });

  describe('lifecycle', () => {
    it('should start in stopped state', () => {
      const c = new GpsController();
      expect(c.state).toBe(GPS_CONTROLLER_STATES.STOPPED);
    });

    it('should transition to no_fix on start', async () => {
      const c = new GpsController();
      await c.start();
      expect(c.state).toBe(GPS_CONTROLLER_STATES.NO_FIX);
      await c.stop();
    });

    it('should transition to stopped on stop', async () => {
      await controller.stop();
      expect(controller.state).toBe(GPS_CONTROLLER_STATES.STOPPED);
    });

    it('should emit started event', async () => {
      const c = new GpsController();
      const handler = jest.fn();
      c.on('started', handler);
      await c.start();
      expect(handler).toHaveBeenCalled();
      await c.stop();
    });

    it('should clear position on stop', async () => {
      controller.updatePosition({ latitude: 37.7749, longitude: -122.4194 });
      await controller.stop();
      expect(controller.getPosition()).toBeNull();
    });
  });

  describe('position updates', () => {
    it('should update position', () => {
      const pos = controller.updatePosition({
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 10,
        speed: 30,
        heading: 90,
      });
      expect(pos.latitude).toBe(37.7749);
      expect(pos.longitude).toBe(-122.4194);
      expect(pos.altitude).toBe(10);
      expect(pos.speed).toBe(30);
      expect(pos.heading).toBe(90);
      expect(pos.timestamp).toBeDefined();
    });

    it('should transition to running after first position', () => {
      controller.updatePosition({ latitude: 37.7749, longitude: -122.4194 });
      expect(controller.state).toBe(GPS_CONTROLLER_STATES.RUNNING);
    });

    it('should emit position event', () => {
      const handler = jest.fn();
      controller.on('position', handler);
      controller.updatePosition({ latitude: 37.7749, longitude: -122.4194 });
      expect(handler).toHaveBeenCalled();
    });

    it('should reject invalid latitude', () => {
      expect(() => controller.updatePosition({ latitude: 91, longitude: 0 }))
        .toThrow('Invalid latitude');
    });

    it('should reject invalid longitude', () => {
      expect(() => controller.updatePosition({ latitude: 0, longitude: 181 }))
        .toThrow('Invalid longitude');
    });

    it('should throw when stopped', async () => {
      const c = new GpsController();
      expect(() => c.updatePosition({ latitude: 0, longitude: 0 }))
        .toThrow('GPS controller not running');
    });

    it('should default altitude, speed, heading to 0', () => {
      const pos = controller.updatePosition({ latitude: 0, longitude: 0 });
      expect(pos.altitude).toBe(0);
      expect(pos.speed).toBe(0);
      expect(pos.heading).toBe(0);
    });
  });

  describe('satellite info', () => {
    it('should update satellite count and fix type', () => {
      controller.updateSatelliteInfo(8, 1.2);
      const status = controller.getStatus();
      expect(status.satellites).toBe(8);
      expect(status.hdop).toBe(1.2);
      expect(status.fixType).toBe('3d');
    });

    it('should report 2d fix with 3 satellites', () => {
      controller.updateSatelliteInfo(3, 5.0);
      expect(controller.getStatus().fixType).toBe('2d');
    });

    it('should report no fix with less than 3 satellites', () => {
      controller.updatePosition({ latitude: 0, longitude: 0 });
      expect(controller.state).toBe(GPS_CONTROLLER_STATES.RUNNING);
      controller.updateSatelliteInfo(2, 99.99);
      expect(controller.state).toBe(GPS_CONTROLLER_STATES.NO_FIX);
    });

    it('should emit satellites event', () => {
      const handler = jest.fn();
      controller.on('satellites', handler);
      controller.updateSatelliteInfo(6, 2.0);
      expect(handler).toHaveBeenCalledWith({
        count: 6,
        hdop: 2.0,
        fixType: '3d',
      });
    });
  });

  describe('distance calculations', () => {
    it('should calculate distance to a point', () => {
      controller.updatePosition({ latitude: 37.7749, longitude: -122.4194 });
      const distance = controller.getDistanceTo(37.7849, -122.4094);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(2000); // should be about 1.4km
    });

    it('should return null for distance when no position', () => {
      const c = new GpsController();
      expect(c.getDistanceTo(0, 0)).toBeNull();
    });

    it('should calculate distance traveled', () => {
      controller.updatePosition({ latitude: 37.7749, longitude: -122.4194 });
      controller.updatePosition({ latitude: 37.7849, longitude: -122.4094 });
      const distance = controller.getDistanceTraveled();
      expect(distance).toBeGreaterThan(0);
    });

    it('should return 0 for distance traveled with single position', () => {
      controller.updatePosition({ latitude: 37.7749, longitude: -122.4194 });
      expect(controller.getDistanceTraveled()).toBe(0);
    });
  });

  describe('simulation', () => {
    it('should start and stop simulation', () => {
      const route = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7750, longitude: -122.4190 },
      ];
      controller.startSimulation(route, 100);
      controller.stopSimulation();
    });

    it('should reject empty route', () => {
      expect(() => controller.startSimulation([])).toThrow('non-empty array');
    });

    it('should update positions during simulation', (done) => {
      const route = [
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7750, longitude: -122.4190 },
      ];
      controller.on('position', () => {
        const pos = controller.getPosition();
        expect(pos).not.toBeNull();
        controller.stopSimulation();
        done();
      });
      controller.startSimulation(route, 50);
    });
  });

  describe('fault handling', () => {
    it('should handle faults', () => {
      expect(controller.handleFault('signal_loss')).toBe(true);
    });

    it('should enter error state after max faults', () => {
      const c = new GpsController({ maxFaults: 2 });
      c.state = GPS_CONTROLLER_STATES.NO_FIX;
      c.handleFault('fault1');
      c.handleFault('fault2');
      expect(c.state).toBe(GPS_CONTROLLER_STATES.ERROR);
    });

    it('should recover from error state', async () => {
      controller.state = GPS_CONTROLLER_STATES.ERROR;
      const recovered = await controller.recover();
      expect(recovered).toBe(true);
      expect(controller.state).toBe(GPS_CONTROLLER_STATES.NO_FIX);
    });
  });

  describe('status', () => {
    it('should return complete status', () => {
      const status = controller.getStatus();
      expect(status.id).toBeDefined();
      expect(status.state).toBe(GPS_CONTROLLER_STATES.NO_FIX);
      expect(status.position).toBeNull();
      expect(status.satellites).toBe(0);
      expect(status.updateRate).toBe(1);
    });
  });

  describe('event management', () => {
    it('should add and remove listeners', () => {
      const handler = jest.fn();
      controller.on('position', handler);
      controller.updatePosition({ latitude: 0, longitude: 0 });
      expect(handler).toHaveBeenCalledTimes(1);

      controller.off('position', handler);
      controller.updatePosition({ latitude: 1, longitude: 1 });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
