'use strict';

const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const Joi = require('joi');

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

const MAX_BLUETOOTH_DEVICES = 5;
const MAX_RECENT_DESTINATIONS = 25;

/**
 * Default audio preferences.
 */
const DEFAULT_AUDIO = {
  equalizer: {
    bass: 0,
    mid: 0,
    treble: 0,
  },
  volume: 50,
  balance: 0,
  fade: 0,
};

/**
 * Default display preferences.
 */
const DEFAULT_DISPLAY = {
  brightness: 70,
  theme: 'dark',
  language: 'en',
};

/**
 * Default navigation preferences.
 */
const DEFAULT_NAVIGATION = {
  voiceGuidance: true,
  avoidTolls: false,
  avoidHighways: false,
  units: 'km',
};

/**
 * Joi schema for profile creation.
 */
const createProfileSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  avatar: Joi.string().trim().max(500).allow(null).optional(),
  audio: Joi.object({
    equalizer: Joi.object({
      bass: Joi.number().min(-10).max(10).optional(),
      mid: Joi.number().min(-10).max(10).optional(),
      treble: Joi.number().min(-10).max(10).optional(),
    }).optional(),
    volume: Joi.number().min(0).max(100).optional(),
    balance: Joi.number().min(-10).max(10).optional(),
    fade: Joi.number().min(-10).max(10).optional(),
  }).optional(),
  display: Joi.object({
    brightness: Joi.number().min(0).max(100).optional(),
    theme: Joi.string().valid('dark', 'light', 'auto').optional(),
    language: Joi.string().min(2).max(10).optional(),
  }).optional(),
  navigation: Joi.object({
    voiceGuidance: Joi.boolean().optional(),
    avoidTolls: Joi.boolean().optional(),
    avoidHighways: Joi.boolean().optional(),
    units: Joi.string().valid('km', 'mi').optional(),
  }).optional(),
});

/**
 * Joi schema for profile update.
 */
const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  avatar: Joi.string().trim().max(500).allow(null).optional(),
  audio: Joi.object({
    equalizer: Joi.object({
      bass: Joi.number().min(-10).max(10).optional(),
      mid: Joi.number().min(-10).max(10).optional(),
      treble: Joi.number().min(-10).max(10).optional(),
    }).optional(),
    volume: Joi.number().min(0).max(100).optional(),
    balance: Joi.number().min(-10).max(10).optional(),
    fade: Joi.number().min(-10).max(10).optional(),
  }).optional(),
  display: Joi.object({
    brightness: Joi.number().min(0).max(100).optional(),
    theme: Joi.string().valid('dark', 'light', 'auto').optional(),
    language: Joi.string().min(2).max(10).optional(),
  }).optional(),
  navigation: Joi.object({
    voiceGuidance: Joi.boolean().optional(),
    avoidTolls: Joi.boolean().optional(),
    avoidHighways: Joi.boolean().optional(),
    units: Joi.string().valid('km', 'mi').optional(),
  }).optional(),
}).min(1);

/**
 * Bluetooth device schema.
 */
const bluetoothDeviceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  macAddress: Joi.string().trim().required(),
  type: Joi.string().valid('phone', 'audio', 'other').default('other'),
});

class UserProfileService {
  constructor() {
    this.profiles = new Map();
    this.activeProfileId = null;
  }

  /**
   * Create a new user profile.
   * @param {object} data - profile data
   * @returns {object} created profile
   */
  createProfile(data) {
    const { error, value } = createProfileSchema.validate(data, {
      stripUnknown: true,
    });
    if (error) {
      throw new Error(`Validation error: ${error.message}`);
    }

    const profile = {
      id: uuidv4(),
      name: value.name,
      avatar: value.avatar || null,
      audio: this._mergeDefaults(value.audio, DEFAULT_AUDIO),
      display: this._mergeDefaults(value.display, DEFAULT_DISPLAY),
      navigation: this._mergeDefaults(value.navigation, DEFAULT_NAVIGATION),
      bluetoothDevices: [],
      recentDestinations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.profiles.set(profile.id, profile);

    logger.info('Profile created', { profileId: profile.id, name: profile.name });

    return { ...profile };
  }

  /**
   * Get a profile by ID.
   * @param {string} id
   * @returns {object|null}
   */
  getProfile(id) {
    const profile = this.profiles.get(id);
    return profile ? { ...profile } : null;
  }

  /**
   * List all profiles.
   * @returns {Array}
   */
  listProfiles() {
    return Array.from(this.profiles.values()).map((p) => ({ ...p }));
  }

  /**
   * Update a profile.
   * @param {string} id
   * @param {object} data
   * @returns {object} updated profile
   */
  updateProfile(id, data) {
    const profile = this.profiles.get(id);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const { error, value } = updateProfileSchema.validate(data, {
      stripUnknown: true,
    });
    if (error) {
      throw new Error(`Validation error: ${error.message}`);
    }

    if (value.name !== undefined) {profile.name = value.name;}
    if (value.avatar !== undefined) {profile.avatar = value.avatar;}

    if (value.audio) {
      profile.audio = this._deepMerge(profile.audio, value.audio);
    }
    if (value.display) {
      profile.display = { ...profile.display, ...value.display };
    }
    if (value.navigation) {
      profile.navigation = { ...profile.navigation, ...value.navigation };
    }

    profile.updatedAt = new Date().toISOString();
    this.profiles.set(id, profile);

    logger.info('Profile updated', { profileId: id });

    return { ...profile };
  }

  /**
   * Delete a profile.
   * @param {string} id
   * @returns {boolean}
   */
  deleteProfile(id) {
    if (!this.profiles.has(id)) {
      throw new Error('Profile not found');
    }

    if (this.activeProfileId === id) {
      this.activeProfileId = null;
    }

    this.profiles.delete(id);
    logger.info('Profile deleted', { profileId: id });
    return true;
  }

  /**
   * Activate a profile (set as current).
   * @param {string} id
   * @returns {object} activated profile with applied preferences
   */
  activateProfile(id) {
    const profile = this.profiles.get(id);
    if (!profile) {
      throw new Error('Profile not found');
    }

    this.activeProfileId = id;
    profile.lastActivatedAt = new Date().toISOString();
    profile.updatedAt = new Date().toISOString();

    logger.info('Profile activated', { profileId: id, name: profile.name });

    return {
      profile: { ...profile },
      appliedPreferences: {
        audio: { ...profile.audio },
        display: { ...profile.display },
        navigation: { ...profile.navigation },
      },
    };
  }

  /**
   * Get the currently active profile.
   * @returns {object|null}
   */
  getActiveProfile() {
    if (!this.activeProfileId) {return null;}
    return this.getProfile(this.activeProfileId);
  }

  /**
   * Add a Bluetooth device to a profile.
   * @param {string} profileId
   * @param {object} device - { name, macAddress, type }
   * @returns {object} updated profile
   */
  addBluetoothDevice(profileId, device) {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const { error, value } = bluetoothDeviceSchema.validate(device, {
      stripUnknown: true,
    });
    if (error) {
      throw new Error(`Validation error: ${error.message}`);
    }

    // Check for duplicate MAC
    const existing = profile.bluetoothDevices.find(
      (d) => d.macAddress === value.macAddress,
    );
    if (existing) {
      throw new Error('Device with this MAC address already paired');
    }

    if (profile.bluetoothDevices.length >= MAX_BLUETOOTH_DEVICES) {
      throw new Error(`Maximum of ${MAX_BLUETOOTH_DEVICES} Bluetooth devices reached`);
    }

    const storedDevice = {
      ...value,
      id: uuidv4(),
      pairedAt: new Date().toISOString(),
    };

    profile.bluetoothDevices.push(storedDevice);
    profile.updatedAt = new Date().toISOString();

    logger.info('Bluetooth device added', {
      profileId,
      deviceName: value.name,
    });

    return { ...profile };
  }

  /**
   * Remove a Bluetooth device from a profile.
   * @param {string} profileId
   * @param {string} deviceId
   * @returns {object} updated profile
   */
  removeBluetoothDevice(profileId, deviceId) {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const index = profile.bluetoothDevices.findIndex((d) => d.id === deviceId);
    if (index === -1) {
      throw new Error('Bluetooth device not found');
    }

    profile.bluetoothDevices.splice(index, 1);
    profile.updatedAt = new Date().toISOString();

    logger.info('Bluetooth device removed', { profileId, deviceId });

    return { ...profile };
  }

  /**
   * Add a recent destination to a profile.
   * @param {string} profileId
   * @param {object} destination - { latitude, longitude, name, address }
   * @returns {object} updated profile
   */
  addRecentDestination(profileId, destination) {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Remove duplicate
    profile.recentDestinations = profile.recentDestinations.filter(
      (d) => !(d.latitude === destination.latitude && d.longitude === destination.longitude),
    );

    // Add to front
    profile.recentDestinations.unshift({
      ...destination,
      visitedAt: new Date().toISOString(),
    });

    // Trim to max
    if (profile.recentDestinations.length > MAX_RECENT_DESTINATIONS) {
      profile.recentDestinations.length = MAX_RECENT_DESTINATIONS;
    }

    profile.updatedAt = new Date().toISOString();

    return { ...profile };
  }

  /**
   * Export a profile for backup/transfer.
   * @param {string} id
   * @returns {object} exportable profile data
   */
  exportProfile(id) {
    const profile = this.profiles.get(id);
    if (!profile) {
      throw new Error('Profile not found');
    }

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      profile: {
        name: profile.name,
        avatar: profile.avatar,
        audio: { ...profile.audio },
        display: { ...profile.display },
        navigation: { ...profile.navigation },
        bluetoothDevices: [...profile.bluetoothDevices],
        recentDestinations: [...profile.recentDestinations],
      },
    };
  }

  /**
   * Import a profile from exported data.
   * @param {object} exportData
   * @returns {object} imported profile
   */
  importProfile(exportData) {
    if (!exportData || !exportData.profile) {
      throw new Error('Invalid export data');
    }

    const profileData = exportData.profile;

    const profile = this.createProfile({
      name: profileData.name,
      avatar: profileData.avatar,
      audio: profileData.audio,
      display: profileData.display,
      navigation: profileData.navigation,
    });

    // Restore bluetooth devices
    const stored = this.profiles.get(profile.id);
    if (profileData.bluetoothDevices) {
      stored.bluetoothDevices = profileData.bluetoothDevices.slice(
        0,
        MAX_BLUETOOTH_DEVICES,
      );
    }
    if (profileData.recentDestinations) {
      stored.recentDestinations = profileData.recentDestinations.slice(
        0,
        MAX_RECENT_DESTINATIONS,
      );
    }

    return { ...stored };
  }

  _mergeDefaults(provided, defaults) {
    if (!provided) {return { ...defaults };}

    const result = { ...defaults };
    for (const key of Object.keys(provided)) {
      if (
        typeof provided[key] === 'object' &&
        provided[key] !== null &&
        !Array.isArray(provided[key])
      ) {
        result[key] = { ...defaults[key], ...provided[key] };
      } else {
        result[key] = provided[key];
      }
    }
    return result;
  }

  _deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object'
      ) {
        result[key] = { ...target[key], ...source[key] };
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}

module.exports = {
  UserProfileService,
  MAX_BLUETOOTH_DEVICES,
  MAX_RECENT_DESTINATIONS,
  DEFAULT_AUDIO,
  DEFAULT_DISPLAY,
  DEFAULT_NAVIGATION,
  createProfileSchema,
  updateProfileSchema,
};
