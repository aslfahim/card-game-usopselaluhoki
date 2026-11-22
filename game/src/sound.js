// Mycelium War — sound: tiny WebAudio synth blips, no audio files, no network.
// Every sound is a short oscillator envelope; muted state lives on the module.

let ctx = null;
let enabled = true;

export function setSoundEnabled(on) { enabled = on; }
export function soundEnabled() { return enabled; }

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Play one blip: frequency slide from `from` to `to` over `ms`, sine/triangle. */
function blip(from, to, ms, type = 'sine', gain = 0.08) {
  if (!enabled) return;
  try {
    const ac = audio();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), ac.currentTime + ms / 1000);
    g.gain.setValueAtTime(gain, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + ms / 1000);
    osc.connect(g).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + ms / 1000);
  } catch (err) { /* audio is decoration; never break the game */ }
}

export const sfx = {
  select: () => blip(520, 660, 90, 'triangle', 0.05),
  plant: () => { blip(220, 440, 160, 'sine', 0.09); setTimeout(() => blip(440, 660, 120, 'sine', 0.06), 90); },
  toxin: () => blip(400, 90, 260, 'sawtooth', 0.06),
  grow: () => blip(330, 520, 200, 'sine', 0.07),
  hurt: () => blip(180, 70, 300, 'sawtooth', 0.08),
  win: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, f, 220, 'triangle', 0.08), i * 130)); },
  lose: () => { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => blip(f, f * 0.8, 240, 'triangle', 0.07), i * 150)); },
  draw: () => blip(700, 900, 70, 'triangle', 0.04),
};
