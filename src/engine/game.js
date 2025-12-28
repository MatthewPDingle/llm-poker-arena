import { createDeck, shuffle, dealCards } from './deck.js';
import { determineWinners } from './hand.js';

export const STAGES = {
  WAITING: 'waiting',
  PREFLOP: 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown',
  COMPLETE: 'complete'
};

export const ACTIONS = {
  FOLD: 'FOLD',
  CHECK: 'CHECK',
  CALL: 'CALL',
  RAISE: 'RAISE',
  ALL_IN: 'ALL_IN'
};

export function createPlayer(id, name, chips, adapter = null) {
  return {
    id,
    name,
    chips,
    adapter,           // LLM adapter for AI players
    holeCards: [],
    currentBet: 0,
    totalBetThisHand: 0,
    folded: false,
    allIn: false,
    isActive: true
  };
}

export function createGame(config = {}) {
  const {
    smallBlind = 10,
    bigBlind = 20,
    ante = 0,
    maxPlayers = 9
  } = config;

  return {
    id: crypto.randomUUID(),
    players: [],
    deck: [],
    communityCards: [],
    pot: 0,
    sidePots: [],
    stage: STAGES.WAITING,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    smallBlind,
    bigBlind,
    ante,
    maxPlayers,
    currentBet: 0,
    minRaise: bigBlind,
    lastRaiserIndex: -1,
    handNumber: 0,
    actionHistory: [],
    handHistory: []
  };
}

export function addPlayer(game, player) {
  if (game.players.length >= game.maxPlayers) {
    throw new Error('Game is full');
  }
  if (game.stage !== STAGES.WAITING && game.stage !== STAGES.COMPLETE) {
    throw new Error('Cannot add player during a hand');
  }
  game.players.push(player);
  return game;
}

export function removePlayer(game, playerId) {
  game.players = game.players.filter(p => p.id !== playerId);
  return game;
}

function resetPlayersForHand(game) {
  for (const player of game.players) {
    player.holeCards = [];
    player.currentBet = 0;
    player.totalBetThisHand = 0;
    player.folded = false;
    player.allIn = false;
    player.isActive = player.chips > 0;
  }
}

function postBlindsAndAntes(game) {
  const activePlayers = game.players.filter(p => p.isActive);
  if (activePlayers.length < 2) {
    throw new Error('Need at least 2 active players');
  }

  // Post antes
  if (game.ante > 0) {
    for (const player of activePlayers) {
      const anteAmount = Math.min(game.ante, player.chips);
      player.chips -= anteAmount;
      player.currentBet += anteAmount;
      player.totalBetThisHand += anteAmount;
      game.pot += anteAmount;
    }
  }

  // Small blind
  const sbIndex = (game.dealerIndex + 1) % game.players.length;
  let sbPlayer = game.players[sbIndex];
  while (!sbPlayer.isActive) {
    sbPlayer = game.players[(game.players.indexOf(sbPlayer) + 1) % game.players.length];
  }
  const sbAmount = Math.min(game.smallBlind, sbPlayer.chips);
  sbPlayer.chips -= sbAmount;
  sbPlayer.currentBet += sbAmount;
  sbPlayer.totalBetThisHand += sbAmount;
  game.pot += sbAmount;
  if (sbPlayer.chips === 0) sbPlayer.allIn = true;

  // Big blind
  let bbPlayer = game.players[(game.players.indexOf(sbPlayer) + 1) % game.players.length];
  while (!bbPlayer.isActive || bbPlayer === sbPlayer) {
    bbPlayer = game.players[(game.players.indexOf(bbPlayer) + 1) % game.players.length];
  }
  const bbAmount = Math.min(game.bigBlind, bbPlayer.chips);
  bbPlayer.chips -= bbAmount;
  bbPlayer.currentBet += bbAmount;
  bbPlayer.totalBetThisHand += bbAmount;
  game.pot += bbAmount;
  game.currentBet = bbAmount;
  if (bbPlayer.chips === 0) bbPlayer.allIn = true;

  // First to act is after BB
  let firstToAct = game.players[(game.players.indexOf(bbPlayer) + 1) % game.players.length];
  while (!firstToAct.isActive || firstToAct.folded || firstToAct.allIn) {
    firstToAct = game.players[(game.players.indexOf(firstToAct) + 1) % game.players.length];
    if (firstToAct === bbPlayer) break; // Only one player can act
  }
  game.currentPlayerIndex = game.players.indexOf(firstToAct);
  game.lastRaiserIndex = game.players.indexOf(bbPlayer);

  return { sbPlayer, bbPlayer, sbAmount, bbAmount };
}

export function startHand(game) {
  if (game.players.filter(p => p.chips > 0).length < 2) {
    throw new Error('Need at least 2 players with chips');
  }

  game.handNumber++;
  game.deck = shuffle(createDeck());
  game.communityCards = [];
  game.pot = 0;
  game.sidePots = [];
  game.currentBet = 0;
  game.minRaise = game.bigBlind;
  game.actionHistory = [];

  resetPlayersForHand(game);

  // Move dealer button
  if (game.handNumber > 1) {
    do {
      game.dealerIndex = (game.dealerIndex + 1) % game.players.length;
    } while (!game.players[game.dealerIndex].isActive);
  }

  // Post blinds
  const blindInfo = postBlindsAndAntes(game);

  // Deal hole cards
  const activePlayers = game.players.filter(p => p.isActive);
  for (const player of activePlayers) {
    const { dealt, remaining } = dealCards(game.deck, 2);
    player.holeCards = dealt;
    game.deck = remaining;
  }

  game.stage = STAGES.PREFLOP;

  return { game, blindInfo };
}

export function getActivePlayersInHand(game) {
  return game.players.filter(p => p.isActive && !p.folded);
}

export function getPlayersWhoCanAct(game) {
  return game.players.filter(p => p.isActive && !p.folded && !p.allIn);
}

export function getCurrentPlayer(game) {
  return game.players[game.currentPlayerIndex];
}

export function getValidActions(game) {
  const player = getCurrentPlayer(game);
  const toCall = game.currentBet - player.currentBet;
  const actions = [ACTIONS.FOLD];

  if (toCall === 0) {
    actions.push(ACTIONS.CHECK);
  } else {
    actions.push(ACTIONS.CALL);
  }

  // Can raise if not all-in and has enough chips
  const minRaiseTotal = game.currentBet + game.minRaise;
  if (player.chips > toCall) {
    actions.push(ACTIONS.RAISE);
  }

  if (player.chips > 0) {
    actions.push(ACTIONS.ALL_IN);
  }

  return {
    actions,
    toCall: Math.min(toCall, player.chips),
    minRaise: game.minRaise,
    minRaiseTotal,
    pot: game.pot,
    playerChips: player.chips
  };
}

export function applyAction(game, playerId, action, amount = 0) {
  const player = game.players.find(p => p.id === playerId);
  if (!player) throw new Error('Player not found');
  if (game.players[game.currentPlayerIndex].id !== playerId) {
    throw new Error('Not this player\'s turn');
  }

  const toCall = game.currentBet - player.currentBet;
  let actionRecord = { playerId, action, amount: 0, stage: game.stage };

  switch (action) {
    case ACTIONS.FOLD:
      player.folded = true;
      break;

    case ACTIONS.CHECK:
      if (toCall > 0) throw new Error('Cannot check, must call or fold');
      break;

    case ACTIONS.CALL:
      const callAmount = Math.min(toCall, player.chips);
      player.chips -= callAmount;
      player.currentBet += callAmount;
      player.totalBetThisHand += callAmount;
      game.pot += callAmount;
      actionRecord.amount = callAmount;
      if (player.chips === 0) player.allIn = true;
      break;

    case ACTIONS.RAISE:
      if (amount < game.minRaise && amount < player.chips) {
        throw new Error(`Minimum raise is ${game.minRaise}`);
      }
      const raiseTotal = toCall + amount;
      if (raiseTotal > player.chips) {
        throw new Error('Not enough chips');
      }
      player.chips -= raiseTotal;
      player.currentBet += raiseTotal;
      player.totalBetThisHand += raiseTotal;
      game.pot += raiseTotal;
      game.minRaise = amount;
      game.currentBet = player.currentBet;
      game.lastRaiserIndex = game.currentPlayerIndex;
      actionRecord.amount = raiseTotal;
      break;

    case ACTIONS.ALL_IN:
      const allInAmount = player.chips;
      player.chips = 0;
      player.currentBet += allInAmount;
      player.totalBetThisHand += allInAmount;
      game.pot += allInAmount;
      player.allIn = true;
      if (player.currentBet > game.currentBet) {
        const raiseAmount = player.currentBet - game.currentBet;
        if (raiseAmount >= game.minRaise) {
          game.minRaise = raiseAmount;
        }
        game.currentBet = player.currentBet;
        game.lastRaiserIndex = game.currentPlayerIndex;
      }
      actionRecord.amount = allInAmount;
      break;

    default:
      throw new Error(`Invalid action: ${action}`);
  }

  game.actionHistory.push(actionRecord);

  // Move to next player or next stage
  advanceGame(game);

  return game;
}

function advanceGame(game) {
  const playersInHand = getActivePlayersInHand(game);
  const playersWhoCanAct = getPlayersWhoCanAct(game);

  // Check if hand is over (only one player left)
  if (playersInHand.length === 1) {
    endHand(game, [playersInHand[0]]);
    return;
  }

  // Check if betting round is complete
  const allMatched = playersWhoCanAct.every(p => p.currentBet === game.currentBet);
  const actionComplete = allMatched && hasEveryoneActed(game);

  if (actionComplete || playersWhoCanAct.length === 0) {
    advanceStage(game);
  } else {
    // Move to next player who can act
    do {
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    } while (
      game.players[game.currentPlayerIndex].folded ||
      game.players[game.currentPlayerIndex].allIn ||
      !game.players[game.currentPlayerIndex].isActive
    );
  }
}

function hasEveryoneActed(game) {
  // Everyone has acted if we've gone around to the last raiser
  // or if there was no raise and we're back to the first actor
  const playersWhoCanAct = getPlayersWhoCanAct(game);
  if (playersWhoCanAct.length === 0) return true;

  // Count actions this stage
  const actionsThisStage = game.actionHistory.filter(a => a.stage === game.stage);

  // If last raiser exists, check if we've gone around
  if (game.lastRaiserIndex >= 0) {
    const actionsAfterRaise = actionsThisStage.slice(
      actionsThisStage.findIndex(a =>
        a.playerId === game.players[game.lastRaiserIndex].id &&
        (a.action === ACTIONS.RAISE || a.action === ACTIONS.ALL_IN)
      ) + 1
    );
    return actionsAfterRaise.length >= playersWhoCanAct.length - 1;
  }

  return actionsThisStage.length >= playersWhoCanAct.length;
}

function advanceStage(game) {
  // Reset current bets for new betting round
  for (const player of game.players) {
    player.currentBet = 0;
  }
  game.currentBet = 0;
  game.lastRaiserIndex = -1;

  switch (game.stage) {
    case STAGES.PREFLOP:
      // Deal flop
      game.deck = game.deck.slice(1); // Burn
      const { dealt: flop, remaining: afterFlop } = dealCards(game.deck, 3);
      game.communityCards = flop;
      game.deck = afterFlop;
      game.stage = STAGES.FLOP;
      break;

    case STAGES.FLOP:
      // Deal turn
      game.deck = game.deck.slice(1); // Burn
      const { dealt: turn, remaining: afterTurn } = dealCards(game.deck, 1);
      game.communityCards.push(...turn);
      game.deck = afterTurn;
      game.stage = STAGES.TURN;
      break;

    case STAGES.TURN:
      // Deal river
      game.deck = game.deck.slice(1); // Burn
      const { dealt: river, remaining: afterRiver } = dealCards(game.deck, 1);
      game.communityCards.push(...river);
      game.deck = afterRiver;
      game.stage = STAGES.RIVER;
      break;

    case STAGES.RIVER:
      // Go to showdown
      game.stage = STAGES.SHOWDOWN;
      resolveShowdown(game);
      return;
  }

  // Set first actor (first active player after dealer)
  const playersWhoCanAct = getPlayersWhoCanAct(game);
  if (playersWhoCanAct.length === 0) {
    // All players are all-in, deal remaining cards
    advanceStage(game);
    return;
  }

  let firstToAct = game.players[(game.dealerIndex + 1) % game.players.length];
  while (firstToAct.folded || firstToAct.allIn || !firstToAct.isActive) {
    firstToAct = game.players[(game.players.indexOf(firstToAct) + 1) % game.players.length];
  }
  game.currentPlayerIndex = game.players.indexOf(firstToAct);
}

function resolveShowdown(game) {
  const playersInHand = getActivePlayersInHand(game);

  const { winners, evaluated } = determineWinners(
    playersInHand.map(p => ({
      id: p.id,
      holeCards: p.holeCards,
      communityCards: game.communityCards
    }))
  );

  endHand(game, winners.map(w => game.players.find(p => p.id === w.id)), evaluated);
}

function endHand(game, winners, evaluated = null) {
  // Split pot among winners
  const winAmount = Math.floor(game.pot / winners.length);
  const remainder = game.pot % winners.length;

  for (let i = 0; i < winners.length; i++) {
    winners[i].chips += winAmount + (i === 0 ? remainder : 0);
  }

  // Record hand history (serialize cards to strings)
  game.handHistory.push({
    handNumber: game.handNumber,
    winners: winners.map(w => w.name),
    pot: game.pot,
    communityCards: game.communityCards.map(c => c.toString()),
    playerStates: game.players.map(p => ({
      id: p.id,
      name: p.name,
      holeCards: p.holeCards.map(c => c.toString()),
      chips: p.chips,
      folded: p.folded,
      totalBet: p.totalBetThisHand
    })),
    evaluated: evaluated ? evaluated.map(e => ({
      id: e.id,
      hand: { rank: e.hand.rank, name: e.hand.name, cards: e.hand.cards.map(c => c.toString()) }
    })) : null,
    actions: [...game.actionHistory]
  });

  game.pot = 0;
  game.stage = STAGES.COMPLETE;
}

export function getGameState(game, forPlayerId = null) {
  // Returns game state, optionally hiding other players' hole cards
  return {
    id: game.id,
    stage: game.stage,
    pot: game.pot,
    communityCards: game.communityCards.map(c => c.toString()),
    currentBet: game.currentBet,
    currentPlayerId: game.stage !== STAGES.COMPLETE && game.stage !== STAGES.WAITING
      ? game.players[game.currentPlayerIndex]?.id
      : null,
    dealerIndex: game.dealerIndex,
    players: game.players.map(p => ({
      id: p.id,
      name: p.name,
      chips: p.chips,
      currentBet: p.currentBet,
      folded: p.folded,
      allIn: p.allIn,
      isActive: p.isActive,
      holeCards: forPlayerId === p.id || game.stage === STAGES.SHOWDOWN
        ? p.holeCards.map(c => c.toString())
        : p.holeCards.length > 0 ? ['??', '??'] : []
    })),
    handNumber: game.handNumber
  };
}
