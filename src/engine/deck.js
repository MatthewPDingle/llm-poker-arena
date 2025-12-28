const SUITS = ['h', 'd', 'c', 's']; // hearts, diamonds, clubs, spades
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export function createCard(rank, suit) {
  return { rank, suit, toString: () => `${rank}${suit}` };
}

export function createDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push(createCard(rank, suit));
    }
  }
  return cards;
}

export function shuffle(deck) {
  const shuffled = [...deck];
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(deck, count) {
  return {
    dealt: deck.slice(0, count),
    remaining: deck.slice(count)
  };
}

export function cardToString(card) {
  return `${card.rank}${card.suit}`;
}

export function cardsToString(cards) {
  return cards.map(cardToString).join(' ');
}

export function parseCard(str) {
  const rank = str[0].toUpperCase();
  const suit = str[1].toLowerCase();
  if (!RANKS.includes(rank) || !SUITS.includes(suit)) {
    throw new Error(`Invalid card: ${str}`);
  }
  return createCard(rank, suit);
}

export function getRankValue(rank) {
  return RANKS.indexOf(rank);
}

export { SUITS, RANKS };
