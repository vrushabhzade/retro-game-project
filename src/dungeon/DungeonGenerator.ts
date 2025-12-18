import { DungeonMap, Room, Corridor, Item, Enemy, Coordinate } from '../types/GameTypes';

export interface DungeonConfig {
  width: number;
  height: number;
  minRooms: number;
  maxRooms: number;
}

// Dungeon generation and management
export class DungeonGenerator {
  generate(config: DungeonConfig): DungeonMap {
    const rooms = this.generateRooms(config);
    const corridors = this.generateCorridors(rooms);
    
    // Add interactive elements (items and enemies) to rooms
    this.addInteractiveElements(rooms);
    
    return {
      rooms,
      corridors,
      width: config.width,
      height: config.height
    };
  }

  private generateRooms(config: DungeonConfig): Room[] {
    const rooms: Room[] = [];
    const numRooms = Math.max(1, Math.min(config.maxRooms, 
      Math.floor(Math.random() * (config.maxRooms - config.minRooms + 1)) + config.minRooms));
    
    for (let i = 0; i < numRooms; i++) {
      // Calculate maximum room size that fits in the dungeon
      const maxRoomWidth = Math.min(9, Math.floor(config.width / 2));
      const maxRoomHeight = Math.min(9, Math.floor(config.height / 2));
      const minRoomSize = Math.min(4, Math.floor(Math.min(config.width, config.height) / 3));
      
      const roomWidth = Math.floor(Math.random() * (maxRoomWidth - minRoomSize + 1)) + minRoomSize;
      const roomHeight = Math.floor(Math.random() * (maxRoomHeight - minRoomSize + 1)) + minRoomSize;
      
      const room: Room = {
        id: `room_${i}`,
        position: {
          x: Math.floor(Math.random() * (config.width - roomWidth - 1)) + 1,
          y: Math.floor(Math.random() * (config.height - roomHeight - 1)) + 1
        },
        width: roomWidth,
        height: roomHeight,
        type: i === 0 ? 'normal' : (Math.random() < 0.1 ? 'treasure' : 'normal'),
        items: [],
        enemies: [],
        connections: []
      };
      
      // Ensure room fits within dungeon bounds
      if (room.position.x + room.width < config.width && 
          room.position.y + room.height < config.height) {
        rooms.push(room);
      }
    }
    
    // Ensure we have at least one room
    if (rooms.length === 0) {
      const fallbackWidth = Math.min(5, config.width - 2);
      const fallbackHeight = Math.min(5, config.height - 2);
      rooms.push({
        id: 'room_0',
        position: { x: 1, y: 1 },
        width: fallbackWidth,
        height: fallbackHeight,
        type: 'normal',
        items: [],
        enemies: [],
        connections: []
      });
    }
    
    return rooms;
  }

  private generateCorridors(rooms: Room[]): Corridor[] {
    const corridors: Corridor[] = [];
    
    // Connect each room to at least one other room
    for (let i = 0; i < rooms.length - 1; i++) {
      const startRoom = rooms[i];
      const endRoom = rooms[i + 1];
      
      if (startRoom && endRoom) {
        const corridor: Corridor = {
          id: `corridor_${i}`,
          startRoom: startRoom.id,
          endRoom: endRoom.id,
          path: this.generatePath(startRoom.position, endRoom.position)
        };
        
        corridors.push(corridor);
      }
    }
    
    // Ensure we have at least one corridor if we have multiple rooms
    if (rooms.length > 1 && corridors.length === 0 && rooms[0] && rooms[1]) {
      corridors.push({
        id: 'corridor_0',
        startRoom: rooms[0].id,
        endRoom: rooms[1].id,
        path: this.generatePath(rooms[0].position, rooms[1].position)
      });
    }
    
    return corridors;
  }

  private generatePath(start: Coordinate, end: Coordinate): Coordinate[] {
    const path: Coordinate[] = [];
    let current = { ...start };
    
    // Simple L-shaped path
    while (current.x !== end.x) {
      path.push({ ...current });
      current.x += current.x < end.x ? 1 : -1;
    }
    
    while (current.y !== end.y) {
      path.push({ ...current });
      current.y += current.y < end.y ? 1 : -1;
    }
    
    path.push({ ...end });
    return path;
  }

  private addInteractiveElements(rooms: Room[]): void {
    // Ensure at least one room has interactive elements
    let hasInteractiveElements = false;
    
    for (const room of rooms) {
      // Add items with some probability
      if (Math.random() < 0.6) {
        const item: Item = {
          id: `item_${room.id}_${room.items.length}`,
          name: 'Treasure',
          type: 'treasure',
          position: {
            x: room.position.x + Math.floor(Math.random() * room.width),
            y: room.position.y + Math.floor(Math.random() * room.height)
          },
          properties: {}
        };
        room.items.push(item);
        hasInteractiveElements = true;
      }
      
      // Add enemies with some probability
      if (Math.random() < 0.4) {
        const enemy: Enemy = {
          id: `enemy_${room.id}_${room.enemies.length}`,
          name: 'Goblin',
          position: {
            x: room.position.x + Math.floor(Math.random() * room.width),
            y: room.position.y + Math.floor(Math.random() * room.height)
          },
          health: 10,
          maxHealth: 10,
          attackPower: 3,
          defense: 1,
          aiType: 'aggressive'
        };
        room.enemies.push(enemy);
        hasInteractiveElements = true;
      }
    }
    
    // If no interactive elements were added, force add one to the first room
    if (!hasInteractiveElements && rooms.length > 0) {
      const firstRoom = rooms[0];
      if (firstRoom) {
        const item: Item = {
          id: `item_${firstRoom.id}_0`,
          name: 'Key',
          type: 'key',
          position: {
            x: firstRoom.position.x + Math.floor(firstRoom.width / 2),
            y: firstRoom.position.y + Math.floor(firstRoom.height / 2)
          },
          properties: {}
        };
        firstRoom.items.push(item);
      }
    }
  }
}