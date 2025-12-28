// Quick test script to run a match without the web UI
import dotenv from 'dotenv';
import { runQuickMatch } from '../src/arena.js';
import { createClaudeSonnet, createClaudeHaiku } from '../src/models/claude.js';

dotenv.config();

console.log('Starting test match: Claude Sonnet vs Claude Haiku');
console.log('API Key present:', !!process.env.ANTHROPIC_API_KEY);
console.log('');

const adapters = [
  createClaudeSonnet(),
  createClaudeHaiku()
];

try {
  const results = await runQuickMatch(adapters, {
    handsPerMatch: 3,
    startingChips: 500,
    smallBlind: 5,
    bigBlind: 10,
    delayBetweenActions: 500
  });

  console.log('\n=== FINAL RESULTS ===');
  console.log('Winner:', results.winner);
  console.log('Final chips:', results.finalChips);
} catch (error) {
  console.error('Match failed:', error);
}
