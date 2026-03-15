'use strict';

const express = require('express');
const Joi = require('joi');

const chatSchema = Joi.object({
  message: Joi.string().min(1).max(2000).required(),
  sessionId: Joi.string().optional(),
});

const createChatRouter = (claudeService) => {
  const router = express.Router();

  router.get('/status', (_req, res) => {
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: { available: claudeService.available },
    });
  });

  router.post('/message', async (req, res) => {
    const { error, value } = chatSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message },
      });
    }

    const sessionId = value.sessionId || 'default';

    try {
      const result = await claudeService.chat(sessionId, value.message);
      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          reply: result.reply,
          toolsUsed: result.toolsUsed || [],
          mediaCommands: result.mediaCommands || [],
          sessionId,
        },
      });
    } catch (err) {
      const status = err.message.includes('not configured') ? 503 : 500;
      return res.status(status).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: { code: 'CHAT_ERROR', message: err.message },
      });
    }
  });

  router.delete('/session/:sessionId', (req, res) => {
    claudeService.clearConversation(req.params.sessionId);
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
};

module.exports = createChatRouter;
