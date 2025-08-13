# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Diamond Defender is a browser-based 2D game built with CreateJS/EaselJS, now fully refactored to TypeScript with modern tooling. It's a defensive shooter game where the player controls a diamond-shaped ship, aims with the mouse, and shoots at enemies.

## Architecture

### Tech Stack

- **Language**: TypeScript 5.3
- **Game Engine**: CreateJS/EaselJS via @thegraid/createjs-module
- **Build Tool**: Vite 5.0
- **Package Manager**: npm
- **Code Quality**: ESLint, Prettier

### Project Structure

```
src/
├── entities/        # Game objects (Player, Enemy, Mouse)
│   └── weapons/    # Weapon classes (Phaser, Kick)
├── managers/       # Game systems (GameManager, InputManager, UpgradeManager)
├── types/          # TypeScript type definitions
├── config/         # Game configuration
├── utils/          # Utility functions
└── main.ts         # Entry point
```

### Core Components

1. **GameManager**: Central game loop and entity orchestration
2. **InputManager**: Handles keyboard and mouse input (replaces keyMaster.js)
3. **Player**: Diamond-shaped player entity with velocity-based movement
4. **Enemy**: Triangle-shaped entities that track the player
5. **Weapons**:
   - **Phaser**: Primary weapon with laser and dub modes
   - **Kick**: Area-of-effect attack
6. **Mouse**: Targeting system with crosshair
7. **UpgradeManager**: Upgrade menu and progression system

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format

# Preview production build
npm run preview
```

## Game Controls

- **Movement**: WASD or Arrow keys
- **Aim**: Mouse
- **Shoot**: Mouse click (hold for continuous fire)
- **Special Attack**: E key (Kick ability)
- **Weapon Switch**: 1 (Laser), 2 (Dub)
- **Pause**: Escape
- **Upgrades**: Click upgrades button (top-right)

## Key Features

- TypeScript for type safety
- Modular architecture with clear separation of concerns
- Hot module replacement in development
- Optimized production builds
- ESLint and Prettier for code quality
- Path aliases for clean imports (@entities, @managers, etc.)

## Notes

- Game runs at 55 FPS
- Canvas dimensions: 1400x800 pixels
- Uses Vite for fast development and optimized builds
- All game logic is now in TypeScript with proper typing