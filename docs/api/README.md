# AI Dungeon Master API Documentation

## Overview

The AI Dungeon Master backend provides a RESTful API and WebSocket interface for the classic dungeon crawler game with modern AI enhancements. The system supports player authentication, game state management, real-time gameplay, and AI-powered assistance.

## Base URL

- Development: `http://localhost:3001/api`
- Production: `https://your-domain.com/api`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Authentication Endpoints

#### POST /auth/register
Register a new player account.

**Request Body:**
```json
{
  "username": "string (3-30 chars, alphanumeric)",
  "email": "string (valid email)",
  "password": "string (6-128 chars)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "player": {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "gameStats": { ... },
      "aiLearningData": { ... },
      "visualPreferences": { ... }
    },
    "token": "jwt-token"
  },
  "timestamp": "2023-12-18T10:00:00.000Z"
}
```

#### POST /auth/login
Authenticate existing player.

**Request Body:**
```json
{
  "username": "string (username or email)",
  "password": "string"
}
```

#### GET /auth/profile
Get current player profile (requires authentication).

#### PUT /auth/profile
Update player profile (requires authentication).

#### PUT /auth/visual-preferences
Update visual preferences (requires authentication).

**Request Body:**
```json
{
  "uiComplexity": "simple|moderate|detailed|expert",
  "colorScheme": "classic|high_contrast|colorblind_friendly|dark",
  "animationSpeed": "slow|normal|fast",
  "informationDensity": "minimal|standard|detailed|comprehensive",
  "thoughtBubbleFrequency": "rare|normal|frequent|constant"
}
```

#### POST /auth/logout
Logout current session (requires authentication).

### Game Endpoints

#### POST /game/new
Create a new game session (requires authentication).

**Response:**
```json
{
  "success": true,
  "data": {
    "gameState": {
      "id": "uuid",
      "playerId": "uuid",
      "dungeonLevel": 1,
      "playerPosition": { "x": 1, "y": 1 },
      "playerStats": { ... },
      "inventory": { ... },
      "dungeonMap": [ ... ],
      "enemies": [ ... ],
      "treasures": [ ... ],
      "doors": [ ... ],
      "gameStatus": "active"
    }
  }
}
```

#### GET /game/:gameId
Load existing game state (requires authentication).

#### GET /game/player/games
Get all active games for current player (requires authentication).

#### POST /game/:gameId/move
Process player movement (requires authentication).

**Request Body:**
```json
{
  "direction": {
    "x": -1|0|1,
    "y": -1|0|1
  }
}
```

#### POST /game/:gameId/combat
Process combat action (requires authentication).

**Request Body:**
```json
{
  "action": "attack|cast_spell|use_item|defend",
  "target": "string (optional)",
  "itemId": "string (optional)"
}
```

#### POST /game/:gameId/save
Save current game state (requires authentication).

#### GET /game/:gameId/ai-guidance
Get AI mentor guidance (requires authentication).

**Query Parameters:**
- `context`: string (optional) - Context for AI guidance

## WebSocket Interface

### Connection

Connect to WebSocket server at `ws://localhost:3001` (development).

### Authentication

After connecting, send authentication message:

```json
{
  "type": "authenticate",
  "data": {
    "token": "your-jwt-token"
  }
}
```

### Events

#### Client to Server

**join_game**
```json
{
  "type": "join_game",
  "data": {
    "gameId": "uuid"
  }
}
```

**player_action**
```json
{
  "type": "player_action",
  "data": {
    "gameId": "uuid",
    "action": "move|combat_action|use_item",
    "payload": { ... }
  }
}
```

**request_ai_guidance**
```json
{
  "type": "request_ai_guidance",
  "data": {
    "gameId": "uuid",
    "context": "string"
  }
}
```

#### Server to Client

**authenticated**
```json
{
  "type": "authenticated",
  "data": {
    "playerId": "uuid"
  }
}
```

**game_state_update**
```json
{
  "type": "game_state_update",
  "payload": {
    "gameState": { ... },
    "events": ["string"],
    "action": "string",
    "playerId": "uuid"
  },
  "timestamp": "2023-12-18T10:00:00.000Z",
  "playerId": "uuid"
}
```

**ai_response**
```json
{
  "type": "ai_response",
  "payload": {
    "type": "guidance|encouragement|warning|analysis",
    "message": "string",
    "context": "string",
    "confidence": 0.8,
    "reasoning": ["string"],
    "suggestedActions": ["string"]
  },
  "timestamp": "2023-12-18T10:00:00.000Z",
  "playerId": "uuid"
}
```

**error**
```json
{
  "type": "error",
  "data": {
    "message": "string"
  }
}
```

## Rate Limits

- General API: 100 requests per 15 minutes per IP
- Authentication: 5 requests per 15 minutes per IP
- Game actions: 60 requests per minute per IP
- AI guidance: 10 requests per minute per IP

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details (optional)"
  },
  "timestamp": "2023-12-18T10:00:00.000Z"
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `MISSING_TOKEN`: Authentication token required
- `INVALID_TOKEN`: Invalid or expired token
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `GAME_NOT_FOUND`: Game session not found
- `PLAYER_NOT_FOUND`: Player profile not found
- `INTERNAL_SERVER_ERROR`: Server error

## Health Checks

#### GET /health
Basic server health check.

#### GET /health/db
Database connectivity health check.

## Data Models

### PlayerProfile
```typescript
interface PlayerProfile {
  id: string;
  username: string;
  email: string;
  gameStats: {
    totalPlayTime: number;
    dungeonLevelsCompleted: number;
    enemiesDefeated: number;
    goldCollected: number;
    deathCount: number;
    averageCombatEfficiency: number;
  };
  aiLearningData: AILearningData;
  visualPreferences: VisualPreferences;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
}
```

### GameState
```typescript
interface GameState {
  id: string;
  playerId: string;
  dungeonLevel: number;
  playerPosition: { x: number; y: number };
  playerStats: PlayerStats;
  inventory: Inventory;
  dungeonMap: DungeonCell[][];
  enemies: Enemy[];
  treasures: Treasure[];
  doors: Door[];
  gameStatus: 'active' | 'paused' | 'completed' | 'game_over';
  createdAt: Date;
  updatedAt: Date;
}
```

### AIResponse
```typescript
interface AIResponse {
  type: 'guidance' | 'encouragement' | 'warning' | 'analysis';
  message: string;
  context: string;
  confidence: number;
  reasoning: string[];
  suggestedActions?: string[];
}
```

## Client Integration

### JavaScript/TypeScript Example

```typescript
import { ApiClient } from './services/ApiClient';
import { WebSocketClient } from './services/WebSocketClient';

// Initialize API client
const apiClient = new ApiClient('http://localhost:3001/api');

// Login
const { player, token } = await apiClient.login('username', 'password');

// Initialize WebSocket
const wsClient = new WebSocketClient('http://localhost:3001');
await wsClient.connect(token);

// Create new game
const gameState = await apiClient.createNewGame();

// Join game room
wsClient.joinGame(gameState.id);

// Listen for game updates
wsClient.on('game_state_update', (data) => {
  console.log('Game state updated:', data);
});

// Move player
wsClient.sendPlayerAction(gameState.id, 'move', { direction: { x: 1, y: 0 } });
```

## Development Setup

1. Install dependencies: `npm run setup:backend`
2. Configure environment: Update `server/.env`
3. Start MongoDB: `mongod`
4. Start Redis: `redis-server`
5. Start server: `npm run server:dev`

## Production Deployment

1. Build server: `npm run server:build`
2. Set production environment variables
3. Start server: `npm run server:start`
4. Configure reverse proxy (nginx/Apache)
5. Set up SSL certificates
6. Configure monitoring and logging