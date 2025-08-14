// =========================
// PokéRankr — starters.js
// =========================

// ----- Data: base-form starters (Gen 1–9)
const baseStarters = [
  { id: 1, name: "Bulbasaur" }, { id: 4, name: "Charmander" }, { id: 7, name: "Squirtle" },
  { id: 152, name: "Chikorita" }, { id: 155, name: "Cyndaquil" }, { id: 158, name: "Totodile" },
  { id: 252, name: "Treecko" }, { id: 255, name: "Torchic" }, { id: 258, name: "Mudkip" },
  { id: 387, name: "Turtwig" }, { id: 390, name: "Chimchar" }, { id: 393, name: "Piplup" },
  { id: 495, name: "Snivy" }, { id: 498, name: "Tepig" }, { id: 501, name: "Oshawott" },
  { id: 650, name: "Chespin" }, { id: 653, name: "Fennekin" }, { id: 656, name: "Froakie" },
  { id: 722, name: "Rowlet" }, { id: 725, name: "Litten" }, { id: 728, name: "Popplio" },
  { id: 810, name: "Grookey" }, { id: 813, name: "Scorbunny" }, { id: 816, name: "Sobble" },
  { id: 906, name: "Sprigatito" }, { id: 909, name: "Fuecoco" }, { id: 912, name: "Quaxly" }
];

// ----- Preferences
const includeShinies = localStorage.getItem("includeShinies") === "true";
const shinyOnly      = localStorage.getItem("shinyOnly") === "true";

// ----- Build pool
let pool = [];
if (shinyOnly) {
  pool = baseStarters.map(p => ({ ...p, shiny: true }));
} else if (includeShinies) {
  pool = [
    ...baseStarters.map(p => ({ ...p, shiny: false })),
    ...baseStarters.map(p => ({ ...p, shiny: true }))
  ];
} else {
  pool = baseStarters.map(p => ({ ...p, shiny: false }));
}

// ----- Sprite helpers (page UI images)
function getImageTag(id, shiny = false, alt = "") {
  const primary = shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

  const fallback = shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny/${id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`;

  return `<img src="${primary}" alt="${alt}" onerror="this.onerror=null;this.src='${fallback}'">`;
}

// ----- Utils
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const monKey = (p) => p ? `${p.id}-${p.shiny ? 1 : 0}` : "";


// ===== Save Slot layer (Starters only for now) =====
const SAVE_SLOTS_KEY = 'PR_SAVE_SLOTS_V1';

// Safe read/write helpers
function readSlots() {
  try {
    const arr = JSON.parse(localStorage.getItem(SAVE_SLOTS_KEY) || '[]');
    const out = Array.isArray(arr) ? arr.slice(0, 3) : [];
    while (out.length < 3) out.push(null);
    return out;
  } catch {
    return [null, null, null];
  }
}
function writeSlots(slots) {
  localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(slots));
}

function pluralize(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

function updatePostProgress() {
  const bar = document.getElementById("progress");
  const txt = document.getElementById("remaining-text");
  const container = document.getElementById("progress-container");
  if (!bar || !txt || !container) return;

  container.style.display = "block";

  const left = Math.max(0, post.totalMatches - post.doneMatches);
  const pct = post.totalMatches > 0 ? Math.round((post.doneMatches / post.totalMatches) * 100) : 0;

  bar.style.width = `${pct}%`;
  txt.textContent =
    (post.phase === 'RU' ? 'Runner-up bracket — ' : 'Third-place bracket — ')
    + `${left} matchups remaining`;
}

// Label helper for this run
function startersLabel() {
  const includeShinies = localStorage.getItem("includeShinies") === "true";
  const shinyOnly      = localStorage.getItem("shinyOnly") === "true";
  return `Starters – ${shinyOnly ? 'Shinies Only' : includeShinies ? 'Include Shinies' : 'No Shinies'}`;
}

// Minimal sprite snapshot for slot cards
function currentMatchupSnapshot() {
  if (!current || !next) return null;
  return {
    a: { id: current.id, name: current.name, shiny: !!current.shiny },
    b: { id: next.id,    name: next.name,    shiny: !!next.shiny  }
  };
}
function spriteUrl(id, shiny) {
  return shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

// Per‑Pokémon wins across RU/Third brackets (global)
const bracketWinsByMon = Object.create(null); // monKey -> count

// Serialize everything needed to resume this exact point
function serializeStarterSession() {
  const includeShinies = localStorage.getItem("includeShinies") === "true";
  const shinyOnly      = localStorage.getItem("shinyOnly") === "true";

  return {
    id: 'v1',
    label: startersLabel(),
    type: 'starters',
    context: { includeShinies, shinyOnly },
    progress: {
      totalMatchups: pool.length,
      completed: eliminated.length + (current ? (current.roundsSurvived || 0) : 0),
      remaining: remaining.length,
      currentIndex: eliminated.length
    },
    state: {
      pool,
      remaining,
      eliminated,
      current,
      next,
      leftHistory,
      // Persist KOTH outcome maps & round counter
      lostTo,           // monKey(loser) -> monKey(winner)
      roundIndex,       // monKey(loser) -> round number
      roundNum,         // last round number (int)
      // Persist per-mon bracket wins (for results after resume)
      bracketWinsByMon,
      // Persist post-bracket state (if any)
      postMode,         // null | 'RU' | 'THIRD'
      post: {
        phase: post.phase,
        currentRound: post.currentRound,
        nextRound: post.nextRound,
        index: post.index,
        totalMatches: post.totalMatches,
        doneMatches: post.doneMatches,
        ruWins: post.ruWins || 0,
        thirdWins: post.thirdWins || 0,
        runnerUp: post.runnerUp,
        third: post.third,
        // NEW: persist per-phase per-mon wins
        ruWinsByMon: post.ruWinsByMon,
        thirdWinsByMon: post.thirdWinsByMon
      }
    },
    currentMatchup: currentMatchupSnapshot(),
    meta: { savedAt: Date.now() }
  };
}

// Render the 3 slot cards in the modal (rows)
function renderSaveSlots() {
  const grid = document.getElementById('saveSlotsGrid');
  const slots = readSlots();

  grid.innerHTML = slots.map((slot, i) => {
    if (!slot) {
      return `
        <div class="slot-row" data-idx="${i}"
             style="border:1px solid #e5e7eb; border-radius:12px; padding:12px; background:#fff; display:flex; flex-direction:column; gap:8px;">
          <div>
            <div style="font-weight:600; color:#9ca3af;">Empty Slot</div>
            <div style="font-size:.85rem; color:#9ca3af;">No save in this slot</div>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px; color:#9ca3af;">Empty</div>
            <div style="display:flex; gap:8px;">
              <button data-action="save" data-idx="${i}" style="flex:1;">Save Here</button>
            </div>
          </div>
        </div>
      `;
    }

    const a = slot.currentMatchup?.a;
    const b = slot.currentMatchup?.b;
    const savedAt = new Date(slot.meta?.savedAt || Date.now()).toLocaleString();

    const remainingText = (() => {
      const rem =
        (slot.progress && typeof slot.progress.remaining === 'number')
          ? slot.progress.remaining
          : (Array.isArray(slot.state?.remaining) ? slot.state.remaining.length : null);
      return (rem !== null && rem !== undefined)
        ? `<div style="font-size:.85rem; color:#374151;">${rem} matchups remaining</div>`
        : '';
    })();

    return `
      <div class="slot-row" data-idx="${i}"
           style="border:1px solid #e5e7eb; border-radius:12px; padding:12px; background:#fff; display:flex; flex-direction:column; gap:8px;">
        <div>
          <div style="font-weight:600; color:#111827;">${slot.label || 'Saved Run'}</div>
          <div style="font-size:.85rem; color:#6b7280;">Saved ${savedAt}</div>
          ${remainingText}
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            ${a ? `<img src="${spriteUrl(a.id, a.shiny)}" alt="${a.name || ''}" width="56" height="56">` : ''}
            <span style="font-weight:700;">VS</span>
            ${b ? `<img src="${spriteUrl(b.id, b.shiny)}" alt="${b.name || ''}" width="56" height="56">` : ''}
          </div>
          <div style="display:flex; gap:8px;">
            <button data-action="save" data-idx="${i}" style="flex:1;">Overwrite</button>
            <button data-action="delete" data-idx="${i}" style="flex:1;">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.onclick = (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = +btn.dataset.idx;
    const action = btn.dataset.action;

    if (action === 'delete') {
      const slots = readSlots();
      if (slots[idx] && !confirm('Delete this save slot?')) return;
      slots[idx] = null;
      writeSlots(slots);
      renderSaveSlots();
      return;
    }
    if (action === 'save') {
      saveToSlot(idx);
    }
  };
}

function saveToSlot(idx) {
  const slots = readSlots();
  const payload = serializeStarterSession();
  if (slots[idx]) {
    const ok = confirm('Overwrite this slot with your current progress?');
    if (!ok) return;
  }
  slots[idx] = payload;
  writeSlots(slots);
  window.location.href = 'index.html';
}

// Load a saved Starters session into current page
function loadStarterSession(s) {
  if (!s || s.type !== 'starters') return;

  localStorage.setItem("includeShinies", s.context?.includeShinies ? 'true' : 'false');
  localStorage.setItem("shinyOnly",      s.context?.shinyOnly ? 'true' : 'false');

  pool        = (s.state?.pool || []).map(x => ({...x}));
  remaining   = (s.state?.remaining || []).map(x => ({...x}));
  eliminated  = (s.state?.eliminated || []).map(x => ({...x}));
  current     = s.state?.current ? {...s.state.current} : null;
  next        = s.state?.next    ? {...s.state.next}    : null;

  // Restore KOTH trackers
  if (s.state?.lostTo) {
    for (const k of Object.keys(lostTo)) delete lostTo[k];
    Object.assign(lostTo, s.state.lostTo);
  }
  if (s.state?.roundIndex) {
    for (const k of Object.keys(roundIndex)) delete roundIndex[k];
    Object.assign(roundIndex, s.state.roundIndex);
  }
  if (typeof s.state?.roundNum === 'number') roundNum = s.state.roundNum;

  // Restore post-bracket state
  postMode = s.state?.postMode || null;
  if (s.state?.post) {
    const P = s.state.post;
    post.phase        = P.phase || null;
    post.currentRound = Array.isArray(P.currentRound) ? P.currentRound.map(x => ({...x})) : [];
    post.nextRound    = Array.isArray(P.nextRound)    ? P.nextRound.map(x => ({...x}))    : [];
    post.index        = typeof P.index === 'number' ? P.index : 0;
    post.totalMatches = typeof P.totalMatches === 'number' ? P.totalMatches : 0;
    post.doneMatches  = typeof P.doneMatches  === 'number' ? P.doneMatches  : 0;
    post.ruWins       = typeof P.ruWins       === 'number' ? P.ruWins       : 0;
    post.thirdWins    = typeof P.thirdWins    === 'number' ? P.thirdWins    : 0;
    post.runnerUp     = P.runnerUp ? {...P.runnerUp} : null;
    post.third        = P.third    ? {...P.third}    : null;

    // NEW: restore per-phase maps if present
    if (P.ruWinsByMon)   post.ruWinsByMon   = { ...P.ruWinsByMon };
    if (P.thirdWinsByMon) post.thirdWinsByMon = { ...P.thirdWinsByMon };
  }

  if (s.state?.bracketWinsByMon) {
    for (const k of Object.keys(bracketWinsByMon)) delete bracketWinsByMon[k];
    Object.assign(bracketWinsByMon, s.state.bracketWinsByMon);
  }

  leftHistory.length = 0;
  (s.state?.leftHistory || []).forEach(p => leftHistory.push({...p}));

  // Route
  if (!current) {
    document.getElementById("result").innerHTML = `
      <h2>No Pokémon found</h2>
      <p>Try adjusting your settings.</p>
      <div class="button-group">
        <button onclick="window.location.href='index.html'">Back to Menu</button>
      </div>
    `;
    document.getElementById("result").style.display = "block";
    return;
  }

  if (postMode === 'RU' || postMode === 'THIRD') {
    displayMatchup();
    updatePostProgress();
    if (!next || !current) scheduleNextPostMatch();
    return;
  }

  if (!next && remaining.length === 0) {
    // One mon left after resume: go to RU bracket, not results
    startRunnerUpBracket(current);
    return;
  }

  displayMatchup();
  updateProgress();
  updateUndoButton();
}

// -------- Save modal UX parity with ranker --------
function isSaveModalOpen() {
  const m = document.getElementById('saveSlotModal');
  return !!m && m.style.display === 'flex';
}
function openSaveModal() {
  const m = document.getElementById('saveSlotModal');
  if (!m) return;
  document.body.style.overflow = 'hidden';
  m.style.display = 'flex';
  renderSaveSlots();
}
function closeSaveModal() {
  const m = document.getElementById('saveSlotModal');
  if (!m) return;
  m.style.display = 'none';
  document.body.style.overflow = '';
}

// Consolidated results computer (used by showWinner, saveResults, export)
function computeResults(finalWinner){
  const champion = leftHistory[leftHistory.length - 1] || finalWinner || current || null;
  if (!champion) return { champion: null, runnerUp: null, thirdPlace: null, honorable: null };

  const runnerUp   = post.runnerUp || null;
  const thirdPlace = post.third    || null;

  const placed = new Set([
    monKey(champion),
    runnerUp ? monKey(runnerUp) : null,
    thirdPlace ? monKey(thirdPlace) : null
  ].filter(Boolean));

  // Honorable Mention: highest unique survivals (>0), else hide
  const hmPool = eliminated.filter(p => !placed.has(monKey(p)));
  hmPool.sort(seedCmp);

  let honorable = null;
  if (hmPool.length) {
    const top = hmPool[0];
    const topSurvivals = (top?.roundsSurvived || 0);
    const tiedForTop = hmPool.filter(p => (p.roundsSurvived || 0) === topSurvivals);
    honorable = (topSurvivals > 0 && tiedForTop.length === 1) ? top : null;
  }

  return { champion, runnerUp, thirdPlace, honorable };
}

// ----- State
let remaining = shuffle([...pool]);
let eliminated = [];
let gameOver = false;

let current = remaining.pop();
let next    = remaining.pop();

if (current) current.roundsSurvived = 0;
if (next)    next.roundsSurvived    = 0;

const leftHistory = [];
if (current) leftHistory.push(current);

// --- Tracking for post‑tournament mini‑brackets ---
const lostTo = Object.create(null);      // monKey(loser) -> monKey(winner)
let roundNum = 0;                        // global match counter (main pass only)
const roundIndex = Object.create(null);  // monKey(loser) -> round number lost

// Post-bracket state (interactive)
let postMode = null; // null | 'RU' | 'THIRD'
const post = {
  phase: null,
  currentRound: [],
  nextRound: [],
  index: 0,
  totalMatches: 0,
  doneMatches: 0,
  ruWins: 0,
  thirdWins: 0,
  runnerUp: null,
  third: null,
  ruR1Pairs: new Set(),
  // per-bracket per-mon wins
  ruWinsByMon: Object.create(null),     // monKey -> wins in RU bracket
  thirdWinsByMon: Object.create(null),  // monKey -> wins in THIRD bracket
};

// Seeding comparator: higher survivals, then later loss
function seedCmp(a, b) {
  const sA = a?.roundsSurvived || 0, sB = b?.roundsSurvived || 0;
  if (sA !== sB) return sB - sA;
  const rA = roundIndex[monKey(a)] || 0, rB = roundIndex[monKey(b)] || 0;
  if (rA !== rB) return rB - rA;
  return String(a?.name||'').localeCompare(String(b?.name||''));
}

// Third reseeding: more RU bracket wins first, then seedCmp
function thirdSeedCmp(a, b) {
  const wa = bracketWinsByMon[monKey(a)] || 0;
  const wb = bracketWinsByMon[monKey(b)] || 0;
  if (wa !== wb) return wb - wa;
  return seedCmp(a, b);
}

// Helpers to pluck mons back from eliminated/current/next by key
function findByKey(key){
  if (!key) return null;
  if (current && monKey(current) === key) return current;
  if (next && monKey(next) === key) return next;
  const e = eliminated.find(p => monKey(p) === key);
  return e || null;
}

function pairKey(a, b) {
  const ak = monKey(a), bk = monKey(b);
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
}

// --- UNDO state ---
let history = [];
function snapshotState() {
  return {
    remaining: remaining.map(p => ({ ...p })),
    eliminated: eliminated.map(p => ({ ...p })),
    current: current ? { ...current } : null,
    next: next ? { ...next } : null,
    leftHistory: leftHistory.map(p => ({ ...p })),
  };
}
function restoreState(s) {
  remaining  = s.remaining.map(p => ({ ...p }));
  eliminated = s.eliminated.map(p => ({ ...p }));
  current    = s.current ? { ...s.current } : null;
  next       = s.next ? { ...s.next } : null;

  leftHistory.length = 0;
  leftHistory.push(...s.leftHistory.map(p => ({ ...p })));

  displayMatchup();
  updateProgress();
  updateUndoButton();
}
function updateUndoButton() {
  const btn = document.getElementById("btnUndo");
  if (btn) btn.disabled = history.length === 0 || !!postMode;
}
function undoLast() {
  if (history.length === 0 || postMode) return;
  const prev = history.pop();
  restoreState(prev);
  history = [];
  updateUndoButton();
}

// ----- Rendering (in-game)
function displayMatchup() {
  const leftEl  = document.getElementById("left");
  const rightEl = document.getElementById("right");

  if (!current && !next) {
    document.getElementById("matchup").style.display = "none";
    document.getElementById("remaining-text").textContent = "No Pokémon loaded.";
    return;
  }
  if (current && !next && remaining.length === 0 && !postMode) {
    showWinner(current);
    return;
  }

  leftEl.innerHTML = `
    ${getImageTag(current.id, current.shiny, current.name)}
    <p>${current.shiny ? "⭐ " : ""}${current.name}</p>
  `;
  rightEl.innerHTML = `
    ${getImageTag(next.id, next.shiny, next.name)}
    <p>${next.shiny ? "⭐ " : ""}${next.name}</p>
  `;
}
function updateProgress() {
  const total = pool.length;
  if (total <= 1) {
    document.getElementById("progress").style.width = "100%";
    document.getElementById("remaining-text").textContent = "Done!";
    return;
  }
  const seen = eliminated.length + 2;
  const remainingCount = remaining.length;
  const pct = Math.min(100, Math.round((seen / total) * 100));
  document.getElementById("progress").style.width = pct + "%";
  document.getElementById("remaining-text").textContent =
    `${remainingCount} matchups remaining`;
}

// ----- Game loop
function pick(side) {
  if (postMode) { handlePostPick(side); return; }
  if (gameOver) return;
  if (!current || !next) return;

  history.push(snapshotState());
  updateUndoButton();

  const prevLeft = current;
  const winner = side === "left" ? current : next;
  const loser  = side === "left" ? next    : current;

  // Record main-pass outcome (used to build post brackets)
  const wKeyMain = monKey(winner), lKeyMain = monKey(loser);
  lostTo[lKeyMain] = wKeyMain;
  roundNum += 1;
  roundIndex[lKeyMain] = roundNum;

  loser.roundsSurvived = loser.roundsSurvived || 0;
  eliminated.push(loser);
  winner.roundsSurvived = (winner.roundsSurvived || 0) + 1;

  if (monKey(winner) !== monKey(prevLeft)) {
    leftHistory.push(winner);
  }

  current = winner;

  if (remaining.length === 0) {
    startRunnerUpBracket(winner);
    return;
  }

  next = remaining.pop();
  next.roundsSurvived = 0;

  displayMatchup();
  updateProgress();
  updateUndoButton();
}

function startRunnerUpBracket(finalChampion){
  history = [];
  updateUndoButton();

  postMode = 'RU';
  post.phase = 'RU';

  // reset per-phase wins
  post.ruWins = 0;
  post.ruWinsByMon = Object.create(null);

  const champKey = monKey(finalChampion);
  // Build the pool: everyone who lost directly to the champion
  const lostKeys = Object.keys(lostTo).filter(k => lostTo[k] === champKey);
  const poolRU = lostKeys.map(findByKey).filter(Boolean);

  post.totalMatches = Math.max(0, poolRU.length - 1);
  post.doneMatches  = 0;
  post.thirdWins = 0; // keep third counter clean if resuming

  if (poolRU.length === 0) {
    post.runnerUp = [...eliminated].sort(seedCmp)[0] || null;
    return startThirdBracket(finalChampion);
  }
  if (poolRU.length === 1) {
    post.runnerUp = poolRU[0];
    return startThirdBracket(finalChampion);
  }

  const seededRU = [...poolRU].sort(seedCmp);
  post.nextRound = [];
  post.index = 0;

  // Top-seed bye for odd count → enters Round 2
  if (seededRU.length % 2 === 1) {
    const bye = seededRU.shift();   // highest seed
    post.nextRound.push(bye);       // pre-seed into next round
  }

  // Round 1 pairs
  post.currentRound = seededRU;

  // Record RU Round‑1 pairs to avoid rematches in Third bracket
  post.ruR1Pairs.clear();
  for (let i = 0; i < post.currentRound.length; i += 2) {
    const a = post.currentRound[i];
    const b = post.currentRound[i + 1];
    if (b) post.ruR1Pairs.add(pairKey(a, b));
  }

  updatePostProgress();
  scheduleNextPostMatch();
}

function buildPairsAvoidingRematch(sortedArr, avoidSet) {
  const arr = [...sortedArr];
  for (let i = 0; i < arr.length - 1; i += 2) {
    const a = arr[i];
    let b = arr[i + 1];
    if (!b) break;

    if (avoidSet.has(pairKey(a, b))) {
      for (let j = i + 2; j < arr.length; j++) {
        if (!arr[j]) continue;
        if (!avoidSet.has(pairKey(a, arr[j]))) {
          [arr[i + 1], arr[j]] = [arr[j], arr[i + 1]];
          break;
        }
      }
    }
  }
  return arr;
}

function startThirdBracket(finalChampion){
  postMode = 'THIRD';
  post.phase = 'THIRD';

  // reset per-phase wins
  post.thirdWins = 0;
  post.thirdWinsByMon = Object.create(null);

  const champKey = monKey(finalChampion);
  const ruKey = post.runnerUp ? monKey(post.runnerUp) : null;

  const lostToChampKeys = Object.keys(lostTo).filter(k => lostTo[k] === champKey);
  const lostToChampList = lostToChampKeys.map(findByKey).filter(Boolean);

  const lostToRunnerUp = ruKey
    ? Object.keys(lostTo).filter(k => lostTo[k] === ruKey).map(findByKey).filter(Boolean)
    : [];

  const poolThird = [
    ...lostToRunnerUp,
    ...lostToChampList.filter(p => monKey(p) !== ruKey)
  ];

  const placedKeys = new Set([champKey, ruKey].filter(Boolean));
  const dedup = [];
  const seen = new Set();
  for (const p of poolThird) {
    const k = monKey(p);
    if (placedKeys.has(k) || seen.has(k)) continue;
    seen.add(k);
    dedup.push(p);
  }

  if (dedup.length === 0) { post.third = null; return finishToResults(finalChampion); }
  if (dedup.length === 1) { post.third = dedup[0]; return finishToResults(finalChampion); }

  post.totalMatches = Math.max(0, dedup.length - 1);
  post.doneMatches  = 0;

  // Reseed by RU performance, then avoid RU Round‑1 rematches.
  const seeded = dedup.sort(thirdSeedCmp);

  post.nextRound = [];
  post.index = 0;

  // Top-seed bye for odd → enters Round 2
  let round1List = seeded;
  if (seeded.length % 2 === 1) {
    const bye = round1List.shift();
    post.nextRound.push(bye);
  }

  // Avoid RU Round‑1 rematches on Round‑1 list
  post.currentRound = buildPairsAvoidingRematch(round1List, post.ruR1Pairs);

  updatePostProgress();
  scheduleNextPostMatch();
}

function scheduleNextPostMatch(){
  // Finish a round -> roll into next or finish bracket
  while (post.index >= post.currentRound.length) {
    if (post.nextRound.length <= 1) {
      const bracketWinner = post.nextRound[0] || post.currentRound[0] || null;
      if (post.phase === 'RU') {
        post.runnerUp = bracketWinner;
        return startThirdBracket(leftHistory[leftHistory.length - 1]);
      } else {
        post.third = bracketWinner;
        return finishToResults(leftHistory[leftHistory.length - 1]);
      }
    }

    // Re-seed each round; for THIRD later rounds you may keep thirdSeedCmp or fall back to seedCmp.
    let seededNext = (post.phase === 'THIRD')
      ? post.nextRound.sort(thirdSeedCmp)
      : post.nextRound.sort(seedCmp);

    post.nextRound = [];
    post.index = 0;

    // Top-seed bye this round → enters the FOLLOWING round
    if (seededNext.length % 2 === 1) {
      const byeTop = seededNext.shift();
      post.nextRound.push(byeTop);
    }

    post.currentRound = seededNext;
    updatePostProgress();
  }

  // Schedule next pair in this round
  const i = post.index;
  const a = post.currentRound[i];
  const b = post.currentRound[i + 1];

  if (!b) {
    // Bye -> advance
    post.nextRound.push(a);
    post.index += 2;
    return scheduleNextPostMatch();
  }

  // Render bracket match in main UI
  current = a;
  next = b;
  displayMatchup();
  updatePostProgress();
}

function handlePostPick(side){
  const winner = (side === 'left') ? current : next;

  // Count bracket win for the actual mon (RU or THIRD only)
  const wKey = monKey(winner);
  bracketWinsByMon[wKey] = (bracketWinsByMon[wKey] || 0) + 1;

  if (post.phase === 'RU') {
    post.ruWins += 1;
    post.ruWinsByMon[wKey] = (post.ruWinsByMon[wKey] || 0) + 1;
  } else if (post.phase === 'THIRD') {
    post.thirdWins += 1;
    post.thirdWinsByMon[wKey] = (post.thirdWinsByMon[wKey] || 0) + 1;
  }

  post.doneMatches += 1;
  updatePostProgress();

  post.nextRound.push(winner);
  post.index += 2;

  scheduleNextPostMatch();
}

function finishToResults(finalChampion){
  showWinner(finalChampion);
}

function pluralize(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

// ----- Results (page UI)
function showWinner(finalWinner) {
  gameOver = true;
  document.removeEventListener("keydown", onKeydown);

  updateUndoButton();
  document.getElementById("btnUndo")?.setAttribute("disabled", true);

  document.getElementById("progress-container").style.display = "none";
  document.getElementById("matchup").style.display = "none";
  const controls = document.getElementById('ingame-controls');
  if (controls) controls.style.display = 'none';

  const { champion, runnerUp, thirdPlace, honorable } = computeResults(finalWinner);

// Helper to read bracket-only wins safely (uses per-phase maps if present)
function bracketWinsFor(title, mon) {
  const key = monKey(mon);
  if (title === "Runner-up") {
    return (post.ruWinsByMon && post.ruWinsByMon[key]) || 0;
  }
  if (title === "Third Place") {
    return (post.thirdWinsByMon && post.thirdWinsByMon[key]) || 0;
  }
  return 0;
}

const renderCard = (title, p) => {
  if (!p) return "";

 const survivedLine = `<p class="rounds-text">Survived ${pluralize(p.roundsSurvived || 0, "Round", "Rounds")}</p>`;

if (title === "Runner-up" || title === "Third Place") {
  let wins = 0;
  if (title === "Runner-up") {
    wins = (post.ruWinsByMon && post.ruWinsByMon[monKey(p)]) || 0;
  } else {
    wins = (post.thirdWinsByMon && post.thirdWinsByMon[monKey(p)]) || 0;
  }
  const winsLine = wins > 0
    ? `<p class="rounds-text">Won ${pluralize(wins, "Match", "Matches")}</p>`
    : `<p class="rounds-text">Auto-advanced</p>`;

    return `
      <div class="pokemon-card compact-card">
        ${getImageTag(p.id, p.shiny, p.name)}
        <p>${p.shiny ? "⭐ " : ""}${p.name}</p>
        ${survivedLine}
        ${winsLine}
        <p class="placement-tag">${title}</p>
      </div>
    `;
  }

  // Hon. Mention: only "Survived" but keep alignment with placeholder
  return `
    <div class="pokemon-card compact-card">
      ${getImageTag(p.id, p.shiny, p.name)}
      <p>${p.shiny ? "⭐ " : ""}${p.name}</p>
      ${survivedLine}
      <p class="rounds-text" style="visibility:hidden;">placeholder</p>
      <p class="placement-tag">${title}</p>
    </div>
  `;
};


  document.getElementById("result").innerHTML = `
    <h2>Your Favorite Starter is:</h2>
    <div class="champion-card">
      <div class="champion-image-wrapper">
        ${getImageTag(champion.id, champion.shiny, champion.name).replace('<img ', '<img class="champion-img" ')}
        <img src="confetti.gif" class="confetti" alt="Confetti">
      </div>
      <h3>${champion.shiny ? "⭐ " : ""}${champion.name}</h3>
      <p class="champion-text">🏆 Champion</p>
      <p class="rounds-text">Survived ${pluralize(champion.roundsSurvived || 0, "Round", "Rounds")}</p>
    </div>
    <div class="compact-grid">
      ${renderCard("Runner-up",   runnerUp)}
      ${renderCard("Third Place", thirdPlace)}
      ${renderCard("Hon. Mention", honorable)}
    </div>
    <div class="button-group">
      <button onclick="restart()">Start Over</button>
      <button onclick="window.location.href='index.html'">Back to Menu</button>
      <button onclick="saveResults()">Save Results</button>
      <button onclick="exportRankingImage()">Export Image</button>
    </div>
  `;
  document.getElementById("result").style.display = "block";
}

// Save to Saved Rankings page
function saveResults() {
  const { champion, runnerUp, thirdPlace, honorable } = computeResults();

  // Add bracket-only wins for RU/Third so Saved page can show them.
  const pack = (p, role) => {
    if (!p) return null;
    const obj = {
      id: p.id,
      name: p.name,
      shiny: !!p.shiny,
      roundsSurvived: p.roundsSurvived || 0
    };
    if (role === 'RU') {
      const key = monKey(p);
      obj.bracketWins  = (post.ruWinsByMon && post.ruWinsByMon[key]) || 0;
      obj.bracketTotal = typeof post.ruTotal === 'number' ? post.ruTotal : 0;
    } else if (role === 'THIRD') {
      const key = monKey(p);
      obj.bracketWins  = (post.thirdWinsByMon && post.thirdWinsByMon[key]) || 0;
      obj.bracketTotal = typeof post.thirdTotal === 'number' ? post.thirdTotal : 0;
    }
    // Champion & HM: no bracket fields
    return obj;
  };

  const category = "Starters";
  const comboKey = `${category}_${includeShinies}_${shinyOnly}`;
  const nowIso = new Date().toISOString();

  const savedRanking = {
    key: comboKey,
    lastModified: nowIso,
    date: nowIso,
    category,
    includeShinies,
    shinyOnly,
    champion:   pack(champion, 'CHAMP'),
    runnerUp:   pack(runnerUp, 'RU'),
    thirdPlace: pack(thirdPlace, 'THIRD'),
    honorable:  pack(honorable, 'HM')
  };

  let saved = [];
  try { saved = JSON.parse(localStorage.getItem("savedRankings") || "[]"); } catch {}
  saved = saved.filter(entry => (entry.key || entry.id) !== comboKey);
  saved.push(savedRanking);

  try {
    localStorage.setItem("savedRankings", JSON.stringify(saved));
    alert(`Saved! Your ${category} ranking (${shinyOnly ? "shiny only" : includeShinies ? "+ shinies" : "no shinies"}) has been updated.`);
  } catch (e) {
    console.error(e);
    alert("Could not save rankings (storage might be full or blocked).");
  }
}


function restart() { window.location.reload(); }

// Expose for onclick
window.pick = pick;

// Keyboard controls (block during results AND while save modal is open)
function onKeydown(e){
  if (gameOver || isSaveModalOpen()) return;
  if (e.key === "ArrowLeft")  pick("left");
  if (e.key === "ArrowRight") pick("right");
  if (e.key === "Backspace") { e.preventDefault(); undoLast(); }
}
document.addEventListener("keydown", onKeydown);
document.getElementById("btnUndo")?.addEventListener("click", undoLast);

// Save & Exit buttons
document.getElementById('btnSaveExit')?.addEventListener('click', openSaveModal);
document.getElementById('btnCancelSave')?.addEventListener('click', closeSaveModal);

// Optional: expose resume helper globally if we decide to deep-link
window._PR_loadStarterSession = loadStarterSession;

// Boot
if (!current) {
  document.getElementById("result").innerHTML = `
    <h2>No Pokémon found</h2>
    <p>Try adjusting your settings.</p>
    <div class="button-group">
      <button onclick="window.location.href='index.html'">Back to Menu</button>
    </div>
  `;
  document.getElementById("result").style.display = "block";
} else if (!next) {
  showWinner(current);
} else {
  displayMatchup();
  updateProgress();
  updateUndoButton();
}

// === Auto-resume if index.html set a pending slot ===
(function tryAutoResumeFromSlot(){
  const slotIdxStr = localStorage.getItem('PR_PENDING_RESUME_SLOT');
  if (!slotIdxStr) return;
  localStorage.removeItem('PR_PENDING_RESUME_SLOT');
  const idx = parseInt(slotIdxStr, 10);
  if (Number.isNaN(idx)) return;

  try {
    const slots = JSON.parse(localStorage.getItem('PR_SAVE_SLOTS_V1') || '[]');
    const s = Array.isArray(slots) ? slots[idx] : null;
    if (s && s.type === 'starters') {
      loadStarterSession(s);
    }
  } catch (e) {
    console.warn('Could not resume slot:', e);
  }
})();

/* ===========================
   Canvas Export (1080×1080)
   =========================== */

// Geometry
function fitContain(w, h, maxW, maxH){
  const r = Math.min(maxW / w, maxH / h);
  return { w: Math.round(w * r), h: Math.round(h * r) };
}
function displayNameCanvas(p){
  return (p.shiny ? '⭐ ' : '') + p.name;
}

// Sprite URLs for export (art first, then “home” fallback)
function spriteUrls(id, shiny){
  const baseOA   = shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  const baseHome = shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny/${id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`;
  return [baseOA, baseHome];
}

// Fetch → ImageBitmap (avoids canvas taint)
async function loadSpriteBitmap(p){
  const urls = spriteUrls(p.id, !!p.shiny);
  for (const url of urls){
    try {
      const resp = await fetch(url, { mode: 'cors', cache: 'no-store' });
      if (!resp.ok) continue;
      const blob = await resp.blob();
      return await createImageBitmap(blob);
    } catch {}
  }
  return null;
}

// Draw a Pokémon (image + name + tag), optional card + multiple stat lines
async function drawMon(ctx, {
  bmp, name, x, y, maxW, maxH, tag, mini=false,
  card=false, lines = [], // NEW: lines is an array of strings; replaces single "rounds"
}){
  function roundedPath(px, py, w, h, r){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(px+rr, py);
    ctx.arcTo(px+w, py,   px+w, py+h, rr);
    ctx.arcTo(px+w, py+h, px,   py+h, rr);
    ctx.arcTo(px,   py+h, px,   py,   rr);
    ctx.arcTo(px,   py,   px+w, py,   rr);
    ctx.closePath();
  }

  let nameY, tagY;

  if (card){
    const CARD_W = 280, CARD_H = 300;
    const cx = x - CARD_W/2, cy = y - CARD_H/2;

    ctx.save();
    ctx.shadowColor = 'rgba(27,56,120,.15)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#ffffff';
    roundedPath(cx, cy, CARD_W, CARD_H, 22);
    ctx.fill();
    ctx.restore();

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#d2deff';
    roundedPath(cx, cy, CARD_W, CARD_H, 22);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#eef3ff';
    roundedPath(cx+3, cy+3, CARD_W-6, CARD_H-6, 18);
    ctx.stroke();

    const PAD_TOP = 18;
    const IMG_MAX_W = Math.min(maxW || 200, 200);
    const IMG_MAX_H = Math.min(maxH || 160, 160);
    if (bmp){
      const s = fitContain(bmp.width, bmp.height, IMG_MAX_W, IMG_MAX_H);
      const imgX = x - s.w/2;
      const imgY = cy + PAD_TOP;
      ctx.drawImage(bmp, imgX, imgY, s.w, s.h);
      nameY = imgY + s.h + 18;
      tagY  = nameY + 28;
    } else {
      nameY = cy + 190;
      tagY  = nameY + 28;
    }
  } else {
    let imgBottom = y;
    if (bmp){
      const s = fitContain(bmp.width, bmp.height, maxW, maxH);
      const imgX = x - s.w/2;
      const imgY = y - s.h/2;
      ctx.drawImage(bmp, imgX, imgY, s.w, s.h);
      imgBottom = imgY + s.h;
    }
    const GAP_NAME = 32;
    const GAP_TAG  = 30;
    nameY = imgBottom + GAP_NAME;
    tagY  = nameY + GAP_TAG;
  }

  // Name
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0d1b2a';
  ctx.font = mini ? '700 24px Poppins, sans-serif' : '800 32px Poppins, sans-serif';
  ctx.fillText(name, x, nameY);

  // Placement tag
  if (tag){
    ctx.fillStyle = '#ffb200';
    ctx.font = mini ? '800 20px Poppins, sans-serif' : '800 24px Poppins, sans-serif';
    ctx.fillText(tag, x, tagY);
  }

  // Stat lines (each on its own line)
  const startY = tag ? (tagY + (mini ? 24 : 26)) : (nameY + (mini ? 24 : 28));
  const lineGap = mini ? 22 : 24;
  ctx.fillStyle = '#5a6a8a';
  ctx.font = mini ? '700 18px Poppins, sans-serif' : '700 20px Poppins, sans-serif';
  lines.forEach((ln, i) => {
    if (!ln) return;
    ctx.fillText(ln, x, startY + i * lineGap);
  });
}


async function exportRankingImage(){
  const { champion, runnerUp, thirdPlace, honorable } = computeResults();
  if (!champion) { alert("No results to export yet."); return; }

  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');

  try { if (document.fonts?.ready) await document.fonts.ready; } catch {}

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#e9f0ff');
  grad.addColorStop(1, '#d5e3ff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.lineWidth = 16;
  ctx.strokeStyle = '#d2deff';
  ctx.strokeRect(8, 8, size - 16, size - 16);

  const TITLE = 'PokéRankr — Starters';
  const MODE  = shinyOnly ? 'Shiny-only' : (includeShinies ? '+Shinies' : 'No Shinies');

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0d1b2a';
  ctx.font = '800 44px Poppins, sans-serif';
  ctx.fillText(TITLE, size/2, 92);

  ctx.fillStyle = '#5a6a8a';
  ctx.font = '700 28px Poppins, sans-serif';
  ctx.fillText(MODE, size/2, 148);

  const [champBmp, ruBmp, thirdBmp, hmBmp] = await Promise.all([
    loadSpriteBitmap(champion),
    runnerUp   ? loadSpriteBitmap(runnerUp)   : Promise.resolve(null),
    thirdPlace ? loadSpriteBitmap(thirdPlace) : Promise.resolve(null),
    honorable  ? loadSpriteBitmap(honorable)  : Promise.resolve(null),
  ]);

  const CHAMP_MAX = 420;
  let champY = 380;
  if (champBmp){
    const s = fitContain(champBmp.width, champBmp.height, CHAMP_MAX, CHAMP_MAX);
    const minTop = 160;
    const top = champY - s.h/2;
    if (top < minTop) champY = minTop + s.h/2;
  }
  await drawMon(ctx, {
  bmp: champBmp,
  name: displayNameCanvas(champion),
  x: size/2, y: champY, maxW: CHAMP_MAX, maxH: CHAMP_MAX,
  tag: '🏆 Champion',
  lines: [ `Survived ${pluralize(champion.roundsSurvived || 0, "Round", "Rounds")}` ]
});

  // Build lines for cards to mirror UI
function buildLinesFor(title, mon) {
  if (!mon) return [];
  const survived = `Survived ${pluralize(mon.roundsSurvived || 0, "Round", "Rounds")}`;

  if (title === 'Runner-up') {
    const wins  = (post.ruWinsByMon?.[monKey(mon)] || 0);
    const total = (typeof post.ruTotal === 'number' ? post.ruTotal : 0);
    const auto  = (wins === 0 && total === 0);
    return auto ? [survived, 'Auto-advanced']
                : [survived, `Won ${pluralize(wins, "Match", "Matches")}`];
  }

  if (title === 'Third Place') {
    const wins  = (post.thirdWinsByMon?.[monKey(mon)] || 0);
    const total = (typeof post.thirdTotal === 'number' ? post.thirdTotal : 0);
    const auto  = (wins === 0 && total === 0);
    return auto ? [survived, 'Auto-advanced']
                : [survived, `Won ${pluralize(wins, "Match", "Matches")}`];
  }

  // Hon. Mention
  return [survived];
}

  const rowY = 840;
const slotData = [
  runnerUp   ? { bmp: ruBmp,    mon: runnerUp,   title: 'Runner-up'   } : null,
  thirdPlace ? { bmp: thirdBmp, mon: thirdPlace, title: 'Third Place' } : null,
  honorable  ? { bmp: hmBmp,    mon: honorable,  title: 'Hon. Mention'} : null,
].filter(Boolean);

if (slotData.length > 0){
  const spacing = 300;
  const startX = size/2 - ((slotData.length - 1) * spacing)/2;

  for (let i=0;i<slotData.length;i++){
    const sd = slotData[i];
    await drawMon(ctx, {
      bmp: sd.bmp,
      name: displayNameCanvas(sd.mon),
      x: startX + i*spacing, y: rowY,
      maxW: 200, maxH: 160,
      tag: sd.title,
      mini: true,
      card: true,
      lines: buildLinesFor(sd.title, sd.mon) // NEW: multiple stat lines
    });
  }
}

  canvas.toBlob(blob => {
    if (!blob) { alert('Export failed.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pokerankr-starters-${Date.now()}.png`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
  }, 'image/png');
}
