// Mycelium War — main: the game state machine, turn flow and growth phase.
// A turn: gain nutrients, draw, plant spores (or dissolve with toxin), end turn.
// Then the rival plays, then the Growth phase compares network power and the
// stronger colony drains the weaker one's life. First life to 0 loses.

import { CARD_DEFS, SUITS, TUNING, buildDeck } from './config.js';
import { drawCards, freshDeck } from './deck.js';
import { aiLegalPlots, chainBonus, describeAiAction, networkPower, planAiTurn, playerLegalPlots, recomputePowers } from './ai.js';
import { logLine, renderBoard, renderHands, renderMeters, setHint, showEnd, showTitle } from './render.js';
import { wireInput } from './input.js';
import { setSoundEnabled, sfx, soundEnabled } from './sound.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function makeSide() {
  return { life: TUNING.startLife, nutrients: TUNING.startNutrients, nutrientCap: TUNING.startNutrients, hand: [], deck: [] };
}

function newState() {
  return {
    phase: 'title', // title | play | win | loss
    turn: 'player',
    round: 1,
    board: {}, // plot index -> { owner, suit, name, basePower, power }
    player: makeSide(),
    ai: makeSide(),
    selectedUid: null,
    justDealt: new Set(),
    playerNet: 0,
    aiNet: 0,
    soundOn: true,
  };
}

let state = newState();

/** Recompute both network totals after any board change. */
function refreshNets() {
  state.playerNet = networkPower(state.board, 'player');
  state.aiNet = networkPower(state.board, 'ai');
}

/** Full re-render of hands, board and meters. */
function renderAll() {
  renderHands(state, onPlayerCard);
  renderBoard(state, onPlot);
  renderMeters(state);
}

/** Deal opening hands and set the title screen; called once at load. */
function setup() {
  state.player.deck = freshDeck(buildDeck);
  state.ai.deck = freshDeck(buildDeck);
  drawCards(state.player.deck, state.player.hand, TUNING.handSize, TUNING.maxHand);
  drawCards(state.ai.deck, state.ai.hand, TUNING.handSize, TUNING.maxHand);
  showTitle();
  renderAll();
  setHint('Press Start — plant spores, chain suits, outgrow the Crimson Cap.');
  logLine('🍄 Welcome to Mycelium War. The soil is wild and ready.');
}

/** Start (or restart) a fresh game from the title / end screen. */
function startGame() {
  state = newState();
  state.phase = 'play';
  state.player.deck = freshDeck(buildDeck);
  state.ai.deck = freshDeck(buildDeck);
  drawCards(state.player.deck, state.player.hand, TUNING.handSize, TUNING.maxHand);
  drawCards(state.ai.deck, state.ai.hand, TUNING.handSize, TUNING.maxHand);
  state.justDealt = new Set(state.player.hand.map((c) => c.uid));
  $('title-screen').classList.add('hidden');
  $('end-screen').classList.add('hidden');
  renderAll();
  setHint('Your turn — click a card, then a glowing plot. Chain same suits for +power.');
  logLine(`Round 1 — you hold ${state.player.hand.length} cards, ${state.player.nutrients} nutrients. Plant!`);
  sfx.grow();
}

/** Select / deselect a hand card (only on the player's turn, in play). */
function onPlayerCard(card) {
  if (state.phase !== 'play' || state.turn !== 'player') return;
  if (card.cost > state.player.nutrients) {
    setHint(`Not enough nutrients for ${card.name} (${card.cost} needed). End the turn to grow more.`);
    return;
  }
  state.selectedUid = state.selectedUid === card.uid ? null : card.uid;
  sfx.select();
  if (state.selectedUid) {
    setHint(card.suit === 'toxin'
      ? `${card.name}: click a red rival node to dissolve it.`
      : `${card.name}: click a glowing plot on wild or your soil to plant it.`);
  } else {
    setHint('Card put back. Click a card to select it.');
  }
  renderAll();
}

/** A board plot was clicked: plant the selected card, or dissolve with toxin. */
function onPlot(plot) {
  if (state.phase !== 'play' || state.turn !== 'player') return;
  const card = state.player.hand.find((c) => c.uid === state.selectedUid);
  if (!card) return;
  if (card.suit === 'toxin') {
    const node = state.board[plot];
    if (!node || node.owner !== 'ai') return;
    dissolveNode(card, plot, 'player');
    return;
  }
  if (state.board[plot]) return;
  if (plot < 5) { setHint('That is rival soil — plant on wild or your soil.'); return; }
  plantCard(card, plot, 'player');
}

/** Plant a card as a node on a plot, pay its cost, apply its on-plant effects. */
function plantCard(card, plot, owner) {
  const side = owner === 'player' ? state.player : state.ai;
  side.hand = side.hand.filter((c) => c.uid !== card.uid);
  side.nutrients -= card.cost;
  state.board[plot] = { owner, suit: card.suit, id: card.id, name: card.name, basePower: card.power, power: card.power };
  recomputePowers(state.board);
  refreshNets();
  if (owner === 'player') {
    state.selectedUid = null;
    state.justDealt.delete(card.uid);
    sfx.plant();
    const bonus = state.board[plot].power - card.power;
    logLine(`You plant ${card.name} ${SUITS[card.suit].glyph} on plot ${plot + 1} — power ${state.board[plot].power}${bonus > 0 ? ` (chain +${bonus})` : ''}.`);
    if (card.id === 'inkcap') {
      const drawn = drawCards(state.player.deck, state.player.hand, 1, TUNING.maxHand);
      if (drawn.length) { state.justDealt.add(state.player.hand[state.player.hand.length - 1].uid); logLine('Inkcap Scout draws you a card.'); }
    }
    if (card.id === 'glowshroom') {
      state.player.life = Math.min(TUNING.startLife, state.player.life + 2);
      logLine('Glowshroom heals your colony +2 life.');
    }
    if (card.id === 'rootnet') logLine('Rootnet Runner: +1 nutrient next turn.');
    setHint('Planted! Play another card, or End Turn to grow.');
  }
  renderAll();
}

/** Dissolve a rival node with a toxin card (optionally dealing direct damage). */
function dissolveNode(card, plot, owner) {
  const side = owner === 'player' ? state.player : state.ai;
  const target = state.board[plot];
  side.hand = side.hand.filter((c) => c.uid !== card.uid);
  side.nutrients -= card.cost;
  if (card.id === 'mildew' && target.power > 3) {
    setHint('Mildew Mist only dissolves nodes of power 3 or less. Pick a weaker node.');
    side.hand.push(card);
    side.nutrients += card.cost;
    renderAll();
    return;
  }
  delete state.board[plot];
  recomputePowers(state.board);
  refreshNets();
  const dmg = { 'blight-spore': 2, 'venom-cap': 3, 'amanita': 4 }[card.id] || 0;
  if (owner === 'player') {
    state.selectedUid = null;
    sfx.toxin();
    logLine(`You dissolve the rival ${target.name} with ${card.name}${dmg ? ` — and deal ${dmg} damage` : ''}.`);
    if (dmg) { state.ai.life -= dmg; sfx.hurt(); }
    setHint('Dissolved! Play another card, or End Turn to grow.');
  } else {
    logLine(`Crimson Cap dissolves your ${target.name} with ${card.name}.`);
    if (dmg) state.player.life -= dmg;
  }
  renderAll();
}

/** End the player's turn: run the AI turn, then the Growth phase. */
async function endTurn() {
  if (state.phase !== 'play' || state.turn !== 'player') return;
  state.selectedUid = null;
  state.turn = 'ai';
  renderAll();
  setHint('Crimson Cap is thinking…');
  await sleep(450);
  await runAiTurn();
  growthPhase();
  if (state.phase !== 'play') return;
  startPlayerTurn();
}

/** The rival draws, then plays its planned actions one at a time, visibly. */
async function runAiTurn() {
  const drawn = drawCards(state.ai.deck, state.ai.hand, 1, TUNING.maxHand);
  if (drawn.length === 0 && state.ai.deck.length === 0) {
    state.ai.life -= TUNING.fatigueDamage;
    logLine(`Crimson Cap's deck is empty — fatigue drains ${TUNING.fatigueDamage} life.`);
  }
  state.ai.nutrientCap = Math.min(TUNING.maxNutrients, state.ai.nutrientCap + 1);
  state.ai.nutrients = state.ai.nutrientCap;
  const actions = planAiTurn(state.ai, state.player, state.board);
  for (const action of actions) {
    await sleep(550);
    const card = state.ai.hand.find((c) => c.uid === action.cardUid);
    if (!card) continue;
    if (action.type === 'toxin') {
      dissolveNode(card, action.target, 'ai');
      logLine(describeAiAction(action, card));
    } else {
      plantCard(card, action.plot, 'ai');
      logLine(describeAiAction(action, card));
      sfx.plant();
    }
    renderAll();
  }
  if (actions.length === 0) logLine('Crimson Cap passes — no good plant this turn.');
}

/** Growth phase: stronger network drains the weaker colony's life by the gap. */
function growthPhase() {
  refreshNets();
  const gap = state.playerNet - state.aiNet;
  if (gap > 0) {
    state.ai.life -= gap;
    sfx.hurt();
    logLine(`🌱 Growth: your network ${state.playerNet} vs ${state.aiNet} — Crimson Cap loses ${gap} life.`);
  } else if (gap < 0) {
    state.player.life -= -gap;
    sfx.hurt();
    logLine(`🌱 Growth: rival network ${state.aiNet} vs ${state.playerNet} — you lose ${-gap} life.`);
  } else {
    logLine(`🌱 Growth: networks tied at ${state.playerNet} — no life lost.`);
  }
  renderAll();
  checkEnd();
}

/** Start the player's next turn: nutrients grow, draw a card, round advances. */
function startPlayerTurn() {
  state.round += 1;
  state.turn = 'player';
  const bonusNutrient = boardHas('rootnet', 'player') ? 1 : 0;
  state.player.nutrientCap = Math.min(TUNING.maxNutrients, state.player.nutrientCap + 1);
  state.player.nutrients = Math.min(TUNING.maxNutrients, state.player.nutrientCap + bonusNutrient);
  const drawn = drawCards(state.player.deck, state.player.hand, 1, TUNING.maxHand);
  state.justDealt = new Set(drawn.length ? [state.player.hand[state.player.hand.length - 1].uid] : []);
  if (drawn.length === 0 && state.player.deck.length === 0) {
    state.player.life -= TUNING.fatigueDamage;
    logLine(`Your deck is empty — fatigue drains ${TUNING.fatigueDamage} life.`);
  } else if (drawn.length) {
    sfx.draw();
    logLine(`Round ${state.round} — you draw ${drawn[0].name}. ${state.player.nutrients} nutrients ready.`);
  }
  setHint('Your turn — click a card, then a glowing plot. Chain same suits for +power.');
  renderAll();
  checkEnd();
}

/** True when the owner has a live node built from the given card id. */
function boardHas(cardId, owner) {
  return Object.values(state.board).some((n) => n && n.owner === owner && n.id === cardId);
}

/** Win / loss check after any life change. */
function checkEnd() {
  if (state.ai.life <= 0 && state.player.life <= 0) {
    // A mutual drain: the bigger network takes the patch.
    endGame(state.playerNet >= state.aiNet);
    return;
  }
  if (state.ai.life <= 0) { endGame(true); return; }
  if (state.player.life <= 0) { endGame(false); return; }
}

/** Show the end screen with final stats. */
function endGame(won) {
  state.phase = won ? 'win' : 'loss';
  renderAll();
  if (won) sfx.win(); else sfx.lose();
  const stats = `
    <div>Final life — You ${Math.max(0, state.player.life)} · Crimson Cap ${Math.max(0, state.ai.life)}</div>
    <div>Final network — You ${state.playerNet} · Crimson Cap ${state.aiNet}</div>
    <div>Rounds played: ${state.round} · Cards left in your deck: ${state.player.deck.length}</div>`;
  showEnd(won, stats);
  logLine(won ? '🏆 Victory! Your mycelium owns the patch.' : '🥀 Defeat. The Crimson Cap overgrew you.');
}

// ---------------------------------------------------------------- scenes
// ?scene=title|play|win|loss stages a composed, fully rendered state for
// screenshots. These are real renders of the game's own code, not mockups.

function stageScene(scene) {
  if (scene === 'title') { setup(); return; }
  startGame();
  if (scene === 'play') {
    // A lively mid-game: both colonies planted, chains formed, both hands full.
    const demo = [
      { card: 'sporeling', plot: 10, owner: 'player' },
      { card: 'puffball', plot: 11, owner: 'player' },
      { card: 'thread', plot: 6, owner: 'player' },
      { card: 'moonbloom', plot: 12, owner: 'player' },
      { card: 'mossback', plot: 0, owner: 'ai' },
      { card: 'webcap', plot: 1, owner: 'ai' },
      { card: 'firecap', plot: 7, owner: 'ai' },
      { card: 'rootnet', plot: 2, owner: 'ai' },
    ];
    for (const d of demo) {
      const def = CARD_DEFS.find((c) => c.id === d.card);
      const side = d.owner === 'player' ? state.player : state.ai;
      side.hand = side.hand.filter((c) => c.id !== d.card);
      state.board[d.plot] = { owner: d.owner, suit: def.suit, id: def.id, name: def.name, basePower: def.power, power: def.power };
    }
    state.player.nutrients = 5;
    state.player.nutrientCap = 5;
    state.player.life = 14;
    state.ai.life = 11;
    state.round = 6;
    recomputePowers(state.board);
    refreshNets();
    state.selectedUid = state.player.hand[0]?.uid ?? null;
    logLine('Round 6 — your Sporeling chain is spreading across the wild row.');
    logLine('Crimson Cap planted Firecap Bloom on the wild row. Counter it!');
    setHint('Your turn — click a card, then a glowing plot. Chain same suits for +power.');
    renderAll();
    return;
  }
  if (scene === 'win' || scene === 'loss') {
    const won = scene === 'win';
    state.player.life = won ? 9 : 0;
    state.ai.life = won ? 0 : 8;
    state.playerNet = won ? 24 : 11;
    state.aiNet = won ? 13 : 22;
    state.round = 9;
    endGame(won);
    return;
  }
  setup();
}

// ---------------------------------------------------------------- boot

wireInput({
  start: () => { if (state.phase === 'title') startGame(); },
  restart: () => startGame(),
  endTurn: () => { endTurn(); },
  cancelSelection: () => { state.selectedUid = null; renderAll(); setHint('Selection cancelled.'); },
  selectByIndex: (i) => {
    const card = state.player.hand[i];
    if (card) onPlayerCard(card);
  },
  toggleSound: () => {
    const on = !soundEnabled();
    setSoundEnabled(on);
    return on;
  },
});

const params = new URLSearchParams(window.location.search);
const scene = params.get('scene');
if (scene) stageScene(scene);
else setup();
