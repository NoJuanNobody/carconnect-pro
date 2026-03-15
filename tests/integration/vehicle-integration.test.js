'use strict';

const { VehicleService } = require('../../src/services/vehicle-service');
const { CanController, CAN_IDS } = require('../../src/hardware/can-controller');
const { GpsController } = require('../../src/hardware/gps-controller');
const { IgnitionHandler, IGNITION_STATES, SAFETY_MODES } = require('../../src/safety/ignition-handler');
const { HalManager } = require('../../src/hal/hal-manager');
const { CanDriver } = require('../../src/drivers/can-driver');
const { LinuxAdapter } = require('../../src/platform/linux-adapter');

describe('Vehicle Integration', () => {
  let service;

  beforeEach(async () => {
    service = new VehicleService();
    await service.start();
  });

  afterEach(async () => {
    await service.stop();
  });

  describe('vehicle state monitoring', () => {
    it('should provide complete vehicle state', () => {
      const state = service.getVehicleState();
      expect(state.ignition).toBeDefined();
      expect(state.speed).toBeDefined();
      expect(state.gear).toBeDefined();
      expect(state.parkingBrake).toBeDefined();
      expect(state.batteryVoltage).toBeDefined();
      expect(state.timestamp).toBeDefined();
    });

    it('should update ignition state from CAN frames', () => {
      service.simulateCanFrame(CAN_IDS.IGNITION_STATUS, [0x01]);
      const state = service.getVehicleState();
      expect(state.ignitionState).toBe('on');
    });

    it('should update speed from CAN frames', () => {
      service.simulateCanFrame(CAN_IDS.IGNITION_STATUS, [0x01]);
      // 6000 / 100 = 60 km/h
      service.simulateCanFrame(CAN_IDS.VEHICLE_SPEED, [0x17, 0x70]);
      const state = service.getVehicleState();
      expect(state.speed).toBeCloseTo(60.0, 0);
    });

    it('should update gear position from CAN frames', () => {
      service.simulateCanFrame(CAN_IDS.GEAR_POSITION, [0x03]);
      expect(service.getVehicleState().gear).toBe('drive');
    });

    it('should update parking brake from CAN frames', () => {
      service.simulateCanFrame(CAN_IDS.PARKING_BRAKE, [0x00]);
      expect(service.getVehicleState().parkingBrake).toBe(false);
    });
  });

  describe('safety interlocks', () => {
    it('should allow all operations when parked', () => {
      expect(service.isOperationAllowed('video_playback')).toBe(true);
      expect(service.isOperationAllowed('text_input')).toBe(true);
      expect(service.isOperationAllowed('complex_settings')).toBe(true);
    });

    it('should block restricted operations while driving', () => {
      service.simulateCanFrame(CAN_IDS.IGNITION_STATUS, [0x01]);
      service.simulateCanFrame(CAN_IDS.PARKING_BRAKE, [0x00]);
      // 6000/100 = 60 km/h
      service.simulateCanFrame(CAN_IDS.VEHICLE_SPEED, [0x17, 0x70]);

      expect(service.isOperationAllowed('video_playback')).toBe(false);
      expect(service.isOperationAllowed('text_input')).toBe(false);
    });

    it('should allow non-restricted operations while driving', () => {
      service.simulateCanFrame(CAN_IDS.IGNITION_STATUS, [0x01]);
      service.simulateCanFrame(CAN_IDS.PARKING_BRAKE, [0x00]);
      service.simulateCanFrame(CAN_IDS.VEHICLE_SPEED, [0x17, 0x70]);

      expect(service.isOperationAllowed('navigation')).toBe(true);
      expect(service.isOperationAllowed('audio_control')).toBe(true);
    });

    it('should report driving/parked state', () => {
      expect(service.isParked()).toBe(true);
      expect(service.isDriving()).toBe(false);

      service.simulateCanFrame(CAN_IDS.IGNITION_STATUS, [0x01]);
      service.simulateCanFrame(CAN_IDS.PARKING_BRAKE, [0x00]);
      service.simulateCanFrame(CAN_IDS.VEHICLE_SPEED, [0x17, 0x70]);

      expect(service.isDriving()).toBe(true);
      expect(service.isParked()).toBe(false);
    });
  });

  describe('steering wheel controls', () => {
    it('should map steering wheel buttons to handlers', () => {
      const handler = jest.fn();
      service.registerSteeringButtonHandler('volume_up', handler);
      service.simulateCanFrame(CAN_IDS.STEERING_WHEEL_BUTTONS, [0x01]);
      expect(handler).toHaveBeenCalled();
    });

    it('should forward steering button events', () => {
      const handler = jest.fn();
      service.on('steeringButton', handler);
      service.simulateCanFrame(CAN_IDS.STEERING_WHEEL_BUTTONS, [0x80]);
      expect(handler).toHaveBeenCalledWith({ button: 'mute' });
    });
  });

  describe('diagnostics', () => {
    it('should request and receive DTC codes', () => {
      service.requestDiagnostics();
      service.simulateCanFrame(CAN_IDS.DIAGNOSTIC_RESPONSE, [0x43, 0x01, 0x01, 0x23]);
      const codes = service.getDtcCodes();
      expect(codes).toHaveLength(1);
      expect(codes[0]).toBe('P0123');
    });
  });

  describe('GPS integration', () => {
    it('should update GPS position', () => {
      service.updateGpsPosition({ latitude: 37.7749, longitude: -122.4194 });
      const state = service.getVehicleState();
      expect(state.position).not.toBeNull();
      expect(state.position.latitude).toBe(37.7749);
    });

    it('should emit position update events', () => {
      const handler = jest.fn();
      service.on('positionUpdate', handler);
      service.updateGpsPosition({ latitude: 37.7749, longitude: -122.4194 });
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('battery monitoring', () => {
    it('should emit low battery from CAN data', () => {
      const handler = jest.fn();
      service.on('lowBattery', handler);
      // 1100 / 100 = 11.0V
      service.simulateCanFrame(CAN_IDS.BATTERY_VOLTAGE, [0x04, 0x4C]);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ voltage: 11.0 }));
    });
  });

  describe('service status', () => {
    it('should return comprehensive status', () => {
      const status = service.getStatus();
      expect(status.id).toBeDefined();
      expect(status.state).toBe('running');
      expect(status.can).toBeDefined();
      expect(status.gps).toBeDefined();
      expect(status.ignition).toBeDefined();
    });
  });

  describe('CAN bus error handling', () => {
    it('should forward CAN errors', () => {
      const handler = jest.fn();
      service.on('canError', handler);
      const canController = service.getCanController();
      canController._handleError(new Error('test error'));
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('ignition shutdown handling', () => {
    it('should handle ignition off sequence', () => {
      service.simulateCanFrame(CAN_IDS.IGNITION_STATUS, [0x01]);
      expect(service.getVehicleState().ignitionState).toBe('on');

      service.simulateCanFrame(CAN_IDS.IGNITION_STATUS, [0x00]);
      expect(service.getVehicleState().ignitionState).toBe('off');
    });
  });
});

describe('HAL Manager Integration', () => {
  let manager;

  beforeEach(async () => {
    manager = new HalManager({ healthCheckMs: 60000 });
    await manager.init();
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  it('should initialize all HAL modules', () => {
    const status = manager.getStatus();
    expect(status.state).toBe('ready');
    expect(status.moduleCount).toBe(4);
  });

  it('should allow audio operations through HAL', () => {
    const audio = manager.getModule('audio');
    audio.setVolume(75);
    expect(audio.volume).toBe(75);
  });

  it('should allow CAN operations through HAL', () => {
    const can = manager.getModule('can');
    const frame = can.sendMessage(0x100, [0x01, 0x02]);
    expect(frame.id).toBe(0x100);
  });

  it('should allow GPS operations through HAL', () => {
    const gps = manager.getModule('gps');
    gps.updatePosition({ latitude: 37.0, longitude: -122.0 });
    expect(gps.getPosition()).not.toBeNull();
  });

  it('should allow display operations through HAL', () => {
    const display = manager.getModule('display');
    display.setBrightness(60);
    expect(display.brightness).toBe(60);
  });

  it('should discover all hardware', () => {
    const hw = manager.discoverHardware();
    expect(hw).toHaveLength(4);
  });

  it('should report capabilities for all modules', () => {
    const caps = manager.getCapabilities();
    expect(Object.keys(caps)).toHaveLength(4);
  });
});

describe('CAN Driver Integration', () => {
  let driver;

  beforeEach(async () => {
    driver = new CanDriver({ loopback: true });
    await driver.load();
    await driver.activate();
  });

  afterEach(async () => {
    await driver.unload();
  });

  it('should send and receive frames via loopback', () => {
    const rxHandler = jest.fn();
    driver.setReceiveCallback(rxHandler);
    driver.send({ id: 0x100, data: Buffer.from([0x01, 0x02]) });
    expect(rxHandler).toHaveBeenCalled();
    expect(driver.getStatistics().txCount).toBe(1);
    expect(driver.getStatistics().rxCount).toBe(1);
  });

  it('should inject frames for testing', () => {
    const rxHandler = jest.fn();
    driver.setReceiveCallback(rxHandler);
    driver.injectFrame({ id: 0x200, data: [0x03, 0x04] });
    expect(rxHandler).toHaveBeenCalled();
  });

  it('should recover from error state', async () => {
    driver.simulateError('bus_off');
    expect(driver.state).toBe('error');
    const recovered = await driver.recover();
    expect(recovered).toBe(true);
    expect(driver.state).toBe('active');
  });
});

describe('Linux Adapter Integration', () => {
  let adapter;

  beforeEach(async () => {
    adapter = new LinuxAdapter();
    await adapter.init();
  });

  afterEach(async () => {
    await adapter.shutdown();
  });

  it('should initialize and report ready', () => {
    expect(adapter.state).toBe('ready');
  });

  it('should discover audio devices', () => {
    const devices = adapter.getAudioDevices();
    expect(devices.length).toBeGreaterThan(0);
  });

  it('should discover CAN interfaces', () => {
    const interfaces = adapter.getCanInterfaces();
    expect(interfaces.length).toBeGreaterThan(0);
  });

  it('should discover GPS devices', () => {
    const devices = adapter.getGpsDevices();
    expect(devices.length).toBeGreaterThan(0);
  });

  it('should discover display devices', () => {
    const devices = adapter.getDisplayDevices();
    expect(devices.length).toBeGreaterThan(0);
  });

  it('should provide platform info', () => {
    const info = adapter.getPlatformInfo();
    expect(info.arch).toBeDefined();
    expect(info.cpu).toBeDefined();
    expect(info.memory).toBeDefined();
  });

  it('should check service availability', () => {
    expect(adapter.isServiceAvailable('alsa')).toBe(true);
    expect(adapter.isServiceAvailable('nonexistent')).toBe(false);
  });
});

describe('Ignition Handler Integration', () => {
  let handler;

  beforeEach(() => {
    handler = new IgnitionHandler();
  });

  it('should transition safety modes based on speed and brake', () => {
    expect(handler.getSafetyMode()).toBe(SAFETY_MODES.PARKED);

    handler.updateParkingBrake(false);
    handler.updateVehicleSpeed(60);
    expect(handler.getSafetyMode()).toBe(SAFETY_MODES.DRIVING);

    handler.updateVehicleSpeed(0);
    handler.updateParkingBrake(true);
    expect(handler.getSafetyMode()).toBe(SAFETY_MODES.PARKED);
  });

  it('should block video playback while driving', () => {
    handler.updateParkingBrake(false);
    handler.updateVehicleSpeed(30);
    expect(handler.isOperationAllowed('video_playback')).toBe(false);
    expect(handler.isOperationAllowed('navigation')).toBe(true);
  });

  it('should trigger emergency shutdown on critical battery', () => {
    const shutdownHandler = jest.fn();
    handler.on('emergencyShutdown', shutdownHandler);
    handler.updateBatteryVoltage(10.0);
    expect(shutdownHandler).toHaveBeenCalled();
    expect(handler.getIgnitionState()).toBe(IGNITION_STATES.OFF);
  });

  it('should execute shutdown callbacks on ignition off', () => {
    const callback = jest.fn();
    handler.registerShutdownCallback(callback);
    handler.setIgnitionState(IGNITION_STATES.ON);
    handler.setIgnitionState(IGNITION_STATES.OFF);
    expect(callback).toHaveBeenCalled();
  });
});
