import { Router } from 'express';
import { gameService } from '../services/GameService';
import { playerService } from '../services/PlayerService';
import { aiService } from '../services/AIService';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest, schemas } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/game/new
 * Create a new game session
 */
router.post('/new', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const playerId = req.playerId!;
    
    const gameState = await gameService.createNewGame(playerId);
    
    res.status(201).json({
      success: true,
      data: { gameState },
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('New game creation error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'GAME_CREATION_FAILED',
        message: 'Failed to create new game'
      },
      timestamp: new Date()
    });
  }
});

/**
 * GET /api/game/:gameId
 * Load existing game state
 */
router.get('/:gameId', 
  authenticateToken, 
  validateRequest(schemas.gameId), 
  async (req: AuthenticatedRequest, res) => {
    try {
      const playerId = req.playerId!;
      const { gameId } = req.params;
      
      const gameState = await gameService.loadGame(gameId, playerId);
      
      if (!gameState) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'GAME_NOT_FOUND',
            message: 'Game not found or access denied'
          },
          timestamp: new Date()
        });
      }
      
      res.json({
        success: true,
        data: { gameState },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Game load error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'GAME_LOAD_FAILED',
          message: 'Failed to load game'
        },
        timestamp: new Date()
      });
    }
  }
);

/**
 * GET /api/game/player/games
 * Get all games for current player
 */
router.get('/player/games', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const playerId = req.playerId!;
    
    const games = await gameService.getPlayerGames(playerId);
    
    res.json({
      success: true,
      data: { games },
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Player games fetch error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'GAMES_FETCH_FAILED',
        message: 'Failed to fetch player games'
      },
      timestamp: new Date()
    });
  }
});

/**
 * POST /api/game/:gameId/move
 * Process player movement
 */
router.post('/:gameId/move', 
  authenticateToken,
  validateRequest({ 
    ...schemas.gameId, 
    ...schemas.playerMovement 
  }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const playerId = req.playerId!;
      const { gameId } = req.params;
      const { direction } = req.body;
      
      // Load current game state
      const gameState = await gameService.loadGame(gameId, playerId);
      if (!gameState) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'GAME_NOT_FOUND',
            message: 'Game not found'
          },
          timestamp: new Date()
        });
      }

      // Process movement
      const moveResult = gameService.processMovement(gameState, direction);
      
      // Save updated game state
      await gameService.saveGame(moveResult.updatedGameState);
      
      // Get AI guidance if movement was successful
      let aiResponse = null;
      if (moveResult.success) {
        const playerProfile = await playerService.getPlayerProfile(playerId);
        if (playerProfile) {
          aiResponse = await aiService.generateGuidance(
            moveResult.updatedGameState,
            playerProfile,
            `Player moved to (${moveResult.newPosition?.x}, ${moveResult.newPosition?.y})`
          );
        }
      }
      
      res.json({
        success: true,
        data: {
          moveResult,
          gameState: moveResult.updatedGameState,
          aiResponse
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Movement processing error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'MOVEMENT_FAILED',
          message: 'Failed to process movement'
        },
        timestamp: new Date()
      });
    }
  }
);

/**
 * POST /api/game/:gameId/combat
 * Process combat action
 */
router.post('/:gameId/combat',
  authenticateToken,
  validateRequest({
    ...schemas.gameId,
    ...schemas.combatAction
  }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const playerId = req.playerId!;
      const { gameId } = req.params;
      const { action, target, itemId } = req.body;
      
      // Load current game state
      const gameState = await gameService.loadGame(gameId, playerId);
      if (!gameState) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'GAME_NOT_FOUND',
            message: 'Game not found'
          },
          timestamp: new Date()
        });
      }

      // TODO: Implement combat processing logic
      // This would involve:
      // 1. Validate combat action
      // 2. Process player action
      // 3. Process enemy actions
      // 4. Update game state
      // 5. Generate combat analysis
      
      res.json({
        success: true,
        data: {
          message: 'Combat action processed',
          gameState
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Combat processing error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'COMBAT_FAILED',
          message: 'Failed to process combat action'
        },
        timestamp: new Date()
      });
    }
  }
);

/**
 * POST /api/game/:gameId/save
 * Save current game state
 */
router.post('/:gameId/save',
  authenticateToken,
  validateRequest(schemas.gameId),
  async (req: AuthenticatedRequest, res) => {
    try {
      const playerId = req.playerId!;
      const { gameId } = req.params;
      
      const gameState = await gameService.loadGame(gameId, playerId);
      if (!gameState) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'GAME_NOT_FOUND',
            message: 'Game not found'
          },
          timestamp: new Date()
        });
      }

      await gameService.saveGame(gameState);
      
      res.json({
        success: true,
        data: { message: 'Game saved successfully' },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Game save error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SAVE_FAILED',
          message: 'Failed to save game'
        },
        timestamp: new Date()
      });
    }
  }
);

/**
 * GET /api/game/:gameId/ai-guidance
 * Get AI mentor guidance for current situation
 */
router.get('/:gameId/ai-guidance',
  authenticateToken,
  validateRequest(schemas.gameId),
  async (req: AuthenticatedRequest, res) => {
    try {
      const playerId = req.playerId!;
      const { gameId } = req.params;
      const context = req.query.context as string || 'general_guidance';
      
      const gameState = await gameService.loadGame(gameId, playerId);
      if (!gameState) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'GAME_NOT_FOUND',
            message: 'Game not found'
          },
          timestamp: new Date()
        });
      }

      const playerProfile = await playerService.getPlayerProfile(playerId);
      if (!playerProfile) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PLAYER_NOT_FOUND',
            message: 'Player profile not found'
          },
          timestamp: new Date()
        });
      }

      const aiResponse = await aiService.generateGuidance(
        gameState,
        playerProfile,
        context
      );
      
      res.json({
        success: true,
        data: { aiResponse },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('AI guidance error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'AI_GUIDANCE_FAILED',
          message: 'Failed to generate AI guidance'
        },
        timestamp: new Date()
      });
    }
  }
);

export default router;