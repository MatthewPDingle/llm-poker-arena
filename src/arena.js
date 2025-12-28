// Arena - runs poker matches between LLM models

import { createGame, createPlayer, addPlayer, startHand, applyAction, getValidActions, getGameState, STAGES } from './engine/game.js';

export class Arena {
  constructor(config = {}) {
    this.config = {
      startingChips: config.startingChips || 1000,
      smallBlind: config.smallBlind || 10,
      bigBlind: config.bigBlind || 20,
      handsPerMatch: config.handsPerMatch || 100,
      delayBetweenActions: config.delayBetweenActions || 0,
      ...config
    };

    this.eventHandlers = {
      handStart: [],
      stageChange: [],
      action: [],
      handEnd: [],
      matchEnd: []
    };
  }

  on(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler);
    }
  }

  emit(event, data) {
    for (const handler of this.eventHandlers[event] || []) {
      handler(data);
    }
  }

  async runMatch(adapters) {
    const game = createGame({
      smallBlind: this.config.smallBlind,
      bigBlind: this.config.bigBlind
    });

    // Create players with adapters
    for (let i = 0; i < adapters.length; i++) {
      const adapter = adapters[i];
      const player = createPlayer(
        `player_${i}`,
        adapter.name,
        this.config.startingChips,
        adapter
      );
      addPlayer(game, player);
    }

    const results = {
      hands: [],
      finalChips: {},
      winner: null
    };

    // Play hands
    for (let hand = 0; hand < this.config.handsPerMatch; hand++) {
      // Check if we have enough players with chips
      const playersWithChips = game.players.filter(p => p.chips > 0);
      if (playersWithChips.length < 2) {
        break;
      }

      const handResult = await this.playHand(game);
      results.hands.push(handResult);

      this.emit('handEnd', { handNumber: hand + 1, result: handResult, game: getGameState(game) });
    }

    // Record final results
    for (const player of game.players) {
      results.finalChips[player.name] = player.chips;
    }

    // Determine winner
    const sorted = [...game.players].sort((a, b) => b.chips - a.chips);
    results.winner = sorted[0].name;

    this.emit('matchEnd', results);

    return results;
  }

  async playHand(game) {
    const { game: updatedGame, blindInfo } = startHand(game);

    this.emit('handStart', {
      handNumber: game.handNumber,
      blinds: {
        sb: { name: blindInfo.sbPlayer.name, amount: blindInfo.sbAmount },
        bb: { name: blindInfo.bbPlayer.name, amount: blindInfo.bbAmount }
      },
      players: game.players.map(p => ({
        name: p.name,
        chips: p.chips,
        holeCards: p.holeCards.map(c => c.toString())
      })),
      pot: game.pot
    });

    // Track stage for change detection
    let lastStage = game.stage;

    // Play until hand is complete
    while (game.stage !== STAGES.COMPLETE && game.stage !== STAGES.SHOWDOWN) {
      const currentPlayer = game.players[game.currentPlayerIndex];

      if (currentPlayer.folded || currentPlayer.allIn || !currentPlayer.isActive) {
        continue;
      }

      // Check for stage change (new community cards)
      if (game.stage !== lastStage) {
        this.emit('stageChange', {
          stage: game.stage,
          communityCards: game.communityCards.map(c => c.toString()),
          pot: game.pot
        });
        lastStage = game.stage;
      }

      const gameState = getGameState(game, currentPlayer.id);
      const validActions = getValidActions(game);

      let action;
      if (currentPlayer.adapter) {
        // LLM player
        action = await currentPlayer.adapter.getAction(gameState, currentPlayer.id, validActions);
      } else {
        // Default to check/fold for non-LLM players
        action = validActions.actions.includes('CHECK')
          ? { action: 'CHECK', amount: 0 }
          : { action: 'FOLD', amount: 0 };
      }

      this.emit('action', {
        player: currentPlayer.name,
        action: action.action,
        amount: action.amount,
        stage: game.stage,
        pot: game.pot + (action.amount || 0),
        communityCards: game.communityCards.map(c => c.toString())
      });

      applyAction(game, currentPlayer.id, action.action, action.amount);

      if (this.config.delayBetweenActions > 0) {
        await new Promise(r => setTimeout(r, this.config.delayBetweenActions));
      }
    }

    // If we're at showdown stage, the game engine already resolved it
    // Return hand history
    return game.handHistory[game.handHistory.length - 1];
  }
}

// Quick match runner
export async function runQuickMatch(adapters, config = {}) {
  const arena = new Arena(config);

  arena.on('handStart', ({ handNumber, players }) => {
    console.log(`\n=== Hand #${handNumber} ===`);
    console.log('Stacks:', players.map(p => `${p.name}: ${p.chips}`).join(', '));
  });

  arena.on('action', ({ player, action, amount, stage }) => {
    const amountStr = amount > 0 ? ` ${amount}` : '';
    console.log(`[${stage}] ${player}: ${action}${amountStr}`);
  });

  arena.on('handEnd', ({ handNumber, result }) => {
    if (result) {
      const winners = result.winners || [];
      console.log(`Hand #${handNumber} won by: ${winners.join(', ')} (pot: ${result.pot})`);
    }
  });

  arena.on('matchEnd', (results) => {
    console.log('\n=== MATCH COMPLETE ===');
    console.log('Final chips:', results.finalChips);
    console.log('Winner:', results.winner);
  });

  return arena.runMatch(adapters);
}
