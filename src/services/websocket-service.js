'use strict';

const WebSocket = require('ws');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'websocket-service' },
  transports: [new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })],
});

const HEARTBEAT_INTERVAL = 30000;

class WebSocketService {
  constructor(server, options = {}) {
    this._vehicleService = options.vehicleService || null;
    this._audioService = options.audioService || null;
    this._obdProvider = options.obdProvider || null;
    this._clients = new Set();

    this._wss = new WebSocket.Server({ server });
    this._wss.on('connection', (ws) => this._onConnection(ws));

    this._heartbeatTimer = setInterval(() => this._heartbeat(), HEARTBEAT_INTERVAL);

    this._setupEventBridges();
    logger.info('WebSocket server started');
  }

  _onConnection(ws) {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('close', () => this._clients.delete(ws));
    ws.on('error', () => this._clients.delete(ws));

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        this._handleClientMessage(ws, msg);
      } catch (_e) {
        // Ignore malformed messages
      }
    });

    this._clients.add(ws);
    logger.info('Client connected', { clients: this._clients.size });

    // Send initial state snapshot
    this._sendInitialState(ws);
  }

  _sendInitialState(ws) {
    const snapshot = { type: 'init', timestamp: new Date().toISOString(), data: {} };

    if (this._vehicleService) {
      snapshot.data.vehicle = this._vehicleService.getVehicleState();
    }

    if (this._obdProvider) {
      snapshot.data.obd = this._obdProvider.state;
      snapshot.data.obdConnection = this._obdProvider.getConnectionStatus();
    }

    if (this._audioService) {
      snapshot.data.audio = {
        sources: this._audioService.getSources(),
        controls: this._audioService.getControls(),
      };
    }

    this._send(ws, snapshot);
  }

  _handleClientMessage(ws, msg) {
    if (msg.type === 'requestDTCs' && this._obdProvider) {
      this._obdProvider.requestDTCs().then((dtcs) => {
        this._send(ws, { type: 'dtcResponse', data: dtcs, timestamp: new Date().toISOString() });
      });
    }
  }

  _setupEventBridges() {
    if (this._obdProvider) {
      this._obdProvider.on('vehicleDataUpdate', (data) => {
        this._broadcast({ type: 'vehicleData', data, timestamp: new Date().toISOString() });
      });

      this._obdProvider.on('modeChange', (mode) => {
        this._broadcast({ type: 'obdMode', data: { mode }, timestamp: new Date().toISOString() });
      });
    }

    if (this._audioService && this._audioService.on) {
      this._audioService.on('audioSourceChange', (data) => {
        this._broadcast({ type: 'audioState', data, timestamp: new Date().toISOString() });
      });

      this._audioService.on('audioControlsChange', (data) => {
        this._broadcast({ type: 'audioControls', data, timestamp: new Date().toISOString() });
      });
    }
  }

  _broadcast(msg) {
    const payload = JSON.stringify(msg);
    for (const client of this._clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  _send(ws, msg) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  _heartbeat() {
    for (const ws of this._clients) {
      if (!ws.isAlive) {
        ws.terminate();
        this._clients.delete(ws);
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }

  getClientCount() {
    return this._clients.size;
  }

  shutdown() {
    clearInterval(this._heartbeatTimer);
    for (const client of this._clients) {
      client.terminate();
    }
    this._clients.clear();
    this._wss.close();
  }
}

module.exports = { WebSocketService };
