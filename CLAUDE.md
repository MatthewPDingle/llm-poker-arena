# Claude Context File

> **READ THIS FIRST** - This file maintains project state across Claude Code sessions.
> Update this file before committing significant changes.

## Project Overview

**LLM Poker Arena** - A web application where various AI models compete against each other in multi-way No-Limit Texas Hold'em. Models are evaluated using an Elo rating system.

**Repository:** https://github.com/MatthewPDingle/llm-poker-arena

## Tech Stack

- **Runtime:** Node.js (v25+)
- **Backend:** Express.js
- **Frontend:** HTML/CSS/JS (vanilla)
- **Database:** SQLite via sql.js (pure JS, no native deps)
- **Real-time:** WebSocket for live game updates
- **Environment:** Termux on Android

## Architecture

```
src/
├── engine/        # Poker game logic (COMPLETE)
│   ├── deck.js        # Card/deck management, shuffling
│   ├── hand.js        # Hand evaluation (all rankings)
│   └── game.js        # Game state machine, betting
├── models/        # LLM adapters (COMPLETE)
│   ├── base.js        # Base adapter interface
│   ├── claude.js      # Anthropic Claude (Opus, Sonnet, Haiku)
│   ├── openai.js      # OpenAI (GPT-4o, o1, etc)
│   └── index.js       # Exports
├── arena.js       # Match runner (COMPLETE)
├── server/        # Express API (COMPLETE)
│   └── index.js       # Server + WebSocket + API
└── web/           # Frontend (COMPLETE)
    ├── index.html     # Main page
    ├── style.css      # Poker table styling
    └── app.js         # Client JS, WebSocket handling
tests/
└── engine.test.js # Poker engine tests (18 passing)
```

## Current Status

### Completed
- [x] Project scaffolding
- [x] GitHub repo created
- [x] CLAUDE.md for session continuity
- [x] Core poker engine (deck, hand evaluation, game state)
- [x] All hand rankings (high card -> royal flush)
- [x] Model adapters (Claude, OpenAI)
- [x] Arena match runner
- [x] Express server with WebSocket
- [x] Web UI with poker table visualization
- [x] 18 passing tests

### Not Yet Implemented
- [ ] Elo rating system
- [ ] Database persistence (sql.js)
- [ ] Hand history storage/viewer
- [ ] Gemini adapter
- [ ] More model variants
- [ ] Side pot calculation for multi-way all-ins
- [ ] Leaderboard page

## Key Design Decisions

1. **Modular model adapters** - Each LLM gets its own adapter file implementing a common interface. `BaseAdapter.getAction()` handles prompt formatting, API calls, and response parsing.

2. **Standardized action format** - Models must respond with:
   - `FOLD`
   - `CHECK` (only if no bet to call)
   - `CALL`
   - `RAISE <amount>` (e.g., RAISE 100)
   - `ALL_IN`

3. **Game state prompt** - Models receive structured info:
   - Their hole cards
   - Community cards
   - Pot size, current bet
   - Stack sizes
   - Position (Button, SB, BB, etc.)
   - Opponents' visible info

4. **Retry with fallback** - If LLM gives invalid response, retry up to 3x then fold.

## API Keys Required

Set in `.env` file:
```
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

## Running Locally

```bash
cd ~/projects/llm-poker-arena
npm install
npm run dev      # Development server (port 3000)
npm test         # Run tests
```

Then open http://localhost:3000 in browser.

## GitHub Issues

- #1 Core Poker Engine (DONE)
- #2 LLM Model Adapters (DONE)
- #3 Elo Rating System (TODO)
- #4 Web UI (DONE - basic version)
- #5 Express Server & API (DONE)
- #6 Database & Hand History (TODO)

## Session Handoff Notes

*Update this section at the end of each session with context for the next one.*

**Last Updated:** 2025-12-28

**Session Summary:**
- Built complete poker engine with hand evaluation
- Created model adapters for Claude and OpenAI
- Built Arena match runner
- Created Express server with WebSocket
- Built web UI with poker table visualization
- All 18 engine tests passing

**Working Features:**
- Select 2+ models from UI
- Start a match with configurable hands/blinds
- Watch live action log
- See final results and winner

**Blockers/Issues:**
- Haven't tested with real API keys yet
- Side pots not fully implemented for complex multi-way all-ins

**Next Session Should:**
1. Test with actual API keys (need .env setup)
2. Implement Elo rating system
3. Add database persistence with sql.js
4. Create hand history viewer
5. Add more model adapters (Gemini, Mistral, etc.)
