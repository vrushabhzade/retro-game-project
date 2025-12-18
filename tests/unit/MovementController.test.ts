import { MovementController } from '../../src/player/MovementController';
import { PlayerCharacter } from '../../src/player/PlayerCharacter';
import { DungeonMap, PlayerAction } from '../../src/types/GameTypes';

describe('MovementController', () => {
  let movementController: MovementController;
  let player: PlayerCharacter;
  let dungeon: DungeonMap;

  beforeEach(() => {
    // Create a simple test dungeon
    dungeon = {
      width: 10,
      height: 10,
      rooms: [
        {
          id: 'room1',
          position: { x: 2, y: 2 },
          width: 4,
          height: 4,
          type: 'normal',
          items: [],
          enemies: [],
          connections: []
        }
      ],
      corridors: [
        {
          id: 'corridor1',
          startRoom: 'room1',
          endRoom: 'room2',
          path: [
            { x: 6, y: 4 },
            { x: 7, y: 4 },
            { x: 8, y: 4 }
          ]
        }
      ]
    };

    player = new PlayerCharacter({
      position: { x: 3, y: 3 } // Inside room1
    });

    movementController = new MovementController(dungeon, player);
  });

  describe('movement validation', () => {
    it('should allow movement within a room', () => {
      const action: PlayerAction = {
        type: 'move',
        direction: 'east',
        timestamp: Date.now()
      };

      const result = movementController.executeMovement(action);

      expect(result.success).toBe(true);
      expect(result.newPosition).toEqual({ x: 4, y: 3 });
    });

    it('should block movement outside dungeon bounds', () => {
      player.moveTo({ x: 0, y: 0 });
      
      const action: PlayerAction = {
        type: 'move',
        direction: 'west',
        timestamp: Date.now()
      };

      const result = movementController.executeMovement(action);

      expect(result.success).toBe(false);
      expect(result.blockedReason).toContain('boundary');
    });

    it('should block movement into walls', () => {
      player.moveTo({ x: 2, y: 2 }); // Edge of room
      
      const action: PlayerAction = {
        type: 'move',
        direction: 'west', // Into wall
        timestamp: Date.now()
      };

      const result = movementController.executeMovement(action);

      expect(result.success).toBe(false);
      expect(result.blockedReason).toContain('wall');
    });

    it('should allow movement in corridors', () => {
      player.moveTo({ x: 6, y: 4 }); // On corridor path
      
      const action: PlayerAction = {
        type: 'move',
        direction: 'east',
        timestamp: Date.now()
      };

      const result = movementController.executeMovement(action);

      expect(result.success).toBe(true);
      expect(result.newPosition).toEqual({ x: 7, y: 4 });
    });
  });

  describe('position queries', () => {
    it('should identify valid adjacent positions', () => {
      player.moveTo({ x: 3, y: 3 }); // Center of room
      
      const validPositions = movementController.getValidAdjacentPositions(player.position);
      
      expect(validPositions).toHaveLength(4); // All directions should be valid
      expect(validPositions).toContainEqual({ x: 2, y: 3 });
      expect(validPositions).toContainEqual({ x: 4, y: 3 });
      expect(validPositions).toContainEqual({ x: 3, y: 2 });
      expect(validPositions).toContainEqual({ x: 3, y: 4 });
    });

    it('should calculate distance correctly', () => {
      const pos1 = { x: 1, y: 1 };
      const pos2 = { x: 4, y: 5 };
      
      const distance = movementController.getDistance(pos1, pos2);
      
      expect(distance).toBe(7); // |4-1| + |5-1| = 3 + 4 = 7
    });

    it('should detect adjacent positions', () => {
      const pos1 = { x: 3, y: 3 };
      const pos2 = { x: 3, y: 4 };
      const pos3 = { x: 5, y: 5 };
      
      expect(movementController.areAdjacent(pos1, pos2)).toBe(true);
      expect(movementController.areAdjacent(pos1, pos3)).toBe(false);
    });
  });

  describe('room detection', () => {
    it('should identify current room', () => {
      player.moveTo({ x: 3, y: 3 });
      
      const roomId = movementController.getCurrentRoom();
      
      expect(roomId).toBe('room1');
    });

    it('should return null when not in a room', () => {
      player.moveTo({ x: 7, y: 4 }); // In corridor
      
      const roomId = movementController.getCurrentRoom();
      
      expect(roomId).toBeNull();
    });
  });

  describe('direction helpers', () => {
    it('should determine direction to adjacent position', () => {
      const from = { x: 3, y: 3 };
      const to = { x: 4, y: 3 };
      
      const direction = movementController.getDirectionTo(from, to);
      
      expect(direction).toBe('east');
    });

    it('should return null for non-adjacent positions', () => {
      const from = { x: 3, y: 3 };
      const to = { x: 5, y: 5 };
      
      const direction = movementController.getDirectionTo(from, to);
      
      expect(direction).toBeNull();
    });

    it('should check if movement is possible in direction', () => {
      player.moveTo({ x: 3, y: 3 });
      
      expect(movementController.canMoveInDirection('east')).toBe(true);
      expect(movementController.canMoveInDirection('invalid')).toBe(false);
    });
  });

  describe('line of sight', () => {
    it('should detect line of sight within room', () => {
      const from = { x: 2, y: 2 };
      const to = { x: 5, y: 5 };
      
      const hasLOS = movementController.hasLineOfSight(from, to);
      
      expect(hasLOS).toBe(true);
    });
  });

  describe('dungeon updates', () => {
    it('should update dungeon reference', () => {
      const newDungeon: DungeonMap = {
        width: 5,
        height: 5,
        rooms: [],
        corridors: []
      };
      
      movementController.updateDungeon(newDungeon);
      
      // Should now reject all movements since no rooms/corridors
      const action: PlayerAction = {
        type: 'move',
        direction: 'east',
        timestamp: Date.now()
      };
      
      const result = movementController.executeMovement(action);
      expect(result.success).toBe(false);
    });
  });
});