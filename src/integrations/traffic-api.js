'use strict';

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

/**
 * Traffic severity levels.
 */
const TRAFFIC_SEVERITY = {
  NONE: 'none',
  LOW: 'low',
  MODERATE: 'moderate',
  HEAVY: 'heavy',
  SEVERE: 'severe',
};

/**
 * Traffic multipliers per severity.
 */
const SEVERITY_MULTIPLIERS = {
  [TRAFFIC_SEVERITY.NONE]: 1.0,
  [TRAFFIC_SEVERITY.LOW]: 1.15,
  [TRAFFIC_SEVERITY.MODERATE]: 1.35,
  [TRAFFIC_SEVERITY.HEAVY]: 1.65,
  [TRAFFIC_SEVERITY.SEVERE]: 2.2,
};

/**
 * Simulated traffic data provider.
 * In production, this would connect to a real traffic API.
 */
class TrafficApi {
  constructor() {
    this.incidents = new Map();
    this.listeners = [];
    this._simulationInterval = null;
  }

  /**
   * Fetch traffic conditions for a route segment.
   * @param {object} from - { latitude, longitude }
   * @param {object} to - { latitude, longitude }
   * @returns {Promise<object>} traffic data
   */
  async getTrafficForSegment(from, to) {
    // Simulated traffic data based on coordinate hash
    const hash = Math.abs(
      (from.latitude * 1000 + from.longitude * 100 +
       to.latitude * 10 + to.longitude) % 5,
    );

    const severities = Object.values(TRAFFIC_SEVERITY);
    const severity = severities[Math.floor(hash) % severities.length];

    const result = {
      from,
      to,
      severity,
      multiplier: SEVERITY_MULTIPLIERS[severity],
      speedKmh: this._estimateSpeed(severity),
      incidents: this._getIncidentsNear(from, to),
      lastUpdated: new Date().toISOString(),
    };

    logger.info('Traffic data fetched for segment', {
      severity,
      multiplier: result.multiplier,
    });

    return result;
  }

  /**
   * Fetch traffic conditions for an entire route.
   * @param {Array<object>} waypoints - array of { latitude, longitude }
   * @returns {Promise<object>} aggregated traffic data
   */
  async getTrafficForRoute(waypoints) {
    if (!waypoints || waypoints.length < 2) {
      return {
        segments: [],
        overallSeverity: TRAFFIC_SEVERITY.NONE,
        averageMultiplier: 1.0,
        totalIncidents: 0,
      };
    }

    const segments = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const segment = await this.getTrafficForSegment(
        waypoints[i],
        waypoints[i + 1],
      );
      segments.push(segment);
    }

    const avgMultiplier =
      segments.reduce((sum, s) => sum + s.multiplier, 0) / segments.length;

    const totalIncidents = segments.reduce(
      (sum, s) => sum + s.incidents.length,
      0,
    );

    const overallSeverity = this._multiplierToSeverity(avgMultiplier);

    return {
      segments,
      overallSeverity,
      averageMultiplier: Math.round(avgMultiplier * 100) / 100,
      totalIncidents,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Report a traffic incident.
   * @param {object} incident - { latitude, longitude, type, description }
   * @returns {object} stored incident
   */
  reportIncident(incident) {
    const id = `incident_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const stored = {
      id,
      ...incident,
      reportedAt: new Date().toISOString(),
      active: true,
    };
    this.incidents.set(id, stored);

    logger.info('Traffic incident reported', { id, type: incident.type });

    this._notifyListeners({
      type: 'incident_reported',
      incident: stored,
    });

    return stored;
  }

  /**
   * Clear a traffic incident.
   * @param {string} incidentId
   * @returns {boolean}
   */
  clearIncident(incidentId) {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    incident.active = false;
    incident.clearedAt = new Date().toISOString();

    this._notifyListeners({
      type: 'incident_cleared',
      incident,
    });

    return true;
  }

  /**
   * Subscribe to traffic updates.
   * @param {function} callback
   * @returns {function} unsubscribe function
   */
  onUpdate(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Start simulated traffic updates.
   * @param {number} intervalMs
   */
  startSimulation(intervalMs = 30000) {
    this.stopSimulation();
    this._simulationInterval = setInterval(() => {
      this._notifyListeners({
        type: 'traffic_update',
        timestamp: new Date().toISOString(),
      });
    }, intervalMs);
  }

  /**
   * Stop simulated traffic updates.
   */
  stopSimulation() {
    if (this._simulationInterval) {
      clearInterval(this._simulationInterval);
      this._simulationInterval = null;
    }
  }

  _estimateSpeed(severity) {
    const speeds = {
      [TRAFFIC_SEVERITY.NONE]: 80,
      [TRAFFIC_SEVERITY.LOW]: 65,
      [TRAFFIC_SEVERITY.MODERATE]: 45,
      [TRAFFIC_SEVERITY.HEAVY]: 25,
      [TRAFFIC_SEVERITY.SEVERE]: 10,
    };
    return speeds[severity] || 60;
  }

  _getIncidentsNear(from, to) {
    return Array.from(this.incidents.values()).filter((incident) => {
      if (!incident.active) return false;
      const lat = incident.latitude;
      const lon = incident.longitude;
      const minLat = Math.min(from.latitude, to.latitude) - 0.1;
      const maxLat = Math.max(from.latitude, to.latitude) + 0.1;
      const minLon = Math.min(from.longitude, to.longitude) - 0.1;
      const maxLon = Math.max(from.longitude, to.longitude) + 0.1;
      return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
    });
  }

  _multiplierToSeverity(multiplier) {
    if (multiplier >= 2.0) return TRAFFIC_SEVERITY.SEVERE;
    if (multiplier >= 1.5) return TRAFFIC_SEVERITY.HEAVY;
    if (multiplier >= 1.25) return TRAFFIC_SEVERITY.MODERATE;
    if (multiplier >= 1.1) return TRAFFIC_SEVERITY.LOW;
    return TRAFFIC_SEVERITY.NONE;
  }

  _notifyListeners(event) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        logger.error('Traffic listener error', { error: err.message });
      }
    }
  }
}

module.exports = {
  TrafficApi,
  TRAFFIC_SEVERITY,
  SEVERITY_MULTIPLIERS,
};
