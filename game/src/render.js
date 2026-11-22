// Mycelium War — render: every pixel of the table is drawn from state here.
// Cards are DOM elements (legible at thumbnail size); the board is a CSS grid.

import { SUITS } from './config.js';

const $ = (id) => document.getElementById(id);

/** One face-up card element. `opts` may carry selected / unaffordable / dealt flags. */
export function cardElement(card, opts = {}) {
  const suit = SUITS[card.suit];
  const el = document.createElement('div');
  el.className = `card suit-${card.suit}${opts.selected ? ' selected' : ''}${opts.unaffordable ? ' unaffordable' : ''}${opts.dealt ? ' dealt' : ''}`;
  el.dataset.uid = card.uid;
  el.dataset.suit = card.suit;
  const powerLine = card.suit === 'toxin'
    ? `<div class="card-power">☠<small> DISSOLVE</small></div>`
    : `<div class="card-power">${card.power}<small> POWER</small></div>`;
  el.innerHTML = `
    <div class="cost" title="Nutrient cost">${card.cost}</div>
    <span class="suit-glyph" style="color:${suit.color}">${suit.glyph}</span>
    <div class="card-name">${card.name}</div>
    ${powerLine}
    <div class="card-text">${card.text}</div>
    <div class="suit-tag" style="color:${suit.color}">${suit.glyph} ${suit.name}</div>`;
  return el;
}

/** One face-down rival card back. */
export function cardBackElement() {
  const el = document.createElement('div');
  el.className = 'card back';
  el.setAttribute('aria-label', 'Rival card, face down');
  return el;
}

/** Render both hands. Player cards are clickable; rival cards are backs. */
export function renderHands(state, onPlayerCard) {
  const rival = $('rival-hand');
  rival.innerHTML = '';
  state.ai.hand.forEach(() => rival.appendChild(cardBackElement()));

  const hand = $('player-hand');
  hand.innerHTML = '';
  state.player.hand.forEach((card, i) => {
    const el = cardElement(card, {
      selected: state.selectedUid === card.uid,
      unaffordable: card.cost > state.player.nutrients,
      dealt: state.justDealt.has(card.uid),
    });
    el.title = `${card.name} — ${i + 1} to select`;
    el.addEventListener('click', () => onPlayerCard(card));
    hand.appendChild(el);
  });
}

/** Render the 15-plot board with nodes, legal-plot and toxin-target highlights. */
export function renderBoard(state, onPlot) {
  const board = $('board');
  board.innerHTML = '';
  const selected = state.player.hand.find((c) => c.uid === state.selectedUid);
  for (let i = 0; i < 15; i++) {
    const plot = document.createElement('div');
    const row = i < 5 ? 'row-rival' : i < 10 ? 'row-neutral' : 'row-yours';
    plot.className = `plot ${row}`;
    plot.dataset.plot = String(i);
    const node = state.board[i];
    if (node) {
      const suit = SUITS[node.suit];
      const nodeEl = document.createElement('div');
      nodeEl.className = `node owned-${node.owner}`;
      const chain = node.power - node.basePower;
      nodeEl.innerHTML = `
        <span class="node-glyph" style="color:${suit.color}">${suit.glyph}</span>
        <div class="node-power">${node.power}<small> PWR</small></div>
        <div class="node-name">${node.name}</div>
        ${chain > 0 ? `<div class="chain">+${chain} CHAIN</div>` : ''}`;
      plot.appendChild(nodeEl);
      if (selected && selected.suit === 'toxin' && node.owner === 'ai') {
        plot.classList.add('targetable');
        plot.addEventListener('click', () => onPlot(i));
      }
    } else {
      if (selected && selected.suit !== 'toxin') {
        const legal = state.phase === 'play' && state.turn === 'player'
          && ((i >= 5 && i < 15));
        if (legal) {
          plot.classList.add('legal');
          plot.addEventListener('click', () => onPlot(i));
        }
      }
      if (!node) {
        const label = document.createElement('span');
        label.className = 'plot-label';
        label.textContent = i < 5 ? 'RIVAL SOIL' : i < 10 ? 'WILD SOIL' : 'YOUR SOIL';
        plot.appendChild(label);
      }
    }
    board.appendChild(plot);
  }
}

/** Render life, network, nutrient and deck meters plus turn/round labels. */
export function renderMeters(state) {
  $('player-life').textContent = String(Math.max(0, state.player.life));
  $('rival-life').textContent = String(Math.max(0, state.ai.life));
  $('player-life-bar').style.width = `${Math.max(0, state.player.life) / 20 * 100}%`;
  $('rival-life-bar').style.width = `${Math.max(0, state.ai.life) / 20 * 100}%`;
  $('player-net').textContent = String(state.playerNet);
  $('rival-net').textContent = String(state.aiNet);
  $('player-nut').textContent = `${state.player.nutrients} / ${state.player.nutrientCap}`;
  $('player-deck').textContent = String(state.player.deck.length);
  $('rival-deck').textContent = String(state.ai.deck.length);
  $('turn-label').textContent = state.phase === 'play'
    ? (state.turn === 'player' ? 'Your turn — plant spores!' : 'Crimson Cap is thinking…')
    : state.phase === 'title' ? 'Ready when you are' : 'Game over';
  $('round-label').textContent = `Round ${state.round}`;
  $('end-turn').disabled = state.phase !== 'play' || state.turn !== 'player';
}

/** Append a line to the battle log (newest last, auto-scrolled). */
export function logLine(text) {
  const log = $('log');
  const div = document.createElement('div');
  div.textContent = text;
  log.appendChild(div);
  while (log.children.length > 6) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
}

/** Show or hide the title / end overlays. */
export function showTitle() {
  $('title-screen').classList.remove('hidden');
  $('end-screen').classList.add('hidden');
}
export function showEnd(won, statsHtml) {
  $('title-screen').classList.add('hidden');
  const end = $('end-screen');
  end.classList.remove('hidden');
  end.classList.toggle('lost', !won);
  $('end-emoji').textContent = won ? '🏆' : '🥀';
  $('end-title').textContent = won ? 'VICTORY!' : 'DEFEAT';
  $('end-title').classList.toggle('win-flourish', won);
  $('end-text').textContent = won
    ? 'Your mycelium swallowed the whole patch. The Crimson Cap withers — the soil is yours.'
    : 'The Crimson Cap overgrew your colony. Your spores scatter on the wind… this time.';
  $('end-stats').innerHTML = statsHtml;
}

/** Hint text under the board, guiding the current action. */
export function setHint(text) {
  $('board-hint').textContent = text;
}
