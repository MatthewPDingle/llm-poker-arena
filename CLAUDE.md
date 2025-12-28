# Claude Context File

> **READ THIS FIRST** - This file maintains project state across Claude Code sessions.
> Update this file before committing significant changes.

## Project Overview

**LLM Poker Arena** - A web application where various AI models compete against each other in multi-way No-Limit Texas Hold'em. Models are evaluated using an Elo rating system.

**Repository:** https://github.com/MatthewPDingle/llm-poker-arena

## Tech Stack

- **Runtime:** Node.js (v25+)
- **Backend:** Express.js
- **Frontend:** HTML/CSS/JS (vanilla, may upgrade to React later)
- **Database:** SQLite (hands, ratings, sessions)
- **Real-time:** WebSocket for live game updates
- **Environment:** Termux on Android

## Architecture

```
src/
├── engine/        # Poker game logic
│   ├── deck.js        # Card/deck management
│   ├── hand.js        # Hand evaluation (rankings)
│   ├── game.js        # Game state machine
│   └── betting.js     # Betting round logic
├── models/        # LLM adapters (one per provider)
│   ├── base.js        # Base adapter interface
│   ├── claude.js      # Anthropic Claude
│   ├── openai.js      # GPT-4, GPT-4o
│   ├── gemini.js      # Google Gemini
│   └── ...
├── elo/           # Rating system
│   └── rating.js      # Elo calculation
├── server/        # Express API
│   ├── index.js       # Entry point
│   ├── routes.js      # API routes
│   └── websocket.js   # Live updates
└── web/           # Frontend
    ├── index.html     # Main page
    ├── style.css      # Styles
    └── app.js         # Client JS
```

## Current Status

### Completed
- [x] Project scaffolding
- [x] GitHub repo created
- [x] CLAUDE.md created

### In Progress
- [ ] Initial project setup (package.json, dependencies)

### Next Up
- [ ] Core poker engine (deck, hand evaluation)
- [ ] Game state machine
- [ ] First model adapter (Claude)
- [ ] Basic web UI
- [ ] Elo rating system
- [ ] Hand history logging

## Key Design Decisions

1. **Modular model adapters** - Each LLM gets its own adapter file implementing a common interface. This allows easy addition of new models.

2. **Standardized action format** - Models must respond with valid poker actions:
   - `FOLD`
   - `CHECK`
   - `CALL`
   - `RAISE <amount>`
   - `ALL_IN`

3. **Game state representation** - Models receive a structured prompt with:
   - Their hole cards
   - Community cards
   - Pot size
   - Stack sizes
   - Betting history
   - Position information

4. **Elo system** - Ratings update after each hand based on chip differential vs expected outcome.

## API Keys Required

Models need API keys set as environment variables:
- `ANTHROPIC_API_KEY` - Claude models
- `OPENAI_API_KEY` - GPT models
- `GOOGLE_API_KEY` - Gemini models
- (add more as needed)

## Running Locally

```bash
cd ~/projects/llm-poker-arena
npm install
npm run dev      # Development server
npm start        # Production
npm test         # Run tests
```

## Session Handoff Notes

*Update this section at the end of each session with context for the next one.*

**Last Updated:** 2025-12-28

**Session Summary:**
- Initial project setup in Termux
- Created repo and directory structure
- Established CLAUDE.md for session continuity

**Blockers/Issues:**
- None currently

**Next Session Should:**
1. Set up package.json and install dependencies
2. Implement core poker engine (start with deck.js and hand.js)
3. Create GitHub issues for tracking features
