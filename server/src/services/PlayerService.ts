import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { PlayerProfile, AILearningData, VisualPreferences } from '../types';
import { PlayerProfileModel } from '../models/PlayerProfile';
import { logger } from '../utils/logger';

export class PlayerService {
  private static instance: PlayerService;

  private constructor() {}

  public static getInstance(): PlayerService {
    if (!PlayerService.instance) {
      PlayerService.instance = new PlayerService();
    }
    return PlayerService.instance;
  }

  /**
   * Register a new player
   */
  public async registerPlayer(
    username: string,
    email: string,
    password: string
  ): Promise<{ player: PlayerProfile; token: string }> {
    try {
      // Check if user already exists
      const existingPlayer = await PlayerProfileModel.findOne({
        $or: [{ username }, { email }]
      });

      if (existingPlayer) {
        throw new Error('Username or email already exists');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create default AI learning data
      const defaultAIData: AILearningData = {
        behaviorPatterns: {
          movementStyle: 'exploratory',
          combatPreference: 'balanced',
          resourceManagement: 'moderate',
          explorationPattern: 'thorough'
        },
        performanceMetrics: {
          averageReactionTime: 500,
          combatEfficiency: 50,
          survivalRate: 70,
          resourceUtilization: 60
        },
        adaptationLevel: 'beginner',
        mentorInteractions: []
      };

      // Create default visual preferences
      const defaultVisualPreferences: VisualPreferences = {
        uiComplexity: 'simple',
        colorScheme: 'classic',
        animationSpeed: 'normal',
        informationDensity: 'minimal',
        thoughtBubbleFrequency: 'normal'
      };

      const playerProfile: PlayerProfile = {
        id: uuidv4(),
        username,
        email,
        passwordHash,
        gameStats: {
          totalPlayTime: 0,
          dungeonLevelsCompleted: 0,
          enemiesDefeated: 0,
          goldCollected: 0,
          deathCount: 0,
          averageCombatEfficiency: 0
        },
        aiLearningData: defaultAIData,
        visualPreferences: defaultVisualPreferences,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      };

      const newPlayer = new PlayerProfileModel(playerProfile);
      await newPlayer.save();

      // Generate JWT token
      const token = this.generateToken(playerProfile.id);

      logger.info(`New player registered: ${username}`, { playerId: playerProfile.id });

      return { 
        player: { ...playerProfile, passwordHash: '' }, // Don't return password hash
        token 
      };

    } catch (error) {
      logger.error('Error registering player:', error);
      throw error;
    }
  }

  /**
   * Authenticate player login
   */
  public async loginPlayer(
    username: string,
    password: string
  ): Promise<{ player: PlayerProfile; token: string }> {
    try {
      const player = await PlayerProfileModel.findOne({
        $or: [{ username }, { email: username }]
      });

      if (!player) {
        throw new Error('Invalid credentials');
      }

      const isValidPassword = await bcrypt.compare(password, player.passwordHash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      player.lastLoginAt = new Date();
      await player.save();

      // Generate JWT token
      const token = this.generateToken(player.id);

      logger.info(`Player logged in: ${username}`, { playerId: player.id });

      return { 
        player: { ...player.toObject(), passwordHash: '' }, // Don't return password hash
        token 
      };

    } catch (error) {
      logger.error('Error during login:', error);
      throw error;
    }
  }

  /**
   * Get player profile by ID
   */
  public async getPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
    try {
      const player = await PlayerProfileModel.findOne({ id: playerId }).lean();
      
      if (!player) {
        return null;
      }

      // Don't return password hash
      const { passwordHash, ...playerProfile } = player;
      return playerProfile as PlayerProfile;

    } catch (error) {
      logger.error('Error fetching player profile:', error);
      throw new Error('Failed to fetch player profile');
    }
  }

  /**
   * Update player profile
   */
  public async updatePlayerProfile(
    playerId: string,
    updates: Partial<PlayerProfile>
  ): Promise<PlayerProfile> {
    try {
      // Remove sensitive fields from updates
      const { passwordHash, id, createdAt, ...safeUpdates } = updates;

      const updatedPlayer = await PlayerProfileModel.findOneAndUpdate(
        { id: playerId },
        { 
          ...safeUpdates,
          updatedAt: new Date()
        },
        { new: true, lean: true }
      );

      if (!updatedPlayer) {
        throw new Error('Player not found');
      }

      logger.info(`Player profile updated: ${playerId}`);

      // Don't return password hash
      const { passwordHash: _, ...playerProfile } = updatedPlayer;
      return playerProfile as PlayerProfile;

    } catch (error) {
      logger.error('Error updating player profile:', error);
      throw new Error('Failed to update player profile');
    }
  }

  /**
   * Update AI learning data
   */
  public async updateAILearningData(
    playerId: string,
    aiDataUpdates: Partial<AILearningData>
  ): Promise<void> {
    try {
      await PlayerProfileModel.updateOne(
        { id: playerId },
        { 
          $set: {
            'aiLearningData': aiDataUpdates,
            'updatedAt': new Date()
          }
        }
      );

      logger.debug(`AI learning data updated for player: ${playerId}`);

    } catch (error) {
      logger.error('Error updating AI learning data:', error);
      throw new Error('Failed to update AI learning data');
    }
  }

  /**
   * Update visual preferences
   */
  public async updateVisualPreferences(
    playerId: string,
    preferences: Partial<VisualPreferences>
  ): Promise<void> {
    try {
      await PlayerProfileModel.updateOne(
        { id: playerId },
        { 
          $set: {
            'visualPreferences': preferences,
            'updatedAt': new Date()
          }
        }
      );

      logger.debug(`Visual preferences updated for player: ${playerId}`);

    } catch (error) {
      logger.error('Error updating visual preferences:', error);
      throw new Error('Failed to update visual preferences');
    }
  }

  /**
   * Update game statistics
   */
  public async updateGameStats(
    playerId: string,
    statsUpdate: {
      playTime?: number;
      levelsCompleted?: number;
      enemiesDefeated?: number;
      goldCollected?: number;
      deaths?: number;
      combatEfficiency?: number;
    }
  ): Promise<void> {
    try {
      const updateQuery: any = { updatedAt: new Date() };

      if (statsUpdate.playTime) {
        updateQuery['$inc'] = { 'gameStats.totalPlayTime': statsUpdate.playTime };
      }
      if (statsUpdate.levelsCompleted) {
        updateQuery['$inc'] = { 
          ...updateQuery['$inc'],
          'gameStats.dungeonLevelsCompleted': statsUpdate.levelsCompleted 
        };
      }
      if (statsUpdate.enemiesDefeated) {
        updateQuery['$inc'] = { 
          ...updateQuery['$inc'],
          'gameStats.enemiesDefeated': statsUpdate.enemiesDefeated 
        };
      }
      if (statsUpdate.goldCollected) {
        updateQuery['$inc'] = { 
          ...updateQuery['$inc'],
          'gameStats.goldCollected': statsUpdate.goldCollected 
        };
      }
      if (statsUpdate.deaths) {
        updateQuery['$inc'] = { 
          ...updateQuery['$inc'],
          'gameStats.deathCount': statsUpdate.deaths 
        };
      }
      if (statsUpdate.combatEfficiency !== undefined) {
        updateQuery['$set'] = { 
          'gameStats.averageCombatEfficiency': statsUpdate.combatEfficiency 
        };
      }

      await PlayerProfileModel.updateOne({ id: playerId }, updateQuery);

      logger.debug(`Game stats updated for player: ${playerId}`);

    } catch (error) {
      logger.error('Error updating game stats:', error);
      throw new Error('Failed to update game stats');
    }
  }

  /**
   * Verify JWT token
   */
  public verifyToken(token: string): { playerId: string } | null {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
      }

      const decoded = jwt.verify(token, jwtSecret) as { playerId: string };
      return decoded;

    } catch (error) {
      logger.warn('Invalid token verification:', error);
      return null;
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(playerId: string): string {
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    return jwt.sign({ playerId }, jwtSecret, { expiresIn: jwtExpiresIn });
  }
}

export const playerService = PlayerService.getInstance();