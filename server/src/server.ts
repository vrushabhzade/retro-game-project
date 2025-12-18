import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { dbManager } from './config/database';
import { logger } from './utils/logger';
import { GameSocketHandler } from './websocket/GameSocketHandler';

// Import routes
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';

// Import middleware
import { generalLimiter, authLimiter, gameActionLimiter, aiGuidanceLimiter } from './middleware/rateLimiter';

class Server {
  private app: express.Application;
  private httpServer: ReturnType<typeof createServer>;
  private io: SocketIOServer;
  private gameSocketHandler: GameSocketHandler;
  private port: number;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.port = parseInt(process.env.PORT || '3001');
    
    this.setupSocketIO();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupSocketIO(): void {
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8080'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.gameSocketHandler = new GameSocketHandler(this.io);
    logger.info('Socket.IO server initialized');
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8080'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.url}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      next();
    });

    // Rate limiting
    this.app.use('/api/', generalLimiter);
    this.app.use('/api/auth/', authLimiter);
    this.app.use('/api/game/', gameActionLimiter);
    this.app.use('/api/game/*/ai-guidance', aiGuidanceLimiter);
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          connectedPlayers: this.gameSocketHandler.getConnectedPlayerCount()
        }
      });
    });

    // Database health check
    this.app.get('/health/db', async (req, res) => {
      try {
        const dbHealth = await dbManager.isHealthy();
        const isHealthy = dbHealth.mongodb && dbHealth.redis;
        
        res.status(isHealthy ? 200 : 503).json({
          success: isHealthy,
          data: {
            mongodb: dbHealth.mongodb,
            redis: dbHealth.redis,
            timestamp: new Date()
          }
        });
      } catch (error) {
        logger.error('Database health check failed:', error);
        res.status(503).json({
          success: false,
          error: {
            code: 'DB_HEALTH_CHECK_FAILED',
            message: 'Database health check failed'
          },
          timestamp: new Date()
        });
      }
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/game', gameRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found'
        },
        timestamp: new Date()
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : error.message
        },
        timestamp: new Date()
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown('UNHANDLED_REJECTION');
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received');
      this.gracefulShutdown('SIGTERM');
    });

    // Handle SIGINT
    process.on('SIGINT', () => {
      logger.info('SIGINT received');
      this.gracefulShutdown('SIGINT');
    });
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    logger.info(`Graceful shutdown initiated by ${signal}`);
    
    try {
      // Close HTTP server
      this.httpServer.close(() => {
        logger.info('HTTP server closed');
      });

      // Close Socket.IO server
      this.io.close(() => {
        logger.info('Socket.IO server closed');
      });

      // Close database connections
      await dbManager.disconnect();
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    try {
      // Connect to databases
      await dbManager.connectMongoDB();
      await dbManager.connectRedis();

      // Start HTTP server
      this.httpServer.listen(this.port, () => {
        logger.info(`AI Dungeon Master server started on port ${this.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`Socket.IO enabled for real-time gameplay`);
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new Server();
server.start().catch((error) => {
  logger.error('Server startup failed:', error);
  process.exit(1);
});