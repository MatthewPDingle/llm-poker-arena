# Claude Context File

> **READ THIS FIRST** - This file maintains project state across Claude Code sessions.
> Update this file before committing significant changes.

## Project Overview

**LLM Poker Arena** - A web application where various AI models compete against each other in multi-way No-Limit Texas Hold'em. Models are evaluated using an Elo rating system.

**Repository:** https://github.com/MatthewPDingle/llm-poker-arena
**Owner:** Matt (@MatthewPDingle)

## Project Management

### Task Tracking
- **GitHub Issues** - Source of truth for all tasks/features/bugs
- **TASKS.md** - Current sprint, active work, session log
- **This file (CLAUDE.md)** - Architecture, context, decisions

### Workflow
1. Check `TASKS.md` for current priorities
2. Check GitHub Issues: `gh issue list --repo MatthewPDingle/llm-poker-arena`
3. Work on highest priority items
4. Update TASKS.md and commit changes
5. Close issues when complete

### Open Issues
- #3 Elo Rating System
- #4 Web UI (improvements)
- #6 Database & Hand History
- #7 Add more LLM providers
- #8 Side pot calculation
- #9 Match statistics and analytics

### Closed Issues
- #1 Core Poker Engine ✓
- #2 LLM Model Adapters ✓
- #5 Express Server & API ✓

## Tech Stack

- **Runtime:** Node.js (v25+)
- **Backend:** Express.js
- **Frontend:** HTML/CSS/JS (vanilla)
- **Database:** SQLite via sql.js (pure JS, no native deps for Termux)
- **Real-time:** WebSocket for live game updates
- **Environment:** Termux on Android

## Architecture

```
llm-poker-arena/
├── CLAUDE.md          # This file - project context
├── TASKS.md           # Current sprint and session log
├── package.json
├── .env               # API keys (gitignored)
├── src/
│   ├── engine/        # Poker game logic ✓
│   │   ├── deck.js        # Card/deck management
│   │   ├── hand.js        # Hand evaluation (all rankings)
│   │   └── game.js        # Game state machine, betting
│   ├── models/        # LLM adapters ✓
│   │   ├── base.js        # Base adapter interface
│   │   ├── claude.js      # Anthropic Claude
│   │   ├── openai.js      # OpenAI GPT
│   │   └── index.js       # Exports
│   ├── arena.js       # Match runner ✓
│   ├── server/        # Express API ✓
│   │   └── index.js       # Server + WebSocket
│   └── web/           # Frontend ✓
│       ├── index.html
│       ├── style.css
│       └── app.js
├── tests/
│   └── engine.test.js # 18 passing tests
└── scripts/
    └── test-match.js  # CLI match runner
```

## Key Design Decisions

1. **Modular model adapters** - Each LLM gets its own file extending `BaseAdapter`. Implement `callLLM(prompt)` method.

2. **Standardized action format** - Models respond with:
   - `FOLD` / `CHECK` / `CALL` / `RAISE <amount>` / `ALL_IN`

3. **Game state prompt** - Models receive:
   - Hole cards, community cards
   - Pot size, current bet, stack sizes
   - Position (Button, SB, BB, etc.)

4. **Retry with fallback** - Invalid LLM response → retry 3x → fold

5. **Event-driven architecture** - Arena emits events (handStart, action, stageChange, handEnd, matchEnd) consumed by server/UI

## API Keys

Set in `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
```

## Quick Commands

```bash
# Development
cd ~/projects/llm-poker-arena
node src/server/index.js    # Start server (localhost:3000)
node scripts/test-match.js  # Run CLI test match
npm test                    # Run engine tests

# GitHub
gh issue list --repo MatthewPDingle/llm-poker-arena
gh issue create --repo MatthewPDingle/llm-poker-arena --title "..." --body "..."
gh issue close <n> --repo MatthewPDingle/llm-poker-arena
```

## Subagent Handoff Protocol

When spawning a subagent for a task:

### 1. Context Files
Tell the agent to read:
- `CLAUDE.md` (this file)
- `TASKS.md`
- Specific source files for their task

### 2. Task Definition
Provide:
- GitHub Issue number and content
- Specific requirements and constraints
- Expected output (files, tests)
- Any gotchas or dependencies

### 3. Example Prompt
```
You are working on llm-poker-arena.

READ FIRST:
- CLAUDE.md for project context
- src/models/base.js for adapter interface

TASK: Implement Gemini adapter (#7)
- Create src/models/gemini.js
- Extend BaseAdapter
- Add to src/models/index.js exports
- Add to server model list

TEST: Run `node scripts/test-match.js` with Gemini
```

## Session Handoff Notes

**Last Updated:** 2025-12-28

**Session Summary:**
- Built complete poker engine with hand evaluation
- Created model adapters (Claude, OpenAI)
- Built Arena match runner with events
- Created Express server with WebSocket
- Built web UI with real-time updates
- Fixed JSON serialization bug
- Added blinds to action log, cards visible during play
- Created test-match.js script
- Set up GitHub Issues for project management
- Tested successfully: Claude Sonnet vs Claude Haiku

**Working Features:**
- Select 2+ models from UI
- Real-time action log with cards
- Hole cards visible on table
- Match results display
- CLI test script

**Known Issues:**
- Side pots not fully implemented for complex multi-way all-ins

**Priority for Next Session:**
1. #3 Elo Rating System - Track and display model rankings
2. #6 Database - Persist hands, ratings, enable history
3. #7 More LLM providers - Gemini, Mistral, etc.
