import mongoose from 'mongoose';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private mongoConnection: typeof mongoose | null = null;
  private redisClient: ReturnType<typeof createClient> | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async connectMongoDB(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-dungeon-master';
      
      this.mongoConnection = await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      logger.info('MongoDB connected successfully');

      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async connectRedis(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.redisClient = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500)
        }
      });

      this.redisClient.on('error', (error) => {
        logger.error('Redis connection error:', error);
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      this.redisClient.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      await this.redisClient.connect();

    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.mongoConnection) {
        await mongoose.disconnect();
        logger.info('MongoDB disconnected');
      }

      if (this.redisClient) {
        await this.redisClient.quit();
        logger.info('Redis disconnected');
      }
    } catch (error) {
      logger.error('Error during database disconnection:', error);
    }
  }

  public getRedisClient() {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    return this.redisClient;
  }

  public getMongoConnection() {
    if (!this.mongoConnection) {
      throw new Error('MongoDB connection not initialized');
    }
    return this.mongoConnection;
  }

  public async isHealthy(): Promise<{ mongodb: boolean; redis: boolean }> {
    const health = {
      mongodb: false,
      redis: false
    };

    try {
      if (this.mongoConnection && mongoose.connection.readyState === 1) {
        health.mongodb = true;
      }
    } catch (error) {
      logger.error('MongoDB health check failed:', error);
    }

    try {
      if (this.redisClient && this.redisClient.isOpen) {
        await this.redisClient.ping();
        health.redis = true;
      }
    } catch (error) {
      logger.error('Redis health check failed:', error);
    }

    return health;
  }
}

export const dbManager = DatabaseManager.getInstance();