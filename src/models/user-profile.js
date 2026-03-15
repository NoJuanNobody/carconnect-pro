'use strict';

const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const DatabaseConnection = require('../database/connection');

const audioPreferencesSchema = Joi.object({
  equalizer: Joi.object({
    bass: Joi.number().min(-10).max(10).default(0),
    mid: Joi.number().min(-10).max(10).default(0),
    treble: Joi.number().min(-10).max(10).default(0),
  }).default(),
  volume: Joi.number().integer().min(0).max(100).default(50),
  balance: Joi.number().min(-10).max(10).default(0),
  fade: Joi.number().min(-10).max(10).default(0),
}).default();

const displayPreferencesSchema = Joi.object({
  brightness: Joi.number().integer().min(0).max(100).default(80),
  theme: Joi.string().valid('light', 'dark', 'auto').default('auto'),
  language: Joi.string().max(10).default('en'),
}).default();

const navigationPreferencesSchema = Joi.object({
  voiceGuidance: Joi.boolean().default(true),
  routeOptions: Joi.object({
    avoidTolls: Joi.boolean().default(false),
    avoidHighways: Joi.boolean().default(false),
    avoidFerries: Joi.boolean().default(false),
  }).default(),
}).default();

const bluetoothDeviceSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().max(100).required(),
  type: Joi.string().valid('phone', 'audio', 'other').default('other'),
  paired: Joi.boolean().default(false),
});

const destinationSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  name: Joi.string().max(200).default(''),
  address: Joi.string().max(500).default(''),
  visitedAt: Joi.string().isoDate(),
});

const userProfileSchema = Joi.object({
  id: Joi.string().uuid(),
  name: Joi.string().min(1).max(100).required(),
  audioPreferences: audioPreferencesSchema,
  displayPreferences: displayPreferencesSchema,
  navigationPreferences: navigationPreferencesSchema,
  bluetoothDevices: Joi.array().items(bluetoothDeviceSchema).max(5).default([]),
  recentDestinations: Joi.array().items(destinationSchema).max(25).default([]),
  createdAt: Joi.string().isoDate(),
  updatedAt: Joi.string().isoDate(),
});

class UserProfile {
  constructor(db) {
    this.db = db || DatabaseConnection.getInstance().getDb();
  }

  static validate(data) {
    return userProfileSchema.validate(data, { abortEarly: false });
  }

  create(data) {
    const { error, value } = UserProfile.validate(data);
    if (error) {
      throw new Error(`Validation error: ${error.message}`);
    }

    const now = new Date().toISOString();
    const profile = {
      id: value.id || uuidv4(),
      name: value.name,
      audioPreferences: value.audioPreferences,
      displayPreferences: value.displayPreferences,
      navigationPreferences: value.navigationPreferences,
      bluetoothDevices: value.bluetoothDevices,
      recentDestinations: value.recentDestinations,
      createdAt: value.createdAt || now,
      updatedAt: value.updatedAt || now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO user_profiles (id, name, audio_preferences, display_preferences, navigation_preferences, bluetooth_devices, recent_destinations, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      profile.id,
      profile.name,
      JSON.stringify(profile.audioPreferences),
      JSON.stringify(profile.displayPreferences),
      JSON.stringify(profile.navigationPreferences),
      JSON.stringify(profile.bluetoothDevices),
      JSON.stringify(profile.recentDestinations),
      profile.createdAt,
      profile.updatedAt,
    );

    return profile;
  }

  findById(id) {
    const stmt = this.db.prepare('SELECT * FROM user_profiles WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;
    return this._deserialize(row);
  }

  findAll() {
    const stmt = this.db.prepare('SELECT * FROM user_profiles');
    return stmt.all().map((row) => this._deserialize(row));
  }

  update(id, data) {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error(`UserProfile not found: ${id}`);
    }

    const merged = { ...existing, ...data, id };
    const { error, value } = UserProfile.validate(merged);
    if (error) {
      throw new Error(`Validation error: ${error.message}`);
    }

    const now = new Date().toISOString();
    value.updatedAt = now;

    const stmt = this.db.prepare(`
      UPDATE user_profiles
      SET name = ?, audio_preferences = ?, display_preferences = ?, navigation_preferences = ?, bluetooth_devices = ?, recent_destinations = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      value.name,
      JSON.stringify(value.audioPreferences),
      JSON.stringify(value.displayPreferences),
      JSON.stringify(value.navigationPreferences),
      JSON.stringify(value.bluetoothDevices),
      JSON.stringify(value.recentDestinations),
      value.updatedAt,
      id,
    );

    return this.findById(id);
  }

  delete(id) {
    const stmt = this.db.prepare('DELETE FROM user_profiles WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  _deserialize(row) {
    return {
      id: row.id,
      name: row.name,
      audioPreferences: JSON.parse(row.audio_preferences),
      displayPreferences: JSON.parse(row.display_preferences),
      navigationPreferences: JSON.parse(row.navigation_preferences),
      bluetoothDevices: JSON.parse(row.bluetooth_devices),
      recentDestinations: JSON.parse(row.recent_destinations),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

module.exports = UserProfile;
