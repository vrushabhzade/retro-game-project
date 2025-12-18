import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameEngine, GameEngineConfig } from '../engine/GameEngine';
import { PlayerAction } from '../types/GameTypes';
import { logger } from '../utils/ErrorHandling';

const GRID_WIDTH = 20;
const GRID_HEIGHT = 15;
const CELL_SIZE = 32;

interface GameState {
  player: { x: number; y: number; health: number; maxHealth: number };
  enemies: Array<{ id: string; x: number; y: number; health: number; type: string }>;
  items: Array<{ id: string; x: number; y: number; type: string }>;
  rooms: Array<{ x: number; y: number; width: number; height: number }>;
  walls: Set<string>;
  level: number;
  score: number;
  isInCombat: boolean;
}

export default function ReactDungeonMaster() {
  const gameEngineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    player: { x: 3, y: 6, health: 100, maxHealth: 100 },
    enemies: [],
    items: [],
    rooms: [],
    walls: new Set(),
    level: 1,
    score: 0,
    isInCombat: false
  });
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [aiMessage, setAiMessage] = useState('Welcome to the AI-Enhanced Dungeon Master!');

  // Initialize game engine
  useEffect(() => {
    const config: Partial<GameEngineConfig> = {
      targetFrameRate: 60,
      dungeonConfig: {
        width: GRID_WIDTH,
        height: GRID_HEIGHT,
        minRooms: 4,
        maxRooms: 8
      }
    };

    gameEngineRef.current = new GameEngine(config);
    
    // Start the game engine
    gameEngineRef.current.start();
    setIsGameRunning(true);

    // Initial game state sync
    syncGameState();

    logger.info('React Dungeon Master initialized');

    return () => {
      if (gameEngineRef.current) {
        gameEngineRef.current.stop();
      }
    };
  }, []);

  // Sync game state from engine
  const syncGameState = useCallback(() => {
    if (!gameEngineRef.current) return;

    try {
      const engineState = gameEngineRef.current.getGameState();
      
      setGameState(prev => ({
        ...prev,
        player: {
          x: engineState.player.position.x,
          y: engineState.player.position.y,
          health: engineState.player.health,
          maxHealth: engineState.player.maxHealth
        },
        enemies: engineState.enemies.map(enemy => ({
          id: enemy.id,
          x: enemy.position.x,
          y: enemy.position.y,
          health: enemy.health,
          type: enemy.name
        })),
        items: engineState.items.map(item => ({
          id: item.id,
          x: item.position.x,
          y: item.position.y,
          type: item.type
        })),
        rooms: engineState.dungeon.rooms.map(room => ({
          x: room.position.x,
          y: room.position.y,
          width: room.width,
          height: room.height
        })),
        level: engineState.player.level,
        isInCombat: engineState.isInCombat
      }));

      // Generate walls from dungeon data
      const wallSet = new Set<string>();
      for (let x = 0; x < GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
          let isWall = true;
          
          // Check if position is inside any room
          for (const room of engineState.dungeon.rooms) {
            if (x >= room.position.x && x < room.position.x + room.width &&
                y >= room.position.y && y < room.position.y + room.height) {
              isWall = false;
              break;
            }
          }
          
          // Check if position is on any corridor
          for (const corridor of engineState.dungeon.corridors) {
            for (const point of corridor.path) {
              if (x === point.x && y === point.y) {
                isWall = false;
                break;
              }
            }
          }
          
          if (isWall) {
            wallSet.add(`${x},${y}`);
          }
        }
      }
      
      setGameState(prev => ({ ...prev, walls: wallSet }));

    } catch (error) {
      logger.error('Error syncing game state:', error);
    }
  }, []);

  // Game state update loop
  useEffect(() => {
    if (!isGameRunning) return;

    const interval = setInterval(() => {
      syncGameState();
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [isGameRunning, syncGameState]);

  // Player movement
  const movePlayer = useCallback((dx: number, dy: number) => {
    if (!gameEngineRef.current) return;

    const direction = getDirectionName(dx, dy);
    if (direction) {
      const action: PlayerAction = {
        type: 'move',
        direction: direction as any,
        timestamp: Date.now()
      };

      gameEngineRef.current.queueAction(action);
      
      // Generate AI response for movement
      setTimeout(() => {
        const messages = [
          'Good move! Stay alert for enemies.',
          'Exploring the dungeon wisely.',
          'Watch your surroundings, adventurer.',
          'The dungeon holds many secrets.',
          'Keep moving, but be cautious.'
        ];
        setAiMessage(messages[Math.floor(Math.random() * messages.length)]);
      }, 200);
    }
  }, []);

  const getDirectionName = (dx: number, dy: number): string | null => {
    if (dx === 0 && dy === -1) return 'north';
    if (dx === 0 && dy === 1) return 'south';
    if (dx === -1 && dy === 0) return 'west';
    if (dx === 1 && dy === 0) return 'east';
    return null;
  };

  // Combat actions
  const attack = useCallback(() => {
    if (!gameEngineRef.current) return;

    const action: PlayerAction = {
      type: 'attack',
      timestamp: Date.now()
    };

    gameEngineRef.current.queueAction(action);
    setAiMessage('Strike with precision! Analyze your enemy\'s patterns.');
  }, []);

  const useItem = useCallback(() => {
    if (!gameEngineRef.current) return;

    const action: PlayerAction = {
      type: 'use_item',
      timestamp: Date.now()
    };

    gameEngineRef.current.queueAction(action);
    setAiMessage('Wise use of resources. Healing is crucial for survival.');
  }, []);

  const defend = useCallback(() => {
    if (!gameEngineRef.current) return;

    const action: PlayerAction = {
      type: 'defend',
      timestamp: Date.now()
    };

    gameEngineRef.current.queueAction(action);
    setAiMessage('Defensive stance activated. Reduce incoming damage.');
  }, []);

  // Generate new dungeon
  const generateNewDungeon = useCallback(() => {
    if (!gameEngineRef.current) return;

    gameEngineRef.current.generateNewDungeon();
    setGameState(prev => ({ ...prev, level: prev.level + 1, score: prev.score + 100 }));
    setAiMessage('New dungeon generated! Adapt your strategy to the new layout.');
    
    setTimeout(() => {
      syncGameState();
    }, 100);
  }, [syncGameState]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          movePlayer(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          movePlayer(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          movePlayer(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          movePlayer(1, 0);
          break;
        case ' ':
          e.preventDefault();
          attack();
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          useItem();
          break;
        case 'Shift':
          e.preventDefault();
          defend();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          generateNewDungeon();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [movePlayer, attack, useItem, defend, generateNewDungeon]);

  const isWall = (x: number, y: number): boolean => {
    return gameState.walls.has(`${x},${y}`);
  };

  const getEnemyEmoji = (type: string): string => {
    const emojiMap: { [key: string]: string } = {
      'goblin': '👹',
      'orc': '🧌',
      'skeleton': '💀',
      'troll': '🧟',
      'default': '👹'
    };
    return emojiMap[type.toLowerCase()] || emojiMap.default;
  };

  const getItemEmoji = (type: string): string => {
    const emojiMap: { [key: string]: string } = {
      'potion': '🧪',
      'consumable': '🧪',
      'weapon': '⚔️',
      'armor': '🛡️',
      'treasure': '💰',
      'key': '🗝️',
      'default': '🧪'
    };
    return emojiMap[type.toLowerCase()] || emojiMap.default;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black p-4">
      {/* Header */}
      <div className="mb-4 text-center">
        <h1 className="text-4xl font-bold text-green-400 mb-2">
          🎮 AI Dungeon Master
        </h1>
        <div className="text-white text-lg mb-2">
          Level: {gameState.level} | Score: {gameState.score}
        </div>
        <div className="text-sm text-gray-300">
          Health: {gameState.player.health}/{gameState.player.maxHealth}
          {gameState.isInCombat && <span className="text-red-400 ml-4">⚔️ IN COMBAT!</span>}
        </div>
      </div>

      {/* AI Message Panel */}
      <div className="mb-4 p-3 bg-blue-900 border-2 border-blue-500 rounded-lg max-w-md">
        <div className="text-blue-200 text-sm font-semibold mb-1">🤖 AI Mentor:</div>
        <div className="text-white text-sm">{aiMessage}</div>
      </div>

      {/* Game Grid */}
      <div 
        className="bg-black border-4 border-green-500 relative shadow-2xl"
        style={{
          width: GRID_WIDTH * CELL_SIZE,
          height: GRID_HEIGHT * CELL_SIZE,
        }}
      >
        {/* Grid background */}
        <div 
          className="absolute inset-0 opacity-10" 
          style={{
            backgroundImage: `linear-gradient(90deg, #333 1px, transparent 1px), linear-gradient(#333 1px, transparent 1px)`,
            backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`
          }} 
        />

        {/* Rooms (floors) */}
        {gameState.rooms.map((room, index) => (
          <div
            key={`room-${index}`}
            className="absolute bg-gray-800 opacity-60"
            style={{
              left: room.x * CELL_SIZE,
              top: room.y * CELL_SIZE,
              width: room.width * CELL_SIZE,
              height: room.height * CELL_SIZE,
            }}
          />
        ))}

        {/* Walls */}
        {Array.from(gameState.walls).map(key => {
          const [x, y] = key.split(',').map(Number);
          return (
            <div
              key={`wall-${x}-${y}`}
              className="absolute bg-gray-700"
              style={{
                left: x * CELL_SIZE,
                top: y * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
              }}
            />
          );
        })}

        {/* Items */}
        {gameState.items.map(item => (
          <div
            key={`item-${item.id}`}
            className="absolute flex items-center justify-center text-2xl animate-pulse"
            style={{
              left: item.x * CELL_SIZE,
              top: item.y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
            }}
          >
            {getItemEmoji(item.type)}
          </div>
        ))}

        {/* Enemies */}
        {gameState.enemies.map(enemy => (
          <div
            key={`enemy-${enemy.id}`}
            className="absolute flex items-center justify-center text-2xl"
            style={{
              left: enemy.x * CELL_SIZE,
              top: enemy.y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
            }}
          >
            {getEnemyEmoji(enemy.type)}
            {/* Enemy health bar */}
            <div 
              className="absolute top-0 left-0 bg-red-600 h-1"
              style={{
                width: `${(enemy.health / 100) * CELL_SIZE}px`
              }}
            />
          </div>
        ))}

        {/* Player */}
        <div
          className="absolute flex items-center justify-center text-3xl transition-all duration-150 z-10"
          style={{
            left: gameState.player.x * CELL_SIZE,
            top: gameState.player.y * CELL_SIZE,
            width: CELL_SIZE,
            height: CELL_SIZE,
          }}
        >
          🧙‍♂️
          {/* Player health bar */}
          <div 
            className="absolute top-0 left-0 bg-green-500 h-2"
            style={{
              width: `${(gameState.player.health / gameState.player.maxHealth) * CELL_SIZE}px`
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 text-center">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button
            onClick={() => movePlayer(0, -1)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
          >
            ↑ Move Up
          </button>
          <button
            onClick={attack}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold"
          >
            ⚔️ Attack
          </button>
          <button
            onClick={() => movePlayer(-1, 0)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
          >
            ← Move Left
          </button>
          <button
            onClick={() => movePlayer(1, 0)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
          >
            → Move Right
          </button>
          <button
            onClick={() => movePlayer(0, 1)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
          >
            ↓ Move Down
          </button>
          <button
            onClick={useItem}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold"
          >
            🧪 Use Item
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button
            onClick={defend}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-semibold"
          >
            🛡️ Defend
          </button>
          <button
            onClick={generateNewDungeon}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold"
          >
            🏰 New Dungeon
          </button>
        </div>

        <div className="text-white text-sm space-y-1">
          <p><strong>Keyboard Controls:</strong></p>
          <p>WASD/Arrow Keys: Move | Space: Attack | E: Use Item</p>
          <p>Shift: Defend | N: New Dungeon</p>
          <p>Collect items 🧪 and avoid enemies 👹</p>
        </div>
      </div>
    </div>
  );
}