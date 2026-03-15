'use strict';

const { UserProfileService } = require('../services/user-profile-service');

const profileService = new UserProfileService();

/**
 * List all profiles.
 */
const listProfiles = (req, res) => {
  try {
    const profiles = profileService.listProfiles();
    const activeProfile = profileService.getActiveProfile();
    res.json({
      success: true,
      data: {
        profiles,
        activeProfileId: activeProfile ? activeProfile.id : null,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

/**
 * Create a new profile.
 */
const createProfile = (req, res) => {
  try {
    const profile = profileService.createProfile(req.body);
    res.status(201).json({
      success: true,
      data: profile,
    });
  } catch (err) {
    if (err.message.startsWith('Validation error')) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

/**
 * Get a profile by ID.
 */
const getProfile = (req, res) => {
  try {
    const profile = profileService.getProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }
    res.json({
      success: true,
      data: profile,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

/**
 * Update a profile.
 */
const updateProfile = (req, res) => {
  try {
    const profile = profileService.updateProfile(req.params.id, req.body);
    res.json({
      success: true,
      data: profile,
    });
  } catch (err) {
    if (err.message === 'Profile not found') {
      return res.status(404).json({
        success: false,
        error: err.message,
      });
    }
    if (err.message.startsWith('Validation error')) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

/**
 * Delete a profile.
 */
const deleteProfile = (req, res) => {
  try {
    profileService.deleteProfile(req.params.id);
    res.json({
      success: true,
      data: { deleted: true },
    });
  } catch (err) {
    if (err.message === 'Profile not found') {
      return res.status(404).json({
        success: false,
        error: err.message,
      });
    }
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

/**
 * Activate a profile.
 */
const activateProfile = (req, res) => {
  try {
    const result = profileService.activateProfile(req.params.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err.message === 'Profile not found') {
      return res.status(404).json({
        success: false,
        error: err.message,
      });
    }
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

/**
 * Get the profile service instance (for testing).
 */
const getServiceInstance = () => profileService;

module.exports = {
  listProfiles,
  createProfile,
  getProfile,
  updateProfile,
  deleteProfile,
  activateProfile,
  getServiceInstance,
};
