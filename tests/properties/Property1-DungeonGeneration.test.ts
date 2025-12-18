// **Feature: ai-dungeon-master, Property 1: Dungeon Generation Consistency**
// **Validates: Requirements 1.1**

import * as fc from 'fast-check';
import { DungeonGenerator, DungeonConfig } from '../../src/dungeon/DungeonGenerator';

describe('Property 1: Dungeon Generation Consistency', () => {
  test('Dungeon generation consistency', () => {
    // Property: *For any* dungeon generation request, the generated dungeon should contain 
    // at least one room, at least one corridor connecting rooms, and at least 
    // one interactive element, all positioned on a valid grid
    
    fc.assert(
      fc.property(
        fc.record({
          width: fc.integer({ min: 10, max: 50 }),
          height: fc.integer({ min: 10, max: 50 }),
          minRooms: fc.integer({ min: 1, max: 8 }),
          maxRooms: fc.integer({ min: 2, max: 15 })
        }).filter(config => config.maxRooms >= config.minRooms),
        (dungeonConfig: DungeonConfig) => {
          const generator = new DungeonGenerator();
          const dungeon = generator.generate(dungeonConfig);
          
          // Assertion 1: At least one room
          expect(dungeon.rooms.length).toBeGreaterThanOrEqual(1);
          
          // Assertion 2: At least one corridor if multiple rooms exist
          if (dungeon.rooms.length > 1) {
            expect(dungeon.corridors.length).toBeGreaterThanOrEqual(1);
          }
          
          // Assertion 3: At least one interactive element (items or enemies)
          const hasInteractiveElements = dungeon.rooms.some(room => 
            room.items.length > 0 || room.enemies.length > 0
          );
          expect(hasInteractiveElements).toBe(true);
          
          // Assertion 4: All rooms positioned on valid grid
          const allRoomsValid = dungeon.rooms.every(room => 
            room.position.x >= 0 && 
            room.position.y >= 0 && 
            room.position.x + room.width <= dungeon.width && 
            room.position.y + room.height <= dungeon.height
          );
          expect(allRoomsValid).toBe(true);
          
          // Assertion 5: All corridor paths are valid coordinates
          const allCorridorsValid = dungeon.corridors.every(corridor =>
            corridor.path.every(coord =>
              coord.x >= 0 && coord.x < dungeon.width &&
              coord.y >= 0 && coord.y < dungeon.height
            )
          );
          expect(allCorridorsValid).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});