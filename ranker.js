// =========================
// PokéRankr — ranker.js
// Purpose: run generic rankings (Gen 1 & Gen 2)
// =========================

// ----- Title / Mode label
(function setTitle(){
  const titleEl = document.getElementById("modeTitle");
  const rc = window.rankConfig || {};
  let label = "PokéRankr";

  if (rc?.category === "generation") {
    const g = rc?.filters?.generation;
    const regionByGen = {
      1:"Kanto", 2:"Johto", 3:"Hoenn", 4:"Sinnoh", 5:"Unova",
      6:"Kalos", 7:"Alola", 8:"Galar/Hisui", 9:"Paldea"
    };
    if (g) label = `Generation ${g} (${regionByGen[g] || "??"})`;
  }

  titleEl.textContent = label + (window.shinyOnly ? " • Shiny-only" : window.includeShinies ? " • +Shinies" : " • No Shinies");
})();

// ----- Pool builder (Gen 1–2)
function buildGenPool(gen){
  const ranges = {
    1:[1,151],
    2:[152,251],
    3:[252,386],
    4:[387,493],
    5:[494,649],
    6:[650,721],
    7:[722,809],
    8:[810,905],
    9:[906,1025],
  };
  const [start, end] = ranges[gen] || [];
  if (!start) return [];

  const ids = Array.from({length: end - start + 1}, (_,i)=> start + i);
  const mk = (id, shiny)=> ({ id, name: null, shiny });

  if (window.shinyOnly)         return ids.map(id => mk(id, true));
  if (window.includeShinies)    return [...ids.map(id => mk(id,false)), ...ids.map(id => mk(id,true))];
  return ids.map(id => mk(id,false));
}

// ----- Choose pool from config
let pool = [];
if (window.rankConfig?.category === "generation") {
  const g = window.rankConfig?.filters?.generation;
  pool = buildGenPool(g);
}

if (!pool.length) {
  document.getElementById("matchup").style.display = "none";
  document.getElementById("progress-container").style.display = "none";
  const res = document.getElementById("result");
  res.innerHTML = `
    <h2>Nothing to rank</h2>
    <p>Go back and pick <strong>Generation → Gen 1 or Gen 2</strong>.</p>
    <div class="button-group">
      <button onclick="window.location.href='index.html'">Back to Menu</button>
    </div>
  `;
  res.style.display = "block";
  throw new Error("No pool selected for ranker.js");
}

// ===== Save Slots (shared schema) =====
const SAVE_SLOTS_KEY = 'PR_SAVE_SLOTS_V1';

function slotsRead(){
  try {
    const arr = JSON.parse(localStorage.getItem(SAVE_SLOTS_KEY) || '[]');
    const out = Array.isArray(arr) ? arr.slice(0,3) : [];
    while (out.length < 3) out.push(null);
    return out;
  } catch { return [null,null,null]; }
}
function slotsWrite(slots){
  localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(slots));
}

// Label for this ranker session (match title bullet style)
function rankerLabel(){
  const rc = window.rankConfig || {};
  let label = "PokéRankr";
  if (rc?.category === "generation") {
    const g = rc?.filters?.generation;
    const regionByGen = {
      1:"Kanto",2:"Johto",3:"Hoenn",4:"Sinnoh",5:"Unova",
      6:"Kalos",7:"Alola",8:"Galar/Hisui",9:"Paldea"
    };
    if (g) label = `Generation ${g} (${regionByGen[g] || "??"})`;
  }
  return label + (window.shinyOnly ? " • Shiny-only" : window.includeShinies ? " • +Shinies" : " • No Shinies");
}

function spriteUrl(id, shiny){
  return shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

// ----- Image helper (UI)
function getImageTag(id, shiny=false, alt=""){
  const primary  = spriteUrl(id, shiny);
  const fallback = shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny/${id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`;
  return `<img src="${primary}" alt="${alt}" onerror="this.onerror=null;this.src='${fallback}'">`;
}

// ----- Name cache (localStorage) + helpers
const NAME_CACHE_KEY = "dexNames";
const nameCache = (() => {
  try { return JSON.parse(localStorage.getItem(NAME_CACHE_KEY) || "{}"); }
  catch { return {}; }
})();
function saveNameCache(){
  try { localStorage.setItem(NAME_CACHE_KEY, JSON.stringify(nameCache)); } catch {}
}
function titleize(s){ return (s||"").split("-").map(w=>w? w[0].toUpperCase()+w.slice(1):w).join("-"); }

// UI display name (uses p.name, then cache, else #NNN)
function displayName(p){
  const nm = p.name || nameCache[p.id];
  return (p.shiny ? "⭐ " : "") + (nm || `#${String(p.id).padStart(3,"0")}`);
}

// Lazy fetch for on-screen labels (non-blocking)
async function ensureName(id){
  if (nameCache[id]) return;
  try {
    const resp = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`, { cache: 'force-cache' });
    if (!resp.ok) return;
    const data = await resp.json();
    const pretty = titleize(data?.name || "");
    nameCache[id] = pretty || `#${String(id).padStart(3,"0")}`;
    saveNameCache();
    updateLabelsIfVisible(id);
  } catch {}
}

// ensure a list of mons have names (used by exporter)
async function ensureNames(list){
  const mons = (list || []).filter(Boolean);
  await Promise.all(mons.map(async p => {
    if (p.name) return;
    if (nameCache[p.id]) { p.name = nameCache[p.id]; return; }
    try {
      const resp = await fetch(`https://pokeapi.co/api/v2/pokemon/${p.id}`, { cache: 'force-cache' });
      const data = await resp.json();
      const nm = titleize(data?.name || "");
      p.name = nm || `#${String(p.id).padStart(3,"0")}`;
      nameCache[p.id] = p.name;
      saveNameCache();
    } catch {
      p.name = `#${String(p.id).padStart(3,"0")}`;
    }
  }));
}

function updateLabelsIfVisible(id){
  const leftP  = document.querySelector("#left p");
  const rightP = document.querySelector("#right p");
  if (leftP  && leftP.dataset.id == id && current) leftP.textContent  = displayName(current);
  if (rightP && rightP.dataset.id == id && next)    rightP.textContent = displayName(next);
}

// ----- Utils
function shuffle(a){
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
const key = (p) => p ? `${p.id}-${p.shiny?1:0}` : "";

// --- Shared helpers ---
function pluralize(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

// Keep scroll position stable across DOM updates (iOS Safari safe)
function withScrollLock(run) {
  const y = window.scrollY;
  run();
  // restore on next frame so Safari doesn't animate
  requestAnimationFrame(() => window.scrollTo({ top: y, left: 0, behavior: 'instant' }));
}

// monKey alias for compatibility with starters.js snippets
const monKey = (p) => key(p);

// --- Post-tournament global win map (used for THIRD seeding) ---
const bracketWinsByMon = Object.create(null); // monKey -> count

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
  // optional totals (used by exporter “Auto-advanced” label)
  ruTotal: 0,
  thirdTotal: 0,
};

// Seeding comparator: higher survivals, then later loss, then name
function seedCmp(a, b) {
  const sA = a?.roundsSurvived || 0, sB = b?.roundsSurvived || 0;
  if (sA !== sB) return sB - sA;
  const rA = roundIndex[monKey(a)] || 0, rB = roundIndex[monKey(b)] || 0;
  if (rA !== rB) return rB - rA;
  return String(a?.name||'').localeCompare(String(b?.name||'')); // stable tiebreak
}

// Third reseeding: more RU bracket wins first, then seedCmp
function thirdSeedCmp(a, b) {
  const wa = bracketWinsByMon[monKey(a)] || 0;
  const wb = bracketWinsByMon[monKey(b)] || 0;
  if (wa !== wb) return wb - wa;
  return seedCmp(a, b);
}

function pairKey(a, b) {
  const ak = monKey(a), bk = monKey(b);
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
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


// ----- State
let remaining = shuffle([...pool]);
let eliminated = [];
let current = remaining.pop() || null;
let next    = remaining.pop()   || null;
if (current) current.roundsSurvived = 0;
if (next)    next.roundsSurvived    = 0;

const leftHistory = [];
if (current) leftHistory.push(current);

// Undo stack
let history = [];
function snapshotState(){
  return {
    remaining: remaining.map(p=>({...p})),
    eliminated: eliminated.map(p=>({...p})),
    current: current ? {...current}:null,
    next:    next    ? {...next}:null,
    leftHistory: leftHistory.map(p=>({...p})),
  };
}
function restoreState(s){
  remaining  = s.remaining.map(p=>({...p}));
  eliminated = s.eliminated.map(p=>({...p}));
  current    = s.current ? {...s.current} : null;
  next       = s.next    ? {...s.next}    : null;
  leftHistory.length = 0;
  leftHistory.push(...s.leftHistory.map(p=>({...p})));
  displayMatchup();
  updateProgress();
  updateUndoButton();
}
function updateUndoButton(){
  const btn = document.getElementById("btnUndo");
  if (btn) btn.disabled = (history.length === 0) || !!postMode;
}
function undoLast(){
  if (!history.length) return;
  const prev = history.pop();
  restoreState(prev);
  history = []; // single-level undo
  updateUndoButton();
}

// ----- Save & Exit (serializer + modal)
function serializeRankerSession(){
  const rc = window.rankConfig || {};
  return {
    id: 'v1',
    type: 'ranker',
    label: rankerLabel(),
    context: {
      config: rc,
      includeShinies: !!window.includeShinies,
      shinyOnly: !!window.shinyOnly,
    },
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
      // Persist KOTH trackers & round counter
      lostTo,
      roundIndex,
      roundNum,
      // Persist per-mon bracket wins (for results after resume)
      bracketWinsByMon,
      // Persist post-bracket state (if any)
      postMode,
      post: {
        phase: post.phase,
        currentRound: post.currentRound,
        nextRound: post.nextRound,
        index: post.index,
        totalMatches: post.totalMatches,
        doneMatches: post.doneMatches,
        ruWins: post.ruWins,
        thirdWins: post.thirdWins,
        runnerUp: post.runnerUp,
        third: post.third,
        ruWinsByMon: post.ruWinsByMon,
        thirdWinsByMon: post.thirdWinsByMon,
        ruTotal: post.ruTotal,
        thirdTotal: post.thirdTotal,
      }
    },
    currentMatchup: (current && next) ? {
      a: { id: current.id, name: current.name || nameCache[current.id], shiny: !!current.shiny },
      b: { id: next.id,    name: next.name    || nameCache[next.id],    shiny: !!next.shiny }
    } : null,
    meta: { savedAt: Date.now() }
  };
}

function renderSaveSlots(){
  const grid = document.getElementById('saveSlotsGrid');
  const slots = slotsRead();

  grid.innerHTML = slots.map((slot, i) => {
    const remainingText = (() => {
      const rem =
        (slot?.progress && typeof slot.progress.remaining === 'number')
          ? slot.progress.remaining
          : (Array.isArray(slot?.state?.remaining) ? slot.state.remaining.length : null);
      return (rem !== null && rem !== undefined)
        ? `<div style="text-align:center; font-size:.85rem; color:#374151; margin-top:6px;">${rem} matchups remaining</div>`
        : '';
    })();

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

    return `
      <div class="slot-row" data-idx="${i}"
           style="border:1px solid #e5e7eb; border-radius:12px; padding:12px; background:#fff; display:flex; flex-direction:column; gap:8px;">
        <div>
          <div style="font-weight:600; color:#111827;">${slot.label || 'Saved Run'}</div>
          <div style="font-size:.85rem; color:#6b7280;">Saved ${savedAt}</div>
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
        ${remainingText}
      </div>
    `;
  }).join('');

  // Clicks
  grid.onclick = (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = +btn.dataset.idx;
    const action = btn.dataset.action;
    if (action === 'delete') {
      const slots = slotsRead();
      if (slots[idx] && !confirm('Delete this save slot?')) return;
      slots[idx] = null;
      slotsWrite(slots);
      renderSaveSlots();
      return;
    }
    if (action === 'save') {
      saveToSlot(idx);
    }
  };
}

function saveToSlot(idx){
  const slots = slotsRead();
  const payload = serializeRankerSession();
  if (slots[idx]) {
    const ok = confirm('Overwrite this slot with your current progress?');
    if (!ok) return;
  }
  slots[idx] = payload;
  slotsWrite(slots);
  window.location.href = 'index.html';
}

// Modal helpers (lock scroll; used to block key input while open)
function isSaveModalOpen(){
  const m = document.getElementById('saveSlotModal');
  return !!m && m.style.display === 'flex';
}
function openSaveModal(){
  const m = document.getElementById('saveSlotModal');
  if (!m) return;
  document.body.style.overflow = 'hidden';
  m.style.display = 'flex';
  renderSaveSlots();
}
function closeSaveModal(){
  const m = document.getElementById('saveSlotModal');
  if (!m) return;
  m.style.display = 'none';
  document.body.style.overflow = '';
}

// Wire buttons (added in ranker.html)
document.getElementById('btnSaveExit')?.addEventListener('click', openSaveModal);
document.getElementById('btnCancelSave')?.addEventListener('click', closeSaveModal);

// ----- Rendering
function labelHTML(p){
  return `<p data-id="${p.id}">${displayName(p)}</p>`;
}
function displayMatchup(){
  const leftEl  = document.getElementById("left");
  const rightEl = document.getElementById("right");

  if (!current && !next){
    document.getElementById("matchup").style.display = "none";
    document.getElementById("remaining-text").textContent = "No Pokémon loaded.";
    return;
  }
  if (current && !next && remaining.length === 0){
    showWinner(current);
    return;
  }

  leftEl.innerHTML  = `${getImageTag(current.id, current.shiny)}${labelHTML(current)}`;
  rightEl.innerHTML = `${getImageTag(next.id,    next.shiny)}${labelHTML(next)}`;

  // kick off lazy name fetches (non-blocking)
  ensureName(current.id);
  ensureName(next.id);
}
function updateProgress(){
  const total = pool.length;
  if (total <= 1){
    document.getElementById("progress").style.width = "100%";
    document.getElementById("remaining-text").textContent = "Done!";
    return;
  }
  const seen = eliminated.length + 2;
  const remainingCount = remaining.length;
  const pct = Math.min(100, Math.round((seen/total)*100));
  document.getElementById("progress").style.width = pct + "%";
  document.getElementById("remaining-text").textContent =
    `${remainingCount} matchups remaining`;
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

// ----- Input control
let gameOver = false;
function onKeydown(e){
  if (gameOver || isSaveModalOpen()) return; // block picks while modal open
  if (e.key === "ArrowLeft")  pick("left");
  if (e.key === "ArrowRight") pick("right");
  if (e.key === "Backspace") { e.preventDefault(); undoLast(); }
}
document.addEventListener("keydown", onKeydown);
document.getElementById("btnUndo")?.addEventListener("click", undoLast);

// ----- Game loop
function pick(side){
  if (postMode) { handlePostPick(side); return; }
  if (gameOver) return;
  if (!current || !next) return;

  history.push(snapshotState());
  updateUndoButton();

  const prevLeft = current;
  const winner = (side === "left") ? current : next;
  const loser  = (side === "left") ? next    : current;

  // Record main-pass outcome (used to build post brackets)
  const wKeyMain = monKey(winner), lKeyMain = monKey(loser);
  lostTo[lKeyMain] = wKeyMain;
  roundNum += 1;
  roundIndex[lKeyMain] = roundNum;

  loser.roundsSurvived  = loser.roundsSurvived  || 0;
  eliminated.push(loser);
  winner.roundsSurvived = (winner.roundsSurvived|| 0) + 1;

  if (monKey(winner) !== monKey(prevLeft)) leftHistory.push(winner);
  current = winner;

  if (remaining.length === 0){
    startRunnerUpBracket(winner);
    return;
  }
  next = remaining.pop();
  next.roundsSurvived = 0;

withScrollLock(() => {
  displayMatchup();
  updateProgress();
  updateUndoButton();
});
}

function startRunnerUpBracket(finalChampion){
  history = [];
  updateUndoButton();

  postMode = 'RU';
  post.phase = 'RU';
  post.ruWins = 0;
  post.ruWinsByMon = Object.create(null);

    const champKey = monKey(finalChampion);

  // --- Build base RU pool: everyone who lost directly to the champion
  const lostKeys = Object.keys(lostTo).filter(k => lostTo[k] === champKey);
  let poolRU = lostKeys.map(k => {
    // try to find the actual mon object from current/next/eliminated
    if (current && monKey(current) === k) return current;
    if (next && monKey(next) === k) return next;
    return eliminated.find(p => monKey(p) === k);
  }).filter(Boolean);

  // De-duplicate RU pool by monKey to prevent mirror matches
{
  const seen = new Set();
  poolRU = poolRU.filter(p => {
    const k = monKey(p);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}


  // --- Inject Honorable Mention (highest unique roundsSurvived > 0), if eligible
  // At this moment, "placed" is only the champion.
  const placedNow = new Set([champKey]);

  // Build HM candidate like computeResults:
  //  - exclude placed
  //  - sort by seedCmp (roundsSurvived desc, later loss later, then name)
  //  - require unique top on roundsSurvived and > 0
  const hmPool = eliminated.filter(p => !placedNow.has(monKey(p)));
  hmPool.sort(seedCmp);

  let hmCandidate = null;
  if (hmPool.length) {
    const top = hmPool[0];
    const topSurvivals = (top?.roundsSurvived || 0);
    const tiedForTop = hmPool.filter(p => (p.roundsSurvived || 0) === topSurvivals);
    if (topSurvivals > 0 && tiedForTop.length === 1) {
      hmCandidate = top;
    }
  }

  // If we have a valid HM and it's not already in RU, add it.
  if (hmCandidate) {
    const hmKey = monKey(hmCandidate);
    const inRU = poolRU.some(p => monKey(p) === hmKey);
    if (!inRU) poolRU.push(hmCandidate);
  }

  // --- Proceed as before
  post.totalMatches = Math.max(0, poolRU.length - 1);
  post.doneMatches  = 0;
  post.ruTotal      = post.totalMatches;

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

  // If odd, top seed gets a bye into next round (same as today)
let round1List = [...seededRU];
if (round1List.length % 2 === 1) {
  const bye = round1List.shift();         // highest seed gets bye
  post.nextRound.push(bye);
}

// Build 1 vs N, 2 vs N-1, ...
const pairs = [];
for (let i = 0, j = round1List.length - 1; i < j; i++, j--) {
  pairs.push(round1List[i], round1List[j]);
}

// If we somehow have a leftover (shouldn’t with even count), push it forward.
if (round1List.length % 2 === 1) {
  post.nextRound.push(round1List[Math.floor(round1List.length / 2)]);
  // (But with the bye above, this case won’t happen.)
}

post.currentRound = pairs;   // now top seed is in the first visible match (or byed)

  if (seededRU.length % 2 === 1) {
    const bye = seededRU.shift();   // highest seed
    post.nextRound.push(bye);       // pre-seed into next round
  }

  post.currentRound = seededRU;

  post.ruR1Pairs.clear();
  for (let i = 0; i < post.currentRound.length; i += 2) {
    const a = post.currentRound[i];
    const b = post.currentRound[i + 1];
    if (b) post.ruR1Pairs.add(pairKey(a, b));
  }

  updatePostProgress();
  scheduleNextPostMatch();
}

function startThirdBracket(finalChampion){
  postMode = 'THIRD';
  post.phase = 'THIRD';
  post.thirdWins = 0;
  post.thirdWinsByMon = Object.create(null);

  const champKey = monKey(finalChampion);
  const ruKey = post.runnerUp ? monKey(post.runnerUp) : null;

  const lostToChampKeys = Object.keys(lostTo).filter(k => lostTo[k] === champKey);
  const lostToChampList = lostToChampKeys.map(k => {
    if (current && monKey(current) === k) return current;
    if (next && monKey(next) === k) return next;
    return eliminated.find(p => monKey(p) === k);
  }).filter(Boolean);

  const lostToRunnerUp = ruKey
    ? Object.keys(lostTo).filter(k => lostTo[k] === ruKey).map(k => {
        if (current && monKey(current) === k) return current;
        if (next && monKey(next) === k) return next;
        return eliminated.find(p => monKey(p) === k);
      }).filter(Boolean)
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
  post.thirdTotal   = post.totalMatches;

  const seeded = dedup.sort(thirdSeedCmp);
  post.nextRound = [];
  post.index = 0;

  let round1List = seeded;
  if (seeded.length % 2 === 1) {
    const bye = round1List.shift();
    post.nextRound.push(bye);
  }

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

    // Re-seed each round
    let seededNext = (post.phase === 'THIRD')
      ? post.nextRound.sort(thirdSeedCmp)
      : post.nextRound.sort(seedCmp);

    post.nextRound = [];
    post.index = 0;

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

  // Guard against accidental mirror pair (treat as a bye)
if (a && b && monKey(a) === monKey(b)) {
  post.nextRound.push(a);
  post.index += 2;
  return scheduleNextPostMatch();
}


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

// ----- Results + save
function showWinner(finalWinner){
  gameOver = true;
  document.removeEventListener("keydown", onKeydown);
  history = [];

  document.getElementById("btnUndo")?.setAttribute("disabled", true);
  const controls = document.getElementById("ingame-controls");
  if (controls) controls.style.display = "none";

  const leftEl  = document.getElementById("left");
  const rightEl = document.getElementById("right");
  if (leftEl)  leftEl.style.pointerEvents  = "none";
  if (rightEl) rightEl.style.pointerEvents = "none";

  document.getElementById("progress-container").style.display = "none";
  document.getElementById("matchup").style.display = "none";

  const { champion, runnerUp, thirdPlace, honorable } = computeResults(finalWinner);

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
      let wins = bracketWinsFor(title, p);
      const total = (title === "Runner-up") ? (post.ruTotal || 0) : (post.thirdTotal || 0);
      const winsLine = (wins > 0)
        ? `<p class="rounds-text">Won ${pluralize(wins, "Match", "Matches")}</p>`
        : `<p class="rounds-text">Auto-advanced</p>`;

      return `
        <div class="pokemon-card compact-card">
          ${getImageTag(p.id, p.shiny)}
          <p>${displayName(p)}</p>
          ${survivedLine}
          ${total === 0 ? `<p class="rounds-text">Auto-advanced</p>` : winsLine}
          <p class="placement-tag">${title}</p>
        </div>
      `;
    }

    // Honorable: keep alignment with hidden placeholder line
    return `
      <div class="pokemon-card compact-card">
        ${getImageTag(p.id, p.shiny)}
        <p>${displayName(p)}</p>
        ${survivedLine}
        <p class="rounds-text" style="visibility:hidden;">placeholder</p>
        <p class="placement-tag">${title}</p>
      </div>
    `;
  };

  const g = window.rankConfig?.filters?.generation || 1;

  document.getElementById("result").innerHTML = `
    <h2>Your Favorite (Gen ${g}) is:</h2>
    <div class="champion-card">
      <div class="champion-image-wrapper">
        ${getImageTag(champion.id, champion.shiny).replace('<img ', '<img class="champion-img" ')}
        <img src="confetti.gif" class="confetti" alt="Confetti">
      </div>
      <h3>${displayName(champion)}</h3>
      <p class="champion-text">🏆 Champion</p>
      <p class="rounds-text">Survived ${pluralize(champion.roundsSurvived || 0, "Round", "Rounds")}</p>
    </div>
    <div class="compact-grid">
      ${renderCard("Runner-up",   runnerUp)}
      ${renderCard("Third Place", thirdPlace)}
      ${renderCard("Honorable Mention", honorable)}
    </div>
    <div class="button-group">
      <button onclick="restart()">Start Over</button>
      <button onclick="window.location.href='index.html'">Back to Menu</button>
      <button onclick="saveResults()">Save Results</button>
      <button onclick="exportRankingImage()">Export Image</button>
    </div>
  `;
  document.getElementById("result").style.display = "block";

  [champion, runnerUp, thirdPlace, honorable].filter(Boolean).forEach(m=>ensureName(m.id));
}


function saveResults(){
  const { champion, runnerUp, thirdPlace, honorable } = computeResults();

  const pack = (p, role) => {
    if (!p) return null;
    const obj = {
      id: p.id,
      name: nameCache[p.id] || p.name || null,
      shiny: !!p.shiny,
      roundsSurvived: p.roundsSurvived || 0
    };
    if (role === 'RU') {
      const k = monKey(p);
      obj.bracketWins  = (post.ruWinsByMon && post.ruWinsByMon[k]) || 0;
      obj.bracketTotal = typeof post.ruTotal === 'number' ? post.ruTotal : 0;
    } else if (role === 'THIRD') {
      const k = monKey(p);
      obj.bracketWins  = (post.thirdWinsByMon && post.thirdWinsByMon[k]) || 0;
      obj.bracketTotal = typeof post.thirdTotal === 'number' ? post.thirdTotal : 0;
    }
    return obj;
  };

  const g = window.rankConfig?.filters?.generation || 1;
  const category = `Gen ${g}`;
  const comboKey = `${category}_${!!window.includeShinies}_${!!window.shinyOnly}`;
  const nowIso = new Date().toISOString();

  let saved = [];
  try { saved = JSON.parse(localStorage.getItem("savedRankings") || "[]"); } catch {}
  saved = saved.filter(r => (r.key || r.id) !== comboKey);
  saved.push({
    key: comboKey,
    lastModified: nowIso,
    date: nowIso,
    category,
    includeShinies: !!window.includeShinies,
    shinyOnly: !!window.shinyOnly,
    champion:   pack(champion, 'CHAMP'),
    runnerUp:   pack(runnerUp, 'RU'),
    thirdPlace: pack(thirdPlace, 'THIRD'),
    honorable:  pack(honorable, 'HM')
  });

  try {
    localStorage.setItem("savedRankings", JSON.stringify(saved));
    alert(`Saved! Your ${category} ranking (${window.shinyOnly ? "shiny only" : window.includeShinies ? "+ shinies" : "no shinies"}) has been updated.`);
  } catch(e){
    console.error(e);
    alert("Could not save rankings.");
  }
}


/* ===========================
   Canvas Export (1080×1080) — Ranker (Gen)
   =========================== */

// Geometry
function fitContain(w, h, maxW, maxH){
  const r = Math.min(maxW / w, maxH / h);
  return { w: Math.round(w * r), h: Math.round(h * r) };
}
function displayNameCanvas(p){
  const name = p.name || nameCache[p.id] || `#${String(p.id).padStart(3, '0')}`;
  return (p.shiny ? '⭐ ' : '') + name;
}

// Sprite URLs
function spriteUrls(id, shiny){
  const baseOA   = spriteUrl(id, shiny);
  const baseHome = shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny/${id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`;
  return [baseOA, baseHome];
}

// Fetch → ImageBitmap (prevents canvas taint)
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

// Rounded card + text renderer (same as starters)
async function drawMon(ctx, {
  bmp, name, x, y, maxW, maxH, tag, mini=false,
  card=false, lines = [], // NEW: array of strings
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

  const startY = tag ? (tagY + (mini ? 24 : 26)) : (nameY + (mini ? 24 : 28));
  const lineGap = mini ? 22 : 24;
  ctx.fillStyle = '#5a6a8a';
  ctx.font = mini ? '700 18px Poppins, sans-serif' : '700 20px Poppins, sans-serif';
  (lines || []).forEach((ln, i) => {
    if (!ln) return;
    ctx.fillText(ln, x, startY + i * lineGap);
  });
}


async function exportRankingImage(){
  const { champion, runnerUp, thirdPlace, honorable } = computeResults();
  if (!champion) { alert("No results to export yet."); return; }

  // Ensure names exist for the 3–4 finalists
  await ensureNames([champion, runnerUp, thirdPlace, honorable]);

  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');

  try { if (document.fonts?.ready) await document.fonts.ready; } catch {}

  // Background + border
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#e9f0ff');
  grad.addColorStop(1, '#d5e3ff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#d2deff';
  ctx.strokeRect(8, 8, size - 16, size - 16);

  // Title (uses Gen from rankConfig)
  const g = (window.rankConfig?.filters?.generation) || 1;
  const TITLE = `PokéRankr — Gen ${g}`;
  const MODE  = (window.shinyOnly ? 'Shiny-only' : (window.includeShinies ? '+Shinies' : 'No Shinies'));

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0d1b2a';
  ctx.font = '800 44px Poppins, sans-serif';
  ctx.fillText(TITLE, size/2, 92);
  ctx.fillStyle = '#5a6a8a';
  ctx.font = '700 28px Poppins, sans-serif';
  ctx.fillText(MODE, size/2, 148);

  // Bitmaps
  const [champBmp, ruBmp, thirdBmp, hmBmp] = await Promise.all([
    loadSpriteBitmap(champion),
    runnerUp   ? loadSpriteBitmap(runnerUp)   : Promise.resolve(null),
    thirdPlace ? loadSpriteBitmap(thirdPlace) : Promise.resolve(null),
    honorable  ? loadSpriteBitmap(honorable)  : Promise.resolve(null),
  ]);

  // Champion (clamped top)
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

  // Helper to build stat lines for bottom cards
  function buildLinesFor(title, mon) {
    if (!mon) return [];
    const survived = `Survived ${pluralize(mon.roundsSurvived || 0, "Round", "Rounds")}`;

    if (title === 'Runner-up') {
      const wins  = (post?.ruWinsByMon?.[monKey(mon)] || 0);
      const total = (typeof post?.ruTotal === 'number' ? post.ruTotal : 0);
      const auto  = (total === 0);
      return auto ? [survived, 'Auto-advanced']
                  : [survived, `Won ${pluralize(wins, "Match", "Matches")}`];
    }

    if (title === 'Third Place') {
      const wins  = (post?.thirdWinsByMon?.[monKey(mon)] || 0);
      const total = (typeof post?.thirdTotal === 'number' ? post.thirdTotal : 0);
      const auto  = (total === 0);
      return auto ? [survived, 'Auto-advanced']
                  : [survived, `Won ${pluralize(wins, "Match", "Matches")}`];
    }

    // Honorable Mention: only survived line
    return [survived];
  }

  // Bottom row cards
  const rowY = 840;
  const slots = [
    runnerUp   ? { bmp: ruBmp,    mon: runnerUp,   title: 'Runner-up'    } : null,
    thirdPlace ? { bmp: thirdBmp, mon: thirdPlace, title: 'Third Place'  } : null,
    honorable  ? { bmp: hmBmp,    mon: honorable,  title: 'Hon. Mention' } : null,
  ].filter(Boolean);

  if (slots.length > 0){
    const spacing = 300;
    const startX = size/2 - ((slots.length - 1) * spacing)/2;
    for (let i=0;i<slots.length;i++){
      const sd = slots[i];
      await drawMon(ctx, {
        bmp: sd.bmp,
        name: displayNameCanvas(sd.mon),
        x: startX + i*spacing, y: rowY,
        maxW: 200, maxH: 160,
        tag: sd.title, mini:true, card:true,
        lines: buildLinesFor(sd.title, sd.mon)
      });
    }
  }

  // Download
  canvas.toBlob(blob => {
    if (!blob) { alert('Export failed.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pokerankr-gen${g}-${Date.now()}.png`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
  }, 'image/png');
}

function restart(){ window.location.reload(); }

// Results helper
function computeResults(finalWinner){
  const champion = leftHistory[leftHistory.length - 1] || finalWinner || null;
  if (!champion) return { champion: null, runnerUp: null, thirdPlace: null, honorable: null };

  const runnerUp   = post.runnerUp || null;
  const thirdPlace = post.third    || null;

  const placed = new Set([
    monKey(champion),
    runnerUp ? monKey(runnerUp) : null,
    thirdPlace ? monKey(thirdPlace) : null
  ].filter(Boolean));

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


// Expose for onclick
window.pick = pick;

// ----- Auto-resume (from index.html "Resume")
function loadRankerSession(s){
  if (!s || s.type !== 'ranker') return;

  // Restore settings
  window.includeShinies = !!s.context?.includeShinies;
  window.shinyOnly      = !!s.context?.shinyOnly;
  window.rankConfig     = s.context?.config || window.rankConfig || {};
  try {
    localStorage.setItem('includeShinies', String(window.includeShinies));
    localStorage.setItem('shinyOnly', String(window.shinyOnly));
    localStorage.setItem('rankConfig', JSON.stringify(window.rankConfig));
  } catch {}

  // Restore state
  restoreState({
    remaining:   s.state?.remaining   || [],
    eliminated:  s.state?.eliminated  || [],
    current:     s.state?.current     || null,
    next:        s.state?.next        || null,
    leftHistory: s.state?.leftHistory || [],
  });

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

  // Restore per-mon bracket wins
  if (s.state?.bracketWinsByMon) {
    for (const k of Object.keys(bracketWinsByMon)) delete bracketWinsByMon[k];
    Object.assign(bracketWinsByMon, s.state.bracketWinsByMon);
  }

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
    post.ruWinsByMon   = P.ruWinsByMon   ? { ...P.ruWinsByMon }   : Object.create(null);
    post.thirdWinsByMon= P.thirdWinsByMon? { ...P.thirdWinsByMon}: Object.create(null);
    post.ruTotal       = typeof P.ruTotal === 'number' ? P.ruTotal : 0;
    post.thirdTotal    = typeof P.thirdTotal === 'number' ? P.thirdTotal : 0;
  }

  // If resuming mid-post, ensure matchup is displayed
  if (postMode === 'RU' || postMode === 'THIRD') {
    displayMatchup();
    updatePostProgress();
    if (!next || !current) scheduleNextPostMatch();
  }
}

// Auto-resume if index.html set a pending slot for ranker
(function tryAutoResumeRanker(){
  const slotIdxStr = localStorage.getItem('PR_PENDING_RESUME_SLOT');
  if (!slotIdxStr) return;
  localStorage.removeItem('PR_PENDING_RESUME_SLOT');
  const idx = parseInt(slotIdxStr, 10);
  if (Number.isNaN(idx)) return;

  try {
    const slots = JSON.parse(localStorage.getItem('PR_SAVE_SLOTS_V1') || '[]');
    const s = Array.isArray(slots) ? slots[idx] : null;
    if (s && s.type === 'ranker') {
      loadRankerSession(s);
    }
  } catch (e) {
    console.warn('Could not resume slot:', e);
  }
})();

// ----- Boot
if (!current){
  const res = document.getElementById("result");
  res.innerHTML = `
    <h2>No Pokémon found</h2>
    <p>Try adjusting your settings.</p>
    <div class="button-group">
      <button onclick="window.location.href='index.html'">Back to Menu</button>
    </div>
  `;
  res.style.display = "block";
} else if (!next){
  showWinner(current);
} else {
  displayMatchup();
  updateProgress();
  updateUndoButton();
}
