'use strict';

const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const DatabaseConnection = require('../database/connection');

const AUDIO_SOURCE_TYPES = ['radio', 'bluetooth', 'usb', 'aux', 'android_auto', 'apple_carplay'];
const CONNECTION_STATUSES = ['connected', 'disconnected', 'connecting', 'error'];

const audioSourceSchema = Joi.object({
  id: Joi.string().uuid(),
  type: Joi.string().valid(...AUDIO_SOURCE_TYPES).required(),
  name: Joi.string().min(1).max(100).required(),
  isAvailable: Joi.boolean().default(false),
  isActive: Joi.boolean().default(false),
  connectionStatus: Joi.string().valid(...CONNECTION_STATUSES).default('disconnected'),
  metadata: Joi.object().default({}),
  createdAt: Joi.string().isoDate(),
});

class AudioSource {
  constructor(db) {
    this.db = db || DatabaseConnection.getInstance().getDb();
  }

  static validate(data) {
    return audioSourceSchema.validate(data, { abortEarly: false });
  }

  static get TYPES() {
    return AUDIO_SOURCE_TYPES;
  }

  static get CONNECTION_STATUSES() {
    return CONNECTION_STATUSES;
  }

  create(data) {
    const { error, value } = AudioSource.validate(data);
    if (error) {
      throw new Error(`Validation error: ${error.message}`);
    }

    const now = new Date().toISOString();
    const source = {
      id: value.id || uuidv4(),
      type: value.type,
      name: value.name,
      isAvailable: value.isAvailable,
      isActive: value.isActive,
      connectionStatus: value.connectionStatus,
      metadata: value.metadata,
      createdAt: value.createdAt || now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO audio_sources (id, type, name, is_available, is_active, connection_status, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      source.id,
      source.type,
      source.name,
      source.isAvailable ? 1 : 0,
      source.isActive ? 1 : 0,
      source.connectionStatus,
      JSON.stringify(source.metadata),
      source.createdAt,
    );

    return source;
  }

  findById(id) {
    const stmt = this.db.prepare('SELECT * FROM audio_sources WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;
    return this._deserialize(row);
  }

  findAll() {
    const stmt = this.db.prepare('SELECT * FROM audio_sources');
    return stmt.all().map((row) => this._deserialize(row));
  }

  findByType(type) {
    const stmt = this.db.prepare('SELECT * FROM audio_sources WHERE type = ?');
    return stmt.all(type).map((row) => this._deserialize(row));
  }

  findActive() {
    const stmt = this.db.prepare('SELECT * FROM audio_sources WHERE is_active = 1');
    return stmt.all().map((row) => this._deserialize(row));
  }

  update(id, data) {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error(`AudioSource not found: ${id}`);
    }

    const merged = { ...existing, ...data, id };
    const { error, value } = AudioSource.validate(merged);
    if (error) {
      throw new Error(`Validation error: ${error.message}`);
    }

    const stmt = this.db.prepare(`
      UPDATE audio_sources
      SET type = ?, name = ?, is_available = ?, is_active = ?, connection_status = ?, metadata = ?
      WHERE id = ?
    `);

    stmt.run(
      value.type,
      value.name,
      value.isAvailable ? 1 : 0,
      value.isActive ? 1 : 0,
      value.connectionStatus,
      JSON.stringify(value.metadata),
      id,
    );

    return this.findById(id);
  }

  delete(id) {
    const stmt = this.db.prepare('DELETE FROM audio_sources WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  _deserialize(row) {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      isAvailable: row.is_available === 1,
      isActive: row.is_active === 1,
      connectionStatus: row.connection_status,
      metadata: JSON.parse(row.metadata),
      createdAt: row.created_at,
    };
  }
}

module.exports = AudioSource;
