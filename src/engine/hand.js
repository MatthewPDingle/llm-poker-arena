import { getRankValue, RANKS } from './deck.js';

// Hand rankings (higher = better)
export const HAND_RANKS = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
  ROYAL_FLUSH: 9
};

export const HAND_NAMES = {
  0: 'High Card',
  1: 'Pair',
  2: 'Two Pair',
  3: 'Three of a Kind',
  4: 'Straight',
  5: 'Flush',
  6: 'Full House',
  7: 'Four of a Kind',
  8: 'Straight Flush',
  9: 'Royal Flush'
};

// Get all 5-card combinations from 7 cards
function getCombinations(cards, k = 5) {
  if (k > cards.length) return [];
  if (k === cards.length) return [cards];
  if (k === 1) return cards.map(c => [c]);

  const combos = [];
  for (let i = 0; i <= cards.length - k; i++) {
    const head = cards[i];
    const tailCombos = getCombinations(cards.slice(i + 1), k - 1);
    for (const tail of tailCombos) {
      combos.push([head, ...tail]);
    }
  }
  return combos;
}

// Count occurrences of each rank
function getRankCounts(cards) {
  const counts = {};
  for (const card of cards) {
    counts[card.rank] = (counts[card.rank] || 0) + 1;
  }
  return counts;
}

// Count occurrences of each suit
function getSuitCounts(cards) {
  const counts = {};
  for (const card of cards) {
    counts[card.suit] = (counts[card.suit] || 0) + 1;
  }
  return counts;
}

// Check if cards form a straight, returns high card rank value or -1
function getStraightHighCard(cards) {
  const values = [...new Set(cards.map(c => getRankValue(c.rank)))].sort((a, b) => b - a);

  // Check for A-2-3-4-5 (wheel)
  if (values.includes(12) && values.includes(0) && values.includes(1) &&
      values.includes(2) && values.includes(3)) {
    return 3; // 5-high straight
  }

  // Check for regular straight
  for (let i = 0; i <= values.length - 5; i++) {
    if (values[i] - values[i + 4] === 4) {
      return values[i];
    }
  }
  return -1;
}

// Evaluate a 5-card hand
function evaluate5Cards(cards) {
  const rankCounts = getRankCounts(cards);
  const suitCounts = getSuitCounts(cards);
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const isFlush = Object.values(suitCounts).some(c => c === 5);
  const straightHigh = getStraightHighCard(cards);
  const isStraight = straightHigh >= 0;

  // Sort ranks by count then by value
  const sortedRanks = Object.entries(rankCounts)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return getRankValue(b[0]) - getRankValue(a[0]);
    })
    .map(([rank]) => getRankValue(rank));

  // Straight flush / Royal flush
  if (isFlush && isStraight) {
    if (straightHigh === 12) {
      return { rank: HAND_RANKS.ROYAL_FLUSH, values: [straightHigh] };
    }
    return { rank: HAND_RANKS.STRAIGHT_FLUSH, values: [straightHigh] };
  }

  // Four of a kind
  if (counts[0] === 4) {
    return { rank: HAND_RANKS.FOUR_OF_A_KIND, values: sortedRanks };
  }

  // Full house
  if (counts[0] === 3 && counts[1] === 2) {
    return { rank: HAND_RANKS.FULL_HOUSE, values: sortedRanks };
  }

  // Flush
  if (isFlush) {
    const flushValues = cards
      .map(c => getRankValue(c.rank))
      .sort((a, b) => b - a);
    return { rank: HAND_RANKS.FLUSH, values: flushValues };
  }

  // Straight
  if (isStraight) {
    return { rank: HAND_RANKS.STRAIGHT, values: [straightHigh] };
  }

  // Three of a kind
  if (counts[0] === 3) {
    return { rank: HAND_RANKS.THREE_OF_A_KIND, values: sortedRanks };
  }

  // Two pair
  if (counts[0] === 2 && counts[1] === 2) {
    return { rank: HAND_RANKS.TWO_PAIR, values: sortedRanks };
  }

  // Pair
  if (counts[0] === 2) {
    return { rank: HAND_RANKS.PAIR, values: sortedRanks };
  }

  // High card
  return { rank: HAND_RANKS.HIGH_CARD, values: sortedRanks };
}

// Compare two hands, returns positive if a wins, negative if b wins, 0 if tie
export function compareHands(a, b) {
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }
  // Compare kickers
  for (let i = 0; i < a.values.length; i++) {
    if (a.values[i] !== b.values[i]) {
      return a.values[i] - b.values[i];
    }
  }
  return 0;
}

// Evaluate best 5-card hand from 7 cards (2 hole + 5 community)
export function evaluateHand(holeCards, communityCards) {
  const allCards = [...holeCards, ...communityCards];

  if (allCards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate');
  }

  const combinations = getCombinations(allCards, 5);
  let best = null;
  let bestCards = null;

  for (const combo of combinations) {
    const result = evaluate5Cards(combo);
    if (!best || compareHands(result, best) > 0) {
      best = result;
      bestCards = combo;
    }
  }

  return {
    ...best,
    name: HAND_NAMES[best.rank],
    cards: bestCards
  };
}

// Determine winners from multiple players
export function determineWinners(players) {
  // players: [{ id, holeCards, communityCards }]
  const evaluated = players.map(p => ({
    ...p,
    hand: evaluateHand(p.holeCards, p.communityCards)
  }));

  // Sort by hand strength (descending)
  evaluated.sort((a, b) => compareHands(b.hand, a.hand));

  // Find all players with the best hand (ties)
  const winners = [evaluated[0]];
  for (let i = 1; i < evaluated.length; i++) {
    if (compareHands(evaluated[i].hand, evaluated[0].hand) === 0) {
      winners.push(evaluated[i]);
    } else {
      break;
    }
  }

  return { winners, evaluated };
}
