'use strict';

const Database = require('better-sqlite3');
const VehicleState = require('../../../src/models/vehicle-state');
const migration = require('../../../src/database/migrations/001-initial-schema');

describe('VehicleState', () => {
  let db;
  let model;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    migration.up(db);
    model = new VehicleState(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('static properties', () => {
    it('should expose IGNITION_STATUSES', () => {
      expect(VehicleState.IGNITION_STATUSES).toEqual(['off', 'accessory', 'on', 'starting']);
    });

    it('should expose GEAR_POSITIONS', () => {
      expect(VehicleState.GEAR_POSITIONS).toEqual(['park', 'reverse', 'neutral', 'drive', 'low', 'sport']);
    });

    it('should expose CAN_BUS_STATUSES', () => {
      expect(VehicleState.CAN_BUS_STATUSES).toEqual(['active', 'inactive', 'error']);
    });
  });

  describe('validate', () => {
    it('should validate empty data with defaults', () => {
      const { error, value } = VehicleState.validate({});
      expect(error).toBeUndefined();
      expect(value.ignitionStatus).toBe('off');
      expect(value.speed).toBe(0);
      expect(value.gearPosition).toBe('park');
      expect(value.parkingBrake).toBe(true);
      expect(value.batteryVoltage).toBe(12.6);
      expect(value.canBusStatus).toBe('inactive');
    });

    it('should reject invalid ignition status', () => {
      const { error } = VehicleState.validate({ ignitionStatus: 'invalid' });
      expect(error).toBeDefined();
    });

    it('should reject invalid gear position', () => {
      const { error } = VehicleState.validate({ gearPosition: 'invalid' });
      expect(error).toBeDefined();
    });

    it('should reject invalid can bus status', () => {
      const { error } = VehicleState.validate({ canBusStatus: 'invalid' });
      expect(error).toBeDefined();
    });

    it('should reject speed above 300', () => {
      const { error } = VehicleState.validate({ speed: 301 });
      expect(error).toBeDefined();
    });

    it('should reject negative speed', () => {
      const { error } = VehicleState.validate({ speed: -1 });
      expect(error).toBeDefined();
    });

    it('should reject battery voltage above 16', () => {
      const { error } = VehicleState.validate({ batteryVoltage: 17 });
      expect(error).toBeDefined();
    });

    it('should reject negative battery voltage', () => {
      const { error } = VehicleState.validate({ batteryVoltage: -1 });
      expect(error).toBeDefined();
    });

    it('should validate diagnostic codes max length', () => {
      const { error } = VehicleState.validate({
        diagnosticCodes: ['a'.repeat(21)],
      });
      expect(error).toBeDefined();
    });

    it('should accept valid diagnostic codes', () => {
      const { error } = VehicleState.validate({
        diagnosticCodes: ['P0420', 'P0301'],
      });
      expect(error).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create with defaults', () => {
      const state = model.create();
      expect(state.id).toBeDefined();
      expect(state.ignitionStatus).toBe('off');
      expect(state.speed).toBe(0);
      expect(state.gearPosition).toBe('park');
      expect(state.parkingBrake).toBe(true);
      expect(state.batteryVoltage).toBe(12.6);
      expect(state.canBusStatus).toBe('inactive');
      expect(state.diagnosticCodes).toEqual([]);
      expect(state.updatedAt).toBeDefined();
    });

    it('should create with custom values', () => {
      const state = model.create({
        ignitionStatus: 'on',
        speed: 60,
        gearPosition: 'drive',
        parkingBrake: false,
        batteryVoltage: 14.2,
        canBusStatus: 'active',
        diagnosticCodes: ['P0420'],
        steeringWheelControls: { volumeUp: true },
      });
      expect(state.ignitionStatus).toBe('on');
      expect(state.speed).toBe(60);
      expect(state.gearPosition).toBe('drive');
      expect(state.parkingBrake).toBe(false);
      expect(state.batteryVoltage).toBe(14.2);
      expect(state.canBusStatus).toBe('active');
      expect(state.diagnosticCodes).toEqual(['P0420']);
      expect(state.steeringWheelControls.volumeUp).toBe(true);
    });

    it('should throw on invalid data', () => {
      expect(() => model.create({ speed: 500 })).toThrow('Validation error');
    });
  });

  describe('findById', () => {
    it('should find an existing state', () => {
      const created = model.create({ ignitionStatus: 'on' });
      const found = model.findById(created.id);
      expect(found).toBeDefined();
      expect(found.ignitionStatus).toBe('on');
    });

    it('should return null for non-existent', () => {
      expect(model.findById('non-existent')).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all states', () => {
      model.create();
      model.create({ ignitionStatus: 'on' });
      expect(model.findAll()).toHaveLength(2);
    });

    it('should return empty when none exist', () => {
      expect(model.findAll()).toEqual([]);
    });
  });

  describe('findLatest', () => {
    it('should return the most recent state', () => {
      const first = model.create({ speed: 0 });
      // Manually set the second one to a later timestamp
      const second = model.create({ speed: 60 });
      db.prepare('UPDATE vehicle_states SET updated_at = ? WHERE id = ?')
        .run('2099-01-01T00:00:00.000Z', second.id);
      db.prepare('UPDATE vehicle_states SET updated_at = ? WHERE id = ?')
        .run('2000-01-01T00:00:00.000Z', first.id);
      const found = model.findLatest();
      expect(found).toBeDefined();
      expect(found.id).toBe(second.id);
    });

    it('should return null when none exist', () => {
      expect(model.findLatest()).toBeNull();
    });
  });

  describe('update', () => {
    it('should update state fields', () => {
      const created = model.create();
      db.prepare('UPDATE vehicle_states SET updated_at = ? WHERE id = ?')
        .run('2000-01-01T00:00:00.000Z', created.id);
      const updated = model.update(created.id, {
        ignitionStatus: 'on',
        speed: 45,
        gearPosition: 'drive',
        parkingBrake: false,
      });
      expect(updated.ignitionStatus).toBe('on');
      expect(updated.speed).toBe(45);
      expect(updated.gearPosition).toBe('drive');
      expect(updated.parkingBrake).toBe(false);
      expect(updated.updatedAt).not.toBe('2000-01-01T00:00:00.000Z');
    });

    it('should update diagnostic codes', () => {
      const created = model.create();
      const updated = model.update(created.id, {
        diagnosticCodes: ['P0420', 'P0301'],
      });
      expect(updated.diagnosticCodes).toEqual(['P0420', 'P0301']);
    });

    it('should throw for non-existent state', () => {
      expect(() => model.update('non-existent', { speed: 0 })).toThrow('not found');
    });

    it('should throw on invalid update', () => {
      const created = model.create();
      expect(() => model.update(created.id, { speed: 500 })).toThrow('Validation error');
    });
  });

  describe('delete', () => {
    it('should delete an existing state', () => {
      const created = model.create();
      expect(model.delete(created.id)).toBe(true);
      expect(model.findById(created.id)).toBeNull();
    });

    it('should return false for non-existent', () => {
      expect(model.delete('non-existent')).toBe(false);
    });
  });
});
