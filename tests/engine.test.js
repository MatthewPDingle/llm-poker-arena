import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createDeck, shuffle, parseCard } from '../src/engine/deck.js';
import { evaluateHand, HAND_RANKS, compareHands } from '../src/engine/hand.js';
import { createGame, createPlayer, addPlayer, startHand, applyAction, ACTIONS, getValidActions, getGameState } from '../src/engine/game.js';

describe('Deck', () => {
  test('creates 52 cards', () => {
    const deck = createDeck();
    assert.strictEqual(deck.length, 52);
  });

  test('shuffle randomizes deck', () => {
    const deck1 = createDeck();
    const deck2 = shuffle(createDeck());
    // Very unlikely to be in same order
    const same = deck1.every((c, i) => c.rank === deck2[i].rank && c.suit === deck2[i].suit);
    assert.strictEqual(same, false);
  });

  test('parseCard works', () => {
    const card = parseCard('As');
    assert.strictEqual(card.rank, 'A');
    assert.strictEqual(card.suit, 's');
  });
});

describe('Hand Evaluation', () => {
  test('detects royal flush', () => {
    const hole = [parseCard('As'), parseCard('Ks')];
    const community = [parseCard('Qs'), parseCard('Js'), parseCard('Ts'), parseCard('2h'), parseCard('3d')];
    const result = evaluateHand(hole, community);
    assert.strictEqual(result.rank, HAND_RANKS.ROYAL_FLUSH);
  });

  test('detects straight flush', () => {
    const hole = [parseCard('9s'), parseCard('8s')];
    const community = [parseCard('7s'), parseCard('6s'), parseCard('5s'), parseCard('2h'), parseCard('3d')];
    const result = evaluateHand(hole, community);
    assert.strictEqual(result.rank, HAND_RANKS.STRAIGHT_FLUSH);
  });

  test('detects four of a kind', () => {
    const hole = [parseCard('Ah'), parseCard('Ad')];
    const community = [parseCard('As'), parseCard('Ac'), parseCard('Ks'), parseCard('2h'), parseCard('3d')];
    const result = evaluateHand(hole, community);
    assert.strictEqual(result.rank, HAND_RANKS.FOUR_OF_A_KIND);
  });

  test('detects full house', () => {
    const hole = [parseCard('Ah'), parseCard('Ad')];
    const community = [parseCard('As'), parseCard('Kc'), parseCard('Ks'), parseCard('2h'), parseCard('3d')];
    const result = evaluateHand(hole, community);
    assert.strictEqual(result.rank, HAND_RANKS.FULL_HOUSE);
  });

  test('detects flush', () => {
    const hole = [parseCard('Ah'), parseCard('9h')];
    const community = [parseCard('5h'), parseCard('3h'), parseCard('2h'), parseCard('Kd'), parseCard('Qc')];
    const result = evaluateHand(hole, community);
    assert.strictEqual(result.rank, HAND_RANKS.FLUSH);
  });

  test('detects straight', () => {
    const hole = [parseCard('9h'), parseCard('8d')];
    const community = [parseCard('7s'), parseCard('6c'), parseCard('5h'), parseCard('2d'), parseCard('Kc')];
    const result = evaluateHand(hole, community);
    assert.strictEqual(result.rank, HAND_RANKS.STRAIGHT);
  });

  test('detects wheel (A-2-3-4-5)', () => {
    const hole = [parseCard('Ah'), parseCard('2d')];
    const community = [parseCard('3s'), parseCard('4c'), parseCard('5h'), parseCard('Kd'), parseCard('Qc')];
    const result = evaluateHand(hole, community);
    assert.strictEqual(result.rank, HAND_RANKS.STRAIGHT);
  });

  test('detects two pair', () => {
    const hole = [parseCard('Ah'), parseCard('Ad')];
    const community = [parseCard('Ks'), parseCard('Kc'), parseCard('2h'), parseCard('5d'), parseCard('7c')];
    const result = evaluateHand(hole, community);
    assert.strictEqual(result.rank, HAND_RANKS.TWO_PAIR);
  });

  test('detects pair', () => {
    const hole = [parseCard('Ah'), parseCard('Ad')];
    const community = [parseCard('Ks'), parseCard('Qc'), parseCard('2h'), parseCard('5d'), parseCard('7c')];
    const result = evaluateHand(hole, community);
    assert.strictEqual(result.rank, HAND_RANKS.PAIR);
  });

  test('compares hands correctly', () => {
    const flush = { rank: HAND_RANKS.FLUSH, values: [12, 10, 8, 5, 3] };
    const straight = { rank: HAND_RANKS.STRAIGHT, values: [10] };
    assert.ok(compareHands(flush, straight) > 0);
  });
});

describe('Game', () => {
  test('creates game with defaults', () => {
    const game = createGame();
    assert.strictEqual(game.smallBlind, 10);
    assert.strictEqual(game.bigBlind, 20);
    assert.strictEqual(game.players.length, 0);
  });

  test('adds players', () => {
    const game = createGame();
    const player = createPlayer('p1', 'Alice', 1000);
    addPlayer(game, player);
    assert.strictEqual(game.players.length, 1);
  });

  test('starts hand and posts blinds', () => {
    const game = createGame({ smallBlind: 10, bigBlind: 20 });
    addPlayer(game, createPlayer('p1', 'Alice', 1000));
    addPlayer(game, createPlayer('p2', 'Bob', 1000));
    addPlayer(game, createPlayer('p3', 'Charlie', 1000));

    startHand(game);

    assert.strictEqual(game.stage, 'preflop');
    assert.strictEqual(game.pot, 30); // SB + BB
    assert.ok(game.players.every(p => p.holeCards.length === 2));
  });

  test('handles betting round', () => {
    const game = createGame({ smallBlind: 10, bigBlind: 20 });
    addPlayer(game, createPlayer('p1', 'Alice', 1000));
    addPlayer(game, createPlayer('p2', 'Bob', 1000));

    startHand(game);

    const currentPlayer = game.players[game.currentPlayerIndex];
    const validActions = getValidActions(game);

    assert.ok(validActions.actions.includes(ACTIONS.FOLD));
    assert.ok(validActions.actions.includes(ACTIONS.CALL));
  });

  test('getGameState hides other players cards', () => {
    const game = createGame();
    addPlayer(game, createPlayer('p1', 'Alice', 1000));
    addPlayer(game, createPlayer('p2', 'Bob', 1000));

    startHand(game);

    const stateForP1 = getGameState(game, 'p1');
    const p1Cards = stateForP1.players.find(p => p.id === 'p1').holeCards;
    const p2Cards = stateForP1.players.find(p => p.id === 'p2').holeCards;

    assert.ok(p1Cards[0] !== '??');
    assert.strictEqual(p2Cards[0], '??');
  });
});
