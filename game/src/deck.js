// Mycelium War — deck: shuffle, draw, fatigue. Pure helpers, no DOM here.

/** Fisher–Yates shuffle; returns a new array, never mutates the input. */
export function shuffleDeck(cards) {
  const deck = cards.slice();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Draw up to `n` cards from the front of `deck` into `hand` (hand cap respected). */
export function drawCards(deck, hand, n, maxHand) {
  const drawn = [];
  for (let k = 0; k < n; k++) {
    if (deck.length === 0) break;
    if (hand.length >= maxHand) break;
    const card = deck.shift();
    hand.push({ ...card, uid: `${card.id}-${Math.random().toString(36).slice(2, 8)}` });
    drawn.push(card);
  }
  return drawn;
}

/** A fresh shuffled deck of card-definition copies, ready to draw from. */
export function freshDeck(buildDeckFn) {
  return shuffleDeck(buildDeckFn());
}
