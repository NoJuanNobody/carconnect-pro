'use strict';

const path = require('path');
const express = require('express');
const winston = require('winston');
const createAudioRouter = require('./api/routes/audio');
const profilesRouter = require('./api/routes/profiles');
const PerformanceMonitor = require('./monitoring/performance-monitor');
const { performanceMiddleware, metricsEndpoint } = require('./middleware/performance-middleware');
const { HealthCheckService } = require('./services/health-check');
const { VehicleService } = require('./services/vehicle-service');
const { NavigationService } = require('./services/navigation-service');
const { OBDDataProvider } = require('./services/obd-data-provider');
const { WebSocketService } = require('./services/websocket-service');
const { ClaudeService } = require('./services/claude-service');
const createChatRouter = require('./api/routes/chat');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`),
  ),
  transports: [new winston.transports.Console()],
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Performance monitoring
const monitor = new PerformanceMonitor();
app.use(performanceMiddleware(monitor));

// OBD-II data provider
const obdProvider = new OBDDataProvider({
  mode: process.env.OBD_MODE || 'auto',
  serialPort: process.env.OBD_SERIAL_PORT || null,
  pollIntervalMs: parseInt(process.env.OBD_POLL_INTERVAL, 10) || 500,
  baudRate: parseInt(process.env.OBD_BAUD_RATE, 10) || 38400,
});

// Health check service
const healthCheck = new HealthCheckService();

// Vehicle service
const vehicleService = new VehicleService();
healthCheck.registerComponent('vehicle', () => ({
  status: vehicleService.getVehicleState() ? 'healthy' : 'degraded',
}));

// Navigation service
const navigationService = new NavigationService(); // eslint-disable-line no-unused-vars
healthCheck.registerComponent('navigation', () => ({
  status: 'healthy',
}));

// Audio API
const { router: audioRouter, service: audioService } = createAudioRouter();
healthCheck.registerComponent('audio', () => ({
  status: 'healthy',
  activeSources: audioService.getSources().filter((s) => s.isActive).length,
}));

// OBD health
healthCheck.registerComponent('obd', () => ({
  status: obdProvider.connected ? 'healthy' : 'degraded',
  mode: obdProvider.activeMode,
}));

// Claude AI assistant with MCP tool handlers
const claudeService = new ClaudeService();

claudeService.registerToolHandler('get_vehicle_status', async () => {
  const vehicle = vehicleService.getVehicleState();
  const obd = obdProvider.state;
  return {
    speed: obd.speed || vehicle.speed || 0,
    rpm: obd.rpm || vehicle.rpm || 0,
    gear: vehicle.gear || 'park',
    coolantTemp: obd.coolantTemp || 0,
    fuelLevel: obd.fuelLevel || 0,
    throttle: obd.throttle || 0,
    engineLoad: obd.engineLoad || 0,
    batteryVoltage: vehicle.batteryVoltage || 0,
    ignition: vehicle.ignitionState || (vehicle.ignition ? 'on' : 'off'),
    parkingBrake: vehicle.parkingBrake || false,
    obdMode: obdProvider.activeMode,
  };
});

claudeService.registerToolHandler('get_diagnostics', async () => {
  const dtcs = await obdProvider.requestDTCs();
  return { codes: dtcs, count: dtcs.length, status: dtcs.length === 0 ? 'clear' : 'faults_present' };
});

claudeService.registerToolHandler('set_audio_source', async (input) => {
  const result = await audioService.switchSource(input.source, 100);
  return { switched: true, from: result.previousSource, to: result.currentSource };
});

claudeService.registerToolHandler('set_volume', async (input) => {
  const result = audioService.updateControls({ volume: input.volume });
  return { volume: result.controls.volume };
});

claudeService.registerToolHandler('set_equalizer', async (input) => {
  const updates = {};
  if (input.bass !== undefined) { updates.bass = input.bass; }
  if (input.treble !== undefined) { updates.treble = input.treble; }
  if (input.balance !== undefined) { updates.balance = input.balance; }
  if (input.fade !== undefined) { updates.fade = input.fade; }
  const result = audioService.updateControls(updates);
  return result.controls;
});

claudeService.registerToolHandler('get_audio_status', async () => {
  const sources = audioService.getSources();
  const controls = audioService.getControls();
  const active = sources.find((s) => s.active);
  return { activeSource: active ? active.name : 'none', controls };
});

// Navigation tools
claudeService.registerToolHandler('plan_route', async (input) => {
  // Simulate route planning with the navigation service
  const session = navigationService.planRoute({
    origin: { lat: 33.749, lng: -84.388, name: 'Current Location' },
    destination: { lat: 33.749 + (Math.random() - 0.5) * 0.1, lng: -84.388 + (Math.random() - 0.5) * 0.1, name: input.destination },
    preferences: { avoidTolls: input.avoidTolls || false, avoidHighways: input.avoidHighways || false },
  });
  return {
    planned: true,
    destination: input.destination,
    sessionId: session.id,
    distance: session.totalDistance ? `${(session.totalDistance / 1000).toFixed(1)} km` : 'calculating',
    eta: session.eta || 'calculating',
    status: session.status,
  };
});

claudeService.registerToolHandler('get_navigation_status', async () => {
  const gps = navigationService.getGpsStatus();
  return {
    gpsSignal: gps.signalStatus,
    hasSignal: gps.hasSignal,
    position: gps.currentPosition,
  };
});

// Profile tools
claudeService.registerToolHandler('list_profiles', async () => {
  const { UserProfileService } = require('./services/user-profile-service');
  const profileService = new UserProfileService();
  const profiles = profileService.listProfiles();
  return {
    profiles: profiles.map((p) => ({ id: p.id, name: p.name, active: p.isActive })),
    count: profiles.length,
  };
});

claudeService.registerToolHandler('create_profile', async (input) => {
  const { UserProfileService } = require('./services/user-profile-service');
  const profileService = new UserProfileService();
  const profile = profileService.createProfile({ name: input.name });
  return { created: true, id: profile.id, name: profile.name };
});

claudeService.registerToolHandler('activate_profile', async (input) => {
  const { UserProfileService } = require('./services/user-profile-service');
  const profileService = new UserProfileService();
  const profiles = profileService.listProfiles();
  const match = profiles.find((p) => p.name.toLowerCase() === input.name.toLowerCase());
  if (!match) {
    return { error: `Profile "${input.name}" not found. Available: ${profiles.map((p) => p.name).join(', ') || 'none'}` };
  }
  profileService.activateProfile(match.id);
  return { activated: true, name: match.name, id: match.id };
});

// System tools
claudeService.registerToolHandler('get_system_health', async () => {
  const statuses = healthCheck.getAllStatuses();
  return statuses;
});

claudeService.registerToolHandler('get_performance_metrics', async () => {
  const dashboard = monitor.getDashboardData();
  return dashboard;
});

// Media tool — returns data for the dashboard to act on
claudeService.registerToolHandler('play_media', async (input) => {
  const { action, query } = input;
  const serviceUrls = {
    youtube: 'https://m.youtube.com',
    primevideo: 'https://www.primevideo.com',
    netflix: 'https://www.netflix.com',
    disneyplus: 'https://www.disneyplus.com',
    hbomax: 'https://play.max.com',
    spotify: 'https://open.spotify.com',
  };

  if (action === 'youtube_search' && query) {
    return { action: 'open_url', url: `https://m.youtube.com/results?search_query=${encodeURIComponent(query)}`, label: `YouTube: ${query}` };
  }
  if (action === 'youtube_video' && query) {
    // Extract video ID from various YouTube URL formats
    const match = query.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
      return { action: 'embed_youtube', videoId: match[1], label: 'YouTube Video' };
    }
    return { action: 'open_url', url: query, label: 'YouTube Video' };
  }
  if (action === 'open_service' && query) {
    const key = query.toLowerCase().replace(/[\s_-]/g, '');
    const url = serviceUrls[key];
    if (url) {
      return { action: 'open_url', url, label: query };
    }
    return { error: `Unknown service: ${query}. Available: ${Object.keys(serviceUrls).join(', ')}` };
  }
  if (action === 'open_url' && query) {
    return { action: 'open_url', url: query, label: 'Media' };
  }
  if (action === 'close') {
    return { action: 'close_media', label: 'Closed media player' };
  }
  return { error: 'Invalid media action' };
});

const chatRouter = createChatRouter(claudeService);

// Routes
app.use('/api/v1/audio', audioRouter);
app.use('/api/v1/profiles', profilesRouter);
app.use('/api/v1/chat', chatRouter);

// System endpoints
app.get('/api/v1/health', (_req, res) => {
  const statuses = healthCheck.getAllStatuses();
  res.json({
    timestamp: new Date().toISOString(),
    components: statuses,
  });
});

app.get('/api/v1/metrics', metricsEndpoint(monitor));

app.get('/api/v1/vehicle/state', (_req, res) => {
  const vehicleState = vehicleService.getVehicleState();
  const obdState = obdProvider.state;
  res.json({
    timestamp: new Date().toISOString(),
    success: true,
    data: { ...vehicleState, ...obdState },
  });
});

app.get('/api/v1/vehicle/obd', (_req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    success: true,
    data: obdProvider.getConnectionStatus(),
  });
});

app.get('/api/v1/navigation/status', (_req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    success: true,
    data: navigationService.getGpsStatus(),
  });
});

// Start server
if (require.main === module) {
  vehicleService.start();
  obdProvider.start().then(() => {
    logger.info(`OBD mode: ${obdProvider.activeMode}`);
  }).catch((err) => {
    logger.warn(`OBD start failed: ${err.message}, continuing without OBD`);
  });

  const server = app.listen(PORT, () => {
    logger.info(`CarConnect Pro started on port ${PORT}`);
    logger.info(`Dashboard:  http://localhost:${PORT}`);
    logger.info(`WebSocket:  ws://localhost:${PORT}`);
    logger.info(`OBD Mode:   ${process.env.OBD_MODE || 'auto'}`);
  });

  const _wsService = new WebSocketService(server, { // eslint-disable-line no-unused-vars
    vehicleService,
    audioService,
    obdProvider,
  });
}

module.exports = app;
