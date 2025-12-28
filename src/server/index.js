import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

import { Arena } from '../arena.js';
import { createClaudeSonnet, createClaudeHaiku } from '../models/claude.js';
import { createGPT4o, createGPT4oMini } from '../models/openai.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(join(__dirname, '../web')));
app.use(express.json());

// Store active games and clients
const clients = new Set();
let currentArena = null;
let matchInProgress = false;

// WebSocket handling
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected');

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });
});

function broadcast(event, data) {
  const message = JSON.stringify({ event, data });
  for (const client of clients) {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  }
}

// Available models
const AVAILABLE_MODELS = {
  'claude-sonnet': { name: 'Claude Sonnet', create: createClaudeSonnet },
  'claude-haiku': { name: 'Claude Haiku', create: createClaudeHaiku },
  'gpt-4o': { name: 'GPT-4o', create: createGPT4o },
  'gpt-4o-mini': { name: 'GPT-4o Mini', create: createGPT4oMini }
};

// API Routes
app.get('/api/models', (req, res) => {
  res.json(Object.entries(AVAILABLE_MODELS).map(([id, m]) => ({ id, name: m.name })));
});

app.post('/api/match/start', async (req, res) => {
  if (matchInProgress) {
    return res.status(400).json({ error: 'Match already in progress' });
  }

  const { models, config } = req.body;

  if (!models || models.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 models' });
  }

  // Create adapters
  const adapters = [];
  for (const modelId of models) {
    const modelDef = AVAILABLE_MODELS[modelId];
    if (!modelDef) {
      return res.status(400).json({ error: `Unknown model: ${modelId}` });
    }
    adapters.push(modelDef.create());
  }

  matchInProgress = true;
  res.json({ status: 'started', models: models.map(id => AVAILABLE_MODELS[id].name) });

  // Run match in background
  try {
    currentArena = new Arena({
      handsPerMatch: config?.hands || 10,
      startingChips: config?.chips || 1000,
      smallBlind: config?.smallBlind || 10,
      bigBlind: config?.bigBlind || 20,
      delayBetweenActions: 100
    });

    currentArena.on('handStart', (data) => broadcast('handStart', data));
    currentArena.on('stageChange', (data) => broadcast('stageChange', data));
    currentArena.on('action', (data) => broadcast('action', data));
    currentArena.on('handEnd', (data) => broadcast('handEnd', data));
    currentArena.on('matchEnd', (data) => broadcast('matchEnd', data));

    const results = await currentArena.runMatch(adapters);
    broadcast('matchComplete', results);
  } catch (error) {
    console.error('Match error:', error);
    broadcast('error', { message: error.message });
  } finally {
    matchInProgress = false;
    currentArena = null;
  }
});

app.get('/api/match/status', (req, res) => {
  res.json({ inProgress: matchInProgress });
});

// Start server
server.listen(PORT, () => {
  console.log(`LLM Poker Arena running at http://localhost:${PORT}`);
  console.log('Available models:', Object.values(AVAILABLE_MODELS).map(m => m.name).join(', '));
});
