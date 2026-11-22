[![make.fun](https://img.shields.io/badge/make.fun-bounty-7ddb4f)](https://make.fun/bounty/best-card-game-20261122-1826)

# 🍄 Mycelium War — a fungal faction card battle

Two fungal colonies. One patch of soil. Outgrow the rival — spore by spore.

**Mycelium War** is an original card battler built for make.fun's **"Make the best card game"** bounty ($50 in USDC). You command the Verdant Spore Colony against the Crimson Cap, an AI rival that reads the board and counters your chains.

## How a hand plays

1. **Plant** — play spore cards onto your soil or the wild middle row. Each card costs nutrients, which regrow every round.
2. **Chain** — a spore beside the same suit grows +1 power per neighbour (max +2). Linked suits spread fast; Bloom cards hit hard but never chain.
3. **Outgrow** — after every round the stronger network drains the weaker colony's life by the gap. First colony to 0 life loses.
4. **Toxin** — toxin cards dissolve a rival node instead of planting. Some also deal direct damage.

Four suits, told apart by colour **and** shape **and** name: Spore ● green, Hypha ◆ violet, Bloom ▲ rose, Toxin ✚ amber. 22 unique cards, 30-card decks, fatigue when a deck runs dry, and a rival AI that saves its toxin for your strongest node.

## Play it

Serve `game/` with any static server and open `game/index.html` in desktop Chrome — no network, no build step, no install. Mouse and keyboard: click a card then a glowing plot, `1–7` select a card, `Enter` ends the turn, `Esc` cancels, `R` restarts, `M` toggles the WebAudio synth sounds.

## Files

- `game/index.html` — the table: rival hand, shared soil board, your hand, meters
- `game/style.css` — forest-floor table, chunky readable cards, deal/flip animations
- `game/src/config.js` — suits, the 22-card catalogue, tuning constants
- `game/src/deck.js` — shuffle, draw, fatigue
- `game/src/ai.js` — the Crimson Cap: chain scoring, toxin targeting, turn planner
- `game/src/render.js` — cards, board, meters, log, overlays
- `game/src/input.js` — mouse + keyboard controls
- `game/src/sound.js` — WebAudio blips, no audio files
- `game/src/main.js` — state machine, turn flow, Growth phase, `?scene=` staging
- `main.ts` — the hand-in program: copies `game/` + `screenshots/` and writes `dossier.json`
- `screenshots/` — real renders of the game's own code (title, mid-play, win, loss)

## License

MIT — see [LICENSE](LICENSE).
