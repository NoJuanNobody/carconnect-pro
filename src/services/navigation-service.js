'use strict';

const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const {
  haversineDistance,
  calculateBearing,
  calculateEta,
  calculateRouteDistance,
  bearingToDirection,
  isValidCoordinate,
} = require('../utils/geo-calculations');
const { TrafficApi } = require('../integrations/traffic-api');

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
 * Navigation session states.
 */
const NAV_STATES = {
  PLANNING: 'planning',
  NAVIGATING: 'navigating',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const MAX_RECENT_DESTINATIONS = 25;
const DEFAULT_SPEED_KMH = 60;

class NavigationService {
  constructor(options = {}) {
    this.trafficApi = options.trafficApi || new TrafficApi();
    this.sessions = new Map();
    this.recentDestinations = new Map(); // userId -> array
    this.currentPosition = null;
    this.gpsSignalStatus = 'acquired';
    this.voiceGuidanceCallbacks = [];
    this.preferences = {
      avoidTolls: false,
      avoidHighways: false,
      units: 'km',
      voiceGuidance: true,
    };
  }

  /**
   * Update current GPS position.
   * @param {object} position - { latitude, longitude, accuracy, heading, speed, timestamp }
   * @returns {object} position with metadata
   */
  updatePosition(position) {
    if (!isValidCoordinate(position.latitude, position.longitude)) {
      throw new Error('Invalid GPS coordinates');
    }

    const prev = this.currentPosition;
    this.currentPosition = {
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy || null,
      heading: position.heading || null,
      speed: position.speed || null,
      timestamp: position.timestamp || new Date().toISOString(),
    };

    if (prev) {
      this.gpsSignalStatus = 'acquired';
    }

    // Update any active navigation sessions
    for (const [, session] of this.sessions) {
      if (session.state === NAV_STATES.NAVIGATING) {
        this._updateActiveSession(session);
      }
    }

    logger.info('GPS position updated', {
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
    });

    return this.currentPosition;
  }

  /**
   * Handle GPS signal loss.
   */
  handleSignalLoss() {
    this.gpsSignalStatus = 'lost';
    logger.warn('GPS signal lost');

    for (const [, session] of this.sessions) {
      if (session.state === NAV_STATES.NAVIGATING) {
        session.gpsSignalLost = true;
        session.lastKnownPosition = this.currentPosition;
      }
    }

    return { status: 'signal_lost', lastKnownPosition: this.currentPosition };
  }

  /**
   * Handle GPS signal recovery.
   */
  handleSignalRecovery() {
    this.gpsSignalStatus = 'acquired';
    logger.info('GPS signal recovered');

    for (const [, session] of this.sessions) {
      if (session.state === NAV_STATES.NAVIGATING && session.gpsSignalLost) {
        session.gpsSignalLost = false;
      }
    }

    return { status: 'signal_recovered' };
  }

  /**
   * Plan a route from origin to destination with optional waypoints.
   * @param {object} options - { origin, destination, waypoints, preferences }
   * @returns {Promise<object>} navigation session
   */
  async planRoute(options) {
    const { origin, destination, waypoints = [], preferences = {} } = options;

    if (!origin || !isValidCoordinate(origin.latitude, origin.longitude)) {
      throw new Error('Invalid origin coordinates');
    }
    if (!destination || !isValidCoordinate(destination.latitude, destination.longitude)) {
      throw new Error('Invalid destination coordinates');
    }

    const mergedPrefs = { ...this.preferences, ...preferences };

    // Build full waypoint list
    const allWaypoints = [origin, ...waypoints, destination];

    // Calculate route distance
    const distanceKm = calculateRouteDistance(allWaypoints);
    const distanceMi = calculateRouteDistance(allWaypoints, 'mi');

    // Get traffic data
    const traffic = await this.trafficApi.getTrafficForRoute(allWaypoints);

    // Calculate ETA
    const speedKmh = this.currentPosition?.speed
      ? this.currentPosition.speed * 3.6
      : DEFAULT_SPEED_KMH;
    const eta = calculateEta(distanceKm, speedKmh, traffic.averageMultiplier);

    // Generate turn-by-turn instructions
    const instructions = this._generateInstructions(allWaypoints);

    const session = {
      id: uuidv4(),
      state: NAV_STATES.PLANNING,
      origin,
      destination,
      waypoints,
      allWaypoints,
      distanceKm: Math.round(distanceKm * 100) / 100,
      distanceMi: Math.round(distanceMi * 100) / 100,
      traffic,
      eta,
      instructions,
      preferences: mergedPrefs,
      currentInstructionIndex: 0,
      gpsSignalLost: false,
      lastKnownPosition: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(session.id, session);

    logger.info('Route planned', {
      sessionId: session.id,
      distanceKm: session.distanceKm,
      etaMinutes: eta.etaMinutes,
    });

    return session;
  }

  /**
   * Start navigation for a planned session.
   * @param {string} sessionId
   * @returns {object} updated session
   */
  startNavigation(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Navigation session not found');
    }
    if (session.state !== NAV_STATES.PLANNING) {
      throw new Error(`Cannot start navigation from state: ${session.state}`);
    }

    session.state = NAV_STATES.NAVIGATING;
    session.startedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    this._triggerVoiceGuidance({
      type: 'navigation_started',
      instruction: session.instructions[0],
    });

    logger.info('Navigation started', { sessionId });
    return session;
  }

  /**
   * Pause active navigation.
   * @param {string} sessionId
   * @returns {object} updated session
   */
  pauseNavigation(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Navigation session not found');
    }
    if (session.state !== NAV_STATES.NAVIGATING) {
      throw new Error(`Cannot pause navigation from state: ${session.state}`);
    }

    session.state = NAV_STATES.PAUSED;
    session.updatedAt = new Date().toISOString();

    logger.info('Navigation paused', { sessionId });
    return session;
  }

  /**
   * Resume paused navigation.
   * @param {string} sessionId
   * @returns {object} updated session
   */
  resumeNavigation(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Navigation session not found');
    }
    if (session.state !== NAV_STATES.PAUSED) {
      throw new Error(`Cannot resume navigation from state: ${session.state}`);
    }

    session.state = NAV_STATES.NAVIGATING;
    session.updatedAt = new Date().toISOString();

    logger.info('Navigation resumed', { sessionId });
    return session;
  }

  /**
   * Cancel navigation.
   * @param {string} sessionId
   * @returns {object} updated session
   */
  cancelNavigation(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Navigation session not found');
    }
    if (session.state === NAV_STATES.COMPLETED || session.state === NAV_STATES.CANCELLED) {
      throw new Error(`Cannot cancel navigation from state: ${session.state}`);
    }

    session.state = NAV_STATES.CANCELLED;
    session.cancelledAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    logger.info('Navigation cancelled', { sessionId });
    return session;
  }

  /**
   * Complete navigation.
   * @param {string} sessionId
   * @returns {object} updated session
   */
  completeNavigation(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Navigation session not found');
    }
    if (session.state !== NAV_STATES.NAVIGATING) {
      throw new Error(`Cannot complete navigation from state: ${session.state}`);
    }

    session.state = NAV_STATES.COMPLETED;
    session.completedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    this._triggerVoiceGuidance({
      type: 'navigation_completed',
      message: 'You have arrived at your destination.',
    });

    logger.info('Navigation completed', { sessionId });
    return session;
  }

  /**
   * Get a navigation session.
   * @param {string} sessionId
   * @returns {object|null}
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Recalculate route with updated traffic.
   * @param {string} sessionId
   * @returns {Promise<object>} updated session
   */
  async recalculateRoute(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Navigation session not found');
    }

    const traffic = await this.trafficApi.getTrafficForRoute(session.allWaypoints);
    const speedKmh = this.currentPosition?.speed
      ? this.currentPosition.speed * 3.6
      : DEFAULT_SPEED_KMH;
    const eta = calculateEta(session.distanceKm, speedKmh, traffic.averageMultiplier);

    session.traffic = traffic;
    session.eta = eta;
    session.updatedAt = new Date().toISOString();

    logger.info('Route recalculated', {
      sessionId,
      etaMinutes: eta.etaMinutes,
    });

    return session;
  }

  /**
   * Add a recent destination for a user.
   * @param {string} userId
   * @param {object} destination - { latitude, longitude, name, address }
   */
  addRecentDestination(userId, destination) {
    if (!this.recentDestinations.has(userId)) {
      this.recentDestinations.set(userId, []);
    }

    const destinations = this.recentDestinations.get(userId);

    // Remove duplicate if exists
    const existingIndex = destinations.findIndex(
      (d) => d.latitude === destination.latitude && d.longitude === destination.longitude,
    );
    if (existingIndex !== -1) {
      destinations.splice(existingIndex, 1);
    }

    // Add to front
    destinations.unshift({
      ...destination,
      visitedAt: new Date().toISOString(),
    });

    // Trim to max
    if (destinations.length > MAX_RECENT_DESTINATIONS) {
      destinations.length = MAX_RECENT_DESTINATIONS;
    }
  }

  /**
   * Get recent destinations for a user.
   * @param {string} userId
   * @returns {Array}
   */
  getRecentDestinations(userId) {
    return this.recentDestinations.get(userId) || [];
  }

  /**
   * Set navigation preferences.
   * @param {object} preferences
   */
  setPreferences(preferences) {
    this.preferences = { ...this.preferences, ...preferences };
  }

  /**
   * Register a voice guidance callback.
   * @param {function} callback
   * @returns {function} unsubscribe
   */
  onVoiceGuidance(callback) {
    this.voiceGuidanceCallbacks.push(callback);
    return () => {
      this.voiceGuidanceCallbacks = this.voiceGuidanceCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  /**
   * Get current GPS status.
   * @returns {object}
   */
  getGpsStatus() {
    return {
      signalStatus: this.gpsSignalStatus,
      currentPosition: this.currentPosition,
      hasSignal: this.gpsSignalStatus === 'acquired',
    };
  }

  _updateActiveSession(session) {
    if (!this.currentPosition) return;

    const remaining = haversineDistance(
      this.currentPosition,
      session.destination,
    );

    // Check if close to destination (within 50 meters)
    if (remaining < 0.05) {
      this.completeNavigation(session.id);
    }
  }

  _generateInstructions(waypoints) {
    if (waypoints.length < 2) return [];

    const instructions = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = waypoints[i];
      const to = waypoints[i + 1];
      const bearing = calculateBearing(from, to);
      const direction = bearingToDirection(bearing);
      const distance = haversineDistance(from, to);

      instructions.push({
        step: i + 1,
        action: i === 0 ? 'depart' : 'continue',
        direction,
        bearing: Math.round(bearing),
        distanceKm: Math.round(distance * 100) / 100,
        description: i === 0
          ? `Head ${direction} for ${distance.toFixed(1)} km`
          : `Continue ${direction} for ${distance.toFixed(1)} km`,
        waypoint: to,
      });
    }

    // Add arrival instruction
    instructions.push({
      step: instructions.length + 1,
      action: 'arrive',
      direction: null,
      bearing: null,
      distanceKm: 0,
      description: 'Arrive at your destination',
      waypoint: waypoints[waypoints.length - 1],
    });

    return instructions;
  }

  _triggerVoiceGuidance(event) {
    if (!this.preferences.voiceGuidance) return;

    for (const callback of this.voiceGuidanceCallbacks) {
      try {
        callback(event);
      } catch (err) {
        logger.error('Voice guidance callback error', { error: err.message });
      }
    }
  }
}

module.exports = {
  NavigationService,
  NAV_STATES,
  MAX_RECENT_DESTINATIONS,
};
