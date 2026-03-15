'use strict';

const express = require('express');
const {
  listProfiles,
  createProfile,
  getProfile,
  updateProfile,
  deleteProfile,
  activateProfile,
} = require('../../controllers/profile-controller');

const router = express.Router();

router.get('/', listProfiles);
router.post('/', createProfile);
router.get('/:id', getProfile);
router.put('/:id', updateProfile);
router.delete('/:id', deleteProfile);
router.post('/:id/activate', activateProfile);

module.exports = router;
