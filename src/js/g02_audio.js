function initAudio() {
  if (G.audio) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  G.audio = { ctx, master, muted: false };
}

function toggleMute() {
  if (!G.audio) return;
  G.audio.muted = !G.audio.muted;
  G.audio.master.gain.value = G.audio.muted ? 0 : 0.5;
}

function tone(freq, dur, type = 'sine', gain = 0.3, slideTo = null, delay = 0) {
  const a = G.audio;
  if (!a || a.muted) return;
  const t = a.ctx.currentTime + delay;
  const o = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo !== null) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(a.master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

let noiseBuf = null;
function noise(dur, gain = 0.3, filter = 'lowpass', f0 = 900, f1 = null, delay = 0) {
  const a = G.audio;
  if (!a || a.muted) return;
  if (!noiseBuf) {
    const len = a.ctx.sampleRate * 1.2;
    noiseBuf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = a.ctx.currentTime + delay;
  const src = a.ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const bq = a.ctx.createBiquadFilter();
  bq.type = filter;
  bq.frequency.setValueAtTime(f0, t);
  if (f1 !== null) bq.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bq);
  bq.connect(g);
  g.connect(a.master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

const SFX = {
  swing() { noise(0.16, 0.22, 'bandpass', 2400, 700); },
  swingHeavy() { noise(0.26, 0.3, 'bandpass', 1500, 400); },
  hit() { noise(0.12, 0.3, 'lowpass', 1100, 300); tone(140, 0.1, 'square', 0.14, 70); },
  crit() { noise(0.14, 0.34, 'lowpass', 2400, 500); tone(420, 0.16, 'square', 0.2, 900); tone(700, 0.2, 'sine', 0.18, 1200, 0.04); },
  hurt() { tone(190, 0.22, 'sawtooth', 0.22, 90); noise(0.18, 0.2, 'lowpass', 700, 200); },
  enemyDie() { noise(0.3, 0.26, 'lowpass', 900, 120); tone(240, 0.3, 'sawtooth', 0.12, 60); },
  fireball() { tone(320, 0.3, 'sawtooth', 0.16, 120); noise(0.3, 0.16, 'highpass', 500, 2200); },
  explode() { noise(0.5, 0.4, 'lowpass', 1600, 90); tone(90, 0.4, 'sine', 0.3, 40); },
  frost() { tone(880, 0.4, 'triangle', 0.18, 1760); tone(1320, 0.35, 'sine', 0.12, 2400, 0.05); noise(0.4, 0.14, 'highpass', 3000, 6000); },
  cleave() { noise(0.3, 0.3, 'bandpass', 900, 200); tone(160, 0.2, 'square', 0.14, 60); },
  leap() { tone(300, 0.28, 'sawtooth', 0.16, 700); },
  land() { noise(0.28, 0.36, 'lowpass', 800, 120); tone(70, 0.25, 'sine', 0.3, 40); },
  levelup() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.34, 'triangle', 0.2, null, i * 0.09)); },
  pickup() { tone(660, 0.09, 'square', 0.14, 990); },
  coin() { tone(1200, 0.07, 'square', 0.1, 1600); tone(1800, 0.1, 'square', 0.07, 2200, 0.05); },
  rare() { [392, 523, 659].forEach((f, i) => tone(f, 0.4, 'sine', 0.18, null, i * 0.08)); },
  potion() { tone(300, 0.2, 'sine', 0.2, 700); noise(0.2, 0.1, 'lowpass', 1500, 400); },
  stairs() { tone(120, 0.9, 'sine', 0.28, 50); noise(0.9, 0.16, 'lowpass', 500, 80); },
  bossRoar() { tone(110, 1.1, 'sawtooth', 0.3, 55); tone(164, 1.1, 'sawtooth', 0.24, 80); noise(1.0, 0.24, 'lowpass', 700, 120); },
  slam() { noise(0.5, 0.42, 'lowpass', 900, 70); tone(60, 0.5, 'sine', 0.36, 34); },
  telegraph() { tone(220, 0.5, 'sine', 0.1, 340); },
  shoot() { noise(0.14, 0.2, 'highpass', 2500, 900); tone(520, 0.12, 'square', 0.1, 260); },
  death() { [440, 349, 262, 196].forEach((f, i) => tone(f, 0.5, 'triangle', 0.22, null, i * 0.18)); },
  victory() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.5, 'triangle', 0.2, null, i * 0.12)); },
  click() { tone(500, 0.05, 'square', 0.1, 640); },
};

function sfx(name) {
  const fn = SFX[name];
  if (fn) fn();
}
