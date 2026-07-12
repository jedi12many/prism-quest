// Prism Quest — procedural sound. Everything is synthesized with the Web Audio
// API (no audio files), matching the game's code-drawn art. One mute toggle.

const SND = { ctx: null, master: null, musicGain: null, muted: false, music: null, musicMood: null };
const MUTE_KEY = 'prismquest_muted_v1';

function sndBoot() {
  try { SND.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}
}

function sndInit() {
  if (SND.ctx) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    SND.ctx = new AC();
    SND.master = SND.ctx.createGain();
    SND.master.gain.value = SND.muted ? 0 : 0.35;
    SND.master.connect(SND.ctx.destination);
    SND.musicGain = SND.ctx.createGain();
    SND.musicGain.gain.value = 0.13;
    SND.musicGain.connect(SND.master);
  } catch (e) { SND.ctx = null; }
}

// call on the first user gesture (autoplay policies)
function sndUnlock() {
  sndInit();
  if (SND.ctx && SND.ctx.state === 'suspended') SND.ctx.resume();
  if (SND.ctx && SND.musicMood && !SND.music) startMusic(SND.musicMood);
}

function sndToggleMute() {
  SND.muted = !SND.muted;
  try { localStorage.setItem(MUTE_KEY, SND.muted ? '1' : '0'); } catch (e) {}
  if (SND.master) SND.master.gain.value = SND.muted ? 0 : 0.35;
  return SND.muted;
}

// ---------- synth primitives ----------

function tone(o) {
  if (!SND.ctx || SND.muted) return;
  const t = SND.ctx.currentTime + (o.when || 0);
  const osc = SND.ctx.createOscillator();
  const g = SND.ctx.createGain();
  const dur = o.dur || 0.15, vol = o.vol == null ? 0.4 : o.vol;
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + (o.attack || 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g); g.connect(o.bus || SND.master);
  osc.start(t); osc.stop(t + dur + 0.03);
}

function noise(o) {
  if (!SND.ctx || SND.muted) return;
  const t = SND.ctx.currentTime + (o.when || 0);
  const dur = o.dur || 0.15, vol = o.vol == null ? 0.4 : o.vol;
  const src = SND.ctx.createBufferSource();
  const buf = SND.ctx.createBuffer(1, Math.max(1, SND.ctx.sampleRate * dur), SND.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  src.buffer = buf;
  const f = SND.ctx.createBiquadFilter();
  f.type = o.filter || 'lowpass';
  f.frequency.setValueAtTime(o.freq || 1200, t);
  if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + dur);
  const g = SND.ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(SND.master);
  src.start(t); src.stop(t + dur + 0.03);
}

function arp(notes, o) {
  o = o || {};
  notes.forEach((f, i) => tone({ freq: f, type: o.type || 'triangle', vol: o.vol == null ? 0.32 : o.vol, dur: o.dur || 0.12, when: (o.when || 0) + i * (o.step || 0.06) }));
}
function chord(freqs, o) {
  o = o || {};
  freqs.forEach(f => tone({ freq: f, type: o.type || 'triangle', vol: o.vol == null ? 0.22 : o.vol, dur: o.dur || 0.4, when: o.when || 0 }));
}

// ---------- named SFX ----------

function sndClick()   { tone({ freq: 620, type: 'square', dur: 0.05, vol: 0.16, slideTo: 720 }); }
function sndMine()    { arp([880, 1180, 1560], { type: 'triangle', step: 0.045, dur: 0.1, vol: 0.28 }); noise({ freq: 2600, dur: 0.06, vol: 0.12, filter: 'highpass' }); }
function sndPolish()  { tone({ freq: 500, type: 'sine', dur: 0.35, vol: 0.3, slideTo: 1500 }); }
function sndBrilliant(){ arp([784, 988, 1319, 1568], { type: 'triangle', step: 0.05, dur: 0.18, vol: 0.32 }); }
function sndCraft()   { chord([523, 659, 784], { type: 'triangle', dur: 0.5, vol: 0.2 }); tone({ freq: 1046, dur: 0.4, vol: 0.18, when: 0.06 }); }
function sndCoin()    { tone({ freq: 1046, type: 'square', dur: 0.07, vol: 0.2 }); tone({ freq: 1568, type: 'square', dur: 0.09, vol: 0.2, when: 0.06 }); }
function sndBonk()    { noise({ freq: 900, freqTo: 200, dur: 0.12, vol: 0.35 }); tone({ freq: 200, type: 'square', dur: 0.1, vol: 0.25, slideTo: 90 }); }
function sndCrit()    { noise({ freq: 1400, freqTo: 300, dur: 0.14, vol: 0.4 }); arp([660, 990, 1320], { type: 'square', step: 0.03, dur: 0.1, vol: 0.25 }); }
function sndHitMon()  { noise({ freq: 1600, dur: 0.07, vol: 0.22, filter: 'highpass' }); }
function sndHurt()    { tone({ freq: 320, type: 'sawtooth', dur: 0.22, vol: 0.3, slideTo: 120 }); noise({ freq: 600, dur: 0.12, vol: 0.2 }); }
function sndDodge()   { noise({ freq: 400, freqTo: 3000, dur: 0.16, vol: 0.18, filter: 'bandpass' }); }
function sndShield()  { chord([392, 523, 659], { type: 'sine', dur: 0.5, vol: 0.16 }); }
function sndHeal()    { arp([523, 659, 784, 1046], { type: 'sine', step: 0.07, dur: 0.3, vol: 0.2 }); }
function sndLevel()   { arp([523, 659, 784, 1046, 1319], { type: 'triangle', step: 0.08, dur: 0.28, vol: 0.34 }); }
function sndVictory() { arp([523, 784, 1046], { type: 'triangle', step: 0.1, dur: 0.35, vol: 0.32 }); }
function sndKey()     { arp([1046, 880, 1318], { type: 'square', step: 0.06, dur: 0.14, vol: 0.24 }); }
function sndTravel()  { tone({ freq: 300, type: 'sine', dur: 0.4, vol: 0.22, slideTo: 900 }); noise({ freq: 500, freqTo: 3000, dur: 0.35, vol: 0.12, filter: 'bandpass' }); }
function sndPact()    { chord([294, 370, 466], { type: 'sawtooth', dur: 0.6, vol: 0.15 }); }
function sndDeath()   { arp([392, 330, 262, 175], { type: 'sawtooth', step: 0.16, dur: 0.5, vol: 0.3 }); }
function sndWin()     { arp([523, 659, 784, 1046, 1319, 1568], { type: 'triangle', step: 0.11, dur: 0.4, vol: 0.34 }); }
function sndSummon()  { arp([440, 554, 659, 880, 1109], { type: 'triangle', step: 0.05, dur: 0.25, vol: 0.28 }); }
function sndDwarves() { arp([196, 262, 330, 262, 196], { type: 'square', step: 0.09, dur: 0.14, vol: 0.24 }); }

// spell-specific casts
function sndSpell(id) {
  switch (id) {
    case 'rainbowbeam': arp([523, 659, 784, 988, 1319], { type: 'sawtooth', step: 0.04, dur: 0.2, vol: 0.26 }); break;
    case 'glitterbomb': noise({ freq: 3000, dur: 0.2, vol: 0.16, filter: 'highpass' }); arp([1046, 1319, 1568], { step: 0.03, dur: 0.1, vol: 0.2 }); break;
    case 'sunflare':    tone({ freq: 300, type: 'sawtooth', dur: 0.4, vol: 0.28, slideTo: 800 }); noise({ freq: 1200, dur: 0.3, vol: 0.14 }); break;
    case 'tidepop':     tone({ freq: 900, type: 'sine', dur: 0.3, vol: 0.26, slideTo: 300 }); break;
    case 'butterflyswarm': arp([1319, 1568, 1319, 1760], { step: 0.04, dur: 0.09, vol: 0.18 }); break;
    case 'bloomheal':   sndHeal(); break;
    case 'prismshield': sndShield(); break;
    case 'unicorn':     sndSummon(); break;
    case 'stardust':    arp([1568, 1319, 988, 659], { type: 'sine', step: 0.05, dur: 0.16, vol: 0.24 }); tone({ freq: 90, type: 'square', dur: 0.5, vol: 0.3, when: 0.28 }); break;
    default:            arp([523, 784], { dur: 0.15, vol: 0.2 });
  }
}

// ---------- ambient music: a slow arpeggio pad, mood per map ----------

const MUSIC_MOODS = {
  village: { root: 261.63, scale: [0, 4, 7, 11, 12, 7, 4], type: 'triangle', tempo: 0.55 },
  zone:    { root: 220.00, scale: [0, 3, 7, 10, 12, 10, 7], type: 'triangle', tempo: 0.48 },
  dungeon: { root: 174.61, scale: [0, 1, 7, 8, 12, 8, 7], type: 'sine', tempo: 0.6 },
  clouds:  { root: 329.63, scale: [0, 4, 7, 12, 16, 12, 7], type: 'triangle', tempo: 0.5 },
  realm:   { root: 155.56, scale: [0, 1, 6, 7, 12, 7, 6], type: 'sawtooth', tempo: 0.62 },
};

function semis(root, n) { return root * Math.pow(2, n / 12); }

function startMusic(mood) {
  SND.musicMood = mood;
  if (!SND.ctx) return; // will start on unlock
  const cfg = MUSIC_MOODS[mood];
  if (!cfg) { stopMusic(); return; }
  SND.music = { mood, i: 0, id: (SND.music ? SND.music.id + 1 : 1) };
  const myId = SND.music.id;
  const step = () => {
    if (!SND.music || SND.music.id !== myId) return; // superseded
    const m = SND.music;
    if (!SND.muted && SND.ctx) {
      const f = semis(cfg.root, cfg.scale[m.i % cfg.scale.length]);
      tone({ freq: f, type: cfg.type, dur: cfg.tempo * 1.6, vol: 0.5, attack: 0.08, bus: SND.musicGain });
      if (m.i % cfg.scale.length === 0) tone({ freq: cfg.root / 2, type: 'sine', dur: cfg.tempo * cfg.scale.length, vol: 0.4, attack: 0.2, bus: SND.musicGain });
    }
    m.i++;
    SND.music.timer = setTimeout(step, cfg.tempo * 1000);
  };
  step();
}

function stopMusic() {
  if (SND.music && SND.music.timer) clearTimeout(SND.music.timer);
  SND.music = null;
}

// switch the ambient mood for the current map (no-op if unchanged)
function setMusic(mapId) {
  const mood = mapId === 'village' ? 'village'
    : (mapId === 'north' || mapId === 'east' || mapId === 'west' || mapId === 'south') ? 'zone'
    : mapId === 'dungeon' ? 'dungeon'
    : mapId === 'clouds' ? 'clouds'
    : mapId === 'realm' ? 'realm' : 'village';
  if (mood === SND.musicMood && SND.music) return;
  startMusic(mood);
}
