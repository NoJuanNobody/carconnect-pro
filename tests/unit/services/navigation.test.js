'use strict';

const {
  NavigationService,
  NAV_STATES,
  MAX_RECENT_DESTINATIONS,
} = require('../../../src/services/navigation-service');
const {
  haversineDistance,
  calculateBearing,
  calculateEta,
  calculateRouteDistance,
  bearingToDirection,
  isValidCoordinate,
} = require('../../../src/utils/geo-calculations');
const { TrafficApi, TRAFFIC_SEVERITY } = require('../../../src/integrations/traffic-api');

// --- Geo Calculations Tests ---

describe('geo-calculations', () => {
  describe('haversineDistance', () => {
    it('should calculate distance between two points in km', () => {
      const nyc = { latitude: 40.7128, longitude: -74.006 };
      const la = { latitude: 34.0522, longitude: -118.2437 };
      const distance = haversineDistance(nyc, la);
      // ~3940 km
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    it('should calculate distance in miles', () => {
      const nyc = { latitude: 40.7128, longitude: -74.006 };
      const la = { latitude: 34.0522, longitude: -118.2437 };
      const distance = haversineDistance(nyc, la, 'mi');
      expect(distance).toBeGreaterThan(2400);
      expect(distance).toBeLessThan(2500);
    });

    it('should return 0 for same point', () => {
      const point = { latitude: 40.7128, longitude: -74.006 };
      expect(haversineDistance(point, point)).toBeCloseTo(0, 5);
    });
  });

  describe('calculateBearing', () => {
    it('should calculate bearing between two points', () => {
      const from = { latitude: 40.7128, longitude: -74.006 };
      const to = { latitude: 41.8781, longitude: -87.6298 };
      const bearing = calculateBearing(from, to);
      expect(bearing).toBeGreaterThan(0);
      expect(bearing).toBeLessThan(360);
    });

    it('should return ~0 for due north', () => {
      const from = { latitude: 0, longitude: 0 };
      const to = { latitude: 10, longitude: 0 };
      const bearing = calculateBearing(from, to);
      expect(bearing).toBeCloseTo(0, 0);
    });

    it('should return ~90 for due east', () => {
      const from = { latitude: 0, longitude: 0 };
      const to = { latitude: 0, longitude: 10 };
      const bearing = calculateBearing(from, to);
      expect(bearing).toBeCloseTo(90, 0);
    });
  });

  describe('calculateEta', () => {
    it('should calculate ETA correctly', () => {
      const result = calculateEta(120, 60);
      expect(result.etaMinutes).toBe(120);
      expect(result.etaDate).toBeInstanceOf(Date);
    });

    it('should apply traffic multiplier', () => {
      const result = calculateEta(120, 60, 1.5);
      expect(result.etaMinutes).toBe(180);
    });

    it('should handle zero speed', () => {
      const result = calculateEta(120, 0);
      expect(result.etaMinutes).toBe(Infinity);
      expect(result.etaDate).toBeNull();
    });
  });

  describe('calculateRouteDistance', () => {
    it('should calculate total route distance', () => {
      const waypoints = [
        { latitude: 0, longitude: 0 },
        { latitude: 1, longitude: 0 },
        { latitude: 1, longitude: 1 },
      ];
      const distance = calculateRouteDistance(waypoints);
      expect(distance).toBeGreaterThan(0);
    });

    it('should return 0 for fewer than 2 waypoints', () => {
      expect(calculateRouteDistance([])).toBe(0);
      expect(calculateRouteDistance([{ latitude: 0, longitude: 0 }])).toBe(0);
      expect(calculateRouteDistance(null)).toBe(0);
    });
  });

  describe('bearingToDirection', () => {
    it('should return N for 0 degrees', () => {
      expect(bearingToDirection(0)).toBe('N');
    });

    it('should return E for 90 degrees', () => {
      expect(bearingToDirection(90)).toBe('E');
    });

    it('should return S for 180 degrees', () => {
      expect(bearingToDirection(180)).toBe('S');
    });

    it('should return W for 270 degrees', () => {
      expect(bearingToDirection(270)).toBe('W');
    });
  });

  describe('isValidCoordinate', () => {
    it('should validate valid coordinates', () => {
      expect(isValidCoordinate(40.7128, -74.006)).toBe(true);
      expect(isValidCoordinate(0, 0)).toBe(true);
      expect(isValidCoordinate(-90, 180)).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      expect(isValidCoordinate(91, 0)).toBe(false);
      expect(isValidCoordinate(0, 181)).toBe(false);
      expect(isValidCoordinate(NaN, 0)).toBe(false);
      expect(isValidCoordinate('a', 0)).toBe(false);
    });
  });
});

// --- Traffic API Tests ---

describe('TrafficApi', () => {
  let trafficApi;

  beforeEach(() => {
    trafficApi = new TrafficApi();
  });

  afterEach(() => {
    trafficApi.stopSimulation();
  });

  describe('getTrafficForSegment', () => {
    it('should return traffic data for a segment', async () => {
      const from = { latitude: 40.7128, longitude: -74.006 };
      const to = { latitude: 40.758, longitude: -73.9855 };
      const result = await trafficApi.getTrafficForSegment(from, to);

      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('multiplier');
      expect(result).toHaveProperty('speedKmh');
      expect(result).toHaveProperty('incidents');
      expect(result).toHaveProperty('lastUpdated');
      expect(Object.values(TRAFFIC_SEVERITY)).toContain(result.severity);
    });
  });

  describe('getTrafficForRoute', () => {
    it('should return aggregated traffic for a route', async () => {
      const waypoints = [
        { latitude: 40.7128, longitude: -74.006 },
        { latitude: 40.758, longitude: -73.9855 },
        { latitude: 40.785, longitude: -73.968 },
      ];
      const result = await trafficApi.getTrafficForRoute(waypoints);

      expect(result).toHaveProperty('segments');
      expect(result.segments).toHaveLength(2);
      expect(result).toHaveProperty('overallSeverity');
      expect(result).toHaveProperty('averageMultiplier');
      expect(result.averageMultiplier).toBeGreaterThanOrEqual(1.0);
    });

    it('should handle empty waypoints', async () => {
      const result = await trafficApi.getTrafficForRoute([]);
      expect(result.segments).toHaveLength(0);
      expect(result.overallSeverity).toBe(TRAFFIC_SEVERITY.NONE);
    });
  });

  describe('incident management', () => {
    it('should report an incident', () => {
      const incident = trafficApi.reportIncident({
        latitude: 40.72,
        longitude: -74.0,
        type: 'accident',
        description: 'Minor fender bender',
      });

      expect(incident).toHaveProperty('id');
      expect(incident.active).toBe(true);
      expect(incident.type).toBe('accident');
    });

    it('should clear an incident', () => {
      const incident = trafficApi.reportIncident({
        latitude: 40.72,
        longitude: -74.0,
        type: 'accident',
      });
      const cleared = trafficApi.clearIncident(incident.id);
      expect(cleared).toBe(true);
    });

    it('should return false for non-existent incident', () => {
      expect(trafficApi.clearIncident('fake-id')).toBe(false);
    });
  });

  describe('listeners', () => {
    it('should notify listeners on incident report', () => {
      const events = [];
      trafficApi.onUpdate((event) => events.push(event));

      trafficApi.reportIncident({
        latitude: 40.72,
        longitude: -74.0,
        type: 'accident',
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('incident_reported');
    });

    it('should allow unsubscribing', () => {
      const events = [];
      const unsub = trafficApi.onUpdate((event) => events.push(event));
      unsub();

      trafficApi.reportIncident({
        latitude: 40.72,
        longitude: -74.0,
        type: 'accident',
      });

      expect(events).toHaveLength(0);
    });
  });
});

// --- Navigation Service Tests ---

describe('NavigationService', () => {
  let navService;
  let trafficApi;

  const origin = { latitude: 40.7128, longitude: -74.006 };
  const destination = { latitude: 40.758, longitude: -73.9855 };

  beforeEach(() => {
    trafficApi = new TrafficApi();
    navService = new NavigationService({ trafficApi });
  });

  afterEach(() => {
    trafficApi.stopSimulation();
  });

  describe('updatePosition', () => {
    it('should update current GPS position', () => {
      const pos = navService.updatePosition({
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 5,
      });

      expect(pos.latitude).toBe(40.7128);
      expect(pos.longitude).toBe(-74.006);
      expect(pos.accuracy).toBe(5);
    });

    it('should reject invalid coordinates', () => {
      expect(() => {
        navService.updatePosition({ latitude: 999, longitude: 0 });
      }).toThrow('Invalid GPS coordinates');
    });
  });

  describe('GPS signal handling', () => {
    it('should handle signal loss', () => {
      navService.updatePosition({ latitude: 40.7128, longitude: -74.006 });
      const result = navService.handleSignalLoss();
      expect(result.status).toBe('signal_lost');
      expect(navService.gpsSignalStatus).toBe('lost');
    });

    it('should handle signal recovery', () => {
      navService.handleSignalLoss();
      const result = navService.handleSignalRecovery();
      expect(result.status).toBe('signal_recovered');
      expect(navService.gpsSignalStatus).toBe('acquired');
    });

    it('should mark active sessions on signal loss', async () => {
      const session = await navService.planRoute({ origin, destination });
      navService.startNavigation(session.id);
      navService.updatePosition({ latitude: 40.7128, longitude: -74.006 });
      navService.handleSignalLoss();

      const updated = navService.getSession(session.id);
      expect(updated.gpsSignalLost).toBe(true);
    });
  });

  describe('planRoute', () => {
    it('should create a navigation session', async () => {
      const session = await navService.planRoute({ origin, destination });

      expect(session.id).toBeDefined();
      expect(session.state).toBe(NAV_STATES.PLANNING);
      expect(session.origin).toEqual(origin);
      expect(session.destination).toEqual(destination);
      expect(session.distanceKm).toBeGreaterThan(0);
      expect(session.instructions.length).toBeGreaterThan(0);
      expect(session.eta).toHaveProperty('etaMinutes');
    });

    it('should include waypoints', async () => {
      const waypoint = { latitude: 40.73, longitude: -73.995 };
      const session = await navService.planRoute({
        origin,
        destination,
        waypoints: [waypoint],
      });

      expect(session.waypoints).toHaveLength(1);
      expect(session.allWaypoints).toHaveLength(3);
    });

    it('should reject invalid origin', async () => {
      await expect(
        navService.planRoute({
          origin: { latitude: 999, longitude: 0 },
          destination,
        }),
      ).rejects.toThrow('Invalid origin coordinates');
    });

    it('should reject invalid destination', async () => {
      await expect(
        navService.planRoute({
          origin,
          destination: { latitude: 0, longitude: 999 },
        }),
      ).rejects.toThrow('Invalid destination coordinates');
    });

    it('should apply navigation preferences', async () => {
      const session = await navService.planRoute({
        origin,
        destination,
        preferences: { avoidTolls: true },
      });

      expect(session.preferences.avoidTolls).toBe(true);
    });
  });

  describe('session state management', () => {
    let sessionId;

    beforeEach(async () => {
      const session = await navService.planRoute({ origin, destination });
      sessionId = session.id;
    });

    it('should start navigation', () => {
      const session = navService.startNavigation(sessionId);
      expect(session.state).toBe(NAV_STATES.NAVIGATING);
      expect(session.startedAt).toBeDefined();
    });

    it('should pause navigation', () => {
      navService.startNavigation(sessionId);
      const session = navService.pauseNavigation(sessionId);
      expect(session.state).toBe(NAV_STATES.PAUSED);
    });

    it('should resume navigation', () => {
      navService.startNavigation(sessionId);
      navService.pauseNavigation(sessionId);
      const session = navService.resumeNavigation(sessionId);
      expect(session.state).toBe(NAV_STATES.NAVIGATING);
    });

    it('should cancel navigation', () => {
      navService.startNavigation(sessionId);
      const session = navService.cancelNavigation(sessionId);
      expect(session.state).toBe(NAV_STATES.CANCELLED);
    });

    it('should complete navigation', () => {
      navService.startNavigation(sessionId);
      const session = navService.completeNavigation(sessionId);
      expect(session.state).toBe(NAV_STATES.COMPLETED);
    });

    it('should not start from non-planning state', () => {
      navService.startNavigation(sessionId);
      expect(() => navService.startNavigation(sessionId)).toThrow(
        'Cannot start navigation from state',
      );
    });

    it('should not pause from non-navigating state', () => {
      expect(() => navService.pauseNavigation(sessionId)).toThrow(
        'Cannot pause navigation from state',
      );
    });

    it('should not resume from non-paused state', () => {
      expect(() => navService.resumeNavigation(sessionId)).toThrow(
        'Cannot resume navigation from state',
      );
    });

    it('should not cancel completed session', () => {
      navService.startNavigation(sessionId);
      navService.completeNavigation(sessionId);
      expect(() => navService.cancelNavigation(sessionId)).toThrow(
        'Cannot cancel navigation from state',
      );
    });

    it('should throw for non-existent session', () => {
      expect(() => navService.startNavigation('fake-id')).toThrow(
        'Navigation session not found',
      );
    });
  });

  describe('recalculateRoute', () => {
    it('should update traffic and ETA', async () => {
      const session = await navService.planRoute({ origin, destination });
      const updated = await navService.recalculateRoute(session.id);

      expect(updated.traffic).toBeDefined();
      expect(updated.eta).toBeDefined();
    });

    it('should throw for non-existent session', async () => {
      await expect(navService.recalculateRoute('fake')).rejects.toThrow(
        'Navigation session not found',
      );
    });
  });

  describe('recent destinations', () => {
    it('should add and retrieve recent destinations', () => {
      navService.addRecentDestination('user1', {
        latitude: 40.758,
        longitude: -73.9855,
        name: 'Times Square',
      });

      const destinations = navService.getRecentDestinations('user1');
      expect(destinations).toHaveLength(1);
      expect(destinations[0].name).toBe('Times Square');
    });

    it('should limit to max recent destinations', () => {
      for (let i = 0; i < 30; i++) {
        navService.addRecentDestination('user1', {
          latitude: i,
          longitude: i,
          name: `Place ${i}`,
        });
      }

      const destinations = navService.getRecentDestinations('user1');
      expect(destinations).toHaveLength(MAX_RECENT_DESTINATIONS);
    });

    it('should move duplicate to front', () => {
      navService.addRecentDestination('user1', {
        latitude: 1,
        longitude: 1,
        name: 'First',
      });
      navService.addRecentDestination('user1', {
        latitude: 2,
        longitude: 2,
        name: 'Second',
      });
      navService.addRecentDestination('user1', {
        latitude: 1,
        longitude: 1,
        name: 'First Again',
      });

      const destinations = navService.getRecentDestinations('user1');
      expect(destinations).toHaveLength(2);
      expect(destinations[0].name).toBe('First Again');
    });

    it('should return empty for unknown user', () => {
      expect(navService.getRecentDestinations('unknown')).toEqual([]);
    });
  });

  describe('preferences', () => {
    it('should set and merge preferences', () => {
      navService.setPreferences({ avoidTolls: true });
      expect(navService.preferences.avoidTolls).toBe(true);
      expect(navService.preferences.avoidHighways).toBe(false);
    });
  });

  describe('voice guidance', () => {
    it('should trigger voice guidance callbacks', async () => {
      const events = [];
      navService.onVoiceGuidance((event) => events.push(event));

      const session = await navService.planRoute({ origin, destination });
      navService.startNavigation(session.id);

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('navigation_started');
    });

    it('should allow unsubscribing from voice guidance', async () => {
      const events = [];
      const unsub = navService.onVoiceGuidance((event) => events.push(event));
      unsub();

      const session = await navService.planRoute({ origin, destination });
      navService.startNavigation(session.id);

      expect(events).toHaveLength(0);
    });

    it('should not trigger when voice guidance disabled', async () => {
      navService.setPreferences({ voiceGuidance: false });
      const events = [];
      navService.onVoiceGuidance((event) => events.push(event));

      const session = await navService.planRoute({ origin, destination });
      navService.startNavigation(session.id);

      expect(events).toHaveLength(0);
    });
  });

  describe('getGpsStatus', () => {
    it('should return GPS status', () => {
      const status = navService.getGpsStatus();
      expect(status.signalStatus).toBe('acquired');
      expect(status.hasSignal).toBe(true);
    });
  });

  describe('getSession', () => {
    it('should return null for non-existent session', () => {
      expect(navService.getSession('fake')).toBeNull();
    });
  });
});
