'use strict';

const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'elm327-driver' },
  transports: [new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })],
});

let SerialPort;
try {
  SerialPort = require('serialport').SerialPort;
} catch (_e) {
  SerialPort = null;
}

const STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  INITIALIZING: 'initializing',
  READY: 'ready',
  ERROR: 'error',
};

const AT_INIT_COMMANDS = [
  'ATZ',   // Reset
  'ATE0',  // Echo off
  'ATL0',  // Linefeeds off
  'ATS0',  // Spaces off
  'ATSP0', // Auto-detect protocol
  'ATH0',  // Headers off
];

const PID_FORMULAS = {
  '0C': { name: 'rpm', bytes: 2, formula: (a, b) => ((a * 256) + b) / 4 },
  '0D': { name: 'speed', bytes: 1, formula: (a) => a },
  '05': { name: 'coolantTemp', bytes: 1, formula: (a) => a - 40 },
  '2F': { name: 'fuelLevel', bytes: 1, formula: (a) => (a / 255) * 100 },
  '11': { name: 'throttle', bytes: 1, formula: (a) => (a / 255) * 100 },
  '04': { name: 'engineLoad', bytes: 1, formula: (a) => (a / 255) * 100 },
};

const COMMAND_TIMEOUT = 2000;

class Elm327Driver {
  constructor(options = {}) {
    this._portPath = options.serialPort || null;
    this._baudRate = options.baudRate || 38400;
    this._state = STATES.DISCONNECTED;
    this._port = null;
    this._responseBuffer = '';
    this._pendingResolve = null;
    this._pendingReject = null;
    this._pendingTimer = null;
    this._listeners = new Map();
  }

  get state() {
    return this._state;
  }

  static get STATES() {
    return STATES;
  }

  static get PID_FORMULAS() {
    return PID_FORMULAS;
  }

  on(event, fn) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(fn);
  }

  off(event, fn) {
    const fns = this._listeners.get(event);
    if (fns) {
      this._listeners.set(event, fns.filter((f) => f !== fn));
    }
  }

  _emit(event, data) {
    const fns = this._listeners.get(event) || [];
    for (const fn of fns) {
      try {
        fn(data);
      } catch (e) {
        logger.error('Event listener error', { event, error: e.message });
      }
    }
  }

  async connect() {
    if (!SerialPort) {
      throw new Error('serialport package not available');
    }

    const portPath = this._portPath || await this._autoDetectPort();
    if (!portPath) {
      throw new Error('No ELM327 device found');
    }

    this._state = STATES.CONNECTING;
    this._emit('stateChange', this._state);

    return new Promise((resolve, reject) => {
      this._port = new SerialPort({
        path: portPath,
        baudRate: this._baudRate,
        autoOpen: false,
      });

      this._port.on('data', (data) => this._onData(data));
      this._port.on('error', (err) => this._onError(err));
      this._port.on('close', () => this._onClose());

      this._port.open((err) => {
        if (err) {
          this._state = STATES.ERROR;
          this._emit('stateChange', this._state);
          reject(new Error(`Failed to open port ${portPath}: ${err.message}`));
        } else {
          logger.info('Serial port opened', { port: portPath });
          this._initialize().then(resolve).catch(reject);
        }
      });
    });
  }

  async _initialize() {
    this._state = STATES.INITIALIZING;
    this._emit('stateChange', this._state);

    for (const cmd of AT_INIT_COMMANDS) {
      try {
        await this._sendCommand(cmd);
      } catch (err) {
        if (cmd !== 'ATZ') {
          logger.warn('AT init command failed', { cmd, error: err.message });
        }
      }
    }

    this._state = STATES.READY;
    this._emit('stateChange', this._state);
    logger.info('ELM327 initialized');
  }

  async requestPID(pid) {
    if (this._state !== STATES.READY) {
      throw new Error(`Cannot request PID in state: ${this._state}`);
    }

    const pidUpper = pid.toUpperCase();
    const formula = PID_FORMULAS[pidUpper];
    if (!formula) {
      throw new Error(`Unknown PID: ${pid}`);
    }

    const response = await this._sendCommand(`01${pidUpper}`);
    return this._parsePIDResponse(response, pidUpper);
  }

  async requestDTCs() {
    if (this._state !== STATES.READY) {
      throw new Error(`Cannot request DTCs in state: ${this._state}`);
    }

    const response = await this._sendCommand('03');
    return this._parseDTCResponse(response);
  }

  async clearDTCs() {
    if (this._state !== STATES.READY) {
      throw new Error(`Cannot clear DTCs in state: ${this._state}`);
    }

    await this._sendCommand('04');
    return true;
  }

  _sendCommand(cmd) {
    return new Promise((resolve, reject) => {
      if (this._pendingResolve) {
        reject(new Error('Command already pending'));
        return;
      }

      this._responseBuffer = '';
      this._pendingResolve = resolve;
      this._pendingReject = reject;

      this._pendingTimer = setTimeout(() => {
        const rej = this._pendingReject;
        this._pendingResolve = null;
        this._pendingReject = null;
        this._pendingTimer = null;
        if (rej) {
          rej(new Error(`Command timeout: ${cmd}`));
        }
      }, COMMAND_TIMEOUT);

      this._port.write(`${cmd}\r`, (err) => {
        if (err) {
          clearTimeout(this._pendingTimer);
          this._pendingResolve = null;
          this._pendingReject = null;
          this._pendingTimer = null;
          reject(new Error(`Write error: ${err.message}`));
        }
      });
    });
  }

  _onData(data) {
    this._responseBuffer += data.toString();

    if (this._responseBuffer.includes('>')) {
      const response = this._responseBuffer
        .replace(/>/g, '')
        .replace(/\r/g, '')
        .replace(/\n/g, '')
        .trim();

      if (this._pendingResolve) {
        clearTimeout(this._pendingTimer);
        const resolve = this._pendingResolve;
        this._pendingResolve = null;
        this._pendingReject = null;
        this._pendingTimer = null;
        resolve(response);
      }
    }
  }

  _onError(err) {
    logger.error('Serial port error', { error: err.message });
    this._state = STATES.ERROR;
    this._emit('stateChange', this._state);
    this._emit('error', err);
  }

  _onClose() {
    logger.info('Serial port closed');
    this._state = STATES.DISCONNECTED;
    this._emit('stateChange', this._state);
  }

  _parsePIDResponse(response, pid) {
    if (!response || response === 'NO DATA' || response === 'UNABLE TO CONNECT') {
      return null;
    }

    const formula = PID_FORMULAS[pid];
    if (!formula) {
      return null;
    }

    // Response format: "41 0C 1A F8" (with spaces removed by ATS0: "410C1AF8")
    const clean = response.replace(/\s/g, '');

    // Find the response after the mode+pid echo (41XX)
    const prefix = `41${pid}`;
    const idx = clean.indexOf(prefix);
    if (idx === -1) {
      return null;
    }

    const dataHex = clean.substring(idx + prefix.length);
    const bytes = [];
    for (let i = 0; i < dataHex.length; i += 2) {
      bytes.push(parseInt(dataHex.substring(i, i + 2), 16));
    }

    if (bytes.length < formula.bytes) {
      return null;
    }

    const value = formula.formula(...bytes.slice(0, formula.bytes));
    return { name: formula.name, value, raw: dataHex };
  }

  _parseDTCResponse(response) {
    if (!response || response === 'NO DATA') {
      return [];
    }

    const clean = response.replace(/\s/g, '');
    if (!clean.startsWith('43')) {
      return [];
    }

    const dtcData = clean.substring(2);
    const codes = [];
    const prefixes = { '0': 'P0', '1': 'P1', '2': 'P2', '3': 'P3', '4': 'C0', '5': 'C1', '6': 'C2', '7': 'C3', '8': 'B0', '9': 'B1', 'A': 'B2', 'B': 'B3', 'C': 'U0', 'D': 'U1', 'E': 'U2', 'F': 'U3' };

    for (let i = 0; i < dtcData.length; i += 4) {
      const chunk = dtcData.substring(i, i + 4);
      if (chunk === '0000' || chunk.length < 4) {
        continue;
      }
      const firstChar = chunk[0].toUpperCase();
      const prefix = prefixes[firstChar] || 'P0';
      const code = `${prefix}${chunk.substring(1)}`;
      codes.push(code);
    }

    return codes;
  }

  async _autoDetectPort() {
    if (!SerialPort || !SerialPort.list) {
      return null;
    }

    try {
      const ports = await SerialPort.list();
      const elm = ports.find((p) => {
        const id = `${p.path} ${p.manufacturer || ''} ${p.pnpId || ''}`.toLowerCase();
        return id.includes('elm') || id.includes('obd') || id.includes('rfcomm');
      });
      return elm ? elm.path : null;
    } catch (_e) {
      return null;
    }
  }

  async destroy() {
    if (this._pendingTimer) {
      clearTimeout(this._pendingTimer);
    }
    if (this._pendingReject) {
      this._pendingReject(new Error('Driver destroyed'));
      this._pendingResolve = null;
      this._pendingReject = null;
    }

    if (this._port && this._port.isOpen) {
      return new Promise((resolve) => {
        this._port.close(() => {
          this._state = STATES.DISCONNECTED;
          resolve();
        });
      });
    }
    this._state = STATES.DISCONNECTED;
  }
}

module.exports = { Elm327Driver, STATES, PID_FORMULAS };
