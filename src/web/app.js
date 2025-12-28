// LLM Poker Arena - Client

const SUIT_SYMBOLS = {
  h: '\u2665', // hearts
  d: '\u2666', // diamonds
  c: '\u2663', // clubs
  s: '\u2660'  // spades
};

let ws = null;
let selectedModels = new Set();

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadModels();
  connectWebSocket();

  document.getElementById('start-btn').addEventListener('click', startMatch);
});

async function loadModels() {
  try {
    const response = await fetch('/api/models');
    const models = await response.json();

    const container = document.getElementById('model-checkboxes');
    container.innerHTML = models.map(m => `
      <label>
        <input type="checkbox" value="${m.id}" onchange="toggleModel('${m.id}')">
        ${m.name}
      </label>
    `).join('');
  } catch (error) {
    console.error('Failed to load models:', error);
  }
}

function toggleModel(modelId) {
  if (selectedModels.has(modelId)) {
    selectedModels.delete(modelId);
  } else {
    selectedModels.add(modelId);
  }
}

function connectWebSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);

  ws.onmessage = (event) => {
    const { event: eventName, data } = JSON.parse(event.data);
    handleEvent(eventName, data);
  };

  ws.onclose = () => {
    setTimeout(connectWebSocket, 2000);
  };
}

function handleEvent(event, data) {
  switch (event) {
    case 'handStart':
      handleHandStart(data);
      break;
    case 'action':
      handleAction(data);
      break;
    case 'handEnd':
      handleHandEnd(data);
      break;
    case 'matchEnd':
    case 'matchComplete':
      handleMatchEnd(data);
      break;
    case 'error':
      setStatus(`Error: ${data.message}`);
      break;
  }
}

function handleHandStart(data) {
  setStatus(`Hand #${data.handNumber}`);
  updatePlayers(data.players);
  document.getElementById('community').innerHTML = '';
  document.getElementById('pot').textContent = 'Pot: 0';
  addLog(`=== Hand #${data.handNumber} ===`, 'hand');
}

function handleAction(data) {
  const amountStr = data.amount > 0 ? ` ${data.amount}` : '';
  addLog(`[${data.stage}] ${data.player}: ${data.action}${amountStr}`, data.action.toLowerCase().replace('_', '-'));
}

function handleHandEnd(data) {
  if (data.result) {
    const winners = data.result.winners || [];
    addLog(`Winner: ${winners.join(', ')} (pot: ${data.result.pot})`, 'winner');

    // Update community cards
    if (data.result.communityCards) {
      updateCommunityCards(data.result.communityCards);
    }

    // Update pot
    document.getElementById('pot').textContent = `Pot: ${data.result.pot}`;
  }

  // Update player states
  if (data.game && data.game.players) {
    updatePlayersFromState(data.game.players);
  }
}

function handleMatchEnd(data) {
  setStatus('Match Complete!');
  document.getElementById('start-btn').disabled = false;

  const resultsDiv = document.getElementById('results');
  const contentDiv = document.getElementById('results-content');

  resultsDiv.style.display = 'block';

  const standings = Object.entries(data.finalChips)
    .sort((a, b) => b[1] - a[1])
    .map(([name, chips], i) => `<div>${i + 1}. ${name}: ${chips} chips</div>`)
    .join('');

  contentDiv.innerHTML = `
    <div class="winner-announcement">Winner: ${data.winner}</div>
    <div class="final-standings">${standings}</div>
    <div style="margin-top: 20px">Total hands played: ${data.hands.length}</div>
  `;
}

async function startMatch() {
  if (selectedModels.size < 2) {
    alert('Please select at least 2 models');
    return;
  }

  const config = {
    hands: parseInt(document.getElementById('hands').value),
    chips: parseInt(document.getElementById('chips').value),
    smallBlind: parseInt(document.getElementById('sb').value),
    bigBlind: parseInt(document.getElementById('bb').value)
  };

  document.getElementById('start-btn').disabled = true;
  document.getElementById('results').style.display = 'none';
  document.getElementById('log').innerHTML = '';

  setStatus('Starting match...');

  try {
    const response = await fetch('/api/match/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        models: Array.from(selectedModels),
        config
      })
    });

    const result = await response.json();
    if (result.error) {
      setStatus(`Error: ${result.error}`);
      document.getElementById('start-btn').disabled = false;
    } else {
      setStatus(`Match started: ${result.models.join(' vs ')}`);
    }
  } catch (error) {
    setStatus(`Error: ${error.message}`);
    document.getElementById('start-btn').disabled = false;
  }
}

function setStatus(text) {
  document.getElementById('status').textContent = text;
}

function addLog(text, className = '') {
  const log = document.getElementById('log');
  const entry = document.createElement('div');
  entry.className = `log-entry ${className}`;
  entry.textContent = text;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

function updatePlayers(players) {
  const container = document.getElementById('players');
  container.innerHTML = players.map(p => `
    <div class="player">
      <div class="player-name">${p.name}</div>
      <div class="player-chips">${p.chips} chips</div>
    </div>
  `).join('');
}

function updatePlayersFromState(players) {
  const container = document.getElementById('players');
  container.innerHTML = players.map(p => `
    <div class="player ${p.folded ? 'folded' : ''}">
      <div class="player-name">${p.name}</div>
      <div class="player-chips">${p.chips} chips</div>
      <div class="player-cards">
        ${p.holeCards.map(c => renderCard(c)).join('')}
      </div>
      ${p.currentBet > 0 ? `<div class="player-bet">Bet: ${p.currentBet}</div>` : ''}
    </div>
  `).join('');
}

function updateCommunityCards(cards) {
  const container = document.getElementById('community');
  container.innerHTML = cards.map(c => renderCard(c)).join('');
}

function renderCard(cardStr) {
  if (!cardStr || cardStr === '??') {
    return '<div class="card hidden"></div>';
  }

  const rank = cardStr[0];
  const suit = cardStr[1];
  const suitClass = (suit === 'h' || suit === 'd') ? 'hearts' : 'spades';
  const symbol = SUIT_SYMBOLS[suit] || suit;

  return `<div class="card ${suitClass}">${rank}${symbol}</div>`;
}
