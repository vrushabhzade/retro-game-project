import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

export const validateRequest = (schema: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    // Validate request body
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate path parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(`Params: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    if (errors.length > 0) {
      logger.warn('Request validation failed:', { errors, url: req.url });
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors
        },
        timestamp: new Date()
      });
    }

    next();
  };
};

// Common validation schemas
export const schemas = {
  // Player registration
  registerPlayer: {
    body: Joi.object({
      username: Joi.string().alphanum().min(3).max(30).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).max(128).required()
    })
  },

  // Player login
  loginPlayer: {
    body: Joi.object({
      username: Joi.string().required(),
      password: Joi.string().required()
    })
  },

  // Game movement
  playerMovement: {
    body: Joi.object({
      direction: Joi.object({
        x: Joi.number().integer().min(-1).max(1).required(),
        y: Joi.number().integer().min(-1).max(1).required()
      }).required()
    })
  },

  // Combat action
  combatAction: {
    body: Joi.object({
      action: Joi.string().valid('attack', 'cast_spell', 'use_item', 'defend').required(),
      target: Joi.string().optional(),
      itemId: Joi.string().optional()
    })
  },

  // Visual preferences update
  updateVisualPreferences: {
    body: Joi.object({
      uiComplexity: Joi.string().valid('simple', 'moderate', 'detailed', 'expert').optional(),
      colorScheme: Joi.string().valid('classic', 'high_contrast', 'colorblind_friendly', 'dark').optional(),
      animationSpeed: Joi.string().valid('slow', 'normal', 'fast').optional(),
      informationDensity: Joi.string().valid('minimal', 'standard', 'detailed', 'comprehensive').optional(),
      thoughtBubbleFrequency: Joi.string().valid('rare', 'normal', 'frequent', 'constant').optional()
    })
  },

  // Game ID parameter
  gameId: {
    params: Joi.object({
      gameId: Joi.string().uuid().required()
    })
  },

  // Player ID parameter
  playerId: {
    params: Joi.object({
      playerId: Joi.string().uuid().required()
    })
  }
};