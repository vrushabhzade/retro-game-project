import { ThoughtBubbleIntegration } from './ThoughtBubbleIntegration';
import { AIMentorSystem } from '../ai/AIMentorSystem';
import { PlayerProfile } from '../player/PlayerProfile';
import { GameState, PlayerAction } from '../types/GameTypes';
import { AIHint } from '../types/AITypes';

/**
 * Example usage of the ThoughtBubbleUI system
 * This demonstrates how to integrate the thought bubble with a game
 */
export class ThoughtBubbleExample {
  private thoughtBubbleIntegration: ThoughtBubbleIntegration;
  private aiMentor: AIMentorSystem;

  constructor(gameContainer: HTMLElement) {
    // Initialize AI mentor system
    this.aiMentor = new AIMentorSystem();
    
    // Create a sample player profile
    const sampleProfile = new PlayerProfile('example-player');
    this.aiMentor.initialize(sampleProfile);

    // Initialize thought bubble integration
    this.thoughtBubbleIntegration = new ThoughtBubbleIntegration(
      gameContainer,
      this.aiMentor,
      {
        position: 'top-right',
        maxWidth: 280,
        fadeInDuration: 400,
        displayDuration: 5000
      },
      {
        colorPalette: ['#000000', '#FFFFFF', '#808080', '#C0C0C0'],
        fontFamily: 'Courier New, monospace',
        fontSize: 12,
        borderStyle: 'simple',
        shadowStyle: 'drop'
      }
    );

    this.thoughtBubbleIntegration.initialize();
  }

  /**
   * Simulate a combat scenario with AI hints
   */
  public simulateCombatScenario(): void {
    // Create a mock game state for combat
    const gameState: GameState = {
      player: {
        id: 'player1',
        position: { x: 5, y: 5 },
        health: 25,
        maxHealth: 100,
        level: 3,
        experience: 150,
        inventory: [],
        equipment: {},
        stats: {
          strength: 10,
          defense: 8,
          agility: 12,
          intelligence: 6
        }
      },
      dungeon: {
        width: 20,
        height: 20,
        rooms: [],
        corridors: []
      },
      enemies: [
        {
          id: 'orc1',
          name: 'Orc Warrior',
          position: { x: 6, y: 5 },
          health: 80,
          maxHealth: 80,
          attackPower: 15,
          defense: 10,
          aiType: 'aggressive'
        }
      ],
      items: [],
      currentRoom: 'room1',
      gameTime: 12000,
      isInCombat: true,
      difficulty: 'medium',
      turnNumber: 1
    };

    // Simulate player action - attacking while at low health
    const playerAction: PlayerAction = {
      type: 'attack',
      target: 'orc1',
      timestamp: Date.now()
    };

    // Process the action through the AI system
    this.thoughtBubbleIntegration.onPlayerAction(playerAction, gameState);

    // The AI should generate a hint about the player's low health and aggressive behavior
    setTimeout(() => {
      this.thoughtBubbleIntegration.onGameStateChange(gameState);
    }, 1000);
  }

  /**
   * Simulate an exploration scenario
   */
  public simulateExplorationScenario(): void {
    const gameState: GameState = {
      player: {
        id: 'player1',
        position: { x: 3, y: 7 },
        health: 85,
        maxHealth: 100,
        level: 2,
        experience: 75,
        inventory: [
          { 
            id: 'sword1', 
            name: 'Iron Sword', 
            type: 'weapon',
            position: { x: 0, y: 0 },
            properties: { damage: 10 }
          },
          { 
            id: 'potion1', 
            name: 'Health Potion', 
            type: 'consumable',
            position: { x: 0, y: 0 },
            properties: { healing: 25 }
          },
          { 
            id: 'key1', 
            name: 'Rusty Key', 
            type: 'key',
            position: { x: 0, y: 0 },
            properties: { opens: 'door1' }
          }
        ],
        equipment: {},
        stats: {
          strength: 8,
          defense: 6,
          agility: 10,
          intelligence: 7
        }
      },
      dungeon: {
        width: 20,
        height: 20,
        rooms: [
          {
            id: 'room2',
            position: { x: 3, y: 7 },
            width: 4,
            height: 4,
            type: 'treasure',
            items: [
              { 
                id: 'treasure1', 
                name: 'Gold Coins', 
                type: 'treasure',
                position: { x: 4, y: 8 },
                properties: { value: 50 }
              },
              { 
                id: 'scroll1', 
                name: 'Magic Scroll', 
                type: 'consumable',
                position: { x: 5, y: 8 },
                properties: { spell: 'fireball' }
              }
            ],
            enemies: [],
            connections: []
          }
        ],
        corridors: []
      },
      enemies: [],
      items: [],
      currentRoom: 'room2',
      gameTime: 8000,
      isInCombat: false,
      difficulty: 'easy',
      turnNumber: 0
    };

    this.thoughtBubbleIntegration.onGameStateChange(gameState);
  }

  /**
   * Show a custom hint manually
   */
  public showCustomHint(): void {
    const customHint: AIHint = {
      id: 'custom_hint_1',
      message: 'Remember to check your inventory regularly for useful items!',
      type: 'tip',
      urgency: 'low',
      context: 'Player has been exploring for a while without checking inventory',
      showDuration: 4000
    };

    this.thoughtBubbleIntegration.showHint(customHint);
  }

  /**
   * Show a series of hints with different urgency levels
   */
  public showHintSeries(): void {
    // Low urgency tip
    setTimeout(() => {
      this.thoughtBubbleIntegration.showQuickHint(
        'Try exploring the corners of rooms for hidden items.',
        'tip',
        'low',
        'General exploration advice'
      );
    }, 1000);

    // Medium urgency strategic hint
    setTimeout(() => {
      this.thoughtBubbleIntegration.showQuickHint(
        'Consider saving your potions for tougher enemies ahead.',
        'strategic',
        'medium',
        'Resource management suggestion'
      );
    }, 6000);

    // High urgency tactical warning
    setTimeout(() => {
      this.thoughtBubbleIntegration.showQuickHint(
        'Enemy approaching from the north! Prepare for combat.',
        'warning',
        'high',
        'Immediate threat detected'
      );
    }, 11000);
  }

  /**
   * Change the visual style to a different theme
   */
  public switchToGreenTheme(): void {
    this.thoughtBubbleIntegration.updateStyling({
      colorPalette: ['#004400', '#00ff00', '#008800', '#00cc00'],
      fontFamily: 'Courier New, monospace',
      fontSize: 11,
      borderStyle: 'detailed',
      shadowStyle: 'drop'
    });
  }

  /**
   * Change to high contrast theme
   */
  public switchToHighContrastTheme(): void {
    this.thoughtBubbleIntegration.updateStyling({
      colorPalette: ['#000000', '#ffffff'],
      fontFamily: 'Arial, sans-serif',
      fontSize: 14,
      borderStyle: 'simple',
      shadowStyle: 'none'
    });
  }

  /**
   * Update the position and size
   */
  public updatePosition(position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'): void {
    this.thoughtBubbleIntegration.updateConfiguration({
      position,
      maxWidth: position.includes('left') ? 250 : 300
    });
  }

  /**
   * Clean up the example
   */
  public cleanup(): void {
    this.thoughtBubbleIntegration.shutdown();
  }
}