'use strict';

const { AudioHal, AUDIO_STATES } = require('../../../src/hal/audio-hal');

describe('AudioHal', () => {
  let hal;

  beforeEach(async () => {
    hal = new AudioHal();
    await hal.init();
  });

  afterEach(async () => {
    await hal.shutdown();
  });

  describe('initialization', () => {
    it('should start uninitialized', () => {
      const h = new AudioHal();
      expect(h.state).toBe(AUDIO_STATES.UNINITIALIZED);
    });

    it('should be ready after init', () => {
      expect(hal.state).toBe(AUDIO_STATES.READY);
    });

    it('should throw if already initialized', async () => {
      await expect(hal.init()).rejects.toThrow('already initialized');
    });

    it('should allow re-init after shutdown', async () => {
      await hal.shutdown();
      await hal.init();
      expect(hal.state).toBe(AUDIO_STATES.READY);
    });
  });

  describe('shutdown', () => {
    it('should enter shutdown state', async () => {
      await hal.shutdown();
      expect(hal.state).toBe(AUDIO_STATES.SHUTDOWN);
    });
  });

  describe('volume', () => {
    it('should set volume', () => {
      hal.setVolume(75);
      expect(hal.volume).toBe(75);
    });

    it('should reject volume out of range', () => {
      expect(() => hal.setVolume(-1)).toThrow();
      expect(() => hal.setVolume(101)).toThrow();
    });

    it('should unmute on volume change', () => {
      hal.mute();
      hal.setVolume(50);
      expect(hal.muted).toBe(false);
    });

    it('should emit volumeChange event', () => {
      const handler = jest.fn();
      hal.on('volumeChange', handler);
      hal.setVolume(60);
      expect(handler).toHaveBeenCalledWith({ volume: 60 });
    });

    it('should use default volume from options', () => {
      const h = new AudioHal({ defaultVolume: 30 });
      expect(h.volume).toBe(30);
    });
  });

  describe('mute', () => {
    it('should mute', () => {
      hal.mute();
      expect(hal.muted).toBe(true);
    });

    it('should unmute', () => {
      hal.mute();
      hal.unmute();
      expect(hal.muted).toBe(false);
    });

    it('should emit muteChange events', () => {
      const handler = jest.fn();
      hal.on('muteChange', handler);
      hal.mute();
      expect(handler).toHaveBeenCalledWith({ muted: true });
    });
  });

  describe('balance and fade', () => {
    it('should set balance', () => {
      hal.setBalance(-50);
      expect(hal.balance).toBe(-50);
    });

    it('should reject invalid balance', () => {
      expect(() => hal.setBalance(-101)).toThrow();
      expect(() => hal.setBalance(101)).toThrow();
    });

    it('should set fade', () => {
      hal.setFade(25);
      expect(hal.fade).toBe(25);
    });

    it('should reject invalid fade', () => {
      expect(() => hal.setFade(-101)).toThrow();
    });
  });

  describe('equalizer', () => {
    it('should set equalizer band', () => {
      hal.setEqualizer('bass', 5);
      expect(hal.equalizer.bass).toBe(5);
    });

    it('should reject invalid band', () => {
      expect(() => hal.setEqualizer('sub', 5)).toThrow('Invalid equalizer band');
    });

    it('should reject out of range value', () => {
      expect(() => hal.setEqualizer('bass', 11)).toThrow();
    });
  });

  describe('source', () => {
    it('should set audio source', () => {
      hal.setSource('bluetooth');
      expect(hal.activeSource).toBe('bluetooth');
      expect(hal.state).toBe(AUDIO_STATES.PLAYING);
    });

    it('should reject invalid source', () => {
      expect(() => hal.setSource('cassette')).toThrow('Invalid source');
    });
  });

  describe('status and capabilities', () => {
    it('should return status', () => {
      const status = hal.getStatus();
      expect(status.id).toBeDefined();
      expect(status.state).toBe(AUDIO_STATES.READY);
      expect(status.volume).toBe(50);
      expect(status.dspReady).toBe(true);
      expect(status.codecReady).toBe(true);
    });

    it('should return capabilities', () => {
      const caps = hal.getCapabilities();
      expect(caps.type).toBe('audio');
      expect(caps.sources).toContain('bluetooth');
      expect(caps.equalizerBands).toContain('bass');
    });
  });

  describe('fault handling', () => {
    it('should handle faults and recover', () => {
      expect(hal.handleFault('dsp_error')).toBe(true);
    });

    it('should enter error after max faults', () => {
      const h = new AudioHal({ maxFaults: 2 });
      h.state = AUDIO_STATES.READY;
      h.handleFault('fault1');
      h.handleFault('fault2');
      expect(h.state).toBe(AUDIO_STATES.ERROR);
    });

    it('should recover from error', async () => {
      hal.state = AUDIO_STATES.ERROR;
      const recovered = await hal.recover();
      expect(recovered).toBe(true);
      expect(hal.state).toBe(AUDIO_STATES.READY);
    });
  });

  describe('state checks', () => {
    it('should throw when not ready', async () => {
      await hal.shutdown();
      expect(() => hal.setVolume(50)).toThrow('not ready');
      expect(() => hal.mute()).toThrow('not ready');
      expect(() => hal.setSource('radio')).toThrow('not ready');
    });
  });
});
