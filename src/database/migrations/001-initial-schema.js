'use strict';

const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      audio_preferences TEXT NOT NULL DEFAULT '{}',
      display_preferences TEXT NOT NULL DEFAULT '{}',
      navigation_preferences TEXT NOT NULL DEFAULT '{}',
      bluetooth_devices TEXT NOT NULL DEFAULT '[]',
      recent_destinations TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audio_sources (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('radio', 'bluetooth', 'usb', 'aux', 'android_auto', 'apple_carplay')),
      name TEXT NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 0,
      connection_status TEXT NOT NULL DEFAULT 'disconnected',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navigation_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      origin TEXT NOT NULL DEFAULT '{}',
      destination TEXT NOT NULL DEFAULT '{}',
      waypoints TEXT NOT NULL DEFAULT '[]',
      route_data TEXT NOT NULL DEFAULT '{}',
      traffic_data TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning', 'navigating', 'paused', 'completed', 'cancelled')),
      eta TEXT,
      distance REAL,
      current_position TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES user_profiles(id)
    );

    CREATE TABLE IF NOT EXISTS vehicle_states (
      id TEXT PRIMARY KEY,
      ignition_status TEXT NOT NULL DEFAULT 'off',
      speed REAL NOT NULL DEFAULT 0,
      gear_position TEXT NOT NULL DEFAULT 'park',
      parking_brake INTEGER NOT NULL DEFAULT 1,
      steering_wheel_controls TEXT NOT NULL DEFAULT '{}',
      battery_voltage REAL NOT NULL DEFAULT 12.6,
      diagnostic_codes TEXT NOT NULL DEFAULT '[]',
      can_bus_status TEXT NOT NULL DEFAULT 'inactive',
      updated_at TEXT NOT NULL
    );
  `);
};

const down = (db) => {
  db.exec(`
    DROP TABLE IF EXISTS navigation_sessions;
    DROP TABLE IF EXISTS vehicle_states;
    DROP TABLE IF EXISTS audio_sources;
    DROP TABLE IF EXISTS user_profiles;
  `);
};

module.exports = { up, down };
