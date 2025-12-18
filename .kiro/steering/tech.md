# Technology Stack

## Core Technologies

- **Language**: TypeScript for type safety and better development experience
- **Runtime**: Node.js for development tooling and build processes
- **Testing Framework**: Jest for unit testing
- **Property Testing**: fast-check library for property-based testing (minimum 100 iterations per property)

## Architecture Pattern

**Layered Architecture** with clear separation of concerns:
- **Presentation Layer**: Game Canvas (Retro UI), Thought Bubble UI, Analysis Panel
- **AI Layer**: AI Mentor System, Visual Adapter Engine, Combat Analyzer
- **Game Logic Layer**: Game Engine, Combat System, Dungeon Generator
- **Data Layer**: Player Profile Manager, Game State Manager, Save Manager

## Key Libraries & Frameworks

- **Graphics**: HTML5 Canvas for retro pixel art rendering
- **Animation**: Custom frame rate management system for consistent performance
- **Serialization**: Native JSON for save/load functionality with error handling
- **AI Processing**: Custom behavioral analysis algorithms with performance throttling

## Performance Requirements

- **Input Response**: ≤100ms for movement actions
- **Frame Rate**: Consistent animation performance without stuttering
- **AI Processing**: Non-blocking background processing to maintain gameplay responsiveness
- **Memory**: Efficient state management for long gaming sessions

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run property-based tests
npm run test:properties

# Build for production
npm run build
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run property tests only
npm run test:properties

# Run performance tests
npm run test:performance
```

### Code Quality
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

## Development Guidelines

- All AI systems must implement non-blocking processing
- Property tests must include comment format: `Feature: ai-dungeon-master, Property {number}: {property_text}`
- Maintain 60fps target for animations and UI responsiveness
- Use TypeScript strict mode for all source files
- Implement graceful error handling for all save/load operations