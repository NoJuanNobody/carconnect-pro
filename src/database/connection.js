'use strict';

const Database = require('better-sqlite3');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' }),
  ],
});

let instance = null;

class DatabaseConnection {
  constructor(options = {}) {
    const dbPath = options.path || process.env.DB_PATH || ':memory:';
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    logger.info('Database connection established', { path: dbPath });
  }

  static getInstance(options = {}) {
    if (!instance) {
      instance = new DatabaseConnection(options);
    }
    return instance;
  }

  static resetInstance() {
    if (instance) {
      instance.close();
      instance = null;
    }
  }

  getDb() {
    return this.db;
  }

  close() {
    if (this.db && this.db.open) {
      this.db.close();
      logger.info('Database connection closed');
    }
  }

  runMigrations() {
    const migration = require('./migrations/001-initial-schema');
    migration.up(this.db);
    logger.info('Migrations completed');
  }
}

module.exports = DatabaseConnection;
