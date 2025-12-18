import { PlayerCharacter as IPlayerCharacter, Coordinate, Item } from '../types/GameTypes';
import { GameError } from '../utils/ErrorHandling';

// Player character representation and management
export class PlayerCharacter implements IPlayerCharacter {
  public id: string;
  public position: Coordinate;
  public health: number;
  public maxHealth: number;
  public level: number;
  public experience: number;
  public inventory: Item[];
  public equipment: {
    weapon?: Item;
    armor?: Item;
    accessory?: Item;
  };
  public stats: {
    strength: number;
    defense: number;
    agility: number;
    intelligence: number;
  };

  constructor(config?: Partial<IPlayerCharacter>) {
    this.id = config?.id || 'player_1';
    this.position = config?.position || { x: 1, y: 1 };
    this.health = config?.health || 100;
    this.maxHealth = config?.maxHealth || 100;
    this.level = config?.level || 1;
    this.experience = config?.experience || 0;
    this.inventory = config?.inventory || [];
    this.equipment = config?.equipment || {};
    this.stats = config?.stats || {
      strength: 10,
      defense: 5,
      agility: 8,
      intelligence: 7
    };

    this.validateCharacter();
  }

  // Validate character data integrity
  private validateCharacter(): void {
    if (this.health < 0 || this.health > this.maxHealth) {
      throw new GameError('Invalid health values', 'INVALID_CHARACTER_DATA');
    }
    if (this.level < 1) {
      throw new GameError('Invalid level', 'INVALID_CHARACTER_DATA');
    }
    if (this.experience < 0) {
      throw new GameError('Invalid experience', 'INVALID_CHARACTER_DATA');
    }
  }

  // Move player to new position
  moveTo(newPosition: Coordinate): void {
    this.position = { ...newPosition };
  }

  // Take damage and return true if still alive
  takeDamage(damage: number): boolean {
    const actualDamage = Math.max(0, damage - this.getEffectiveDefense());
    this.health = Math.max(0, this.health - actualDamage);
    return this.health > 0;
  }

  // Heal the player
  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  // Get effective defense including equipment bonuses
  getEffectiveDefense(): number {
    let defense = this.stats.defense;
    
    if (this.equipment.armor) {
      defense += this.equipment.armor.properties['defense'] || 0;
    }
    
    return defense;
  }

  // Get effective attack power including equipment bonuses
  getEffectiveAttack(): number {
    let attack = this.stats.strength;
    
    if (this.equipment.weapon) {
      attack += this.equipment.weapon.properties['attack'] || 0;
    }
    
    return attack;
  }

  // Add item to inventory
  addItem(item: Item): boolean {
    const maxInventorySize = 20; // Could be made configurable
    
    if (this.inventory.length >= maxInventorySize) {
      return false; // Inventory full
    }
    
    this.inventory.push(item);
    return true;
  }

  // Remove item from inventory
  removeItem(itemId: string): Item | null {
    const itemIndex = this.inventory.findIndex(item => item.id === itemId);
    if (itemIndex >= 0) {
      return this.inventory.splice(itemIndex, 1)[0] || null;
    }
    return null;
  }

  // Equip an item from inventory
  equipItem(itemId: string): boolean {
    const item = this.inventory.find(i => i.id === itemId);
    if (!item) {
      return false;
    }

    // Check if item can be equipped
    if (item.type !== 'weapon' && item.type !== 'armor') {
      return false;
    }

    // Unequip current item of same type if exists
    if (item.type === 'weapon' && this.equipment.weapon) {
      this.inventory.push(this.equipment.weapon);
    } else if (item.type === 'armor' && this.equipment.armor) {
      this.inventory.push(this.equipment.armor);
    }

    // Equip new item
    if (item.type === 'weapon') {
      this.equipment.weapon = item;
    } else if (item.type === 'armor') {
      this.equipment.armor = item;
    }

    // Remove from inventory
    this.removeItem(itemId);
    return true;
  }

  // Unequip an item and return it to inventory
  unequipItem(slot: 'weapon' | 'armor' | 'accessory'): boolean {
    const item = this.equipment[slot];
    if (!item) {
      return false;
    }

    if (!this.addItem(item)) {
      return false; // Inventory full
    }

    delete this.equipment[slot];
    return true;
  }

  // Gain experience and check for level up
  gainExperience(amount: number): boolean {
    this.experience += amount;
    
    const experienceForNextLevel = this.getExperienceForLevel(this.level + 1);
    if (this.experience >= experienceForNextLevel) {
      this.levelUp();
      return true;
    }
    
    return false;
  }

  // Calculate experience required for a given level
  private getExperienceForLevel(level: number): number {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  // Level up the character
  private levelUp(): void {
    this.level++;
    
    // Increase stats on level up
    this.stats.strength += 2;
    this.stats.defense += 1;
    this.stats.agility += 1;
    this.stats.intelligence += 1;
    
    // Increase max health and heal to full
    const healthIncrease = 10 + Math.floor(this.stats.strength / 2);
    this.maxHealth += healthIncrease;
    this.health = this.maxHealth;
  }

  // Check if player is alive
  isAlive(): boolean {
    return this.health > 0;
  }

  // Get character summary for display
  getSummary(): string {
    return `Level ${this.level} Character (${this.health}/${this.maxHealth} HP)`;
  }

  // Serialize character data
  serialize(): IPlayerCharacter {
    return {
      id: this.id,
      position: { ...this.position },
      health: this.health,
      maxHealth: this.maxHealth,
      level: this.level,
      experience: this.experience,
      inventory: [...this.inventory],
      equipment: { ...this.equipment },
      stats: { ...this.stats }
    };
  }

  // Create character from serialized data
  static deserialize(data: IPlayerCharacter): PlayerCharacter {
    return new PlayerCharacter(data);
  }
}