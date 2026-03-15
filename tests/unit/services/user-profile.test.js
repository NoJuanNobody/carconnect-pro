'use strict';

const {
  UserProfileService,
  MAX_BLUETOOTH_DEVICES,
  MAX_RECENT_DESTINATIONS,
  DEFAULT_AUDIO,
  DEFAULT_DISPLAY,
  DEFAULT_NAVIGATION,
} = require('../../../src/services/user-profile-service');

describe('UserProfileService', () => {
  let service;

  beforeEach(() => {
    service = new UserProfileService();
  });

  describe('createProfile', () => {
    it('should create a profile with defaults', () => {
      const profile = service.createProfile({ name: 'Driver 1' });

      expect(profile.id).toBeDefined();
      expect(profile.name).toBe('Driver 1');
      expect(profile.audio).toEqual(DEFAULT_AUDIO);
      expect(profile.display).toEqual(DEFAULT_DISPLAY);
      expect(profile.navigation).toEqual(DEFAULT_NAVIGATION);
      expect(profile.bluetoothDevices).toEqual([]);
      expect(profile.recentDestinations).toEqual([]);
      expect(profile.createdAt).toBeDefined();
    });

    it('should create a profile with custom preferences', () => {
      const profile = service.createProfile({
        name: 'Custom Driver',
        audio: { volume: 80, equalizer: { bass: 5 } },
        display: { theme: 'light', brightness: 90 },
        navigation: { avoidTolls: true, units: 'mi' },
      });

      expect(profile.audio.volume).toBe(80);
      expect(profile.audio.equalizer.bass).toBe(5);
      expect(profile.audio.equalizer.mid).toBe(0); // default
      expect(profile.display.theme).toBe('light');
      expect(profile.display.brightness).toBe(90);
      expect(profile.display.language).toBe('en'); // default
      expect(profile.navigation.avoidTolls).toBe(true);
      expect(profile.navigation.units).toBe('mi');
    });

    it('should reject missing name', () => {
      expect(() => service.createProfile({})).toThrow('Validation error');
    });

    it('should reject empty name', () => {
      expect(() => service.createProfile({ name: '' })).toThrow('Validation error');
    });

    it('should strip unknown fields', () => {
      const profile = service.createProfile({
        name: 'Test',
        malicious: 'data',
      });
      expect(profile.malicious).toBeUndefined();
    });

    it('should trim whitespace from name', () => {
      const profile = service.createProfile({ name: '  Driver 1  ' });
      expect(profile.name).toBe('Driver 1');
    });
  });

  describe('getProfile', () => {
    it('should return a profile by ID', () => {
      const created = service.createProfile({ name: 'Test' });
      const found = service.getProfile(created.id);
      expect(found.name).toBe('Test');
    });

    it('should return null for non-existent ID', () => {
      expect(service.getProfile('non-existent')).toBeNull();
    });

    it('should return a copy (not reference)', () => {
      const created = service.createProfile({ name: 'Test' });
      const found = service.getProfile(created.id);
      found.name = 'Modified';
      const again = service.getProfile(created.id);
      expect(again.name).toBe('Test');
    });
  });

  describe('listProfiles', () => {
    it('should return all profiles', () => {
      service.createProfile({ name: 'A' });
      service.createProfile({ name: 'B' });
      const list = service.listProfiles();
      expect(list).toHaveLength(2);
    });

    it('should return empty array when no profiles', () => {
      expect(service.listProfiles()).toEqual([]);
    });
  });

  describe('updateProfile', () => {
    it('should update name', () => {
      const profile = service.createProfile({ name: 'Old' });
      const updated = service.updateProfile(profile.id, { name: 'New' });
      expect(updated.name).toBe('New');
    });

    it('should update nested audio preferences', () => {
      const profile = service.createProfile({ name: 'Test' });
      const updated = service.updateProfile(profile.id, {
        audio: { volume: 90, equalizer: { bass: 8 } },
      });
      expect(updated.audio.volume).toBe(90);
      expect(updated.audio.equalizer.bass).toBe(8);
      expect(updated.audio.balance).toBe(0); // preserved
    });

    it('should update display preferences', () => {
      const profile = service.createProfile({ name: 'Test' });
      const updated = service.updateProfile(profile.id, {
        display: { theme: 'light' },
      });
      expect(updated.display.theme).toBe('light');
      expect(updated.display.brightness).toBe(70); // preserved
    });

    it('should throw for non-existent profile', () => {
      expect(() => service.updateProfile('fake', { name: 'X' })).toThrow(
        'Profile not found',
      );
    });

    it('should reject empty update', () => {
      const profile = service.createProfile({ name: 'Test' });
      expect(() => service.updateProfile(profile.id, {})).toThrow(
        'Validation error',
      );
    });

    it('should reject invalid values', () => {
      const profile = service.createProfile({ name: 'Test' });
      expect(() =>
        service.updateProfile(profile.id, {
          audio: { volume: 200 },
        }),
      ).toThrow('Validation error');
    });
  });

  describe('deleteProfile', () => {
    it('should delete a profile', () => {
      const profile = service.createProfile({ name: 'Test' });
      service.deleteProfile(profile.id);
      expect(service.getProfile(profile.id)).toBeNull();
    });

    it('should clear active profile if deleted', () => {
      const profile = service.createProfile({ name: 'Test' });
      service.activateProfile(profile.id);
      service.deleteProfile(profile.id);
      expect(service.getActiveProfile()).toBeNull();
    });

    it('should throw for non-existent profile', () => {
      expect(() => service.deleteProfile('fake')).toThrow('Profile not found');
    });
  });

  describe('activateProfile', () => {
    it('should activate a profile', () => {
      const profile = service.createProfile({ name: 'Test' });
      const result = service.activateProfile(profile.id);

      expect(result.profile.id).toBe(profile.id);
      expect(result.appliedPreferences).toBeDefined();
      expect(result.appliedPreferences.audio).toEqual(DEFAULT_AUDIO);
    });

    it('should set active profile', () => {
      const profile = service.createProfile({ name: 'Test' });
      service.activateProfile(profile.id);
      const active = service.getActiveProfile();
      expect(active.id).toBe(profile.id);
    });

    it('should switch active profile', () => {
      const p1 = service.createProfile({ name: 'P1' });
      const p2 = service.createProfile({ name: 'P2' });
      service.activateProfile(p1.id);
      service.activateProfile(p2.id);
      expect(service.getActiveProfile().id).toBe(p2.id);
    });

    it('should throw for non-existent profile', () => {
      expect(() => service.activateProfile('fake')).toThrow('Profile not found');
    });
  });

  describe('getActiveProfile', () => {
    it('should return null when no active profile', () => {
      expect(service.getActiveProfile()).toBeNull();
    });
  });

  describe('Bluetooth devices', () => {
    let profileId;

    beforeEach(() => {
      const profile = service.createProfile({ name: 'Test' });
      profileId = profile.id;
    });

    it('should add a Bluetooth device', () => {
      const result = service.addBluetoothDevice(profileId, {
        name: 'iPhone',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        type: 'phone',
      });

      expect(result.bluetoothDevices).toHaveLength(1);
      expect(result.bluetoothDevices[0].name).toBe('iPhone');
      expect(result.bluetoothDevices[0].id).toBeDefined();
    });

    it('should reject duplicate MAC address', () => {
      service.addBluetoothDevice(profileId, {
        name: 'iPhone',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        type: 'phone',
      });

      expect(() =>
        service.addBluetoothDevice(profileId, {
          name: 'Another Phone',
          macAddress: 'AA:BB:CC:DD:EE:FF',
          type: 'phone',
        }),
      ).toThrow('Device with this MAC address already paired');
    });

    it('should enforce max device limit', () => {
      for (let i = 0; i < MAX_BLUETOOTH_DEVICES; i++) {
        service.addBluetoothDevice(profileId, {
          name: `Device ${i}`,
          macAddress: `AA:BB:CC:DD:EE:0${i}`,
          type: 'other',
        });
      }

      expect(() =>
        service.addBluetoothDevice(profileId, {
          name: 'Extra',
          macAddress: 'AA:BB:CC:DD:EE:99',
          type: 'other',
        }),
      ).toThrow(`Maximum of ${MAX_BLUETOOTH_DEVICES} Bluetooth devices reached`);
    });

    it('should remove a Bluetooth device', () => {
      const updated = service.addBluetoothDevice(profileId, {
        name: 'iPhone',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        type: 'phone',
      });
      const deviceId = updated.bluetoothDevices[0].id;

      const result = service.removeBluetoothDevice(profileId, deviceId);
      expect(result.bluetoothDevices).toHaveLength(0);
    });

    it('should throw when removing non-existent device', () => {
      expect(() =>
        service.removeBluetoothDevice(profileId, 'fake-device'),
      ).toThrow('Bluetooth device not found');
    });

    it('should throw for non-existent profile', () => {
      expect(() =>
        service.addBluetoothDevice('fake', {
          name: 'iPhone',
          macAddress: 'AA:BB:CC:DD:EE:FF',
        }),
      ).toThrow('Profile not found');
    });
  });

  describe('recent destinations', () => {
    let profileId;

    beforeEach(() => {
      const profile = service.createProfile({ name: 'Test' });
      profileId = profile.id;
    });

    it('should add a recent destination', () => {
      const result = service.addRecentDestination(profileId, {
        latitude: 40.758,
        longitude: -73.9855,
        name: 'Times Square',
      });

      expect(result.recentDestinations).toHaveLength(1);
      expect(result.recentDestinations[0].name).toBe('Times Square');
    });

    it('should move duplicate to front', () => {
      service.addRecentDestination(profileId, {
        latitude: 1,
        longitude: 1,
        name: 'First',
      });
      service.addRecentDestination(profileId, {
        latitude: 2,
        longitude: 2,
        name: 'Second',
      });
      const result = service.addRecentDestination(profileId, {
        latitude: 1,
        longitude: 1,
        name: 'First Updated',
      });

      expect(result.recentDestinations).toHaveLength(2);
      expect(result.recentDestinations[0].name).toBe('First Updated');
    });

    it('should limit to max destinations', () => {
      for (let i = 0; i < 30; i++) {
        service.addRecentDestination(profileId, {
          latitude: i,
          longitude: i,
          name: `Place ${i}`,
        });
      }

      const profile = service.getProfile(profileId);
      expect(profile.recentDestinations).toHaveLength(MAX_RECENT_DESTINATIONS);
    });

    it('should throw for non-existent profile', () => {
      expect(() =>
        service.addRecentDestination('fake', {
          latitude: 0,
          longitude: 0,
          name: 'X',
        }),
      ).toThrow('Profile not found');
    });
  });

  describe('export/import', () => {
    it('should export a profile', () => {
      const profile = service.createProfile({
        name: 'Export Test',
        audio: { volume: 80 },
      });

      const exported = service.exportProfile(profile.id);
      expect(exported.version).toBe('1.0');
      expect(exported.exportedAt).toBeDefined();
      expect(exported.profile.name).toBe('Export Test');
      expect(exported.profile.audio.volume).toBe(80);
    });

    it('should import a profile', () => {
      const profile = service.createProfile({
        name: 'Original',
        audio: { volume: 80 },
      });

      service.addBluetoothDevice(profile.id, {
        name: 'Phone',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        type: 'phone',
      });

      const exported = service.exportProfile(profile.id);
      const imported = service.importProfile(exported);

      expect(imported.name).toBe('Original');
      expect(imported.id).not.toBe(profile.id); // new ID
      expect(imported.audio.volume).toBe(80);
      expect(imported.bluetoothDevices).toHaveLength(1);
    });

    it('should throw for invalid export data', () => {
      expect(() => service.importProfile(null)).toThrow('Invalid export data');
      expect(() => service.importProfile({})).toThrow('Invalid export data');
    });

    it('should throw for non-existent profile on export', () => {
      expect(() => service.exportProfile('fake')).toThrow('Profile not found');
    });
  });
});
