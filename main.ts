// Mycelium War — the hand-in program (Node 22, standard library only).
//
// What it does, in three steps:
//   1. Find the game (game/) and the screenshots (screenshots/) beside this file.
//   2. Copy both, byte for byte, into the output directory the grader gives us
//      (MAKEFUN_OUTPUT_DIR outside the grader, /output inside it).
//   3. Write /output/dossier.json with the make.fun library, so the scorer can
//      check the game and the judge can read it.
//
// Nothing here is installed, fetched or generated: the game is plain static
// files, the screenshots are real renders, and the dossier is whatever the
// library writes from them. Run it twice and the two outputs are identical.

import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the directory this file lives in.
const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

if (!existsSync(gameDir)) throw new Error('main.ts: game/ is missing beside this file');
if (!existsSync(shotsDir)) throw new Error('main.ts: screenshots/ is missing beside this file');

// A screenshot is only a screenshot when it is a whole PNG or JPEG under the
// gate's 256 KiB cap; refuse early here rather than handing in a bad entry.
const shotNames = readdirSync(shotsDir).filter((n) => !n.startsWith('.')).sort();
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`main.ts: screenshots/ holds ${shotNames.length} images, the gate wants 3 or 4`);
}
for (const name of shotNames) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > 262144) throw new Error(`main.ts: screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
  if (!/\.(png|jpe?g)$/i.test(name)) throw new Error(`main.ts: screenshots/${name} is not a PNG or JPEG`);
}

mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
for (const name of shotNames) copyFileSync(join(shotsDir, name), join(outDir, 'screenshots', name));

// The dossier caps are the gate's own: 160 KiB of source text, at most 4
// screenshots of 256 KiB, game/ at most 993 entries and 48 MiB, paths at
// most 1000 bytes. Passing them here makes this program fail exactly where
// the scorer would refuse the entry.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
