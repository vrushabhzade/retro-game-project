import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    },
    timestamp: new Date()
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.'
      },
      timestamp: new Date()
    });
  }
});

// Stricter rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.'
    },
    timestamp: new Date()
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later.'
      },
      timestamp: new Date()
    });
  }
});

// Game action rate limiter (more permissive for gameplay)
export const gameActionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 actions per minute (1 per second average)
  message: {
    success: false,
    error: {
      code: 'GAME_ACTION_RATE_LIMIT_EXCEEDED',
      message: 'Too many game actions, please slow down.'
    },
    timestamp: new Date()
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Game action rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'GAME_ACTION_RATE_LIMIT_EXCEEDED',
        message: 'Too many game actions, please slow down.'
      },
      timestamp: new Date()
    });
  }
});

// AI guidance rate limiter
export const aiGuidanceLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI requests per minute
  message: {
    success: false,
    error: {
      code: 'AI_GUIDANCE_RATE_LIMIT_EXCEEDED',
      message: 'Too many AI guidance requests, please wait before requesting more help.'
    },
    timestamp: new Date()
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`AI guidance rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'AI_GUIDANCE_RATE_LIMIT_EXCEEDED',
        message: 'Too many AI guidance requests, please wait before requesting more help.'
      },
      timestamp: new Date()
    });
  }
});