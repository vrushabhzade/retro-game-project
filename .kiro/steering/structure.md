# Project Structure

## Directory Organization

```
src/
├── engine/           # Core game engine components
│   ├── GameEngine.ts
│   ├── GameState.ts
│   └── InputHandler.ts
├── dungeon/          # Dungeon generation and management
│   ├── DungeonGenerator.ts
│   ├── Room.ts
│   └── Corridor.ts
├── combat/           # Combat system and mechanics
│   ├── CombatSystem.ts
│   ├── Enemy.ts
│   └── CombatAnalysis.ts
├── player/           # Player character and profile management
│   ├── PlayerCharacter.ts
│   ├── PlayerProfile.ts
│   └── MovementController.ts
├── ai/               # AI systems and intelligence
│   ├── AIMentorSystem.ts
│   ├── VisualAdaptationEngine.ts
│   └── BehaviorAnalyzer.ts
├── ui/               # User interface components
│   ├── GameCanvas.ts
│   ├── ThoughtBubbleUI.ts
│   ├── AnalysisPanel.ts
│   └── RetroRenderer.ts
├── data/             # Data management and persistence
│   ├── SaveManager.ts
│   ├── PlayerProfileManager.ts
│   └── ConfigurationManager.ts
├── types/            # TypeScript type definitions
│   ├── GameTypes.ts
│   ├── AITypes.ts
│   └── UITypes.ts
└── utils/            # Utility functions and helpers
    ├── Performance.ts
    ├── ErrorHandling.ts
    └── Constants.ts

tests/
├── unit/             # Unit tests for specific components
├── properties/       # Property-based tests (fast-check)
├── integration/      # Integration and end-to-end tests
└── fixtures/         # Test data and mock objects

assets/
├── sprites/          # Pixel art graphics and animations
├── sounds/           # Retro sound effects and music
└── fonts/            # Bitmap fonts for retro styling

docs/
├── api/              # API documentation
└── architecture/     # Architecture diagrams and docs
```

## File Naming Conventions

- **Classes**: PascalCase (e.g., `GameEngine.ts`, `AIMentorSystem.ts`)
- **Interfaces**: PascalCase with 'I' prefix (e.g., `IPlayerProfile`, `ICombatAnalysis`)
- **Types**: PascalCase (e.g., `GameState`, `CombatTurn`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_DUNGEON_SIZE`, `DEFAULT_PERFORMANCE_THRESHOLD`)
- **Functions**: camelCase (e.g., `analyzePlayerAction`, `generateHint`)

## Module Organization

### Core Game Systems
- Each major system (engine, combat, AI) has its own directory
- Related functionality grouped together (e.g., all AI systems in `/ai/`)
- Clear separation between game logic and presentation layers

### Data Flow Patterns
- **Unidirectional data flow**: Game state flows down, actions flow up
- **Event-driven architecture**: Systems communicate through events, not direct coupling
- **Centralized state management**: Game state managed by GameEngine, player data by PlayerProfileManager

### Import Conventions
```typescript
// External libraries first
import * as fc from 'fast-check';

// Internal modules by layer (data -> logic -> AI -> UI)
import { GameState } from '../types/GameTypes';
import { PlayerProfile } from '../data/PlayerProfileManager';
import { AIMentorSystem } from '../ai/AIMentorSystem';
import { ThoughtBubbleUI } from '../ui/ThoughtBubbleUI';
```

## Testing Structure

- **Property tests**: One file per correctness property in `/tests/properties/`
- **Unit tests**: Mirror source structure in `/tests/unit/`
- **Integration tests**: End-to-end workflows in `/tests/integration/`
- **Test naming**: `{ComponentName}.test.ts` for unit tests, `Property{Number}.test.ts` for properties

## Configuration Management

- **Development config**: Local settings and debug flags
- **AI parameters**: Learning rates, thresholds, and behavior settings
- **Performance config**: Frame rate targets, response time limits
- **Save data**: Player profiles and game state persistence