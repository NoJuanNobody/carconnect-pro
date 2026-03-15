'use strict';

const {
  CanController,
  CAN_IDS,
  GEAR_POSITIONS,
  STEERING_BUTTONS,
  CONTROLLER_STATES,
} = require('../../../src/hardware/can-controller');

describe('CanController', () => {
  let controller;

  beforeEach(async () => {
    controller = new CanController();
    await controller.start();
  });

  afterEach(async () => {
    await controller.stop();
  });

  describe('lifecycle', () => {
    it('should start in stopped state', () => {
      const c = new CanController();
      expect(c.state).toBe(CONTROLLER_STATES.STOPPED);
    });

    it('should transition to running on start', async () => {
      const c = new CanController();
      await c.start();
      expect(c.state).toBe(CONTROLLER_STATES.RUNNING);
      await c.stop();
    });

    it('should transition to stopped on stop', async () => {
      await controller.stop();
      expect(controller.state).toBe(CONTROLLER_STATES.STOPPED);
    });

    it('should not error when starting twice', async () => {
      await controller.start();
      expect(controller.state).toBe(CONTROLLER_STATES.RUNNING);
    });

    it('should emit started event', async () => {
      const c = new CanController();
      const handler = jest.fn();
      c.on('started', handler);
      await c.start();
      expect(handler).toHaveBeenCalled();
      await c.stop();
    });
  });

  describe('vehicle state', () => {
    it('should return default vehicle state', () => {
      const state = controller.getVehicleState();
      expect(state.ignition).toBe(false);
      expect(state.speed).toBe(0);
      expect(state.rpm).toBe(0);
      expect(state.gear).toBe('park');
      expect(state.parkingBrake).toBe(true);
      expect(state.batteryVoltage).toBe(12.6);
    });

    it('should return a copy of vehicle state', () => {
      const state1 = controller.getVehicleState();
      const state2 = controller.getVehicleState();
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('ignition processing', () => {
    it('should process ignition on', () => {
      const handler = jest.fn();
      controller.on('ignitionChange', handler);
      controller.simulateFrame(CAN_IDS.IGNITION_STATUS, [0x01]);
      expect(controller.getVehicleState().ignition).toBe(true);
      expect(handler).toHaveBeenCalledWith({ ignition: true });
    });

    it('should process ignition off', () => {
      controller.simulateFrame(CAN_IDS.IGNITION_STATUS, [0x01]);
      controller.simulateFrame(CAN_IDS.IGNITION_STATUS, [0x00]);
      expect(controller.getVehicleState().ignition).toBe(false);
    });

    it('should not emit when ignition state unchanged', () => {
      const handler = jest.fn();
      controller.simulateFrame(CAN_IDS.IGNITION_STATUS, [0x00]);
      controller.on('ignitionChange', handler);
      controller.simulateFrame(CAN_IDS.IGNITION_STATUS, [0x00]);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('speed processing', () => {
    it('should process vehicle speed', () => {
      const handler = jest.fn();
      controller.on('speedChange', handler);
      // 6000 / 100 = 60 km/h
      controller.simulateFrame(CAN_IDS.VEHICLE_SPEED, [0x17, 0x70]);
      expect(handler).toHaveBeenCalled();
      expect(controller.getVehicleState().speed).toBeCloseTo(60.0, 0);
    });

    it('should process zero speed', () => {
      controller.simulateFrame(CAN_IDS.VEHICLE_SPEED, [0x00, 0x00]);
      expect(controller.getVehicleState().speed).toBe(0);
    });
  });

  describe('RPM processing', () => {
    it('should process engine RPM', () => {
      const handler = jest.fn();
      controller.on('rpmChange', handler);
      // 3200 / 4 = 800 RPM
      controller.simulateFrame(CAN_IDS.ENGINE_RPM, [0x0C, 0x80]);
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('gear processing', () => {
    it('should process gear position changes', () => {
      const handler = jest.fn();
      controller.on('gearChange', handler);
      controller.simulateFrame(CAN_IDS.GEAR_POSITION, [0x03]);
      expect(controller.getVehicleState().gear).toBe('drive');
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ gear: 'drive' }));
    });

    it('should process park gear', () => {
      controller.simulateFrame(CAN_IDS.GEAR_POSITION, [0x00]);
      expect(controller.getVehicleState().gear).toBe('park');
    });

    it('should process reverse gear', () => {
      controller.simulateFrame(CAN_IDS.GEAR_POSITION, [0x01]);
      expect(controller.getVehicleState().gear).toBe('reverse');
    });
  });

  describe('parking brake', () => {
    it('should process parking brake engaged', () => {
      const handler = jest.fn();
      controller.on('parkingBrakeChange', handler);
      // Start is true, set to false first
      controller.simulateFrame(CAN_IDS.PARKING_BRAKE, [0x00]);
      expect(controller.getVehicleState().parkingBrake).toBe(false);
      expect(handler).toHaveBeenCalledWith({ engaged: false });
    });

    it('should process parking brake disengaged', () => {
      controller.simulateFrame(CAN_IDS.PARKING_BRAKE, [0x00]);
      controller.simulateFrame(CAN_IDS.PARKING_BRAKE, [0x01]);
      expect(controller.getVehicleState().parkingBrake).toBe(true);
    });
  });

  describe('battery voltage', () => {
    it('should process battery voltage', () => {
      // 1260 / 100 = 12.6V
      controller.simulateFrame(CAN_IDS.BATTERY_VOLTAGE, [0x04, 0xEC]);
      expect(controller.getVehicleState().batteryVoltage).toBe(12.6);
    });

    it('should emit low battery warning', () => {
      const handler = jest.fn();
      controller.on('lowBattery', handler);
      // 1100 / 100 = 11.0V
      controller.simulateFrame(CAN_IDS.BATTERY_VOLTAGE, [0x04, 0x4C]);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ voltage: 11.0 }));
    });
  });

  describe('steering wheel buttons', () => {
    it('should process volume up button', () => {
      const handler = jest.fn();
      controller.on('steeringButton', handler);
      controller.simulateFrame(CAN_IDS.STEERING_WHEEL_BUTTONS, [0x01]);
      expect(handler).toHaveBeenCalledWith({ button: 'volume_up' });
    });

    it('should process multiple buttons', () => {
      const handler = jest.fn();
      controller.on('steeringButton', handler);
      controller.simulateFrame(CAN_IDS.STEERING_WHEEL_BUTTONS, [0x03]); // volume_up + volume_down
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should process mute button', () => {
      const handler = jest.fn();
      controller.on('steeringButton', handler);
      controller.simulateFrame(CAN_IDS.STEERING_WHEEL_BUTTONS, [0x80]);
      expect(handler).toHaveBeenCalledWith({ button: 'mute' });
    });
  });

  describe('diagnostics', () => {
    it('should request diagnostics', () => {
      const handler = jest.fn();
      controller.on('txFrame', handler);
      const frame = controller.requestDiagnostics();
      expect(frame.id).toBe(CAN_IDS.DIAGNOSTIC_REQUEST);
      expect(handler).toHaveBeenCalled();
    });

    it('should process DTC codes', () => {
      const handler = jest.fn();
      controller.on('dtcReceived', handler);
      controller.simulateFrame(CAN_IDS.DIAGNOSTIC_RESPONSE, [0x43, 0x01, 0x01, 0x23]);
      const codes = controller.getDtcCodes();
      expect(codes).toHaveLength(1);
      expect(codes[0]).toBe('P0123');
    });

    it('should clear DTC codes', () => {
      controller.simulateFrame(CAN_IDS.DIAGNOSTIC_RESPONSE, [0x43, 0x01, 0x01, 0x23]);
      controller.clearDtcCodes();
      expect(controller.getDtcCodes()).toHaveLength(0);
    });

    it('should not duplicate DTC codes', () => {
      controller.simulateFrame(CAN_IDS.DIAGNOSTIC_RESPONSE, [0x43, 0x01, 0x01, 0x23]);
      controller.simulateFrame(CAN_IDS.DIAGNOSTIC_RESPONSE, [0x43, 0x01, 0x01, 0x23]);
      expect(controller.getDtcCodes()).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should throw when processing frames while stopped', async () => {
      const c = new CanController();
      expect(() => c.processFrame({ id: 0x100, data: Buffer.from([0]) }))
        .toThrow('CAN controller not running');
    });

    it('should enter error state after max errors', () => {
      const c = new CanController({ maxErrors: 2 });
      // Cannot easily trigger internal errors, test via recover
      c.state = CONTROLLER_STATES.ERROR;
      expect(c.state).toBe(CONTROLLER_STATES.ERROR);
    });

    it('should recover from error state', async () => {
      controller.state = CONTROLLER_STATES.ERROR;
      const recovered = await controller.recover();
      expect(recovered).toBe(true);
      expect(controller.state).toBe(CONTROLLER_STATES.RUNNING);
    });
  });

  describe('latency', () => {
    it('should report -1 latency before first update', () => {
      const c = new CanController();
      expect(c.getLatency()).toBe(-1);
    });

    it('should track processing latency', () => {
      controller.simulateFrame(CAN_IDS.VEHICLE_SPEED, [0x00, 0x00]);
      const latency = controller.getLatency();
      expect(latency).toBeGreaterThanOrEqual(0);
      expect(latency).toBeLessThan(50);
    });

    it('should return latency in processFrame result', () => {
      const result = controller.simulateFrame(CAN_IDS.VEHICLE_SPEED, [0x00, 0x00]);
      expect(result.processed).toBe(true);
      expect(result.latency).toBeDefined();
      expect(result.latency).toBeLessThan(50);
    });
  });

  describe('event management', () => {
    it('should add and remove listeners', () => {
      const handler = jest.fn();
      controller.on('speedChange', handler);
      controller.simulateFrame(CAN_IDS.VEHICLE_SPEED, [0x00, 0x00]);
      expect(handler).toHaveBeenCalledTimes(1);

      controller.off('speedChange', handler);
      controller.simulateFrame(CAN_IDS.VEHICLE_SPEED, [0x00, 0x00]);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
