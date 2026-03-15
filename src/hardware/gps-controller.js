'use strict';

const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'gps-controller' },
  transports: [new winston.transports.Console({ silent: true })],
});

const GPS_CONTROLLER_STATES = {
  STOPPED: 'stopped',
  STARTING: 'starting',
  RUNNING: 'running',
  NO_FIX: 'no_fix',
  ERROR: 'error',
};

class GpsController {
  constructor(options = {}) {
    this.id = uuidv4();
    this.state = GPS_CONTROLLER_STATES.STOPPED;
    this._position = null;
    this._previousPosition = null;
    this._satellites = 0;
    this._hdop = 99.99;
    this._fixType = 'none';
    this._updateRate = options.updateRate || 1;
    this._listeners = new Map();
    this._simulationInterval = null;
    this._simulationRoute = null;
    this._simulationIndex = 0;
    this._faultCount = 0;
    this._maxFaults = options.maxFaults || 3;
  }

  async start() {
    if (this.state === GPS_CONTROLLER_STATES.RUNNING) {
      return;
    }
    this.state = GPS_CONTROLLER_STATES.STARTING;
    logger.info('Starting GPS controller', { id: this.id });

    this._faultCount = 0;
    this.state = GPS_CONTROLLER_STATES.NO_FIX;
    logger.info('GPS controller started, waiting for fix');
    this._emit('started', { id: this.id });
  }

  async stop() {
    logger.info('Stopping GPS controller', { id: this.id });
    this.stopSimulation();
    this.state = GPS_CONTROLLER_STATES.STOPPED;
    this._position = null;
    this._previousPosition = null;
    this._emit('stopped', { id: this.id });
  }

  updatePosition(position) {
    if (this.state === GPS_CONTROLLER_STATES.STOPPED) {
      throw new Error('GPS controller not running');
    }

    const { latitude, longitude, altitude, speed, heading } = position;

    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      throw new Error('Invalid latitude');
    }
    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      throw new Error('Invalid longitude');
    }

    this._previousPosition = this._position;
    this._position = {
      latitude,
      longitude,
      altitude: altitude || 0,
      speed: speed || 0,
      heading: heading || 0,
      timestamp: Date.now(),
    };

    if (this.state === GPS_CONTROLLER_STATES.NO_FIX) {
      this.state = GPS_CONTROLLER_STATES.RUNNING;
    }

    this._emit('position', this._position);
    return this._position;
  }

  updateSatelliteInfo(satellites, hdop) {
    this._satellites = satellites;
    this._hdop = hdop || 99.99;

    if (satellites >= 4) {
      this._fixType = '3d';
    } else if (satellites >= 3) {
      this._fixType = '2d';
    } else {
      this._fixType = 'none';
      if (this.state === GPS_CONTROLLER_STATES.RUNNING) {
        this.state = GPS_CONTROLLER_STATES.NO_FIX;
      }
    }

    this._emit('satellites', {
      count: satellites,
      hdop: this._hdop,
      fixType: this._fixType,
    });
  }

  getPosition() {
    return this._position ? { ...this._position } : null;
  }

  getDistanceTo(lat, lon) {
    if (!this._position) {return null;}
    return this._haversine(
      this._position.latitude,
      this._position.longitude,
      lat,
      lon,
    );
  }

  getDistanceTraveled() {
    if (!this._position || !this._previousPosition) {return 0;}
    return this._haversine(
      this._previousPosition.latitude,
      this._previousPosition.longitude,
      this._position.latitude,
      this._position.longitude,
    );
  }

  startSimulation(route, intervalMs) {
    if (!Array.isArray(route) || route.length === 0) {
      throw new Error('Route must be a non-empty array of positions');
    }
    this._simulationRoute = route;
    this._simulationIndex = 0;
    this._simulationInterval = setInterval(() => {
      if (this._simulationIndex < this._simulationRoute.length) {
        this.updatePosition(this._simulationRoute[this._simulationIndex]);
        this._simulationIndex++;
      } else {
        this.stopSimulation();
        this._emit('simulationComplete', {});
      }
    }, intervalMs || 1000);

    if (this._simulationInterval.unref) {
      this._simulationInterval.unref();
    }
  }

  stopSimulation() {
    if (this._simulationInterval) {
      clearInterval(this._simulationInterval);
      this._simulationInterval = null;
    }
    this._simulationRoute = null;
    this._simulationIndex = 0;
  }

  getStatus() {
    return {
      id: this.id,
      state: this.state,
      position: this._position ? { ...this._position } : null,
      satellites: this._satellites,
      hdop: this._hdop,
      fixType: this._fixType,
      updateRate: this._updateRate,
    };
  }

  handleFault(fault) {
    this._faultCount++;
    logger.warn('GPS fault detected', { fault, count: this._faultCount });
    if (this._faultCount >= this._maxFaults) {
      this.state = GPS_CONTROLLER_STATES.ERROR;
      this._emit('error', { fault, count: this._faultCount });
      return false;
    }
    return true;
  }

  async recover() {
    if (this.state !== GPS_CONTROLLER_STATES.ERROR) {
      return true;
    }
    logger.info('Attempting GPS controller recovery');
    this._faultCount = 0;
    this.state = GPS_CONTROLLER_STATES.STOPPED;
    await this.start();
    return this.state !== GPS_CONTROLLER_STATES.ERROR;
  }

  _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  on(event, listener) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(listener);
  }

  off(event, listener) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) {listeners.splice(idx, 1);}
    }
  }

  _emit(event, data) {
    const listeners = this._listeners.get(event) || [];
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (err) {
        logger.error('Event listener error', { event, error: err.message });
      }
    }
  }
}

module.exports = { GpsController, GPS_CONTROLLER_STATES };
