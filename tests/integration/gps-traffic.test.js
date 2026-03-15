'use strict';

const express = require('express');
const request = require('supertest');
const profileRoutes = require('../../src/api/routes/profiles');
const { getServiceInstance } = require('../../src/controllers/profile-controller');
const { NavigationService } = require('../../src/services/navigation-service');
const { TrafficApi } = require('../../src/integrations/traffic-api');

// --- Integration: Navigation + Traffic ---

describe('Navigation + Traffic Integration', () => {
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

  it('should plan a route with traffic data', async () => {
    const session = await navService.planRoute({ origin, destination });

    expect(session.traffic).toBeDefined();
    expect(session.traffic.averageMultiplier).toBeGreaterThanOrEqual(1.0);
    expect(session.eta.etaMinutes).toBeGreaterThan(0);
  });

  it('should navigate full lifecycle: plan -> start -> pause -> resume -> complete', async () => {
    const session = await navService.planRoute({ origin, destination });
    expect(session.state).toBe('planning');

    const started = navService.startNavigation(session.id);
    expect(started.state).toBe('navigating');

    const paused = navService.pauseNavigation(session.id);
    expect(paused.state).toBe('paused');

    const resumed = navService.resumeNavigation(session.id);
    expect(resumed.state).toBe('navigating');

    const completed = navService.completeNavigation(session.id);
    expect(completed.state).toBe('completed');
  });

  it('should navigate plan -> start -> cancel', async () => {
    const session = await navService.planRoute({ origin, destination });
    navService.startNavigation(session.id);
    const cancelled = navService.cancelNavigation(session.id);
    expect(cancelled.state).toBe('cancelled');
  });

  it('should recalculate route with updated traffic', async () => {
    const session = await navService.planRoute({ origin, destination });
    navService.startNavigation(session.id);

    // Report an incident
    trafficApi.reportIncident({
      latitude: 40.73,
      longitude: -74.0,
      type: 'construction',
      description: 'Road work ahead',
    });

    const recalc = await navService.recalculateRoute(session.id);
    expect(recalc.traffic).toBeDefined();
    expect(recalc.updatedAt).toBeDefined();
  });

  it('should handle GPS signal loss and recovery during navigation', async () => {
    const session = await navService.planRoute({ origin, destination });
    navService.startNavigation(session.id);
    navService.updatePosition(origin);

    // Signal loss
    navService.handleSignalLoss();
    const lostSession = navService.getSession(session.id);
    expect(lostSession.gpsSignalLost).toBe(true);

    // Signal recovery
    navService.handleSignalRecovery();
    const recoveredSession = navService.getSession(session.id);
    expect(recoveredSession.gpsSignalLost).toBe(false);
  });

  it('should track GPS position with accuracy metadata', () => {
    const pos = navService.updatePosition({
      latitude: 40.7128,
      longitude: -74.006,
      accuracy: 3.5,
      heading: 45,
      speed: 16.67,
    });

    expect(pos.accuracy).toBe(3.5);
    expect(pos.heading).toBe(45);
    expect(pos.speed).toBe(16.67);

    const status = navService.getGpsStatus();
    expect(status.hasSignal).toBe(true);
    expect(status.currentPosition.accuracy).toBe(3.5);
  });

  it('should apply navigation preferences to route planning', async () => {
    navService.setPreferences({ avoidTolls: true, avoidHighways: true });

    const session = await navService.planRoute({ origin, destination });
    expect(session.preferences.avoidTolls).toBe(true);
    expect(session.preferences.avoidHighways).toBe(true);
  });

  it('should store and retrieve recent destinations', () => {
    const dest1 = { latitude: 40.758, longitude: -73.9855, name: 'Times Square' };
    const dest2 = { latitude: 40.7484, longitude: -73.9856, name: 'Empire State' };

    navService.addRecentDestination('user1', dest1);
    navService.addRecentDestination('user1', dest2);

    const recent = navService.getRecentDestinations('user1');
    expect(recent).toHaveLength(2);
    expect(recent[0].name).toBe('Empire State');
    expect(recent[1].name).toBe('Times Square');
  });
});

// --- Integration: Profile API Routes ---

describe('Profile API Routes', () => {
  let app;

  beforeEach(() => {
    // Reset service state by clearing profiles
    const service = getServiceInstance();
    service.profiles.clear();
    service.activeProfileId = null;

    app = express();
    app.use(express.json());
    app.use('/api/v1/profiles', profileRoutes);
  });

  describe('POST /api/v1/profiles', () => {
    it('should create a profile', async () => {
      const res = await request(app)
        .post('/api/v1/profiles')
        .send({ name: 'Test Driver' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Driver');
      expect(res.body.data.id).toBeDefined();
    });

    it('should return 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/profiles')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should create profile with custom preferences', async () => {
      const res = await request(app)
        .post('/api/v1/profiles')
        .send({
          name: 'Custom',
          audio: { volume: 80 },
          display: { theme: 'light' },
          navigation: { avoidTolls: true },
        })
        .expect(201);

      expect(res.body.data.audio.volume).toBe(80);
      expect(res.body.data.display.theme).toBe('light');
      expect(res.body.data.navigation.avoidTolls).toBe(true);
    });
  });

  describe('GET /api/v1/profiles', () => {
    it('should list all profiles', async () => {
      await request(app)
        .post('/api/v1/profiles')
        .send({ name: 'A' });
      await request(app)
        .post('/api/v1/profiles')
        .send({ name: 'B' });

      const res = await request(app)
        .get('/api/v1/profiles')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.profiles).toHaveLength(2);
    });

    it('should return empty list when no profiles', async () => {
      const res = await request(app)
        .get('/api/v1/profiles')
        .expect(200);

      expect(res.body.data.profiles).toHaveLength(0);
    });
  });

  describe('GET /api/v1/profiles/:id', () => {
    it('should return a profile', async () => {
      const create = await request(app)
        .post('/api/v1/profiles')
        .send({ name: 'Test' });

      const res = await request(app)
        .get(`/api/v1/profiles/${create.body.data.id}`)
        .expect(200);

      expect(res.body.data.name).toBe('Test');
    });

    it('should return 404 for non-existent profile', async () => {
      await request(app)
        .get('/api/v1/profiles/non-existent-id')
        .expect(404);
    });
  });

  describe('PUT /api/v1/profiles/:id', () => {
    it('should update a profile', async () => {
      const create = await request(app)
        .post('/api/v1/profiles')
        .send({ name: 'Old Name' });

      const res = await request(app)
        .put(`/api/v1/profiles/${create.body.data.id}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(res.body.data.name).toBe('New Name');
    });

    it('should return 404 for non-existent profile', async () => {
      await request(app)
        .put('/api/v1/profiles/fake-id')
        .send({ name: 'X' })
        .expect(404);
    });

    it('should return 400 for invalid update', async () => {
      const create = await request(app)
        .post('/api/v1/profiles')
        .send({ name: 'Test' });

      await request(app)
        .put(`/api/v1/profiles/${create.body.data.id}`)
        .send({ audio: { volume: 200 } })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/profiles/:id', () => {
    it('should delete a profile', async () => {
      const create = await request(app)
        .post('/api/v1/profiles')
        .send({ name: 'Delete Me' });

      await request(app)
        .delete(`/api/v1/profiles/${create.body.data.id}`)
        .expect(200);

      await request(app)
        .get(`/api/v1/profiles/${create.body.data.id}`)
        .expect(404);
    });

    it('should return 404 for non-existent profile', async () => {
      await request(app)
        .delete('/api/v1/profiles/fake-id')
        .expect(404);
    });
  });

  describe('POST /api/v1/profiles/:id/activate', () => {
    it('should activate a profile', async () => {
      const create = await request(app)
        .post('/api/v1/profiles')
        .send({ name: 'Activate Me' });

      const res = await request(app)
        .post(`/api/v1/profiles/${create.body.data.id}/activate`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.id).toBe(create.body.data.id);
      expect(res.body.data.appliedPreferences).toBeDefined();
    });

    it('should return 404 for non-existent profile', async () => {
      await request(app)
        .post('/api/v1/profiles/fake-id/activate')
        .expect(404);
    });

    it('should show active profile in list', async () => {
      const create = await request(app)
        .post('/api/v1/profiles')
        .send({ name: 'Active' });

      await request(app)
        .post(`/api/v1/profiles/${create.body.data.id}/activate`);

      const list = await request(app)
        .get('/api/v1/profiles')
        .expect(200);

      expect(list.body.data.activeProfileId).toBe(create.body.data.id);
    });
  });
});
