// =========================
// PokéRankr — starters.js
// =========================

// --- Engine bootstrap (no behavior change yet) ---
/**
 * We create a global engine instance now so future steps can
 * gradually delegate to it. For the moment, we do NOT call any
 * engine methods from the existing code — this is just plumbing.
 */
window.prEngine = (window.PokeRankrEngine && typeof PokeRankrEngine.create === 'function')
  ? PokeRankrEngine.create()
  : null;

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

// ----- Starter lines (ids + names) -----
const STARTER_LINES = new Map([
  // Gen 1
  [1,  [{id:1,name:"Bulbasaur"}, {id:2,name:"Ivysaur"},   {id:3,name:"Venusaur"}]],
  [4,  [{id:4,name:"Charmander"}, {id:5,name:"Charmeleon"}, {id:6,name:"Charizard"}]],
  [7,  [{id:7,name:"Squirtle"},  {id:8,name:"Wartortle"}, {id:9,name:"Blastoise"}]],

  // Gen 2
  [152,[{id:152,name:"Chikorita"}, {id:153,name:"Bayleef"},   {id:154,name:"Meganium"}]],
  [155,[{id:155,name:"Cyndaquil"}, {id:156,name:"Quilava"},   {id:157,name:"Typhlosion"}]],
  [158,[{id:158,name:"Totodile"},  {id:159,name:"Croconaw"},  {id:160,name:"Feraligatr"}]],

  // Gen 3
  [252,[{id:252,name:"Treecko"},   {id:253,name:"Grovyle"},   {id:254,name:"Sceptile"}]],
  [255,[{id:255,name:"Torchic"},   {id:256,name:"Combusken"}, {id:257,name:"Blaziken"}]],
  [258,[{id:258,name:"Mudkip"},    {id:259,name:"Marshtomp"}, {id:260,name:"Swampert"}]],

  // Gen 4
  [387,[{id:387,name:"Turtwig"},   {id:388,name:"Grotle"},    {id:389,name:"Torterra"}]],
  [390,[{id:390,name:"Chimchar"},  {id:391,name:"Monferno"},  {id:392,name:"Infernape"}]],
  [393,[{id:393,name:"Piplup"},    {id:394,name:"Prinplup"},  {id:395,name:"Empoleon"}]],

  // Gen 5
  [495,[{id:495,name:"Snivy"},     {id:496,name:"Servine"},   {id:497,name:"Serperior"}]],
  [498,[{id:498,name:"Tepig"},     {id:499,name:"Pignite"},   {id:500,name:"Emboar"}]],
  [501,[{id:501,name:"Oshawott"},  {id:502,name:"Dewott"},    {id:503,name:"Samurott"}]],

  // Gen 6
  [650,[{id:650,name:"Chespin"},   {id:651,name:"Quilladin"}, {id:652,name:"Chesnaught"}]],
  [653,[{id:653,name:"Fennekin"},  {id:654,name:"Braixen"},   {id:655,name:"Delphox"}]],
  [656,[{id:656,name:"Froakie"},   {id:657,name:"Frogadier"}, {id:658,name:"Greninja"}]],

  // Gen 7
  [722,[{id:722,name:"Rowlet"},    {id:723,name:"Dartrix"},   {id:724,name:"Decidueye"}]],
  [725,[{id:725,name:"Litten"},    {id:726,name:"Torracat"},  {id:727,name:"Incineroar"}]],
  [728,[{id:728,name:"Popplio"},   {id:729,name:"Brionne"},   {id:730,name:"Primarina"}]],

  // Gen 8
  [810,[{id:810,name:"Grookey"},   {id:811,name:"Thwackey"},  {id:812,name:"Rillaboom"}]],
  [813,[{id:813,name:"Scorbunny"}, {id:814,name:"Raboot"},    {id:815,name:"Cinderace"}]],
  [816,[{id:816,name:"Sobble"},    {id:817,name:"Drizzile"},  {id:818,name:"Inteleon"}]],

  // Gen 9
  [906,[{id:906,name:"Sprigatito"},{id:907,name:"Floragato"},{id:908,name:"Meowscarada"}]],
  [909,[{id:909,name:"Fuecoco"},   {id:910,name:"Crocalor"},  {id:911,name:"Skeledirge"}]],
  [912,[{id:912,name:"Quaxly"},    {id:913,name:"Quaxwell"},  {id:914,name:"Quaquaval"}]],
]);

// Pikachu/Eevee (for the optional toggle)
const PIKA_BASE   = { id:25,  name:"Pikachu" };
const EEVEE_BASE  = { id:133, name:"Eevee"   };

const PIKA_LINE   = [{id:172,name:"Pichu"}, {id:25,name:"Pikachu"}, {id:26,name:"Raichu"}];
const EEVEE_LINE  = [
  {id:133,name:"Eevee"}, {id:134,name:"Vaporeon"}, {id:135,name:"Jolteon"}, {id:136,name:"Flareon"},
  {id:196,name:"Espeon"}, {id:197,name:"Umbreon"}, {id:470,name:"Leafeon"},
  {id:471,name:"Glaceon"}, {id:700,name:"Sylveon"}
];


// ----- Preferences
// ----- Preferences
const includeShinies       = localStorage.getItem("includeShinies") === "true";
const shinyOnly            = localStorage.getItem("shinyOnly") === "true";
const addPikaEevee         = localStorage.getItem("addPikaEevee") === "true";          // NEW
const includeStarterLines  = localStorage.getItem("includeStarterLines") === "true";    // NEW

// Make shiny settings available globally for tracking
window.includeShinies = includeShinies;
window.shinyOnly = shinyOnly;


// ----- Build pool (now honors Pikachu/Eevee + Full Starter Line)
function dedupeById(arr) {
  const seen = new Set();
  const out = [];
  for (const p of arr) {
    if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
  }
  return out;
}

// Build the working base list
let working = [...baseStarters];

// Optional: add Pikachu/Eevee bases
if (addPikaEevee) {
  working.push(PIKA_BASE, EEVEE_BASE);
}

// Optional: expand each base into its full line
if (includeStarterLines) {
  const expanded = [];
  for (const p of working) {
    if (p.id === PIKA_BASE.id)        expanded.push(...PIKA_LINE);
    else if (p.id === EEVEE_BASE.id)  expanded.push(...EEVEE_LINE);
    else if (STARTER_LINES.has(p.id)) expanded.push(...STARTER_LINES.get(p.id));
    else expanded.push(p);
  }
  working = dedupeById(expanded);
} else {
  working = dedupeById(working);
}

// Finally, apply shiny toggles
let pool = [];
if (shinyOnly) {
  pool = working.map(p => ({ ...p, shiny: true }));
} else if (includeShinies) {
  pool = [
    ...working.map(p => ({ ...p, shiny: false })),
    ...working.map(p => ({ ...p, shiny: true })),
  ];
} else {
  pool = working.map(p => ({ ...p, shiny: false }));
}


// --- Engine v0 init (no behavior change) ---
if (window.prEngine && typeof prEngine.init === 'function') {
  prEngine.init({
    pool: [...pool], // pass a copy to avoid accidental mutation later
    options: {
      includeShinies,
      shinyOnly,
      // future options go here (seedStrategy, includeForms, etc.)
    },
    seed: null, // we'll add deterministic seeding later
    callbacks: {
      onMatchReady: () => {
        // Engine has a fresh pair ready; safe to ignore for now because
        // our pick()/undo code already re-renders after mirroring state.
        // We’ll move rendering into these callbacks in a later step.
      },
      onProgress: () => {
        // We already update bars after pick()/undo; no-op for now.
      },
      onPhaseChange: ({ phase }) => {
        // Keep our local postMode in sync defensively (harmless duplicate).
        if (phase === 'RU' || phase === 'THIRD') {
          window.postMode = phase;
        } else if (phase === 'DONE') {
          window.postMode = null;
        }
      },
      onResults: ({ champion }) => {
        try {
          const { honorable } = computeResults(champion);
          showWinner(champion || (window.leftHistory?.[window.leftHistory.length - 1]));
        } catch {}
      },
    }
  });
}

// ===== Sprite helpers (no-flash + fallback chain) =====

// Build ordered URLs to try (official-artwork first, then home)
function spriteUrlChain(id, shiny = false) {
  const oa = shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  const home = shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny/${id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`;
  return [oa, home];
}

// Returns an <img> string that stays hidden until loaded and walks the fallback list on error.
function getImageTag(pOrId, shiny = false, alt = "", forResults = false) {
  const p = (typeof pOrId === 'object' && pOrId) ? pOrId : { id: pOrId, shiny, name: alt || "" };
  const wantShiny = !!(p.shiny ?? shiny);
  const chain = spriteUrlChain(p.id, wantShiny);
  const first = chain[0];
  const fallbacks = JSON.stringify(chain.slice(1));
  const safeAlt = alt || p.name || "";
return `<img
  src="${first}"
  alt="${safeAlt}"
  style="visibility:hidden"
  width="256"${forResults ? "" : " height=\"256\""}
  decoding="async"
  loading="eager"
  fetchpriority="high"
  data-step="0"
  data-fallbacks='${fallbacks}'
  onload="this.style.visibility='visible'"
  onerror="
    try {
      this.style.visibility='hidden';
      const steps = JSON.parse(this.dataset.fallbacks || '[]');
      let i = parseInt(this.dataset.step || '0', 10);
      if (i < steps.length) {
        this.dataset.step = String(++i);
        this.src = steps[i - 1];
      } else {
        this.onerror = null; // no more fallbacks; stop handling
      }
    } catch (e) { this.onerror = null; }
  "
>`;
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

// Keep scroll position stable across DOM updates (iOS Safari safe)
function withScrollLock(run) {
  const y = window.scrollY;
  run();
  requestAnimationFrame(() => window.scrollTo({ top: y, left: 0, behavior: 'instant' }));
}

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
function slotsWrite(slots){
  localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(slots));
  // Auto-sync if logged in
  if (window.PokeRankrAuth && window.PokeRankrAuth.isLoggedIn()) {
    setTimeout(() => {
      window.PokeRankrSync.syncLocalToCloud();
    }, 500);
  }
}

function pluralize(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

// Helper: always read post-phase from the engine if possible
function _getPostView() {
  let phase = post.phase;
  let currentRound = Array.isArray(post.currentRound) ? post.currentRound : [];
  let nextRound    = Array.isArray(post.nextRound)    ? post.nextRound    : [];
  let index        = Number.isFinite(post.index) ? post.index : 0;

  try {
    const st = (window.prEngine && typeof prEngine.getState === 'function')
      ? prEngine.getState()
      : null;
    if (st && st.post) {
      phase        = st.post.phase || phase;
      currentRound = Array.isArray(st.post.currentRound) ? st.post.currentRound : currentRound;
      nextRound    = Array.isArray(st.post.nextRound)    ? st.post.nextRound    : nextRound;
      index        = Number.isFinite(st.post.index) ? st.post.index : index;
    }
  } catch {}

  // Ensure we’re aligned to the start of a pair
  if (Number.isFinite(index)) index = Math.max(0, index - (index % 2));

  return { phase, currentRound, nextRound, index };
}

function updatePostProgress() {
  const bar = document.getElementById("progress");
  const txt = document.getElementById("remaining-text");
  const container = document.getElementById("progress-container");
  if (!bar || !txt || !container) return;

  const { phase, currentRound, nextRound, index } = _getPostView();
  const inPost = (phase === 'RU' || phase === 'THIRD');

  container.style.display = "block";

  // How many entrants are still alive in this bracket *right now*?
  const curLen = Array.isArray(currentRound) ? currentRound.length : 0;
  const nxtLen = Array.isArray(nextRound)    ? nextRound.length    : 0;

  // Clamp index to the array (defensive)
  const idx = Math.min(Math.max(0, index), Math.max(0, curLen - 1));

  const aliveEntrants = Math.max(0, (curLen - idx) + nxtLen);
  // Matches remaining INCLUDING the current on-screen match (if any)
  const remainingIncl = Math.max(0, aliveEntrants - 1);

  // Is the on-screen pair exactly the bracket's current pair? (so we can exclude it)
  let showingBracketPair = false;
  if (inPost && current && next && curLen >= idx + 2) {
    const a = currentRound[idx];
    const b = currentRound[idx + 1];
    const mk = (p) => p ? `${p.id}-${p.shiny?1:0}` : '';
    if (a && b) {
      const cur = mk(current), nxt = mk(next);
      const aa  = mk(a),       bb  = mk(b);
      showingBracketPair = (cur === aa && nxt === bb) || (cur === bb && nxt === aa);
    }
  }

  // Displayed "remaining" EXCLUDES the visible match if it's truly the live bracket pair
  const left = Math.max(0, remainingIncl - (showingBracketPair ? 1 : 0));

  // Dynamic total for the progress bar so pct is always correct:
  // total = done so far + matches still to play (including the visible one if any)
  let done = 0;
  try {
    const st = (window.prEngine && typeof prEngine.getState === 'function')
      ? prEngine.getState()
      : null;
    done = Number.isFinite(st?.post?.doneMatches) ? st.post.doneMatches
         : Number.isFinite(post.doneMatches)      ? post.doneMatches
         : 0;
  } catch {}
  const totalDyn = done + remainingIncl;
  const pct = totalDyn > 0 ? Math.round((done / totalDyn) * 100) : 0;

  bar.style.width = `${pct}%`;
  txt.textContent =
    (phase === 'RU' ? 'Runner-up bracket — ' : 'Third-place bracket — ')
    + `${left} matchups remaining`;
}

window._debugPostView = () => {
  const v = _getPostView();
  console.log('postView:', {
    phase: v.phase,
    idx: v.index,
    curLen: v.currentRound.length,
    nxtLen: v.nextRound.length,
    current: current ? `${current.id}-${current.shiny?1:0}` : null,
    next:    next    ? `${next.id}-${next.shiny?1:0}`    : null
  });
  return v;
};



// Label helper for this run
function startersLabel() {
  const includeShinies = localStorage.getItem("includeShinies") === "true";
  const shinyOnly      = localStorage.getItem("shinyOnly") === "true";
  const addPikaEevee   = localStorage.getItem("addPikaEevee") === "true";
  const linesOn        = localStorage.getItem("includeStarterLines") === "true";

    // NEW: simplified phrasing to match dynamic title
  const base = linesOn ? "Starter Lines" : "Starters";
  const shinyBit = shinyOnly ? " - Shiny Only" : (includeShinies ? " + Shinies" : "");
  const extras   = addPikaEevee ? " + Pika/Eevee" : "";

  return `${base}${extras}${shinyBit}`;
}

function trackRankingCompletion(category, pokemonCount) {
  // Get the champion from your results
  const { champion } = computeResults();
  
  // NEW: Extract unique Pokemon IDs from the pool
  const pokemonIds = [];
  if (Array.isArray(window.pool)) {
    const seenIds = new Set();
    window.pool.forEach(p => {
      if (p && p.id && !seenIds.has(p.id)) {
        seenIds.add(p.id);
        pokemonIds.push(p.id);
      }
    });
  }
  
  let completions = JSON.parse(localStorage.getItem('PR_COMPLETIONS') || '[]');
  
  // Build detailed subcategory info
  let subcategory = category;
  if (category === 'generation') {
    const gen = window.rankConfig?.filters?.generation;
    subcategory = gen === 'ALL' ? 'generation-all' : `generation-${gen}`;
  } else if (category === 'legendaries') {
    const mythMode = window.rankConfig?.toggles?.mythMode || 'none';
    const ubsMode = window.rankConfig?.toggles?.ubsMode || 'exclude';
    if (mythMode === 'only') subcategory = 'legendaries-mythicals';
    else if (ubsMode === 'only') subcategory = 'legendaries-ultrabeasts';
    else if (mythMode === 'include' && ubsMode === 'include') subcategory = 'legendaries-all';
    else subcategory = 'legendaries-base';
  } else if (category === 'type') {
    const types = window.rankConfig?.filters?.type?.types || [];
    subcategory = `type-${types.join('-')}`;
  }
  
  completions.push({
    date: new Date().toISOString(),
    category: category,
    subcategory: subcategory,
    pokemonCount: pokemonCount || 0,
    pokemonIds: pokemonIds, // NEW: Store the actual Pokemon IDs
    includeShinies: window.includeShinies || false,
    shinyOnly: window.shinyOnly || false,
    championId: champion?.id || null,
    championShiny: champion?.shiny || false
  });

  console.log('Tracking completion:', {
  includeShinies: window.includeShinies,
  shinyOnly: window.shinyOnly,
  championShiny: champion?.shiny || false
});
  
  if (completions.length > 100) {
    completions = completions.slice(-100);
  }
  
  localStorage.setItem('PR_COMPLETIONS', JSON.stringify(completions));
// Auto-sync if logged in
if (window.PokeRankrAuth && window.PokeRankrAuth.isLoggedIn()) {
  setTimeout(() => {
    window.PokeRankrSync.syncLocalToCloud();
  }, 500);
}
}

// NEW: write a dynamic title into #modeTitle for Starters mode
function setStartersTitle() {
  const includeShinies = localStorage.getItem("includeShinies") === "true";
  const shinyOnly      = localStorage.getItem("shinyOnly") === "true";
  const addPikaEevee   = localStorage.getItem("addPikaEevee") === "true";
  const linesOn        = localStorage.getItem("includeStarterLines") === "true";

  // Base label matches your spec
  const base = linesOn ? "Starter Lines" : "Starters";

  // Suffixes in your requested style:
  //   "Starter Lines + Shinies", "Starter Lines - Shiny Only", etc.
  const shinyBit = shinyOnly ? " - Shiny Only" : (includeShinies ? " + Shinies" : "");
  const extras   = addPikaEevee ? " + Pika/Eevee" : "";

  const el = document.getElementById("modeTitle");
  if (el) el.textContent = `${base}${extras}${shinyBit}`;
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
  return (spriteUrlChain(id, shiny))[0]; // just the primary for small previews
}

function serializeStarterSession() {
  const includeShinies = localStorage.getItem("includeShinies") === "true";
  const shinyOnly      = localStorage.getItem("shinyOnly") === "true";

  // Post-aware progress (what to show in slot labels)
  const inPost = (post.phase === 'RU' || post.phase === 'THIRD');

  let postLeft = remaining.length; // KOTH default
  if (inPost) {
    const curLen = Array.isArray(post.currentRound) ? post.currentRound.length : 0;
    const nxtLen = Array.isArray(post.nextRound)    ? post.nextRound.length    : 0;
    const idx    = Number.isFinite(post.index) ? Math.max(0, post.index) : 0;

    const alive  = Math.max(0, (curLen - idx) + nxtLen);    // entrants still alive now
    const remainingIncl = Math.max(0, alive - 1);           // matches remaining inc. visible
    let showingPair = false;
    if (current && next && curLen > idx + 1) {
      const a = post.currentRound[idx], b = post.currentRound[idx + 1];
      if (a && b) {
        const mk = (p) => `${p.id}-${p.shiny ? 1 : 0}`;
        showingPair =
          (mk(current) === mk(a) && mk(next) === mk(b)) ||
          (mk(current) === mk(b) && mk(next) === mk(a));
      }
    }
    postLeft = Math.max(0, remainingIncl - (showingPair ? 1 : 0));
  }

  return {
    id: 'v1',
    label: startersLabel(),
    type: 'starters',
    context: { includeShinies, shinyOnly },
    progress: {
      totalMatchups: pool.length,
      completed: eliminated.length + (current ? (current.roundsSurvived || 0) : 0),
      remaining: remaining.length,
      currentIndex: eliminated.length,
      mode: inPost ? post.phase : 'KOTH',
      displayRemaining: postLeft,
      displayLabel: inPost
        ? ((post.phase === 'RU' ? 'Runner-up bracket — ' : 'Third-place bracket — ') + `${postLeft} matchups remaining`)
        : `${remaining.length} matchups remaining`,
    },
    state: {
      // ✅ KOTH core
      pool:        pool.map(p => ({ ...p })),
      remaining:   remaining.map(p => ({ ...p })),
      eliminated:  eliminated.map(p => ({ ...p })),
      current:     current ? { ...current } : null,
      next:        next    ? { ...next }    : null,
      leftHistory: leftHistory.map(p => ({ ...p })),
      lostTo:      { ...(lostTo || {}) },
      roundIndex:  { ...(roundIndex || {}) },
      roundNum:    typeof roundNum === 'number' ? roundNum : 0,

      // ✅ Post-phase
      postMode, // null | 'RU' | 'THIRD'  (kept for compatibility, not used for UI gates)
      post: {
        phase: post.phase,
        currentRound: Array.isArray(post.currentRound) ? post.currentRound.map(x => ({ ...x })) : [],
        nextRound:    Array.isArray(post.nextRound)    ? post.nextRound.map(x => ({ ...x }))    : [],
        index:        typeof post.index === 'number' ? post.index : 0,
        totalMatches: typeof post.totalMatches === 'number' ? post.totalMatches : 0,
        doneMatches:  typeof post.doneMatches  === 'number' ? post.doneMatches  : 0,
        ruTotal:      typeof post.ruTotal      === 'number' ? post.ruTotal      : 0,
        thirdTotal:   typeof post.thirdTotal   === 'number' ? post.thirdTotal   : 0,
        ruWins:       typeof post.ruWins       === 'number' ? post.ruWins       : 0,
        thirdWins:    typeof post.thirdWins    === 'number' ? post.thirdWins    : 0,
        runnerUp:     post.runnerUp ? { ...post.runnerUp } : null,
        third:        post.third    ? { ...post.third }    : null,
        ruWinsByMon:  { ...(post.ruWinsByMon || {}) },
        thirdWinsByMon: { ...(post.thirdWinsByMon || {}) },
        // If you ever serialize the avoided-pairs set:
        ruR1Pairs: Array.isArray(post.ruR1Pairs) ? [...post.ruR1Pairs] : (post.ruR1Pairs instanceof Set ? Array.from(post.ruR1Pairs) : [])
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
      // Prefer new post-aware fields if present
      let label = slot?.progress?.displayLabel;

      // If missing (older saves), derive from saved state
      if (!label) {
        const inPost = !!slot?.state?.postMode &&
                       (slot?.state?.post?.phase === 'RU' || slot?.state?.post?.phase === 'THIRD');

        if (inPost) {
          const curLen = Array.isArray(slot?.state?.post?.currentRound) ? slot.state.post.currentRound.length : 0;
          const nxtLen = Array.isArray(slot?.state?.post?.nextRound)    ? slot.state.post.nextRound.length    : 0;
          const idx    = Number.isFinite(slot?.state?.post?.index) ? Math.max(0, slot.state.post.index) : 0;

          const alive = Math.max(0, (curLen - idx) + nxtLen);
          const remainingIncl = Math.max(0, alive - 1);

          let showingPair = false;
          try {
            const a = slot?.state?.post?.currentRound?.[idx];
            const b = slot?.state?.post?.currentRound?.[idx + 1];
            const cur = slot?.state?.current;
            const nxt = slot?.state?.next;
            const mk = (p) => p ? `${p.id}-${(p.shiny?1:0)}` : '';
            if (a && b && cur && nxt) {
              showingPair = ((mk(cur) === mk(a) && mk(nxt) === mk(b)) ||
                             (mk(cur) === mk(b) && mk(nxt) === mk(a)));
            }
          } catch {}

          const left = Math.max(0, remainingIncl - (showingPair ? 1 : 0));

          label = (slot.state.post.phase === 'RU'
            ? 'Runner-up bracket — '
            : 'Third-place bracket — ') + `${left} matchups remaining`;

        } else {
          const rem = (slot?.progress && typeof slot.progress.remaining === 'number')
            ? slot.progress.remaining
            : (Array.isArray(slot?.state?.remaining) ? slot.state.remaining.length : null);
          if (rem !== null && rem !== undefined) {
            label = `${rem} matchups remaining`;
          }
        }
      }
      return label
        ? `<div style="font-size:.85rem; color:#374151;">${label}</div>`
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
      slotsWrite(slots);
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
  slotsWrite(slots);
  window.location.href = 'index.html';
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

// --- Tracking for post-tournament mini-brackets ---
const lostTo = Object.create(null);      // monKey(loser) -> monKey(winner)
let roundNum = 0;                        // global match counter (main pass only)
const roundIndex = Object.create(null);  // monKey(loser) -> round number lost

// Post-bracket state (interactive)
let postMode = null; // null | 'RU' | 'THIRD'
// --- Head-to-Head (per run; shows rematch context) ---
const H2H = Object.create(null); // "ak|bk" -> { aKey, bKey, aWins, bWins, total, last }

function pairKey(a, b) {
  const ak = monKey(a), bk = monKey(b);
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
}

function h2hRecord(winner, loser) {
  if (!winner || !loser) return;
  const k = pairKey(winner, loser);
  const [aKey, bKey] = k.split('|');
  if (!H2H[k]) H2H[k] = { aKey, bKey, aWins: 0, bWins: 0, total: 0, last: null };
  const rec = H2H[k];
  const wKey = monKey(winner);
  if (wKey === rec.aKey) rec.aWins++; else rec.bWins++;
  rec.total++; 
  rec.last = wKey;
}

function h2hFor(leftMon, rightMon) {
  const k = pairKey(leftMon, rightMon);
  const rec = H2H[k];
  if (!rec) return null;
  const leftKey  = monKey(leftMon);
  const rightKey = monKey(rightMon);
  const winsFor = (k) => (k === rec.aKey ? rec.aWins : rec.bWins);
  return {
    leftWins:  winsFor(leftKey),
    rightWins: winsFor(rightKey),
    total:     rec.total,
    lastWinnerKey: rec.last
  };
}

function h2hBadgeText(myWins, theirWins) {
  const mw = myWins|0, tw = theirWins|0;
  if (mw + tw === 0) return '';
  if (mw === tw) return `Tied ${mw}–${tw}`;
  return (mw > tw) ? `Leads ${mw}–${tw}` : `Trails ${mw}–${tw}`;
}

function refreshH2HBadges() {
  try {
    const L = document.querySelector('#left .h2h-badge');
    const R = document.querySelector('#right .h2h-badge');
    if (!L || !R) return;
    if (!current || !next) { L.textContent = ''; R.textContent = ''; return; }
    const rec = h2hFor(current, next);
    if (!rec) { L.textContent = ''; R.textContent = ''; return; }
    L.textContent = h2hBadgeText(rec.leftWins,  rec.rightWins);
    R.textContent = h2hBadgeText(rec.rightWins, rec.leftWins);
  } catch {}
}
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

// Simple canonical phase check used everywhere for UI choices
const isInPost = () => (post.phase === 'RU' || post.phase === 'THIRD');

// --- Engine sync: hydrate engine with current KOTH state (once) ---
if (window.prEngine && typeof prEngine.hydrate === 'function') {
  try {
    prEngine.hydrate({
      state: {
        remaining:  remaining.map(p => ({ ...p })),
        eliminated: eliminated.map(p => ({ ...p })),
        current:    current ? { ...current } : null,
        next:       next    ? { ...next }    : null,
        leftHistory: leftHistory.map(p => ({ ...p })),
        lostTo:     (() => { const o = {}; for (const k in lostTo) o[k] = lostTo[k]; return o; })(),
        roundIndex: (() => { const o = {}; for (const k in roundIndex) o[k] = roundIndex[k]; return o; })(),
        roundNum,
        gameOver
      }
    });
  } catch (e) {
    console.warn('Engine hydrate failed (will continue without engine sync):', e);
  }
}

// Load a saved Starters session into current page
function loadStarterSession(s) {
  if (!s || s.type !== 'starters') return;

  // Persist toggles so sprites match the save
  localStorage.setItem("includeShinies", s.context?.includeShinies ? 'true' : 'false');
  localStorage.setItem("shinyOnly",      s.context?.shinyOnly ? 'true' : 'false');

  // 1) Restore INTO THE ENGINE first (referee owns the truth)
  try {
    if (window.prEngine && typeof prEngine.hydrateSnapshot === 'function') {
      prEngine.hydrateSnapshot({
        // Phase: if postMode + post.phase exist, we’re in RU/THIRD; otherwise KOTH
        phase: (s.state?.postMode && s.state?.post?.phase) ? s.state.post.phase : 'KOTH',

        pool:        (s.state?.pool || []).map(x => ({ ...x })),
        remaining:   (s.state?.remaining || []).map(x => ({ ...x })),
        eliminated:  (s.state?.eliminated || []).map(x => ({ ...x })),
        current:      s.state?.current ? { ...s.state.current } : null,
        next:         s.state?.next    ? { ...s.state.next }    : null,
        leftHistory: (s.state?.leftHistory || []).map(x => ({ ...x })),

        lostTo:      { ...(s.state?.lostTo || {}) },
        roundIndex:  { ...(s.state?.roundIndex || {}) },
        roundNum:     (typeof s.state?.roundNum === 'number') ? s.state.roundNum : 0,
        gameOver:     false,

        post: {
          phase: s.state?.post?.phase || null,
          currentRound: Array.isArray(s.state?.post?.currentRound) ? s.state.post.currentRound.map(x => ({ ...x })) : [],
          nextRound:    Array.isArray(s.state?.post?.nextRound)    ? s.state.post.nextRound.map(x => ({ ...x }))    : [],
          index:        (typeof s.state?.post?.index === 'number') ? s.state.post.index : 0,
          totalMatches: (typeof s.state?.post?.totalMatches === 'number') ? s.state.post.totalMatches : 0,
          doneMatches:  (typeof s.state?.post?.doneMatches  === 'number') ? s.state.post.doneMatches  : 0,

          // fixed bracket totals (for "Won X of Y")
          ruTotal:      (typeof s.state?.post?.ruTotal    === 'number') ? s.state.post.ruTotal    : 0,
          thirdTotal:   (typeof s.state?.post?.thirdTotal === 'number') ? s.state.post.thirdTotal : 0,

          // bracket win tallies + placements
          ruWins:       (typeof s.state?.post?.ruWins    === 'number') ? s.state.post.ruWins    : 0,
          thirdWins:    (typeof s.state?.post?.thirdWins === 'number') ? s.state.post.thirdWins : 0,
          runnerUp:     s.state?.post?.runnerUp ? { ...s.state.post.runnerUp } : null,
          third:        s.state?.post?.third    ? { ...s.state.post.third }    : null,

          ruWinsByMon:     { ...(s.state?.post?.ruWinsByMon || {}) },
          thirdWinsByMon:  { ...(s.state?.post?.thirdWinsByMon || {}) },
          // ✅ fixed: source ruR1Pairs from the snapshot "s", not live "post"
          ruR1Pairs: Array.isArray(s?.state?.post?.ruR1Pairs)
            ? [...s.state.post.ruR1Pairs]
            : (s?.state?.post?.ruR1Pairs instanceof Set ? Array.from(s.state.post.ruR1Pairs) : [])
        }
      });
    }
  } catch (e) {
    console.warn('Engine hydrateSnapshot failed (continuing anyway):', e);
  }

  // 2) Pull the now-authoritative state FROM the engine into UI vars
  try {
    const st = prEngine.getState?.();
    if (st) {
      pool        = st.pool        || [];
      remaining   = st.remaining   || [];
      eliminated  = st.eliminated  || [];
      current     = st.current     || null;
      next        = st.next        || null;
      roundNum    = st.roundNum    || 0;
      gameOver    = !!st.gameOver;

      // maps/arrays
      for (const k in lostTo) delete lostTo[k];
      Object.assign(lostTo, st.lostTo || {});
      for (const k in roundIndex) delete roundIndex[k];
      Object.assign(roundIndex, st.roundIndex || {});
      leftHistory.length = 0;
      (st.leftHistory || []).forEach(p => leftHistory.push({ ...p }));

      // post mirror
      const p = st.post || {};
      postMode             = (st.phase === 'RU' || st.phase === 'THIRD') ? st.phase : null;
      post.phase           = p.phase || null;
      post.currentRound    = Array.isArray(p.currentRound) ? p.currentRound.map(x => ({ ...x })) : [];
      post.nextRound       = Array.isArray(p.nextRound)    ? p.nextRound.map(x => ({ ...x }))    : [];
      post.index           = (typeof p.index === 'number') ? p.index : 0;
      post.totalMatches    = (typeof p.totalMatches === 'number') ? p.totalMatches : 0;
      post.doneMatches     = (typeof p.doneMatches  === 'number') ? p.doneMatches  : 0;
      post.ruTotal         = (typeof p.ruTotal      === 'number') ? p.ruTotal      : (post.ruTotal || 0);
      post.thirdTotal      = (typeof p.thirdTotal   === 'number') ? p.thirdTotal   : (post.thirdTotal || 0);
      post.ruWins          = (typeof p.ruWins       === 'number') ? p.ruWins       : 0;
      post.thirdWins       = (typeof p.thirdWins    === 'number') ? p.thirdWins    : 0;
      post.runnerUp        = p.runnerUp ? { ...p.runnerUp } : null;
      post.third           = p.third    ? { ...p.third }    : null;
      post.ruWinsByMon     = { ...(p.ruWinsByMon || {}) };
      post.thirdWinsByMon  = { ...(p.thirdWinsByMon || {}) };
      // if engine exposes ruR1Pairs on state.post, it’s harmless to ignore it here
    }
  } catch (e) {
    console.warn('Mirror from engine failed (continuing anyway):', e);
  }

  // 3) Render — NEVER call engine internals like scheduleNextPostMatch() here unless needed to build a missing pair
  const resultBox = document.getElementById("result");
  if (resultBox) resultBox.style.display = "none";

  if (isInPost()) {
    // Normalize to an even index and ensure we have a pair to show
    if (Number.isFinite(post.index)) post.index -= (post.index % 2);

   // Engine hydrateSnapshot() already schedules a visible pair if needed.
    // Just render and update UI mirrors.
    displayMatchup();
    updatePostProgress();
    updateUndoButton();
    return;
  }

  // If we truly have no current mon, show the friendly error
  if (!current) {
    if (resultBox) {
      resultBox.innerHTML = `
        <h2>No Pokémon found</h2>
        <p>Try adjusting your settings.</p>
        <div class="button-group">
          <button onclick="window.location.href='index.html'">Back to Menu</button>
        </div>`;
      resultBox.style.display = "block";
    }
    return;
  }

  // Normal KOTH render path
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

// --- UNDO state (single-step everywhere) ---
let kothLastSnap = false; // KOTH: allow exactly one undo after your last pick

function updateUndoButton() {
  const btn = document.getElementById("btnUndo");
  if (!btn) return;
  // Trust the actual phase we’re in (post.phase), not postMode
  const inPost = isInPost();
  btn.disabled = inPost ? !post.lastSnap : !kothLastSnap;
}

function undoLast() {
  if (!window.prEngine || typeof prEngine.undo !== 'function') return;

  const state = prEngine.undo();
  if (!state) return;

  // ---- Mirror engine → local (let bindings can reassign) ----
  remaining  = state.remaining  || [];
  eliminated = state.eliminated || [];
  current    = state.current    || null;
  next       = state.next       || null;
  roundNum   = state.roundNum   || 0;
  gameOver   = !!state.gameOver;

  // Restore H2H state (KOTH or post-phase)
const inPostUndo = (state.phase === 'RU' || state.phase === 'THIRD');

if (inPostUndo && post?.lastSnap?.h2h) {
  // Use the post-phase snapshot we saved right before the pick
  for (const k in H2H) delete H2H[k];
  Object.assign(H2H, post.lastSnap.h2h);
  // post.lastSnap itself gets cleared later in this function; don't clear it here
} else if (window.lastH2HSnapshot) {
  // KOTH single-step snapshot path
  for (const k in H2H) delete H2H[k];
  Object.assign(H2H, window.lastH2HSnapshot);
  window.lastH2HSnapshot = null;
}


  // const-like containers: clear then copy
  if (state.lostTo) {
    for (const k in lostTo) delete lostTo[k];
    for (const k in state.lostTo) lostTo[k] = state.lostTo[k];
  } else {
    for (const k in lostTo) delete lostTo[k];
  }
  if (state.roundIndex) {
    for (const k in roundIndex) delete roundIndex[k];
    for (const k in state.roundIndex) roundIndex[k] = state.roundIndex[k];
  } else {
    for (const k in roundIndex) delete roundIndex[k];
  }
  const lh = Array.isArray(state.leftHistory) ? state.leftHistory : [];
  leftHistory.splice(0, leftHistory.length, ...lh);

  // ---- Mirror post-phase info ----
  const p = state.post || {};
  postMode = (state.phase === 'RU' || state.phase === 'THIRD') ? state.phase : null;

  post.phase        = p.phase || null;
  post.currentRound = Array.isArray(p.currentRound) ? p.currentRound.map(x => ({...x})) : [];
  post.nextRound    = Array.isArray(p.nextRound)    ? p.nextRound.map(x => ({...x}))    : [];
  post.index        = typeof p.index === 'number' ? p.index : 0;
  post.totalMatches = typeof p.totalMatches === 'number' ? p.totalMatches : 0;
  post.doneMatches  = typeof p.doneMatches  === 'number' ? p.doneMatches  : 0;
  post.ruTotal      = typeof p.ruTotal      === 'number' ? p.ruTotal      : (post.ruTotal || 0);
  post.thirdTotal   = typeof p.thirdTotal   === 'number' ? p.thirdTotal   : (post.thirdTotal || 0);
  post.ruWins       = typeof p.ruWins       === 'number' ? p.ruWins       : 0;
  post.thirdWins    = typeof p.thirdWins    === 'number' ? p.thirdWins    : 0;
  post.runnerUp     = p.runnerUp ? { ...p.runnerUp } : null;
  post.third        = p.third ? { ...p.third } : null;
  post.ruWinsByMon    = { ...(p.ruWinsByMon || {}) };
  post.thirdWinsByMon = { ...(p.thirdWinsByMon || {}) };

  // Consuming an undo = disarm both single-step flags locally
  kothLastSnap = false;
  post.lastSnap = null;
  // If the last move was Pick For Me, restore the use
  if (lastMoveWasPickForMe) {
    pickForMeUsesLeft++;
    updatePickForMeButton();
    lastMoveWasPickForMe = false; // Reset the flag
  }

  withScrollLock(() => {
    displayMatchup();
    if (state.phase === 'RU' || state.phase === 'THIRD') {
      updatePostProgress();
    } else {
      updateProgress();
    }
    updateUndoButton();
  });
}

// ----- Rendering (no-flash labels, hidden placeholder text when name missing)
function labelHTML(p, side){
  const text = p.name ? (p.shiny ? `⭐ ${p.name}` : p.name) : "";
  return `<p data-role="label" class="pkr-label">${text || "&nbsp;"}</p>
          <div class="h2h-badge" data-side="${side || ''}"
               style="text-align:center; font-size:.8rem; color:#6b7280; min-height:1em; margin-top:2px;"></div>`;
}

// Track what’s currently shown on each side so we don’t re-render unnecessarily
let _prevLeftKey = '';
let _prevRightKey = '';

function _monKeyForSide(p){ return p ? `${p.id}-${p.shiny?1:0}` : ''; }

// Resolve when an <img> loads, or when all fallbacks are exhausted.
function awaitImgLoaded(img){
  return new Promise((resolve) => {
    if (!img) return resolve();
    if (img.complete && img.naturalWidth > 0) return resolve();

    const onLoad = () => { cleanup(); resolve(); };
    const onError = () => {
      try {
        const steps = JSON.parse(img.dataset.fallbacks || '[]');
        const i = parseInt(img.dataset.step || '0', 10);
        if (i < steps.length) return; // more fallbacks pending; keep waiting
      } catch {}
      cleanup(); resolve();
    };
    const cleanup = () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };

    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
  });
}

function maybePreloadNextSprite(){
  try {
    // Respect user’s connection
    const nc = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
    if (nc && (nc.saveData || (nc.effectiveType && /(^|[^3-4])g/.test(nc.effectiveType)))) {
      return; // skip on data-saver or <3g-ish
    }

    // Peek the next upcoming mon after the visible pair
    const upcoming = remaining && remaining.length ? remaining[remaining.length - 1] : null;
    if (!upcoming) return;

    // Only preload the primary official-artwork; fallbacks still handled at show time
    const url = spriteUrlChain(upcoming.id, !!upcoming.shiny)[0];

    // Avoid re-preloading the same URL repeatedly
    if (maybePreloadNextSprite._last === url) return;
    maybePreloadNextSprite._last = url;

    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    try { img.fetchPriority = 'low'; } catch {}
    img.src = url; // browser will cache it for the next swap
  } catch {}
}

// --- Right-side smooth swap (off-screen prerender + height lock)
let _rightRenderVersion = 0;
let _pendingRightTemp = null;

function renderOpponentSmooth(mon){
  const rightEl = document.getElementById("right");
  _rightRenderVersion += 1;
  const myVersion = _rightRenderVersion;

  // Clean any previous temp node
  if (_pendingRightTemp && _pendingRightTemp.isConnected) {
    try { document.body.removeChild(_pendingRightTemp); } catch {}
  }
  _pendingRightTemp = null;

  if (!mon) { rightEl.innerHTML = ""; return; }

// Lock to the *current* height only (never force a taller card)
const prevMinHeight = rightEl.style.minHeight;
const curH = rightEl.offsetHeight || rightEl.getBoundingClientRect().height || 0;
if (curH > 0) {
  rightEl.style.minHeight = `${Math.round(curH)}px`;
}
  // Off-screen prerender: use your existing getImageTag() + labelHTML()
  // Off-screen prerender: mirror the left card’s structure
const temp = document.createElement('div');
temp.style.position = 'absolute';
temp.style.left = '-9999px';
temp.style.top = '0';
temp.innerHTML = `
  <div class="matchup-img-wrap">
    ${getImageTag(mon, mon.shiny, mon.name)}
  </div>
  ${labelHTML(mon, 'right')}
`;
document.body.appendChild(temp);
_pendingRightTemp = temp;


  const img = temp.querySelector('img');

  awaitImgLoaded(img).then(() => {
    // If another render started, abort and clean up
    if (myVersion !== _rightRenderVersion) {
      try { document.body.removeChild(temp); } catch {}
      return;
    }

    // Move already-loaded nodes into place (no flicker)
    while (rightEl.firstChild) rightEl.removeChild(rightEl.firstChild);
    while (temp.firstChild) {
      const node = temp.firstChild;
      temp.removeChild(node);
      if (node.tagName === 'IMG') {
        node.style.visibility = 'visible';
      }
      rightEl.appendChild(node);
    }

    try { document.body.removeChild(temp); } catch {}
    _pendingRightTemp = null;

 // Track last rendered key (you already do this for both sides)
    _prevRightKey = _monKeyForSide(mon);
    
    // Refresh H2H badges after the right side is rendered
    refreshH2HBadges();
  }).finally(() => {
    // Unlock height on next frame
    requestAnimationFrame(() => {
      rightEl.style.minHeight = prevMinHeight || '';
    });
  });
}


// Ensure a side container has an <img> + <p>, then update only if the mon changed
function buildOrUpdateSide(sideId, mon){
  const container = document.getElementById(sideId);
  if (!container) return;

  const key    = _monKeyForSide(mon);
  const isLeft = (sideId === 'left');
  const prevKey = isLeft ? _prevLeftKey : _prevRightKey;

  // Same mon → ensure visible & label in sync; nothing else to do
  if (key === prevKey) {
    const img = container.querySelector('img');
    const nameP = container.querySelector('p[data-role="label"]');
    if (nameP) nameP.textContent = (mon.shiny ? '⭐ ' : '') + (mon.name || '');
    if (img) img.style.visibility = 'visible';
    return;
  }

// Lock to the *current* height only (never force a taller card)
const prevMinHeight = container.style.minHeight;
const curH = container.offsetHeight || container.getBoundingClientRect().height || 0;
if (curH > 0) {
  container.style.minHeight = `${Math.round(curH)}px`;
}

  // Off-screen prerender: build the exact markup we will show
  const temp = document.createElement('div');
  temp.style.position = 'absolute';
  temp.style.left = '-9999px';
  temp.style.top  = '0';
 temp.innerHTML = `
    <div class="matchup-img-wrap">
      ${getImageTag(mon, mon.shiny, mon.name)}
    </div>
    ${labelHTML(mon, isLeft ? 'left' : 'right')}
  `;
  document.body.appendChild(temp);

  const img = temp.querySelector('img');
  if (img) {
    // tiny hints; no extra requests
    img.fetchPriority = 'high';
    img.decoding = 'async';
    img.loading = 'eager';
  }

  const done = img ? awaitImgLoaded(img) : Promise.resolve();
  done.then(() => {
    // Swap in the already-loaded nodes atomically
    container.innerHTML = '';
    while (temp.firstChild) {
      const node = temp.firstChild;
      temp.removeChild(node);
      if (node.tagName === 'IMG') node.style.visibility = 'visible';
      container.appendChild(node);
    }
    try { document.body.removeChild(temp); } catch {}

    if (isLeft) _prevLeftKey = key; else _prevRightKey = key;
  }).finally(() => {
    requestAnimationFrame(() => {
      container.style.minHeight = prevMinHeight || '';
    });
  });
}



function displayMatchup() {
  if (!current && !next) {
    document.getElementById("matchup").style.display = "none";
    document.getElementById("remaining-text").textContent = "No Pokémon loaded.";
    return;
  }
  if (current && !next && remaining.length === 0 && !isInPost()) {
    showWinner(current);
    return;
  }

 buildOrUpdateSide('left', current); // unchanged
renderOpponentSmooth(next);         // flicker-free swap on the right

  // Warm up just one sprite ahead (no effect on slow/data-saver)
  maybePreloadNextSprite();
  
  // Refresh H2H badges after rendering
  refreshH2HBadges();
}

function updateProgress() {
  // If we're in a post bracket, never use KOTH math — delegate.
  if (post && (post.phase === 'RU' || post.phase === 'THIRD')) {
    updatePostProgress();
    return;
  }
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

function pick(side) {
  if (!window.prEngine || typeof prEngine.choose !== 'function') return;
  if (gameOver) return;

  const inPost = isInPost();

  // Save H2H state before making the pick
  const h2hSnapshot = JSON.parse(JSON.stringify(H2H));

  // Capture the pair BEFORE calling the engine
  const beforeLeft  = current;
  const beforeRight = next;

  if (inPost) {
    // RU/THIRD: create our local one-step snapshot so the Undo button enables immediately
    postSaveLastSnapshot();
  } else {
    // KOTH: arm single-step undo for exactly one revert
    kothLastSnap = true;
    // Store H2H snapshot for KOTH undo
    window.lastH2HSnapshot = h2hSnapshot;
  }
  updateUndoButton();

const state = prEngine.choose(side === 'left' ? 'left' : 'right');
  if (!state) return;

  // Record the head-to-head result for this exact pair
  const winnerMon = (side === 'left') ? beforeLeft : beforeRight;
  const loserMon  = (side === 'left') ? beforeRight : beforeLeft;
  if (winnerMon && loserMon) h2hRecord(winnerMon, loserMon);
  // ---- Mirror engine → local (let bindings can reassign) ----
  remaining  = state.remaining  || [];
  eliminated = state.eliminated || [];
  current    = state.current    || null;
  next       = state.next       || null;
  roundNum   = state.roundNum   || 0;
gameOver   = !!state.gameOver;

  // const-like containers: mutate in place
  if (state.lostTo) {
    for (const k in lostTo) delete lostTo[k];
    for (const k in state.lostTo) lostTo[k] = state.lostTo[k];
  } else {
    for (const k in lostTo) delete lostTo[k];
  }
  if (state.roundIndex) {
    for (const k in roundIndex) delete roundIndex[k];
    for (const k in state.roundIndex) roundIndex[k] = state.roundIndex[k];
  } else {
    for (const k in roundIndex) delete roundIndex[k];
  }
  const lh = Array.isArray(state.leftHistory) ? state.leftHistory : [];
  leftHistory.splice(0, leftHistory.length, ...lh);

  // ---- Mirror post-phase info for your existing UI ----
  const p = state.post || {};
  postMode = (state.phase === 'RU' || state.phase === 'THIRD') ? state.phase : null;

  post.phase        = p.phase || null;
  post.currentRound = Array.isArray(p.currentRound) ? p.currentRound.map(x => ({...x})) : [];
  post.nextRound    = Array.isArray(p.nextRound)    ? p.nextRound.map(x => ({...x}))    : [];
  post.index        = typeof p.index === 'number' ? p.index : 0;
  post.totalMatches = typeof p.totalMatches === 'number' ? p.totalMatches : 0;
  post.doneMatches  = typeof p.doneMatches  === 'number' ? p.doneMatches  : 0;
  post.ruTotal      = typeof p.ruTotal      === 'number' ? p.ruTotal      : (post.ruTotal || 0);
  post.thirdTotal   = typeof p.thirdTotal   === 'number' ? p.thirdTotal   : (post.thirdTotal || 0);
  post.ruWins       = typeof p.ruWins       === 'number' ? p.ruWins       : 0;
  post.thirdWins    = typeof p.thirdWins    === 'number' ? p.thirdWins    : 0;
  post.runnerUp     = p.runnerUp ? { ...p.runnerUp } : null;
  post.third        = p.third ? { ...p.third } : null;

  post.ruWinsByMon    = { ...(p.ruWinsByMon || {}) };
  post.thirdWinsByMon = { ...(p.thirdWinsByMon || {}) };

  // If the engine just transitioned into RU or THIRD and no picks
  // have been made in that bracket yet, ensure Undo is disabled.
  if ((state.phase === 'RU' || state.phase === 'THIRD') &&
      post.doneMatches === 0 && post.index === 0) {
    post.lastSnap = null;
  }

  // ---- Render depending on phase ----
  if (state.phase === 'DONE') {
    showWinner(leftHistory[leftHistory.length - 1] || current);
    return;
  }

  withScrollLock(() => {
    displayMatchup();
    if (state.phase === 'RU' || state.phase === 'THIRD') {
      updatePostProgress();
    } else {
      updateProgress();
    }
    updateUndoButton();
  });
}

// --- Single-step undo for post-phase (RU/THIRD) ---
// --- Single-step undo for post-phase (RU/THIRD) ---
function postSaveLastSnapshot() {
  post.lastSnap = {
    phase: post.phase,
    currentRound: [...post.currentRound],
    nextRound:    [...post.nextRound],
    index:        post.index,
    totalMatches: post.totalMatches,
    doneMatches:  post.doneMatches,
    ruWins:       post.ruWins,
    ruWinsByMon:  { ...(post.ruWinsByMon || {}) },
    thirdWins:    post.thirdWins,
    thirdWinsByMon:{ ...(post.thirdWinsByMon || {}) },
    runnerUp:     post.runnerUp ? { ...post.runnerUp } : null,
    third:        post.third ? { ...post.third } : null,
    h2h:          JSON.parse(JSON.stringify(H2H)),  // Save H2H state
  };
  updateUndoButton?.();
}

function postRestoreLastSnapshot() {
  const s = post.lastSnap;
  if (!s) return;

  post.phase        = s.phase;
  post.currentRound = s.currentRound;
  post.nextRound    = s.nextRound;
  post.index        = s.index;
  post.totalMatches = s.totalMatches;
  post.doneMatches  = s.doneMatches;
  post.ruWins       = s.ruWins;
  post.ruWinsByMon  = s.ruWinsByMon || {};
  post.thirdWins    = s.thirdWins;
  post.thirdWinsByMon = s.thirdWinsByMon || {};
  post.runnerUp     = s.runnerUp;
  post.third        = s.third;

  // Restore H2H state
  if (s.h2h) {
    for (const k in H2H) delete H2H[k];
    Object.assign(H2H, s.h2h);
  }

  post.lastSnap = null;        // single-step: consume it
  updateUndoButton?.();

  // Re-render the current post-phase matchup
  scheduleNextPostMatch();
}

// Seeding comparator: higher survivals, then later loss, then name
function seedCmp(a, b) {
  const sA = a?.roundsSurvived || 0, sB = b?.roundsSurvived || 0;
  if (sA !== sB) return sB - sA;
  const rA = roundIndex[monKey(a)] || 0, rB = roundIndex[monKey(b)] || 0;
  if (rA !== rB) return rB - rA;
  return String(a?.name||'').localeCompare(String(b?.name||'')); // stable tiebreak
}

// Helpers to pluck mons by key
function findByKey(key){
  if (!key) return null;
  if (current && monKey(current) === key) return current;
  if (next && monKey(next) === key) return next;
  const e = eliminated.find(p => monKey(p) === key);
  return e || null;
}

function showWinner(finalWinner){
  // Track completion for achievements (NEW!)
  if (!gameOver) {  // Only track if we haven't already finished
    const category = 'starters';  // Starters page always tracks as 'starters'
    trackRankingCompletion(category, pool.length);
  }
  gameOver = true;
  document.removeEventListener("keydown", onKeydown);

  updateUndoButton();
  document.getElementById("btnUndo")?.setAttribute("disabled", true);

  document.getElementById("progress-container").style.display = "none";
  document.getElementById("matchup").style.display = "none";
  const controls = document.getElementById('ingame-controls');
  if (controls) controls.style.display = 'none';

  const { champion, runnerUp, thirdPlace, honorable } = computeResults(finalWinner);

  function bracketWinsFor(title, mon) {
    const key = monKey(mon);
    if (title === "Runner-up")  return (post.ruWinsByMon && post.ruWinsByMon[key]) || 0;
    if (title === "Third Place") return (post.thirdWinsByMon && post.thirdWinsByMon[key]) || 0;
    return 0;
  }

  const renderCard = (title, p) => {
    if (!p) return "";
    const survivedLine = `<p class="rounds-text">Survived ${pluralize(p.roundsSurvived || 0, "Round", "Rounds")}</p>`;

    if (title === "Runner-up" || title === "Third Place") {
      const wins = bracketWinsFor(title, p);
      const winsLine = wins > 0
        ? `<p class="rounds-text">Won ${pluralize(wins, "Match", "Matches")}</p>`
        : `<p class="rounds-text">Auto-advanced</p>`;

      return `
        <div class="pokemon-card compact-card">
         ${getImageTag(p, p.shiny, p.name, true)}
          <p>${p.shiny ? "⭐ " : ""}${p.name}</p>
          ${survivedLine}
          ${winsLine}
          <p class="placement-tag">${title}</p>
        </div>
      `;
    }

    // Hon. Mention keeps alignment with an invisible placeholder line
return `
  <div class="pokemon-card compact-card">
    ${getImageTag(p, p.shiny, p.name, true)}
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
        ${getImageTag(champion, champion.shiny, champion.name).replace('<img ', '<img class="champion-img" ')}
        <img src="assets/confetti.gif" class="confetti" alt="Confetti">
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
    return obj;
  };

    // Use the same dynamic label you see in the page title
  const category = startersLabel();
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
    // Auto-sync if logged in
    if (window.PokeRankrAuth && window.PokeRankrAuth.isLoggedIn()) {
      setTimeout(() => {
        window.PokeRankrSync.syncLocalToCloud();
      }, 500);
    }
    alert(`Saved! Your ${category} ranking has been updated.`);
  } catch(e){
    console.error(e);
    alert("Could not save rankings.");
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

// Pick For Me button functionality
let pickForMeUsesLeft = 3;
let lastMoveWasPickForMe = false; // Track if last move was Pick For Me

function handlePickForMe() {
  if (pickForMeUsesLeft <= 0) return;
  
  // Mark that this move was made with Pick For Me
  lastMoveWasPickForMe = true;
  
  // Randomly choose left or right
  const choice = Math.random() < 0.5 ? 'left' : 'right';
  
  // Use the existing pick function
  pick(choice);
  
  // Decrease uses and update button
  pickForMeUsesLeft--;
  updatePickForMeButton();
}

function updatePickForMeButton() {
  const btn = document.getElementById('btnPickForMe');
  if (!btn) return;
  
  if (pickForMeUsesLeft <= 0) {
    btn.disabled = true;
    btn.querySelector('.button_top').textContent = 'Pick For Me! (0)';
  } else {
    btn.disabled = false;
    btn.querySelector('.button_top').textContent = `Pick For Me! (${pickForMeUsesLeft})`;
  }
}

// Add event listener for the button
document.getElementById('btnPickForMe')?.addEventListener('click', handlePickForMe);

// Initialize button state
updatePickForMeButton();

// Add event listener to existing Main Menu button
document.getElementById('btnMainMenu')?.addEventListener('click', goToMainMenu);

// Optional: expose resume helper globally if we decide to deep-link
window._PR_loadStarterSession = loadStarterSession;

function goToMainMenu(){
  // Consider it "in progress" if you’ve done anything beyond the initial state
    const atStart =
    eliminated.length === 0 &&
    !isInPost() &&
    roundNum === 0 &&
    remaining.length === (pool.length - 2);


  if (!atStart) {
    const ok = confirm("This session has not been saved! Are you sure you want to go back to the main menu?");
    if (!ok) return;
  }
  window.location.href = 'index.html';
}

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
  return spriteUrlChain(id, shiny);
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
  card=false, lines = [],
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

  // Stat lines
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
        lines: buildLinesFor(sd.title, sd.mon)
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

document.addEventListener('DOMContentLoaded', () => {
  try {
    const pending = localStorage.getItem('PR_PENDING_RESUME_SLOT');
    if (pending !== null) {
      localStorage.removeItem('PR_PENDING_RESUME_SLOT');
      const slots = readSlots();
      const idx = parseInt(pending, 10);
      const s = Array.isArray(slots) ? slots[idx] : null;
      if (s && s.type === 'starters') {
        loadStarterSession(s);
        setStartersTitle();            // NEW
        return;
      }
    }
  } catch {}
  // No pending resume → render current phase correctly
  setStartersTitle();                  // NEW
  displayMatchup();
  (isInPost() ? updatePostProgress() : updateProgress());
  updateUndoButton();
});

