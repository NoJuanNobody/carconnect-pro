'use strict';

const Database = require('better-sqlite3');
const NavigationSession = require('../../../src/models/navigation-session');
const UserProfile = require('../../../src/models/user-profile');
const migration = require('../../../src/database/migrations/001-initial-schema');

describe('NavigationSession', () => {
  let db;
  let model;
  let userModel;
  let testUserId;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    migration.up(db);
    model = new NavigationSession(db);
    userModel = new UserProfile(db);
    const user = userModel.create({ name: 'Nav Test User' });
    testUserId = user.id;
  });

  afterEach(() => {
    db.close();
  });

  const validSession = () => ({
    userId: testUserId,
    origin: { lat: 40.7128, lng: -74.006 },
    destination: { lat: 34.0522, lng: -118.2437 },
  });

  describe('static properties', () => {
    it('should expose STATUSES', () => {
      expect(NavigationSession.STATUSES).toEqual([
        'planning', 'navigating', 'paused', 'completed', 'cancelled',
      ]);
    });
  });

  describe('validate', () => {
    it('should validate a valid session', () => {
      const { error } = NavigationSession.validate(validSession());
      expect(error).toBeUndefined();
    });

    it('should require userId', () => {
      const { error } = NavigationSession.validate({
        origin: { lat: 0, lng: 0 },
        destination: { lat: 1, lng: 1 },
      });
      expect(error).toBeDefined();
    });

    it('should require origin', () => {
      const { error } = NavigationSession.validate({
        userId: testUserId,
        destination: { lat: 1, lng: 1 },
      });
      expect(error).toBeDefined();
    });

    it('should require destination', () => {
      const { error } = NavigationSession.validate({
        userId: testUserId,
        origin: { lat: 0, lng: 0 },
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid lat', () => {
      const { error } = NavigationSession.validate({
        ...validSession(),
        origin: { lat: 100, lng: 0 },
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid lng', () => {
      const { error } = NavigationSession.validate({
        ...validSession(),
        destination: { lat: 0, lng: 200 },
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid status', () => {
      const { error } = NavigationSession.validate({
        ...validSession(),
        status: 'invalid',
      });
      expect(error).toBeDefined();
    });

    it('should enforce max 20 waypoints', () => {
      const waypoints = Array.from({ length: 21 }, (_, i) => ({ lat: i, lng: i }));
      const { error } = NavigationSession.validate({
        ...validSession(),
        waypoints,
      });
      expect(error).toBeDefined();
    });

    it('should apply defaults', () => {
      const { value } = NavigationSession.validate(validSession());
      expect(value.status).toBe('planning');
      expect(value.waypoints).toEqual([]);
      expect(value.routeData).toEqual({});
      expect(value.trafficData).toEqual({});
      expect(value.eta).toBeNull();
      expect(value.distance).toBeNull();
    });

    it('should reject negative distance', () => {
      const { error } = NavigationSession.validate({
        ...validSession(),
        distance: -5,
      });
      expect(error).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a session with defaults', () => {
      const session = model.create(validSession());
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(testUserId);
      expect(session.status).toBe('planning');
      expect(session.createdAt).toBeDefined();
      expect(session.updatedAt).toBeDefined();
    });

    it('should create with all fields', () => {
      const session = model.create({
        ...validSession(),
        waypoints: [{ lat: 37.7749, lng: -122.4194 }],
        status: 'navigating',
        eta: '2026-01-01T12:00:00.000Z',
        distance: 4500.5,
      });
      expect(session.waypoints).toHaveLength(1);
      expect(session.status).toBe('navigating');
      expect(session.eta).toBe('2026-01-01T12:00:00.000Z');
      expect(session.distance).toBe(4500.5);
    });

    it('should throw on invalid data', () => {
      expect(() => model.create({})).toThrow('Validation error');
    });

    it('should enforce foreign key on userId', () => {
      expect(() => model.create({
        userId: '00000000-0000-0000-0000-000000000000',
        origin: { lat: 0, lng: 0 },
        destination: { lat: 1, lng: 1 },
      })).toThrow();
    });
  });

  describe('findById', () => {
    it('should find an existing session', () => {
      const created = model.create(validSession());
      const found = model.findById(created.id);
      expect(found).toBeDefined();
      expect(found.userId).toBe(testUserId);
    });

    it('should return null for non-existent', () => {
      expect(model.findById('non-existent')).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all sessions', () => {
      model.create(validSession());
      model.create(validSession());
      expect(model.findAll()).toHaveLength(2);
    });

    it('should return empty array when none exist', () => {
      expect(model.findAll()).toEqual([]);
    });
  });

  describe('findByUserId', () => {
    it('should find sessions for a user', () => {
      model.create(validSession());
      model.create(validSession());
      const sessions = model.findByUserId(testUserId);
      expect(sessions).toHaveLength(2);
    });

    it('should return empty for user with no sessions', () => {
      const user2 = userModel.create({ name: 'User 2' });
      expect(model.findByUserId(user2.id)).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should find sessions by status', () => {
      model.create(validSession());
      model.create({ ...validSession(), status: 'navigating' });
      expect(model.findByStatus('planning')).toHaveLength(1);
      expect(model.findByStatus('navigating')).toHaveLength(1);
    });

    it('should return empty for no matches', () => {
      expect(model.findByStatus('completed')).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update session fields', () => {
      const created = model.create(validSession());
      // Set createdAt to past so updatedAt will differ
      db.prepare('UPDATE navigation_sessions SET updated_at = ? WHERE id = ?')
        .run('2000-01-01T00:00:00.000Z', created.id);
      const updated = model.update(created.id, { status: 'navigating' });
      expect(updated.status).toBe('navigating');
      expect(updated.updatedAt).not.toBe('2000-01-01T00:00:00.000Z');
    });

    it('should update eta and distance', () => {
      const created = model.create(validSession());
      const updated = model.update(created.id, {
        eta: '2026-06-01T15:00:00.000Z',
        distance: 1234.5,
      });
      expect(updated.eta).toBe('2026-06-01T15:00:00.000Z');
      expect(updated.distance).toBe(1234.5);
    });

    it('should throw for non-existent session', () => {
      expect(() => model.update('non-existent', { status: 'paused' })).toThrow('not found');
    });

    it('should throw on invalid update', () => {
      const created = model.create(validSession());
      expect(() => model.update(created.id, { status: 'invalid' })).toThrow('Validation error');
    });
  });

  describe('delete', () => {
    it('should delete an existing session', () => {
      const created = model.create(validSession());
      expect(model.delete(created.id)).toBe(true);
      expect(model.findById(created.id)).toBeNull();
    });

    it('should return false for non-existent', () => {
      expect(model.delete('non-existent')).toBe(false);
    });
  });
});
