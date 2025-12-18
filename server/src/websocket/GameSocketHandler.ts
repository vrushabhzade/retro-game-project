import { Server as SocketIOServer, Socket } from 'socket.io';
import { playerService } from '../services/PlayerService';
import { gameService } from '../services/GameService';
import { aiService } from '../services/AIService';
import { WebSocketMessage, GameState, PlayerProfile } from '../types';
import { logger } from '../utils/logger';

export class GameSocketHandler {
  private io: SocketIOServer;
  private connectedPlayers: Map<string, { socket: Socket; playerId: string }> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (data: { token: string }) => {
        try {
          const decoded = playerService.verifyToken(data.token);
          if (!decoded) {
            socket.emit('auth_error', { message: 'Invalid token' });
            socket.disconnect();
            return;
          }

          // Store authenticated connection
          this.connectedPlayers.set(socket.id, {
            socket,
            playerId: decoded.playerId
          });

          socket.emit('authenticated', { playerId: decoded.playerId });
          logger.info(`Player authenticated: ${decoded.playerId}`);

        } catch (error) {
          logger.error('Socket authentication error:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
          socket.disconnect();
        }
      });

      // Handle joining game room
      socket.on('join_game', async (data: { gameId: string }) => {
        try {
          const connection = this.connectedPlayers.get(socket.id);
          if (!connection) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const gameState = await gameService.loadGame(data.gameId, connection.playerId);
          if (!gameState) {
            socket.emit('error', { message: 'Game not found' });
            return;
          }

          // Join game room
          socket.join(`game_${data.gameId}`);
          
          // Send current game state
          socket.emit('game_state_update', {
            type: 'game_state_update',
            payload: gameState,
            timestamp: new Date(),
            playerId: connection.playerId
          } as WebSocketMessage);

          logger.info(`Player ${connection.playerId} joined game ${data.gameId}`);

        } catch (error) {
          logger.error('Join game error:', error);
          socket.emit('error', { message: 'Failed to join game' });
        }
      });

      // Handle real-time player actions
      socket.on('player_action', async (data: {
        gameId: string;
        action: string;
        payload: any;
      }) => {
        try {
          const connection = this.connectedPlayers.get(socket.id);
          if (!connection) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          await this.handlePlayerAction(
            connection.playerId,
            data.gameId,
            data.action,
            data.payload,
            socket
          );

        } catch (error) {
          logger.error('Player action error:', error);
          socket.emit('error', { message: 'Action failed' });
        }
      });

      // Handle AI guidance requests
      socket.on('request_ai_guidance', async (data: {
        gameId: string;
        context: string;
      }) => {
        try {
          const connection = this.connectedPlayers.get(socket.id);
          if (!connection) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          await this.handleAIGuidanceRequest(
            connection.playerId,
            data.gameId,
            data.context,
            socket
          );

        } catch (error) {
          logger.error('AI guidance request error:', error);
          socket.emit('error', { message: 'AI guidance failed' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const connection = this.connectedPlayers.get(socket.id);
        if (connection) {
          logger.info(`Player disconnected: ${connection.playerId}`);
          this.connectedPlayers.delete(socket.id);
        }
      });
    });
  }

  private async handlePlayerAction(
    playerId: string,
    gameId: string,
    action: string,
    payload: any,
    socket: Socket
  ): Promise<void> {
    try {
      // Load current game state
      const gameState = await gameService.loadGame(gameId, playerId);
      if (!gameState) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      let updatedGameState: GameState = gameState;
      let events: string[] = [];

      // Process different action types
      switch (action) {
        case 'move':
          const moveResult = gameService.processMovement(gameState, payload.direction);
          updatedGameState = moveResult.updatedGameState;
          events = moveResult.events;
          break;

        case 'combat_action':
          // TODO: Implement combat action processing
          events.push('Combat action processed');
          break;

        case 'use_item':
          // TODO: Implement item usage
          events.push('Item used');
          break;

        default:
          socket.emit('error', { message: 'Unknown action type' });
          return;
      }

      // Save updated game state
      await gameService.saveGame(updatedGameState);

      // Broadcast game state update to all players in the game room
      this.io.to(`game_${gameId}`).emit('game_state_update', {
        type: 'game_state_update',
        payload: {
          gameState: updatedGameState,
          events,
          action,
          playerId
        },
        timestamp: new Date(),
        playerId
      } as WebSocketMessage);

      // Generate AI response if appropriate
      if (events.length > 0) {
        const playerProfile = await playerService.getPlayerProfile(playerId);
        if (playerProfile) {
          const aiResponse = await aiService.generateGuidance(
            updatedGameState,
            playerProfile,
            `Player performed ${action}: ${events.join(', ')}`
          );

          socket.emit('ai_response', {
            type: 'ai_response',
            payload: aiResponse,
            timestamp: new Date(),
            playerId
          } as WebSocketMessage);
        }
      }

    } catch (error) {
      logger.error('Handle player action error:', error);
      socket.emit('error', { message: 'Action processing failed' });
    }
  }

  private async handleAIGuidanceRequest(
    playerId: string,
    gameId: string,
    context: string,
    socket: Socket
  ): Promise<void> {
    try {
      const gameState = await gameService.loadGame(gameId, playerId);
      if (!gameState) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const playerProfile = await playerService.getPlayerProfile(playerId);
      if (!playerProfile) {
        socket.emit('error', { message: 'Player profile not found' });
        return;
      }

      const aiResponse = await aiService.generateGuidance(
        gameState,
        playerProfile,
        context
      );

      socket.emit('ai_response', {
        type: 'ai_response',
        payload: aiResponse,
        timestamp: new Date(),
        playerId
      } as WebSocketMessage);

    } catch (error) {
      logger.error('Handle AI guidance request error:', error);
      socket.emit('error', { message: 'AI guidance request failed' });
    }
  }

  // Broadcast message to all connected players
  public broadcastToAll(message: WebSocketMessage): void {
    this.io.emit('broadcast', message);
  }

  // Send message to specific player
  public sendToPlayer(playerId: string, message: WebSocketMessage): void {
    for (const [socketId, connection] of this.connectedPlayers) {
      if (connection.playerId === playerId) {
        connection.socket.emit('message', message);
        break;
      }
    }
  }

  // Get connected player count
  public getConnectedPlayerCount(): number {
    return this.connectedPlayers.size;
  }

  // Get connected players
  public getConnectedPlayers(): string[] {
    return Array.from(this.connectedPlayers.values()).map(conn => conn.playerId);
  }
}