'use strict';

const Joi = require('joi');

const switchSourceSchema = Joi.object({
  sourceId: Joi.string()
    .valid('radio', 'bluetooth', 'usb', 'aux', 'android_auto', 'apple_carplay')
    .required()
    .messages({
      'any.only': 'Invalid audio source ID',
      'any.required': 'sourceId is required',
    }),
  fadeTime: Joi.number()
    .integer()
    .min(0)
    .max(500)
    .default(200)
    .messages({
      'number.min': 'fadeTime must be at least 0ms',
      'number.max': 'fadeTime must not exceed 500ms',
    }),
});

const updateControlsSchema = Joi.object({
  volume: Joi.number().integer().min(0).max(100).messages({
    'number.min': 'Volume must be between 0 and 100',
    'number.max': 'Volume must be between 0 and 100',
  }),
  balance: Joi.number().integer().min(-100).max(100).messages({
    'number.min': 'Balance must be between -100 and 100',
    'number.max': 'Balance must be between -100 and 100',
  }),
  fade: Joi.number().integer().min(-100).max(100).messages({
    'number.min': 'Fade must be between -100 and 100',
    'number.max': 'Fade must be between -100 and 100',
  }),
  bass: Joi.number().integer().min(-10).max(10).messages({
    'number.min': 'Bass must be between -10 and 10',
    'number.max': 'Bass must be between -10 and 10',
  }),
  treble: Joi.number().integer().min(-10).max(10).messages({
    'number.min': 'Treble must be between -10 and 10',
    'number.max': 'Treble must be between -10 and 10',
  }),
}).min(1).messages({
  'object.min': 'At least one control parameter is required',
});

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));

    return res.status(400).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details,
      },
    });
  }

  req.body = value;
  next();
};

module.exports = {
  validateSwitchSource: validate(switchSourceSchema),
  validateUpdateControls: validate(updateControlsSchema),
  switchSourceSchema,
  updateControlsSchema,
};
