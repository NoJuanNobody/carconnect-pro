'use strict';

const express = require('express');
const AudioController = require('../../controllers/audio-controller');
const AudioService = require('../../services/audio-service');
const {
  validateSwitchSource,
  validateUpdateControls,
} = require('../../middleware/audio-validation');

const createAudioRouter = (audioService) => {
  const router = express.Router();
  const service = audioService || new AudioService();
  const controller = new AudioController(service);

  router.get('/sources', (req, res) => controller.getSources(req, res));

  router.get('/controls', (req, res) => {
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: service.getControls(),
    });
  });

  router.post(
    '/source',
    validateSwitchSource,
    (req, res) => controller.switchSource(req, res),
  );

  router.patch(
    '/control',
    validateUpdateControls,
    (req, res) => controller.updateControls(req, res),
  );

  return { router, service };
};

module.exports = createAudioRouter;
