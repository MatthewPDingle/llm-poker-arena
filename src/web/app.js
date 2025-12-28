// LLM Poker Arena - Client

const SUITS = {
  h: { symbol: '\u2665', name: 'hearts', color: 'red' },
  d: { symbol: '\u2666', name: 'diamonds', color: 'red' },
  c: { symbol: '\u2663', name: 'clubs', color: 'black' },
  s: { symbol: '\u2660', name: 'spades', color: 'black' }
};

let ws = null;
let selectedModels = new Set();
let gameState = {
  players: [],
  communityCards: [],
  pot: 0,
  stage: 'WAITING',
  handNumber: 0,
  dealerIndex: 0,
  currentPlayerId: null
};

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
    case 'stageChange':
      handleStageChange(data);
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
      addLog(`Error: ${data.message}`, 'error');
      break;
  }
}

function handleHandStart(data) {
  gameState.handNumber = data.handNumber;
  gameState.stage = 'PREFLOP';
  gameState.pot = data.pot;
  gameState.players = data.players.map((p, i) => ({
    ...p,
    index: i,
    folded: false,
    allIn: false,
    currentBet: 0,
    lastAction: null
  }));
  gameState.communityCards = [];
  gameState.dealerIndex = 0; // Will be updated

  updateHeader();
  renderSeats();
  renderCommunityCards();
  updatePot();

  addLog(`═══ Hand #${data.handNumber} ═══`, 'hand');
  addLog(`${data.blinds.sb.name} posts SB $${data.blinds.sb.amount}`, 'blind');
  addLog(`${data.blinds.bb.name} posts BB $${data.blinds.bb.amount}`, 'blind');
}

function handleStageChange(data) {
  gameState.stage = data.stage.toUpperCase();
  gameState.communityCards = data.communityCards;
  gameState.pot = data.pot;

  // Clear player bets for new round
  gameState.players.forEach(p => {
    p.currentBet = 0;
    p.lastAction = null;
  });

  updateHeader();
  renderCommunityCards();
  updatePot();
  renderSeats();

  const cardsStr = formatCardsText(data.communityCards);
  addLog(`── ${data.stage.toUpperCase()}: ${cardsStr} ──`, 'stage');
}

function handleAction(data) {
  // Update player state
  const player = gameState.players.find(p => p.name === data.player);
  if (player) {
    player.lastAction = data.action;
    if (data.action === 'FOLD') {
      player.folded = true;
    } else if (data.action === 'ALL_IN') {
      player.allIn = true;
    }
    if (data.amount > 0) {
      player.currentBet = data.amount;
      player.chips -= data.amount;
    }
  }

  gameState.pot = data.pot;
  if (data.communityCards) {
    gameState.communityCards = data.communityCards;
  }

  updatePot();
  renderCommunityCards();
  renderSeats();

  const amountStr = data.amount > 0 ? ` $${data.amount}` : '';
  addLog(`${data.player}: ${data.action}${amountStr}`, data.action.toLowerCase().replace('_', '-'));
}

function handleHandEnd(data) {
  if (data.result) {
    gameState.stage = 'SHOWDOWN';
    updateHeader();

    // Show final community cards
    if (data.result.communityCards) {
      gameState.communityCards = data.result.communityCards;
      renderCommunityCards();
    }

    // Update player states from result
    if (data.result.playerStates) {
      data.result.playerStates.forEach(ps => {
        const player = gameState.players.find(p => p.name === ps.name);
        if (player) {
          player.chips = ps.chips;
          player.holeCards = ps.holeCards;
          player.folded = ps.folded;
        }
      });
      renderSeats();
    }

    // Show winner
    const winners = data.result.winners || [];
    const handName = data.result.evaluated?.[0]?.hand?.name || '';
    const handInfo = handName ? ` with ${handName}` : '';
    addLog(`Winner: ${winners.join(', ')}${handInfo} (pot: $${data.result.pot})`, 'winner');
  }
}

function handleMatchEnd(data) {
  gameState.stage = 'COMPLETE';
  updateHeader();

  document.getElementById('start-btn').disabled = false;

  const modal = document.getElementById('results-modal');
  const content = document.getElementById('results-content');

  const standings = Object.entries(data.finalChips)
    .sort((a, b) => b[1] - a[1])
    .map(([name, chips], i) => `<div>${i + 1}. ${name}: $${chips}</div>`)
    .join('');

  content.innerHTML = `
    <div class="winner-announcement">${data.winner} Wins!</div>
    <div class="final-standings">${standings}</div>
    <div>Hands played: ${data.hands.length}</div>
  `;

  modal.style.display = 'flex';
}

function closeResults() {
  document.getElementById('results-modal').style.display = 'none';
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
  document.getElementById('results-modal').style.display = 'none';
  document.getElementById('log').innerHTML = '';

  gameState.stage = 'STARTING';
  updateHeader();

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
      addLog(`Error: ${result.error}`, 'error');
      document.getElementById('start-btn').disabled = false;
    }
  } catch (error) {
    addLog(`Error: ${error.message}`, 'error');
    document.getElementById('start-btn').disabled = false;
  }
}

// UI Rendering Functions

function updateHeader() {
  document.getElementById('hand-number').textContent =
    gameState.handNumber > 0 ? `Hand #${gameState.handNumber}` : '-';
  document.getElementById('stage-indicator').textContent = gameState.stage;
}

function updatePot() {
  document.getElementById('pot').textContent = `Pot: $${gameState.pot}`;
}

function renderCommunityCards() {
  const container = document.getElementById('community-cards');
  const cards = gameState.communityCards;

  let html = '';
  for (let i = 0; i < 5; i++) {
    if (i < cards.length) {
      html += renderCard(cards[i]);
    } else {
      html += '<div class="card card-placeholder"></div>';
    }
  }
  container.innerHTML = html;
}

function renderSeats() {
  const container = document.getElementById('seats');

  container.innerHTML = gameState.players.map((player, index) => {
    const isActive = gameState.currentPlayerId === player.id;
    const classes = [
      'seat',
      player.folded ? 'folded' : '',
      player.allIn ? 'all-in' : '',
      isActive ? 'active' : ''
    ].filter(Boolean).join(' ');

    const positionLabel = getPositionLabel(index, gameState.players.length, gameState.dealerIndex);

    return `
      <div class="${classes}" data-position="${index}">
        ${positionLabel ? `<div class="position-label ${positionLabel.toLowerCase()}">${positionLabel}</div>` : ''}
        <div class="player-box">
          <div class="player-name">${player.name}</div>
          <div class="player-chips">$${player.chips}</div>
          <div class="player-cards">
            ${player.holeCards ? player.holeCards.map(c => renderCard(c, true)).join('') : ''}
          </div>
        </div>
        ${player.currentBet > 0 ? `<div class="player-bet">$${player.currentBet}</div>` : ''}
        ${player.lastAction && !player.folded ? `<div class="last-action ${player.lastAction.toLowerCase().replace('_', '-')}">${player.lastAction}</div>` : ''}
        ${isActive ? '<div class="thinking"><span></span><span></span><span></span></div>' : ''}
      </div>
    `;
  }).join('');
}

function getPositionLabel(playerIndex, numPlayers, dealerIndex) {
  const relPos = (playerIndex - dealerIndex + numPlayers) % numPlayers;

  if (relPos === 0) return 'BTN';
  if (relPos === 1) return 'SB';
  if (relPos === 2) return 'BB';
  if (numPlayers > 3 && relPos === numPlayers - 1) return 'CO';
  return null;
}

function renderCard(cardStr, small = false) {
  if (!cardStr || cardStr === '??') {
    return `<div class="card card-back${small ? ' small' : ''}"></div>`;
  }

  const rank = cardStr[0];
  const suitKey = cardStr[1];
  const suit = SUITS[suitKey] || { symbol: suitKey, color: 'black' };

  return `
    <div class="card ${suit.color}${small ? ' small' : ''}">
      <span class="rank">${rank}</span>
      <span class="suit">${suit.symbol}</span>
    </div>
  `;
}

function formatCardsText(cards) {
  return cards.map(c => {
    const rank = c[0];
    const suitKey = c[1];
    const suit = SUITS[suitKey] || { symbol: suitKey };
    return `${rank}${suit.symbol}`;
  }).join(' ');
}

function addLog(text, className = '') {
  const log = document.getElementById('log');
  const entry = document.createElement('div');
  entry.className = `log-entry ${className}`;
  entry.textContent = text;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

// Global for onclick
window.closeResults = closeResults;
window.toggleModel = toggleModel;
