import { Router } from 'express';
import { playerService } from '../services/PlayerService';
import { validateRequest, schemas } from '../middleware/validation';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new player
 */
router.post('/register', validateRequest(schemas.registerPlayer), async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    const result = await playerService.registerPlayer(username, email, password);
    
    res.status(201).json({
      success: true,
      data: {
        player: result.player,
        token: result.token
      },
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Registration error:', error);
    
    const message = error instanceof Error ? error.message : 'Registration failed';
    const statusCode = message.includes('already exists') ? 409 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 409 ? 'USER_EXISTS' : 'REGISTRATION_FAILED',
        message
      },
      timestamp: new Date()
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate player login
 */
router.post('/login', validateRequest(schemas.loginPlayer), async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await playerService.loginPlayer(username, password);
    
    res.json({
      success: true,
      data: {
        player: result.player,
        token: result.token
      },
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Login error:', error);
    
    const message = error instanceof Error ? error.message : 'Login failed';
    const statusCode = message.includes('Invalid credentials') ? 401 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 401 ? 'INVALID_CREDENTIALS' : 'LOGIN_FAILED',
        message
      },
      timestamp: new Date()
    });
  }
});

/**
 * GET /api/auth/profile
 * Get current player profile
 */
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const playerId = req.playerId!;
    
    const player = await playerService.getPlayerProfile(playerId);
    
    if (!player) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PLAYER_NOT_FOUND',
          message: 'Player profile not found'
        },
        timestamp: new Date()
      });
    }
    
    res.json({
      success: true,
      data: { player },
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Profile fetch error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFILE_FETCH_FAILED',
        message: 'Failed to fetch player profile'
      },
      timestamp: new Date()
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update player profile
 */
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const playerId = req.playerId!;
    const updates = req.body;
    
    const updatedPlayer = await playerService.updatePlayerProfile(playerId, updates);
    
    res.json({
      success: true,
      data: { player: updatedPlayer },
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Profile update error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFILE_UPDATE_FAILED',
        message: 'Failed to update player profile'
      },
      timestamp: new Date()
    });
  }
});

/**
 * PUT /api/auth/visual-preferences
 * Update visual preferences
 */
router.put('/visual-preferences', 
  authenticateToken, 
  validateRequest(schemas.updateVisualPreferences), 
  async (req: AuthenticatedRequest, res) => {
    try {
      const playerId = req.playerId!;
      const preferences = req.body;
      
      await playerService.updateVisualPreferences(playerId, preferences);
      
      res.json({
        success: true,
        data: { message: 'Visual preferences updated successfully' },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Visual preferences update error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'PREFERENCES_UPDATE_FAILED',
          message: 'Failed to update visual preferences'
        },
        timestamp: new Date()
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout (client-side token removal, server-side logging)
 */
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const playerId = req.playerId!;
    
    logger.info(`Player logged out: ${playerId}`);
    
    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Logout error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: 'Logout failed'
      },
      timestamp: new Date()
    });
  }
});

export default router;