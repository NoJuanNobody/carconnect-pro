'use strict';

const Database = require('better-sqlite3');
const UserProfile = require('../../../src/models/user-profile');
const migration = require('../../../src/database/migrations/001-initial-schema');

describe('UserProfile', () => {
  let db;
  let model;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    migration.up(db);
    model = new UserProfile(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('validate', () => {
    it('should validate a valid profile', () => {
      const { error } = UserProfile.validate({ name: 'Test User' });
      expect(error).toBeUndefined();
    });

    it('should require name', () => {
      const { error } = UserProfile.validate({});
      expect(error).toBeDefined();
      expect(error.message).toContain('name');
    });

    it('should reject name longer than 100 characters', () => {
      const { error } = UserProfile.validate({ name: 'a'.repeat(101) });
      expect(error).toBeDefined();
    });

    it('should reject empty name', () => {
      const { error } = UserProfile.validate({ name: '' });
      expect(error).toBeDefined();
    });

    it('should enforce max 5 bluetooth devices', () => {
      const devices = Array.from({ length: 6 }, (_, i) => ({
        id: `dev-${i}`,
        name: `Device ${i}`,
      }));
      const { error } = UserProfile.validate({ name: 'Test', bluetoothDevices: devices });
      expect(error).toBeDefined();
    });

    it('should enforce max 25 recent destinations', () => {
      const destinations = Array.from({ length: 26 }, (_, i) => ({
        lat: i,
        lng: i,
      }));
      const { error } = UserProfile.validate({ name: 'Test', recentDestinations: destinations });
      expect(error).toBeDefined();
    });

    it('should apply default audio preferences', () => {
      const { value } = UserProfile.validate({ name: 'Test' });
      expect(value.audioPreferences).toEqual({
        equalizer: { bass: 0, mid: 0, treble: 0 },
        volume: 50,
        balance: 0,
        fade: 0,
      });
    });

    it('should apply default display preferences', () => {
      const { value } = UserProfile.validate({ name: 'Test' });
      expect(value.displayPreferences).toEqual({
        brightness: 80,
        theme: 'auto',
        language: 'en',
      });
    });

    it('should apply default navigation preferences', () => {
      const { value } = UserProfile.validate({ name: 'Test' });
      expect(value.navigationPreferences).toEqual({
        voiceGuidance: true,
        routeOptions: {
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: false,
        },
      });
    });

    it('should validate display theme enum', () => {
      const { error } = UserProfile.validate({
        name: 'Test',
        displayPreferences: { theme: 'invalid' },
      });
      expect(error).toBeDefined();
    });

    it('should validate audio preferences ranges', () => {
      const { error } = UserProfile.validate({
        name: 'Test',
        audioPreferences: { volume: 150 },
      });
      expect(error).toBeDefined();
    });

    it('should validate bluetooth device requires name', () => {
      const { error } = UserProfile.validate({
        name: 'Test',
        bluetoothDevices: [{ id: '1' }],
      });
      expect(error).toBeDefined();
    });

    it('should validate destination coordinates', () => {
      const { error } = UserProfile.validate({
        name: 'Test',
        recentDestinations: [{ lat: 100, lng: 0 }],
      });
      expect(error).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a profile with defaults', () => {
      const profile = model.create({ name: 'Alice' });
      expect(profile.id).toBeDefined();
      expect(profile.name).toBe('Alice');
      expect(profile.createdAt).toBeDefined();
      expect(profile.updatedAt).toBeDefined();
      expect(profile.bluetoothDevices).toEqual([]);
      expect(profile.recentDestinations).toEqual([]);
    });

    it('should create a profile with custom preferences', () => {
      const profile = model.create({
        name: 'Bob',
        audioPreferences: { volume: 75 },
        displayPreferences: { theme: 'dark', brightness: 50 },
      });
      expect(profile.audioPreferences.volume).toBe(75);
      expect(profile.displayPreferences.theme).toBe('dark');
      expect(profile.displayPreferences.brightness).toBe(50);
    });

    it('should throw on invalid data', () => {
      expect(() => model.create({})).toThrow('Validation error');
    });

    it('should create with bluetooth devices', () => {
      const profile = model.create({
        name: 'Charlie',
        bluetoothDevices: [{ id: 'bt-1', name: 'Phone' }],
      });
      expect(profile.bluetoothDevices).toHaveLength(1);
      expect(profile.bluetoothDevices[0].name).toBe('Phone');
    });

    it('should create with recent destinations', () => {
      const profile = model.create({
        name: 'Diana',
        recentDestinations: [{ lat: 40.7128, lng: -74.006, name: 'NYC' }],
      });
      expect(profile.recentDestinations).toHaveLength(1);
      expect(profile.recentDestinations[0].lat).toBe(40.7128);
    });
  });

  describe('findById', () => {
    it('should find an existing profile', () => {
      const created = model.create({ name: 'Eve' });
      const found = model.findById(created.id);
      expect(found).toBeDefined();
      expect(found.name).toBe('Eve');
      expect(found.id).toBe(created.id);
    });

    it('should return null for non-existent id', () => {
      const found = model.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all profiles', () => {
      model.create({ name: 'User 1' });
      model.create({ name: 'User 2' });
      const all = model.findAll();
      expect(all).toHaveLength(2);
    });

    it('should return empty array when no profiles', () => {
      const all = model.findAll();
      expect(all).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update profile fields', () => {
      const created = model.create({ name: 'Frank' });
      db.prepare('UPDATE user_profiles SET updated_at = ? WHERE id = ?')
        .run('2000-01-01T00:00:00.000Z', created.id);
      const updated = model.update(created.id, { name: 'Franklin' });
      expect(updated.name).toBe('Franklin');
      expect(updated.updatedAt).not.toBe('2000-01-01T00:00:00.000Z');
    });

    it('should update audio preferences', () => {
      const created = model.create({ name: 'Grace' });
      const updated = model.update(created.id, {
        audioPreferences: { volume: 80, equalizer: { bass: 5, mid: 0, treble: 0 }, balance: 0, fade: 0 },
      });
      expect(updated.audioPreferences.volume).toBe(80);
      expect(updated.audioPreferences.equalizer.bass).toBe(5);
    });

    it('should throw for non-existent profile', () => {
      expect(() => model.update('non-existent', { name: 'Test' })).toThrow('not found');
    });

    it('should throw on invalid update data', () => {
      const created = model.create({ name: 'Hank' });
      expect(() => model.update(created.id, { name: '' })).toThrow('Validation error');
    });
  });

  describe('delete', () => {
    it('should delete an existing profile', () => {
      const created = model.create({ name: 'Ivy' });
      const result = model.delete(created.id);
      expect(result).toBe(true);
      expect(model.findById(created.id)).toBeNull();
    });

    it('should return false for non-existent profile', () => {
      const result = model.delete('non-existent');
      expect(result).toBe(false);
    });
  });
});
