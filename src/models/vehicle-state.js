'use strict';

const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const DatabaseConnection = require('../database/connection');

const IGNITION_STATUSES = ['off', 'accessory', 'on', 'starting'];
const GEAR_POSITIONS = ['park', 'reverse', 'neutral', 'drive', 'low', 'sport'];
const CAN_BUS_STATUSES = ['active', 'inactive', 'error'];

const vehicleStateSchema = Joi.object({
  id: Joi.string().uuid(),
  ignitionStatus: Joi.string().valid(...IGNITION_STATUSES).default('off'),
  speed: Joi.number().min(0).max(300).default(0),
  gearPosition: Joi.string().valid(...GEAR_POSITIONS).default('park'),
  parkingBrake: Joi.boolean().default(true),
  steeringWheelControls: Joi.object().default({}),
  batteryVoltage: Joi.number().min(0).max(16).default(12.6),
  diagnosticCodes: Joi.array().items(Joi.string().max(20)).default([]),
  canBusStatus: Joi.string().valid(...CAN_BUS_STATUSES).default('inactive'),
  updatedAt: Joi.string().isoDate(),
});

class VehicleState {
  constructor(db) {
    this.db = db || DatabaseConnection.getInstance().getDb();
  }

  static validate(data) {
    return vehicleStateSchema.validate(data, { abortEarly: false });
  }

  static get IGNITION_STATUSES() {
    return IGNITION_STATUSES;
  }

  static get GEAR_POSITIONS() {
    return GEAR_POSITIONS;
  }

  static get CAN_BUS_STATUSES() {
    return CAN_BUS_STATUSES;
  }

  create(data = {}) {
    const { error, value } = VehicleState.validate(data);
    if (error) {
      throw new Error(`Validation error: ${error.message}`);
    }

    const now = new Date().toISOString();
    const state = {
      id: value.id || uuidv4(),
      ignitionStatus: value.ignitionStatus,
      speed: value.speed,
      gearPosition: value.gearPosition,
      parkingBrake: value.parkingBrake,
      steeringWheelControls: value.steeringWheelControls,
      batteryVoltage: value.batteryVoltage,
      diagnosticCodes: value.diagnosticCodes,
      canBusStatus: value.canBusStatus,
      updatedAt: value.updatedAt || now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO vehicle_states (id, ignition_status, speed, gear_position, parking_brake, steering_wheel_controls, battery_voltage, diagnostic_codes, can_bus_status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      state.id,
      state.ignitionStatus,
      state.speed,
      state.gearPosition,
      state.parkingBrake ? 1 : 0,
      JSON.stringify(state.steeringWheelControls),
      state.batteryVoltage,
      JSON.stringify(state.diagnosticCodes),
      state.canBusStatus,
      state.updatedAt,
    );

    return state;
  }

  findById(id) {
    const stmt = this.db.prepare('SELECT * FROM vehicle_states WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;
    return this._deserialize(row);
  }

  findAll() {
    const stmt = this.db.prepare('SELECT * FROM vehicle_states');
    return stmt.all().map((row) => this._deserialize(row));
  }

  findLatest() {
    const stmt = this.db.prepare('SELECT * FROM vehicle_states ORDER BY updated_at DESC LIMIT 1');
    const row = stmt.get();
    if (!row) return null;
    return this._deserialize(row);
  }

  update(id, data) {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error(`VehicleState not found: ${id}`);
    }

    const merged = { ...existing, ...data, id };
    const { error, value } = VehicleState.validate(merged);
    if (error) {
      throw new Error(`Validation error: ${error.message}`);
    }

    const now = new Date().toISOString();
    value.updatedAt = now;

    const stmt = this.db.prepare(`
      UPDATE vehicle_states
      SET ignition_status = ?, speed = ?, gear_position = ?, parking_brake = ?, steering_wheel_controls = ?, battery_voltage = ?, diagnostic_codes = ?, can_bus_status = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      value.ignitionStatus,
      value.speed,
      value.gearPosition,
      value.parkingBrake ? 1 : 0,
      JSON.stringify(value.steeringWheelControls),
      value.batteryVoltage,
      JSON.stringify(value.diagnosticCodes),
      value.canBusStatus,
      value.updatedAt,
      id,
    );

    return this.findById(id);
  }

  delete(id) {
    const stmt = this.db.prepare('DELETE FROM vehicle_states WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  _deserialize(row) {
    return {
      id: row.id,
      ignitionStatus: row.ignition_status,
      speed: row.speed,
      gearPosition: row.gear_position,
      parkingBrake: row.parking_brake === 1,
      steeringWheelControls: JSON.parse(row.steering_wheel_controls),
      batteryVoltage: row.battery_voltage,
      diagnosticCodes: JSON.parse(row.diagnostic_codes),
      canBusStatus: row.can_bus_status,
      updatedAt: row.updated_at,
    };
  }
}

module.exports = VehicleState;
