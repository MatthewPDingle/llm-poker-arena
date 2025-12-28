# LLM Poker Arena - Task Management

> **For Claude**: This file tracks active work. Update after each session.
> Use GitHub Issues as the source of truth for backlog.

## Current Sprint

### In Progress
- [ ] #7 - Real-time UI improvements (cards visible during play)

### Up Next
- [ ] #3 - Elo Rating System
- [ ] #6 - Database & Hand History

### Blocked
(none)

---

## Quick Commands

```bash
# View all issues
gh issue list --repo MatthewPDingle/llm-poker-arena

# Create new issue
gh issue create --repo MatthewPDingle/llm-poker-arena --title "Title" --body "Description"

# Close issue
gh issue close <number> --repo MatthewPDingle/llm-poker-arena

# Run test match
node scripts/test-match.js

# Start server
node src/server/index.js
```

---

## Subagent Context Template

When spawning a subagent, provide:

1. **Read these files first:**
   - `CLAUDE.md` - Project overview, architecture, decisions
   - `TASKS.md` - Current priorities
   - Relevant source files for the task

2. **GitHub Issue:** Link or paste the issue content

3. **Specific instructions:** What to implement, constraints, tests needed

4. **Output expected:** Files to create/modify, tests to pass

---

## Session Log

### 2025-12-28 - Session 1
- Initial project setup
- Built poker engine, model adapters, web UI
- Created GitHub repo with issues #1-6
- Tested successfully: Claude Sonnet vs Claude Haiku

### 2025-12-28 - Session 1 (continued)
- Fixed circular JSON serialization bug
- Added real-time card display in UI
- Added blinds to action log
- Created test-match.js script
- All tests passing, matches working
