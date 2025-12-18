# AI-Enhanced Dungeon Master Game

A modern recreation of the classic 1987 Dungeon Master experience with intelligent AI systems that learn player behavior and provide adaptive assistance. This project combines traditional grid-based dungeon crawling with cutting-edge AI features while maintaining authentic retro gameplay.

## 🎮 Features

### Core Gameplay
- **Classic Dungeon Crawler**: Grid-based movement, real-time combat, retro pixel art aesthetics
- **Multi-level Dungeons**: Procedurally generated levels with increasing difficulty
- **Real-time Combat**: Strategic turn-based combat with multiple attack options
- **Character Progression**: Level up system with stat improvements and new abilities

### AI Enhancements
- **AI Mentor System**: Learns player behavior patterns and provides contextual tactical guidance
- **Visual Adaptation Engine**: Adjusts UI complexity and styling based on player skill level
- **Combat Analysis System**: Provides detailed post-combat analysis with efficiency scoring (0-100%)
- **Adaptive Learning**: AI systems persist learning data across gaming sessions
- **Real-time Thought Bubbles**: Visual interface showing AI decision-making process

### Technical Features
- **Full-Stack Architecture**: TypeScript frontend and Node.js backend
- **Real-time Multiplayer**: WebSocket-based real-time game state synchronization
- **Persistent Data**: MongoDB for game state and player profiles
- **Performance Optimized**: Redis caching for fast response times
- **Comprehensive Testing**: Unit tests, integration tests, and property-based testing

## 🏗️ Architecture

### Frontend (Client)
- **TypeScript** with strict type checking
- **HTML5 Canvas** for retro pixel art rendering
- **WebSocket Client** for real-time communication
- **Layered Architecture**: Presentation → AI → Game Logic → Data

### Backend (Server)
- **Node.js** with Express.js framework
- **Socket.IO** for WebSocket communication
- **MongoDB** for persistent data storage
- **Redis** for session management and caching
- **JWT Authentication** for secure user sessions

### AI Systems
- **Behavior Analysis**: Tracks and learns from player actions
- **Performance Metrics**: Monitors combat efficiency and survival rates
- **Adaptive Guidance**: Provides contextual hints based on skill level
- **Visual Adaptation**: Adjusts UI complexity dynamically

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- MongoDB 4.4+
- Redis 6.0+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-dungeon-master
   ```

2. **Setup backend services**
   ```bash
   npm run setup:backend
   ```

3. **Configure environment**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your configuration
   ```

4. **Start required services**
   ```bash
   # Terminal 1: Start MongoDB
   mongod
   
   # Terminal 2: Start Redis
   redis-server
   
   # Terminal 3: Start backend server
   npm run server:dev
   
   # Terminal 4: Start frontend
   npm run dev
   ```

5. **Open the game**
   - Navigate to `http://localhost:8080`
   - Create an account or login
   - Start your dungeon adventure!

## 🎯 Game Controls

### Movement
- **WASD** or **Arrow Keys**: Move player character
- **Mouse**: Interact with UI elements

### Combat
- **A**: Attack with weapon
- **S**: Cast spell (requires MP)
- **P**: Use healing potion
- **D**: Defend (reduce incoming damage)

### AI Interaction
- **H**: Request AI guidance
- **T**: Toggle thought bubble frequency
- **ESC**: Open game menu

## 🧠 AI Features

### Behavior Learning
The AI mentor observes your gameplay patterns:
- **Movement Style**: Cautious, aggressive, exploratory, or efficient
- **Combat Preference**: Melee, magic, balanced, or defensive
- **Resource Management**: Conservative, moderate, or aggressive
- **Exploration Pattern**: Thorough, direct, or random

### Adaptive Assistance
Based on your skill level, the AI provides:
- **Beginner**: Simple UI, basic guidance, frequent encouragement
- **Intermediate**: Moderate complexity, tactical suggestions
- **Advanced**: Detailed analytics, strategic advice
- **Expert**: Comprehensive data, optimization recommendations

### Combat Analysis
After each battle, receive detailed feedback:
- **Efficiency Score**: 0-100% compared to optimal play
- **Turn-by-turn Breakdown**: Analysis of each action
- **Alternative Strategies**: What you could have done differently
- **Resource Optimization**: Better use of HP, MP, and items

## 🔧 Development

### Project Structure
```
├── src/                    # Frontend source code
│   ├── ai/                # AI systems
│   ├── combat/            # Combat mechanics
│   ├── dungeon/           # Dungeon generation
│   ├── engine/            # Core game engine
│   ├── player/            # Player management
│   ├── services/          # API and WebSocket clients
│   ├── ui/                # User interface
│   └── utils/             # Utility functions
├── server/                # Backend source code
│   ├── src/
│   │   ├── models/        # Database models
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── websocket/     # WebSocket handlers
│   │   └── middleware/    # Express middleware
├── tests/                 # Test suites
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── properties/        # Property-based tests
└── docs/                  # Documentation
```

### Available Scripts

#### Frontend
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run test             # Run all tests
npm run test:properties  # Run property-based tests
npm run lint             # Lint code
npm run format           # Format code
```

#### Backend
```bash
npm run server:dev       # Start backend in development
npm run server:build     # Build backend for production
npm run server:start     # Start production backend
```

### Testing
The project includes comprehensive testing:
- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end workflow testing
- **Property Tests**: Automated correctness verification with 100+ iterations
- **Performance Tests**: Response time and memory usage validation

Run tests with:
```bash
npm test                 # All tests
npm run test:watch       # Watch mode
npm run test:properties  # Property-based tests only
```

## 📊 Performance Requirements

- **Input Response**: ≤100ms for movement actions
- **Frame Rate**: Consistent 60fps animation performance
- **AI Processing**: Non-blocking background processing
- **Memory Usage**: Efficient state management for long sessions
- **Network**: Optimized WebSocket communication

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against API abuse
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configured cross-origin resource sharing
- **Helmet Security**: Security headers and protection middleware

## 🌐 API Documentation

Comprehensive API documentation is available at [docs/api/README.md](docs/api/README.md).

### Key Endpoints
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Authenticate user
- `POST /api/game/new` - Start new game
- `POST /api/game/:id/move` - Move player
- `GET /api/game/:id/ai-guidance` - Get AI advice

### WebSocket Events
- `game_state_update` - Real-time game state changes
- `ai_response` - AI mentor guidance
- `combat_analysis` - Post-combat feedback

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Write tests for new features
- Maintain 60fps performance target
- Use property-based testing for correctness
- Follow the established architecture patterns

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the original 1987 Dungeon Master by FTL Games
- Built with modern web technologies and AI enhancements
- Thanks to the open-source community for the amazing tools and libraries

## 🐛 Bug Reports & Feature Requests

Please use the GitHub Issues tab to report bugs or request features. Include:
- Detailed description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser/environment information
- Screenshots if applicable

## 📈 Roadmap

### Upcoming Features
- [ ] Multiplayer dungeon exploration
- [ ] Advanced AI personality customization
- [ ] Mobile-responsive interface
- [ ] Achievement system
- [ ] Leaderboards and statistics
- [ ] Custom dungeon editor
- [ ] Voice-activated AI mentor
- [ ] VR/AR support exploration

---

**Happy dungeon crawling! 🗡️🛡️**