'use strict';

const Database = require('better-sqlite3');
const AudioSource = require('../../../src/models/audio-source');
const migration = require('../../../src/database/migrations/001-initial-schema');

describe('AudioSource', () => {
  let db;
  let model;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    migration.up(db);
    model = new AudioSource(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('static properties', () => {
    it('should expose TYPES', () => {
      expect(AudioSource.TYPES).toEqual([
        'radio', 'bluetooth', 'usb', 'aux', 'android_auto', 'apple_carplay',
      ]);
    });

    it('should expose CONNECTION_STATUSES', () => {
      expect(AudioSource.CONNECTION_STATUSES).toEqual([
        'connected', 'disconnected', 'connecting', 'error',
      ]);
    });
  });

  describe('validate', () => {
    it('should validate a valid audio source', () => {
      const { error } = AudioSource.validate({ type: 'radio', name: 'FM Radio' });
      expect(error).toBeUndefined();
    });

    it('should require type', () => {
      const { error } = AudioSource.validate({ name: 'Test' });
      expect(error).toBeDefined();
    });

    it('should require name', () => {
      const { error } = AudioSource.validate({ type: 'radio' });
      expect(error).toBeDefined();
    });

    it('should reject invalid type', () => {
      const { error } = AudioSource.validate({ type: 'invalid', name: 'Test' });
      expect(error).toBeDefined();
    });

    it('should reject invalid connection status', () => {
      const { error } = AudioSource.validate({
        type: 'radio',
        name: 'Test',
        connectionStatus: 'invalid',
      });
      expect(error).toBeDefined();
    });

    it('should reject name longer than 100 chars', () => {
      const { error } = AudioSource.validate({
        type: 'radio',
        name: 'a'.repeat(101),
      });
      expect(error).toBeDefined();
    });

    it('should apply defaults', () => {
      const { value } = AudioSource.validate({ type: 'bluetooth', name: 'BT' });
      expect(value.isAvailable).toBe(false);
      expect(value.isActive).toBe(false);
      expect(value.connectionStatus).toBe('disconnected');
      expect(value.metadata).toEqual({});
    });
  });

  describe('create', () => {
    it('should create an audio source', () => {
      const source = model.create({ type: 'radio', name: 'FM Radio' });
      expect(source.id).toBeDefined();
      expect(source.type).toBe('radio');
      expect(source.name).toBe('FM Radio');
      expect(source.isAvailable).toBe(false);
      expect(source.isActive).toBe(false);
      expect(source.createdAt).toBeDefined();
    });

    it('should create with all fields', () => {
      const source = model.create({
        type: 'bluetooth',
        name: 'BT Speaker',
        isAvailable: true,
        isActive: true,
        connectionStatus: 'connected',
        metadata: { codec: 'AAC' },
      });
      expect(source.isAvailable).toBe(true);
      expect(source.isActive).toBe(true);
      expect(source.connectionStatus).toBe('connected');
      expect(source.metadata.codec).toBe('AAC');
    });

    it('should throw on invalid data', () => {
      expect(() => model.create({ type: 'invalid', name: 'Test' })).toThrow('Validation error');
    });

    it('should create each valid type', () => {
      AudioSource.TYPES.forEach((type) => {
        const source = model.create({ type, name: `Source ${type}` });
        expect(source.type).toBe(type);
      });
    });
  });

  describe('findById', () => {
    it('should find an existing source', () => {
      const created = model.create({ type: 'usb', name: 'USB Drive' });
      const found = model.findById(created.id);
      expect(found).toBeDefined();
      expect(found.name).toBe('USB Drive');
    });

    it('should return null for non-existent id', () => {
      expect(model.findById('non-existent')).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all sources', () => {
      model.create({ type: 'radio', name: 'FM' });
      model.create({ type: 'aux', name: 'AUX' });
      expect(model.findAll()).toHaveLength(2);
    });

    it('should return empty array when none exist', () => {
      expect(model.findAll()).toEqual([]);
    });
  });

  describe('findByType', () => {
    it('should find sources by type', () => {
      model.create({ type: 'radio', name: 'FM' });
      model.create({ type: 'radio', name: 'AM' });
      model.create({ type: 'aux', name: 'AUX' });
      const radios = model.findByType('radio');
      expect(radios).toHaveLength(2);
    });

    it('should return empty for no matches', () => {
      expect(model.findByType('bluetooth')).toEqual([]);
    });
  });

  describe('findActive', () => {
    it('should find active sources', () => {
      model.create({ type: 'radio', name: 'FM', isActive: true });
      model.create({ type: 'aux', name: 'AUX', isActive: false });
      const active = model.findActive();
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('FM');
    });
  });

  describe('update', () => {
    it('should update source fields', () => {
      const created = model.create({ type: 'radio', name: 'FM' });
      const updated = model.update(created.id, { name: 'FM Radio', isAvailable: true });
      expect(updated.name).toBe('FM Radio');
      expect(updated.isAvailable).toBe(true);
    });

    it('should update connection status', () => {
      const created = model.create({ type: 'bluetooth', name: 'BT' });
      const updated = model.update(created.id, { connectionStatus: 'connected' });
      expect(updated.connectionStatus).toBe('connected');
    });

    it('should throw for non-existent source', () => {
      expect(() => model.update('non-existent', { name: 'Test' })).toThrow('not found');
    });

    it('should throw on invalid update', () => {
      const created = model.create({ type: 'radio', name: 'FM' });
      expect(() => model.update(created.id, { type: 'invalid' })).toThrow('Validation error');
    });
  });

  describe('delete', () => {
    it('should delete an existing source', () => {
      const created = model.create({ type: 'radio', name: 'FM' });
      expect(model.delete(created.id)).toBe(true);
      expect(model.findById(created.id)).toBeNull();
    });

    it('should return false for non-existent', () => {
      expect(model.delete('non-existent')).toBe(false);
    });
  });
});
