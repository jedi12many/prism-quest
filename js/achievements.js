// Prism Quest — Deeds & the Village Ledger.
// Persistent per-device (its own localStorage key, untouched by permadeath).
// All writes funnel through achEvent() so the balance sim can stub one function.

const ACH_KEY = 'prismquest_deeds_v1';

function achData() {
  try {
    const d = JSON.parse(localStorage.getItem(ACH_KEY) || '{}');
    d.unlocked = d.unlocked || {};
    d.stats = d.stats || {};
    const st = d.stats;
    st.runs = st.runs || 0; st.wins = st.wins || 0; st.losses = st.losses || 0; st.elites = st.elites || 0;
    st.keepers = st.keepers || {}; st.winsByClass = st.winsByClass || {}; st.bestByClass = st.bestByClass || {};
    st.winsByDifficulty = st.winsByDifficulty || {};
    return d;
  } catch (e) { return { unlocked: {}, stats: { runs: 0, wins: 0, losses: 0, elites: 0, keepers: {}, winsByClass: {}, bestByClass: {}, winsByDifficulty: {} } }; }
}

function achSave(d) {
  try { localStorage.setItem(ACH_KEY, JSON.stringify(d)); } catch (e) {}
}

function achUnlock(d, id) {
  if (d.unlocked[id] || !ACHIEVEMENTS[id]) return;
  d.unlocked[id] = Date.now();
  const a = ACHIEVEMENTS[id];
  toast(`🏆 Deed done: ${a.name} — ${a.desc}`);
  fxConfetti(window.innerWidth / 2, 140, 26);
  sndLevel();
}

function fmtRunTime(sec) {
  sec = Math.round(sec || 0);
  const m = Math.floor(sec / 60), s2 = sec % 60;
  return `${m}:${String(s2).padStart(2, '0')}`;
}

// the single entry point for everything deed- or stat-worthy
function achEvent(type, data = {}) {
  const d = achData();
  const st = d.stats;
  switch (type) {
    case 'zone':
      achUnlock(d, 'first-steps');
      if (data.all4) achUnlock(d, 'lights-on');
      if (data.pact) achUnlock(d, 'pact-victor');
      break;
    case 'wyrm': achUnlock(d, 'wyrmfall'); break;
    case 'elite':
      st.elites = (st.elites || 0) + 1;
      if (st.elites >= 25) achUnlock(d, 'elite-slayer');
      break;
    case 'keeper':
      st.keepers[data.type] = 1;
      if (Object.keys(st.keepers).length >= 3) achUnlock(d, 'keeper-slayer');
      break;
    case 'unicorn': achUnlock(d, 'unicorn-rider'); break;
    case 'dwarves': achUnlock(d, 'dwarf-friend'); break;
    case 'walls': achUnlock(d, 'wall-builder'); break;
    case 'floor3': achUnlock(d, 'deep-delver'); break;
    case 'facets': achUnlock(d, 'facet-hunter'); break;
    case 'neighbor': achUnlock(d, 'good-neighbor'); break;
    case 'forge':
      achUnlock(d, 'twinlight');
      if (data.power >= 4) achUnlock(d, 'prismblade');
      break;
    case 'runEnd': {
      st.runs++;
      if (data.won) {
        st.wins++;
        st.winsByClass[data.cls] = (st.winsByClass[data.cls] || 0) + 1;
        const best = st.bestByClass[data.cls];
        if (!best || data.sec < best) st.bestByClass[data.cls] = Math.round(data.sec);
        const diff = data.diff || 'normal';
        st.winsByDifficulty[diff] = (st.winsByDifficulty[diff] || 0) + 1;
        achUnlock(d, 'sunbringer');
        if (data.sec < 2400) achUnlock(d, 'speed-sun');
        if (data.lowHp >= 0.3) achUnlock(d, 'untouchable');
        if (['mage', 'knight', 'whisperer'].every(c => st.winsByClass[c])) achUnlock(d, 'triple-crown');
        if (st.winsByDifficulty.hard || st.winsByDifficulty.monsoon) achUnlock(d, 'sun-hard');
        if (st.winsByDifficulty.monsoon) achUnlock(d, 'sun-monsoon');
        if (['easy', 'normal', 'hard', 'monsoon'].every(k => st.winsByDifficulty[k])) achUnlock(d, 'sun-all-diffs');
      } else {
        st.losses++;
      }
      break;
    }
  }
  achSave(d);
}

// Grandma's wisdom: a nudge toward one deed not yet done
function achHintLine() {
  const d = achData();
  const locked = Object.keys(ACHIEVEMENTS).filter(id => !d.unlocked[id]);
  if (!locked.length) return '<br><br>🏆 "Every deed in the old ledger, done. You are the story now, dearie."';
  const id = locked[Math.floor(Math.random() * locked.length)];
  return `<br><br>🏆 Grandma's wisdom: "${ACHIEVEMENTS[id].hint}"`;
}

// ---------- the Village Ledger (journal + deeds + chronicle) ----------

function openBoard() {
  renderBoard();
  openScreen('boardScreen');
}

function renderBoard() {
  const s = G.state;
  const d = achData();
  const total = Object.keys(ACHIEVEMENTS).length;
  const done = Object.keys(d.unlocked).length;

  // journal: the main thread + villager favors
  let journal = `<div class="ledgerQuest">📜 ${questText()}</div>`;
  const favors = [];
  const q = s.sideQuests || {};
  const favorLine = (id, name, text) => {
    const st2 = q[id];
    if (!st2 || st2.stage === 0) return;
    favors.push(`<div class="ledgerFavor">${st2.stage >= 2 ? '✅' : '▫️'} <b>${name}</b> — ${text(st2)}</div>`);
  };
  favorLine('pip', 'Pip\'s frog', st2 => st2.stage >= 2 ? 'Sir Croaksworth is home!' : `scare off monsters in Bogmire (${Math.min(5, st2.n)}/5)`);
  favorLine('baker', 'Barnaby\'s ovens', st2 => st2.stage >= 2 ? 'the ovens glow again' : 'bring 4 Sunstone');
  favorLine('willow', 'Willow\'s tulips', st2 => st2.stage >= 2 ? 'the tulips bloom!' : 'bring 2 Rose Opal');
  if (favors.length) journal += favors.join('');
  document.getElementById('ledgerJournal').innerHTML = journal;

  // deeds: completed only, plus the denominator
  let deeds = `<div class="deedCount">🏆 Deeds: <b>${done}/${total}</b></div>`;
  const items = Object.entries(d.unlocked).sort((a, b) => a[1] - b[1]);
  for (const [id] of items) {
    const a = ACHIEVEMENTS[id];
    if (a) deeds += `<div class="deedRow">✅ <b>${a.name}</b><small>${a.desc}</small></div>`;
  }
  if (done < total) deeds += `<div class="deedRow locked">…and ${total - done} deed${total - done === 1 ? '' : 's'} remain unwritten. Grandma may know more.</div>`;
  document.getElementById('ledgerDeeds').innerHTML = deeds;

  // chronicle: runs and record times
  const st = d.stats;
  const diffName = (s && s.difficulty && DIFFICULTIES[s.difficulty]) ? DIFFICULTIES[s.difficulty].name : 'Normal';
  let chron = `<div class="chronRow">This hero's difficulty: <b>🌧️ ${diffName}</b></div>`;
  chron += `<div class="chronRow">Runs <b>${st.runs}</b> · Suns restored <b>${st.wins}</b> · Heroes lost <b>${st.losses}</b></div>`;
  const classNames = { mage: 'Prism Mage', knight: 'Crystal Knight', whisperer: 'Unicorn Whisperer' };
  for (const [cls, sec] of Object.entries(st.bestByClass || {})) {
    chron += `<div class="chronRow">Fastest sun — ${classNames[cls] || cls}: <b>${fmtRunTime(sec)}</b></div>`;
  }
  const wonDiffs = DIFFICULTY_ORDER.filter(k => (st.winsByDifficulty || {})[k]).map(k => DIFFICULTIES[k].name);
  if (wonDiffs.length) chron += `<div class="chronRow">Suns restored on: <b>${wonDiffs.join(', ')}</b></div>`;
  if (s && s.playSec != null) chron += `<div class="chronRow dim">This run: ${fmtRunTime(s.playSec)}</div>`;
  document.getElementById('ledgerChron').innerHTML = chron;
}
