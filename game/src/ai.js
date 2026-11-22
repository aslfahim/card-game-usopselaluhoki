// Mycelium War — ai: the Crimson Cap rival. Plays sensibly, reads the board,
// and can be countered: it loves chains, saves toxin for your strongest node,
// and never spends its last nutrient on a weak plant when a bloom is coming.

import { SUITS } from './config.js';

/** Orthogonal neighbours of a board index (5 columns x 3 rows). */
export function neighboursOf(index, cols = 5, rows = 3) {
  const r = Math.floor(index / cols);
  const c = index % cols;
  const out = [];
  if (r > 0) out.push(index - cols);
  if (r < rows - 1) out.push(index + cols);
  if (c > 0) out.push(index - 1);
  if (c < cols - 1) out.push(index + 1);
  return out;
}

/**
 * Chain bonus for a node of `suit` at `index`, given the board map (index -> node).
 * Bloom never chains; every same-suit orthogonal neighbour adds +1, capped at +2.
 */
export function chainBonus(board, index, suit, cap = 2) {
  if (suit === 'bloom') return 0;
  let bonus = 0;
  for (const n of neighboursOf(index)) {
    const node = board[n];
    if (node && node.owner === board[index]?.owner && node.suit === suit) bonus++;
  }
  return Math.min(bonus, cap);
}

/** Recompute every node's effective power from base + chain bonus. */
export function recomputePowers(board) {
  for (const index of Object.keys(board)) {
    const node = board[index];
    if (!node) continue;
    node.power = node.basePower + chainBonus(board, Number(index), node.suit);
  }
}

/** Total network power of one owner's nodes. */
export function networkPower(board, owner) {
  let total = 0;
  for (const node of Object.values(board)) {
    if (node && node.owner === owner) total += node.power;
  }
  return total;
}

/** Plots the AI may plant on: its own row (0–4) and the wild middle row (5–9). */
export function aiLegalPlots(board) {
  const plots = [];
  for (let i = 0; i < 10; i++) if (!board[i]) plots.push(i);
  return plots;
}

/** Plots the player may plant on: the wild middle row (5–9) and their own row (10–14). */
export function playerLegalPlots(board) {
  const plots = [];
  for (let i = 5; i < 15; i++) if (!board[i]) plots.push(i);
  return plots;
}

/** Score a candidate plant: base power + chain it would gain + small spot value. */
function scorePlant(board, index, card) {
  const ghost = { ...board, [index]: { owner: 'ai', suit: card.suit, basePower: card.power } };
  const bonus = chainBonus(ghost, index, card.suit);
  const centre = 2 - Math.abs((index % 5) - 2); // middle columns chain better
  return card.power + bonus * 1.6 + centre * 0.25;
}

/**
 * Plan the AI's whole turn. Returns an ordered list of actions:
 *   { type: 'plant', cardUid, plot } or { type: 'toxin', cardUid, target }
 * The AI spends nutrients greedily on the best value it can see, toxin first
 * when the player has a node worth dissolving (power >= 5 or a chain hub).
 */
export function planAiTurn(ai, player, board) {
  const actions = [];
  let nutrients = ai.nutrients;
  const hand = ai.hand.slice();
  const simBoard = { ...board };

  // 1. Toxin: dissolve the player's strongest node when it is worth the cost.
  const playerNodes = Object.entries(simBoard)
    .filter(([, n]) => n && n.owner === 'player')
    .map(([i, n]) => ({ index: Number(i), node: n }))
    .sort((a, b) => b.node.power - a.node.power);
  const toxin = hand.find((c) => c.suit === 'toxin' && c.cost <= nutrients);
  if (toxin && playerNodes.length > 0) {
    const best = playerNodes[0];
    const worthIt = best.node.power >= 5 || (best.node.power >= 4 && toxin.cost <= 2);
    if (worthIt) {
      actions.push({ type: 'toxin', cardUid: toxin.uid, target: best.index });
      nutrients -= toxin.cost;
      delete simBoard[best.index];
      hand.splice(hand.indexOf(toxin), 1);
    }
  }

  // 2. Plant: best value first, cheapest tie-break, until nutrients run out
  //    or the board is full. Keep 1 nutrient back when a bloom sits in hand.
  const hasBloom = hand.some((c) => c.suit === 'bloom');
  let guard = 0;
  while (guard++ < 12) {
    const reserve = hasBloom ? 1 : 0;
    const affordable = hand.filter((c) => c.suit !== 'toxin' && c.cost <= nutrients - reserve);
    if (affordable.length === 0) break;
    const plots = aiLegalPlots(simBoard);
    if (plots.length === 0) break;
    let bestAction = null;
    let bestScore = -Infinity;
    for (const card of affordable) {
      for (const plot of plots) {
        const score = scorePlant(simBoard, plot, card) - card.cost * 0.35;
        if (score > bestScore) { bestScore = score; bestAction = { card, plot }; }
      }
    }
    if (!bestAction || bestScore < 1.2) break;
    actions.push({ type: 'plant', cardUid: bestAction.card.uid, plot: bestAction.plot });
    nutrients -= bestAction.card.cost;
    simBoard[bestAction.plot] = {
      owner: 'ai', suit: bestAction.card.suit, basePower: bestAction.card.power, power: bestAction.card.power,
    };
    hand.splice(hand.indexOf(bestAction.card), 1);
  }
  return actions;
}

/** One-line explanation of an AI action, for the battle log. */
export function describeAiAction(action, card, targetName) {
  if (action.type === 'toxin') return `Crimson Cap dissolves your ${targetName} with ${card.name}.`;
  return `Crimson Cap plants ${card.name} (${SUITS[card.suit].glyph} ${card.power}) on plot ${action.plot + 1}.`;
}
