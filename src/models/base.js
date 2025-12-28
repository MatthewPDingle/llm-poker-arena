// Base adapter interface for LLM poker players

export class BaseAdapter {
  constructor(config = {}) {
    this.name = config.name || 'Unknown';
    this.model = config.model || 'unknown';
    this.maxRetries = config.maxRetries || 3;
  }

  // Format game state into a prompt for the LLM
  formatGameState(gameState, playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    const position = this.getPosition(gameState, playerId);
    const opponents = gameState.players
      .filter(p => p.id !== playerId && !p.folded && p.isActive)
      .map(p => `${p.name}: ${p.chips} chips, bet ${p.currentBet}${p.allIn ? ' (ALL-IN)' : ''}`);

    return `You are playing No-Limit Texas Hold'em poker.

=== YOUR CARDS ===
${player.holeCards.join(' ')}

=== COMMUNITY CARDS ===
${gameState.communityCards.length > 0 ? gameState.communityCards.join(' ') : '(none yet)'}

=== GAME STATE ===
Stage: ${gameState.stage.toUpperCase()}
Pot: ${gameState.pot}
Current bet to call: ${gameState.currentBet}
Your chips: ${player.chips}
Your current bet: ${player.currentBet}
Your position: ${position}

=== OPPONENTS ===
${opponents.join('\n')}

=== ACTION REQUIRED ===
Choose your action. You MUST respond with EXACTLY one of these formats:
- FOLD
- CHECK (only if no bet to call)
- CALL
- RAISE <amount> (e.g., RAISE 100)
- ALL_IN

Respond with ONLY the action, nothing else.`;
  }

  getPosition(gameState, playerId) {
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    const dealerIndex = gameState.dealerIndex;
    const numPlayers = gameState.players.filter(p => p.isActive).length;

    if (playerIndex === dealerIndex) return 'Dealer (Button)';

    const posFromDealer = (playerIndex - dealerIndex + gameState.players.length) % gameState.players.length;

    if (posFromDealer === 1) return 'Small Blind';
    if (posFromDealer === 2) return 'Big Blind';
    if (posFromDealer === numPlayers - 1) return 'Cutoff';
    return `Middle Position`;
  }

  // Parse LLM response into a valid action
  parseAction(response, validActions) {
    const text = response.trim().toUpperCase();

    // Try to parse RAISE amount
    const raiseMatch = text.match(/RAISE\s+(\d+)/);
    if (raiseMatch && validActions.actions.includes('RAISE')) {
      return { action: 'RAISE', amount: parseInt(raiseMatch[1], 10) };
    }

    // Check for exact action matches
    for (const action of ['FOLD', 'CHECK', 'CALL', 'ALL_IN']) {
      if (text.includes(action) && validActions.actions.includes(action)) {
        return { action, amount: 0 };
      }
    }

    // Default to safest action if parse fails
    if (validActions.actions.includes('CHECK')) {
      return { action: 'CHECK', amount: 0 };
    }
    if (validActions.actions.includes('FOLD')) {
      return { action: 'FOLD', amount: 0 };
    }

    throw new Error(`Could not parse action from: ${response}`);
  }

  // Override this in subclasses
  async callLLM(prompt) {
    throw new Error('callLLM must be implemented by subclass');
  }

  // Main method to get an action from the LLM
  async getAction(gameState, playerId, validActions) {
    const prompt = this.formatGameState(gameState, playerId);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.callLLM(prompt);
        const action = this.parseAction(response, validActions);

        // Validate the action
        if (!validActions.actions.includes(action.action)) {
          throw new Error(`Invalid action: ${action.action}`);
        }

        // Validate raise amount
        if (action.action === 'RAISE') {
          if (action.amount < validActions.minRaise) {
            action.amount = validActions.minRaise;
          }
          if (action.amount > validActions.playerChips - validActions.toCall) {
            action.action = 'ALL_IN';
            action.amount = 0;
          }
        }

        return action;
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);
        if (attempt === this.maxRetries) {
          // Fall back to fold
          console.error(`All attempts failed, folding`);
          return { action: 'FOLD', amount: 0 };
        }
      }
    }
  }
}
