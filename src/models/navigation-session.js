'use strict';

const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const DatabaseConnection = require('../database/connection');

const STATUSES = ['planning', 'navigating', 'paused', 'completed', 'cancelled'];

const coordinateSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
});

const navigationSessionSchema = Joi.object({
  id: Joi.string().uuid(),
  userId: Joi.string().uuid().required(),
  origin: coordinateSchema.required(),
  destination: coordinateSchema.required(),
  waypoints: Joi.array().items(coordinateSchema).max(20).default([]),
  routeData: Joi.object().default({}),
  trafficData: Joi.object().default({}),
  status: Joi.string().valid(...STATUSES).default('planning'),
  eta: Joi.string().isoDate().allow(null).default(null),
  distance: Joi.number().min(0).allow(null).default(null),
  currentPosition: coordinateSchema.default({ lat: 0, lng: 0 }),
  createdAt: Joi.string().isoDate(),
  updatedAt: Joi.string().isoDate(),
});

class NavigationSession {
  constructor(db) {
    this.db = db || DatabaseConnection.getInstance().getDb();
  }

  static validate(data) {
    return navigationSessionSchema.validate(data, { abortEarly: false });
  }

  static get STATUSES() {
    return STATUSES;
  }

  create(data) {
    const { error, value } = NavigationSession.validate(data);
    if (error) {
      throw new Error(`Validation error: ${error.message}`);
    }

    const now = new Date().toISOString();
    const session = {
      id: value.id || uuidv4(),
      userId: value.userId,
      origin: value.origin,
      destination: value.destination,
      waypoints: value.waypoints,
      routeData: value.routeData,
      trafficData: value.trafficData,
      status: value.status,
      eta: value.eta,
      distance: value.distance,
      currentPosition: value.currentPosition,
      createdAt: value.createdAt || now,
      updatedAt: value.updatedAt || now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO navigation_sessions (id, user_id, origin, destination, waypoints, route_data, traffic_data, status, eta, distance, current_position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      session.id,
      session.userId,
      JSON.stringify(session.origin),
      JSON.stringify(session.destination),
      JSON.stringify(session.waypoints),
      JSON.stringify(session.routeData),
      JSON.stringify(session.trafficData),
      session.status,
      session.eta,
      session.distance,
      JSON.stringify(session.currentPosition),
      session.createdAt,
      session.updatedAt,
    );

    return session;
  }

  findById(id) {
    const stmt = this.db.prepare('SELECT * FROM navigation_sessions WHERE id = ?');
    const row = stmt.get(id);
    if (!row) {return null;}
    return this._deserialize(row);
  }

  findAll() {
    const stmt = this.db.prepare('SELECT * FROM navigation_sessions');
    return stmt.all().map((row) => this._deserialize(row));
  }

  findByUserId(userId) {
    const stmt = this.db.prepare('SELECT * FROM navigation_sessions WHERE user_id = ?');
    return stmt.all(userId).map((row) => this._deserialize(row));
  }

  findByStatus(status) {
    const stmt = this.db.prepare('SELECT * FROM navigation_sessions WHERE status = ?');
    return stmt.all(status).map((row) => this._deserialize(row));
  }

  update(id, data) {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error(`NavigationSession not found: ${id}`);
    }

    const merged = { ...existing, ...data, id };
    const { error, value } = NavigationSession.validate(merged);
    if (error) {
      throw new Error(`Validation error: ${error.message}`);
    }

    const now = new Date().toISOString();
    value.updatedAt = now;

    const stmt = this.db.prepare(`
      UPDATE navigation_sessions
      SET user_id = ?, origin = ?, destination = ?, waypoints = ?, route_data = ?, traffic_data = ?, status = ?, eta = ?, distance = ?, current_position = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      value.userId,
      JSON.stringify(value.origin),
      JSON.stringify(value.destination),
      JSON.stringify(value.waypoints),
      JSON.stringify(value.routeData),
      JSON.stringify(value.trafficData),
      value.status,
      value.eta,
      value.distance,
      JSON.stringify(value.currentPosition),
      value.updatedAt,
      id,
    );

    return this.findById(id);
  }

  delete(id) {
    const stmt = this.db.prepare('DELETE FROM navigation_sessions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  _deserialize(row) {
    return {
      id: row.id,
      userId: row.user_id,
      origin: JSON.parse(row.origin),
      destination: JSON.parse(row.destination),
      waypoints: JSON.parse(row.waypoints),
      routeData: JSON.parse(row.route_data),
      trafficData: JSON.parse(row.traffic_data),
      status: row.status,
      eta: row.eta,
      distance: row.distance,
      currentPosition: JSON.parse(row.current_position),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

module.exports = NavigationSession;
