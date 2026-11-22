// Mycelium War — config: suits, card catalogue and tuning constants.
// Suits are told apart by colour AND shape glyph AND name, never text alone:
//   Spore ● green · Hypha ◆ violet · Bloom ▲ rose · Toxin ✚ amber.

export const SUITS = {
  spore: { key: 'spore', name: 'SPORE', glyph: '●', color: '#2c7a2c', blurb: 'Chains with neighbours' },
  hypha: { key: 'hypha', name: 'HYPHA', glyph: '◆', color: '#6a3fb8', blurb: 'Cheap, spreads wide' },
  bloom: { key: 'bloom', name: 'BLOOM', glyph: '▲', color: '#b32a66', blurb: 'Heavy power, no chain' },
  toxin: { key: 'toxin', name: 'TOXIN', glyph: '✚', color: '#a85408', blurb: 'Dissolves a rival node' },
};

// One catalogue entry: id, name, suit, cost (nutrients), power, rules text.
// Power is the node's base strength; same-suit orthogonal neighbours add +1 each (cap +2),
// except Bloom, which never chains, and Toxin, which never plants (it dissolves instead).
export const CARD_DEFS = [
  { id: 'sporeling', name: 'Sporeling', suit: 'spore', cost: 1, power: 2, text: 'Chain +1 per neighbour.' },
  { id: 'puffball', name: 'Puffball', suit: 'spore', cost: 2, power: 3, text: 'Chain +1 per neighbour.' },
  { id: 'mossback', name: 'Mossback Cap', suit: 'spore', cost: 3, power: 4, text: 'Chain +1 per neighbour.' },
  { id: 'elder-spore', name: 'Elder Spore', suit: 'spore', cost: 4, power: 5, text: 'Chain +1 per neighbour.' },
  { id: 'spore-storm', name: 'Spore Storm', suit: 'spore', cost: 5, power: 6, text: 'Chain +1 per neighbour.' },
  { id: 'inkcap', name: 'Inkcap Scout', suit: 'spore', cost: 1, power: 1, text: 'Chain +1. Draw a card.' },
  { id: 'thread', name: 'Thread Hypha', suit: 'hypha', cost: 1, power: 2, text: 'Chain +1 per neighbour.' },
  { id: 'webcap', name: 'Webcap Weaver', suit: 'hypha', cost: 2, power: 3, text: 'Chain +1 per neighbour.' },
  { id: 'rootnet', name: 'Rootnet Runner', suit: 'hypha', cost: 2, power: 2, text: 'Chain +1. +1 nutrient.' },
  { id: 'mycelial-web', name: 'Mycelial Web', suit: 'hypha', cost: 3, power: 4, text: 'Chain +1 per neighbour.' },
  { id: 'deep-hypha', name: 'Deep Hypha', suit: 'hypha', cost: 4, power: 5, text: 'Chain +1 per neighbour.' },
  { id: 'glowshroom', name: 'Glowshroom', suit: 'hypha', cost: 1, power: 1, text: 'Chain +1. Heal 2 life.' },
  { id: 'moonbloom', name: 'Moonbloom', suit: 'bloom', cost: 2, power: 5, text: 'Heavy. Never chains.' },
  { id: 'firecap', name: 'Firecap Bloom', suit: 'bloom', cost: 3, power: 7, text: 'Heavy. Never chains.' },
  { id: 'queen-bloom', name: 'Queen Bloom', suit: 'bloom', cost: 5, power: 10, text: 'Heavy. Never chains.' },
  { id: 'petal-burst', name: 'Petal Burst', suit: 'bloom', cost: 4, power: 8, text: 'Heavy. Never chains.' },
  { id: 'spore-bloom', name: 'Spore Bloom', suit: 'bloom', cost: 1, power: 3, text: 'Heavy. Never chains.' },
  { id: 'rot-toxin', name: 'Rot Toxin', suit: 'toxin', cost: 2, power: 0, text: 'Dissolve a rival node.' },
  { id: 'blight-spore', name: 'Blight Spore', suit: 'toxin', cost: 3, power: 0, text: 'Dissolve a node, deal 2.' },
  { id: 'venom-cap', name: 'Venom Cap', suit: 'toxin', cost: 4, power: 0, text: 'Dissolve a node, deal 3.' },
  { id: 'mildew', name: 'Mildew Mist', suit: 'toxin', cost: 1, power: 0, text: 'Dissolve a node (≤ 3 power).' },
  { id: 'amanita', name: 'Amanita Doom', suit: 'toxin', cost: 5, power: 0, text: 'Dissolve a node, deal 4.' },
];

// Build a 30-card deck: the full catalogue (22) plus a second copy of the cheap openers.
export function buildDeck() {
  const extra = ['sporeling', 'thread', 'inkcap', 'glowshroom', 'spore-bloom', 'moonbloom', 'puffball', 'webcap'];
  const ids = CARD_DEFS.map((c) => c.id).concat(extra);
  return ids.map((id) => CARD_DEFS.find((c) => c.id === id));
}

export const TUNING = {
  startLife: 20,
  startNutrients: 3,
  maxNutrients: 8,
  handSize: 5,
  maxHand: 7,
  boardCols: 5,
  boardRows: 3,
  chainCap: 2,
  fatigueDamage: 2,
  winLife: 0,
};
