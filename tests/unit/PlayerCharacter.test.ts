import { PlayerCharacter } from '../../src/player/PlayerCharacter';
import { Item } from '../../src/types/GameTypes';

describe('PlayerCharacter', () => {
  let player: PlayerCharacter;

  beforeEach(() => {
    player = new PlayerCharacter();
  });

  describe('initialization', () => {
    it('should create a player with default values', () => {
      expect(player.id).toBe('player_1');
      expect(player.position).toEqual({ x: 1, y: 1 });
      expect(player.health).toBe(100);
      expect(player.maxHealth).toBe(100);
      expect(player.level).toBe(1);
      expect(player.experience).toBe(0);
      expect(player.inventory).toEqual([]);
      expect(player.stats.strength).toBe(10);
    });

    it('should create a player with custom values', () => {
      const customPlayer = new PlayerCharacter({
        id: 'custom_player',
        position: { x: 5, y: 5 },
        health: 80,
        level: 2
      });

      expect(customPlayer.id).toBe('custom_player');
      expect(customPlayer.position).toEqual({ x: 5, y: 5 });
      expect(customPlayer.health).toBe(80);
      expect(customPlayer.level).toBe(2);
    });
  });

  describe('movement', () => {
    it('should update position when moving', () => {
      const newPosition = { x: 3, y: 4 };
      player.moveTo(newPosition);
      
      expect(player.position).toEqual(newPosition);
      expect(player.position).not.toBe(newPosition); // Should be a copy
    });
  });

  describe('combat', () => {
    it('should take damage correctly', () => {
      const initialHealth = player.health;
      const damage = 20;
      
      const isAlive = player.takeDamage(damage);
      
      expect(isAlive).toBe(true);
      expect(player.health).toBe(initialHealth - damage + player.getEffectiveDefense());
    });

    it('should not go below 0 health', () => {
      const isAlive = player.takeDamage(200);
      
      expect(isAlive).toBe(false);
      expect(player.health).toBe(0);
    });

    it('should heal correctly', () => {
      player.takeDamage(50);
      const healthAfterDamage = player.health;
      
      player.heal(20);
      
      expect(player.health).toBe(healthAfterDamage + 20);
    });

    it('should not heal above max health', () => {
      player.heal(200);
      
      expect(player.health).toBe(player.maxHealth);
    });
  });

  describe('inventory management', () => {
    const testItem: Item = {
      id: 'test_item',
      name: 'Test Item',
      type: 'consumable',
      position: { x: 0, y: 0 },
      properties: {}
    };

    it('should add items to inventory', () => {
      const success = player.addItem(testItem);
      
      expect(success).toBe(true);
      expect(player.inventory).toContain(testItem);
    });

    it('should remove items from inventory', () => {
      player.addItem(testItem);
      const removedItem = player.removeItem(testItem.id);
      
      expect(removedItem).toEqual(testItem);
      expect(player.inventory).not.toContain(testItem);
    });

    it('should return null when removing non-existent item', () => {
      const removedItem = player.removeItem('non_existent');
      
      expect(removedItem).toBeNull();
    });
  });

  describe('equipment', () => {
    const weapon: Item = {
      id: 'test_weapon',
      name: 'Test Sword',
      type: 'weapon',
      position: { x: 0, y: 0 },
      properties: { attack: 5 }
    };

    it('should equip weapons', () => {
      player.addItem(weapon);
      const success = player.equipItem(weapon.id);
      
      expect(success).toBe(true);
      expect(player.equipment.weapon).toEqual(weapon);
      expect(player.inventory).not.toContain(weapon);
    });

    it('should calculate effective attack with weapon', () => {
      const baseAttack = player.getEffectiveAttack();
      
      player.addItem(weapon);
      player.equipItem(weapon.id);
      
      expect(player.getEffectiveAttack()).toBe(baseAttack + 5);
    });
  });

  describe('experience and leveling', () => {
    it('should gain experience', () => {
      const initialExp = player.experience;
      player.gainExperience(50);
      
      expect(player.experience).toBe(initialExp + 50);
    });

    it('should level up when enough experience is gained', () => {
      const initialLevel = player.level;
      const initialStats = { ...player.stats };
      
      // Gain enough experience to level up
      player.gainExperience(1000);
      
      expect(player.level).toBeGreaterThan(initialLevel);
      expect(player.stats.strength).toBeGreaterThan(initialStats.strength);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize correctly', () => {
      player.moveTo({ x: 10, y: 15 });
      player.takeDamage(20);
      
      const serialized = player.serialize();
      const deserialized = PlayerCharacter.deserialize(serialized);
      
      expect(deserialized.position).toEqual(player.position);
      expect(deserialized.health).toBe(player.health);
      expect(deserialized.level).toBe(player.level);
    });
  });
});