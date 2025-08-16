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

// ----- Regional form name suffixes used by PokeAPI "pokemon" endpoint
const FORM_VARIETY_SUFFIX = {
  hisui:  '-hisui',
  galar:  '-galar',
  alola:  '-alola',
};

// Curated display names for specific varieties (no dashed slugs)
const FRIENDLY_NAME_OVERRIDES = {
  "lycanroc-midday":   "Lycanroc (Midday)",
  "lycanroc-midnight": "Lycanroc (Midnight)",
  "lycanroc-dusk":     "Lycanroc (Dusk)",

  "oricorio-baile":    "Oricorio (Baile)",
  "oricorio-pom-pom":  "Oricorio (Pom-Pom)",
  "oricorio-pau":      "Oricorio (Pa'u)",
  "oricorio-sensu":    "Oricorio (Sensu)",
};

// Minimal starter set for Alternate/Battle forms by generation.
// IMPORTANT: we pass a base national dex id (id), plus a variety slug (variety).
// Images will use the slug; keys use (id + variety) so entries are distinct.
const ALT_BATTLE_FORMS_BY_GEN = {
  7: [
    // Lycanroc
    { id: 745, variety: "lycanroc-midday"   },
    { id: 745, variety: "lycanroc-midnight" },
    { id: 745, variety: "lycanroc-dusk"     },

    // Oricorio
    { id: 741, variety: "oricorio-baile"   },
    { id: 741, variety: "oricorio-pom-pom" },
    { id: 741, variety: "oricorio-pau"     },
    { id: 741, variety: "oricorio-sensu"   },
  ],
};


// Helper: build a nice display name for an alt/battle entry
function friendlyNameForVariety(variety){
  // 1) exact curated override
  if (FRIENDLY_NAME_OVERRIDES[variety]) return FRIENDLY_NAME_OVERRIDES[variety];

  // 2) derive "Base (Form ...)" from the slug, e.g. "lycanroc-midday" -> "Lycanroc (Midday)"
  const parts = String(variety || '').split('-').filter(Boolean);
  if (!parts.length) return '';
  const base = parts.shift();                 // "lycanroc"
  const form = parts.join(' ');               // "midday" | "mid night" (rare multi-part)

  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  const capWords = (s) => s.split(' ').map(cap).join(' ');

  return `${cap(base)} (${capWords(form)})`;
}


// ----- Pool builder (Gen 1–2)
function buildGenPool(gen){
  const toggles = (window.rankConfig && window.rankConfig.toggles) || window.toggles || {};
  const includeRegional = !!toggles.regional;      // Regional forms (Alola / Galar / Hisui)
  const includeAltBattle = !!toggles.altBattle;    // Alternate/Battle forms (e.g., Lycanroc)

  // ----- Regional/alt-form → generation overrides (forms that belong to a later gen)
  // Only include forms whose *base dex ID* is from an earlier gen, but the form debuted later.
  // Display names are what you want to show in the UI/export; IDs stay the same.
  const FORM_GEN_OVERRIDES = [
    // Hisui (Gen 8)
    { id: 58,   name: "Hisuian Growlithe", gen: 8 },
    { id: 59,   name: "Hisuian Arcanine",  gen: 8 },
    { id: 215,  name: "Hisuian Sneasel",   gen: 8 },
    { id: 503,  name: "Hisuian Samurott",  gen: 8 },
    { id: 549,  name: "Hisuian Lilligant", gen: 8 },
    { id: 571,  name: "Hisuian Zoroark",   gen: 8 },
    { id: 628,  name: "Hisuian Braviary",  gen: 8 },
    { id: 705,  name: "Hisuian Sliggoo",   gen: 8 },
    { id: 706,  name: "Hisuian Goodra",    gen: 8 },
    { id: 713,  name: "Hisuian Avalugg",   gen: 8 },
    { id: 724,  name: "Hisuian Decidueye", gen: 8 },

    // Alola (Gen 7) – examples
    { id: 19,   name: "Alolan Rattata",    gen: 7 },
    { id: 20,   name: "Alolan Raticate",   gen: 7 },
    { id: 26,   name: "Alolan Raichu",     gen: 7 },
    { id: 27,   name: "Alolan Sandshrew",  gen: 7 },
    { id: 28,   name: "Alolan Sandslash",  gen: 7 },
    { id: 37,   name: "Alolan Vulpix",     gen: 7 },
    { id: 38,   name: "Alolan Ninetales",  gen: 7 },

    // Galar (Gen 8) – examples
    { id: 52,   name: "Galarian Meowth",   gen: 8 },
    { id: 77,   name: "Galarian Ponyta",   gen: 8 },
    { id: 78,   name: "Galarian Rapidash", gen: 8 },
    { id: 79,   name: "Galarian Slowpoke", gen: 8 },
    { id: 80,   name: "Galarian Slowbro",  gen: 8 },
    { id: 110,  name: "Galarian Weezing",  gen: 8 },
    { id: 122,  name: "Galarian Mr. Mime", gen: 8 },
    { id: 144,  name: "Galarian Articuno", gen: 8 },
    { id: 145,  name: "Galarian Zapdos",  gen: 8 },
    { id: 146,  name: "Galarian Moltres", gen: 8 },
  ];

   // helper: build entries honoring shinyOnly/includeShinies flags
  function entriesFor(id, name) {
    const base = { id, name: name || null };
    if (window.shinyOnly) return [{ ...base, shiny: true }];
    if (window.includeShinies) return [{ ...base, shiny: false }, { ...base, shiny: true }];
    return [{ ...base, shiny: false }];
  }

  const ranges = { 1:[1,151],2:[152,251],3:[252,386],4:[387,493],5:[494,649],6:[650,721],7:[722,809],8:[810,905],9:[906,1025] };
  const [start, end] = ranges[gen] || [];
  if (!start) return [];

  // Base pool by national dex range
  const ids = Array.from({length: end - start + 1}, (_,i)=> start + i);
  let pool = [];
  ids.forEach(id => { pool.push(...entriesFor(id, null)); });

    // ✅ Inject Regional forms for this gen ONLY if toggle is on
  if (includeRegional) {
    const formsForGen = FORM_GEN_OVERRIDES.filter(f => f.gen === gen);

    // Track existing display names to avoid dup labels
    const existingNames = new Set(
      pool.map(m => (m.name || '').toLowerCase()).filter(Boolean)
    );

    formsForGen.forEach(f => {
      const display = f.name; // e.g., "Alolan Rattata"
      if (!existingNames.has(display.toLowerCase())) {
        pool.push(...entriesFor(f.id, display));
        existingNames.add(display.toLowerCase());
      }
    });
  }

// ✅ Inject Alternate/Battle forms for this gen ONLY if toggle is on
if (includeAltBattle && ALT_BATTLE_FORMS_BY_GEN[gen]?.length) {
  // Index existing entries by id
  const byId = new Map();
  pool.forEach((p, idx) => {
    if (!byId.has(p.id)) byId.set(p.id, []);
    byId.get(p.id).push(idx);
  });

  // Track names to avoid dup labels
  const existingNames = new Set(
    pool.map(m => (m.name || '').toLowerCase()).filter(Boolean)
  );

  ALT_BATTLE_FORMS_BY_GEN[gen].forEach(entry => {
    const display = friendlyNameForVariety(entry.variety); // e.g. "Lycanroc (Midnight)"

    // If we already have the base id in pool (e.g. 745 from base dex range)
    // and this variety is the "default" one you want the base slot to represent
    // (for Lycanroc, we treat "midday" as default),
    // then rename/annotate that base entry instead of adding a duplicate.
    const isDefaultLycanroc = (entry.id === 745 && entry.variety === 'lycanroc-midday');
    const isDefaultOricorio = (entry.id === 741 && entry.variety === 'oricorio-baile');

    if ((isDefaultLycanroc || isDefaultOricorio) && byId.has(entry.id)) {
      const idxs = byId.get(entry.id) || [];
      idxs.forEach(i => {
        pool[i].name = display;          // curated label
        pool[i].variety = entry.variety; // remember variety for images/keys
      });
      existingNames.add(display.toLowerCase());
      return; // do not add a new entry for the default
    }

    // For non-default varieties: add a new entry if name not already present
    if (!existingNames.has(display.toLowerCase())) {
      const base = { id: entry.id, name: display, variety: entry.variety };
      if (window.shinyOnly) {
        pool.push({ ...base, shiny: true });
      } else if (window.includeShinies) {
        pool.push({ ...base, shiny: false }, { ...base, shiny: true });
      } else {
        pool.push({ ...base, shiny: false });
      }
      existingNames.add(display.toLowerCase());
    }
  });
}
  return pool;
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
    <h2>COMING SOON!</h2>
    <p>Currently Supported: <strong>Generation + Starters</strong>.</p>
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

// Artwork ID cache (variety slug -> numeric pokemon id, e.g. "growlithe-hisui" -> 10229)
const ART_ID_CACHE_KEY = "artIdCache";
const artIdCache = (() => {
  try { return JSON.parse(localStorage.getItem(ART_ID_CACHE_KEY) || "{}"); }
  catch { return {}; }
})();
function saveArtIdCache(){
  try { localStorage.setItem(ART_ID_CACHE_KEY, JSON.stringify(artIdCache)); } catch {}
}

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

/* ---------- Form-aware sprite helpers (official-artwork only, numeric-ID aware) ---------- */

// Slugify a display name like "Mr. Mime" -> "mr-mime"
function slugifyBaseName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // non-alnum -> dash
    .replace(/^-+|-+$/g, '');      // trim dashes
}

// Detect a regional form from a display name like "Hisuian Growlithe" or "Galarian Weezing"
function parseFormFromName(name) {
  const n = String(name || '');
  if (/^\s*hisuian\s+/i.test(n)) return 'hisui';
  if (/^\s*galarian\s+/i.test(n)) return 'galar';
  if (/^\s*alolan?\s+/i.test(n))  return 'alola';
  return null;
}

// Build a "variety" slug. For alt/battle, we store p.variety explicitly.
// For regional (Alolan/Galarian/Hisuian) we derive from the display name.
function varietySlugFromMon(p) {
  if (p?.variety) return p.variety; // explicit wins

  const display = p?.name || nameCache[p?.id];
  if (!display) return null;

  const n = String(display);
  if (/^\s*hisuian\s+/i.test(n)) {
    return `${slugifyBaseName(n.replace(/^\s*hisuian\s+/i, ''))}-hisui`;
  }
  if (/^\s*galarian\s+/i.test(n)) {
    return `${slugifyBaseName(n.replace(/^\s*galarian\s+/i, ''))}-galar`;
  }
  if (/^\s*alolan?\s+/i.test(n)) {
    return `${slugifyBaseName(n.replace(/^\s*alolan?\s+/i, ''))}-alola`;
  }
  return null;
}


// Resolve numeric artwork id for a variety slug via PokeAPI /pokemon/{slug}, cache it, then refresh any matching <img>s.
async function ensureArtworkIdForVariety(varietySlug){
  if (!varietySlug || artIdCache[varietySlug]) return artIdCache[varietySlug];

  try {
    const resp = await fetch(`https://pokeapi.co/api/v2/pokemon/${varietySlug}`, { cache: 'force-cache' });
    if (!resp.ok) return null;
    const data = await resp.json();
    const id = data?.id;
    if (typeof id === 'number' && id > 0) {
      artIdCache[varietySlug] = id;
      saveArtIdCache();

      // Update any imgs already on the page that were waiting on this id
      const nodes = document.querySelectorAll(`img[data-variety="${varietySlug}"]`);
      nodes.forEach(img => {
        const shiny = img.dataset.shiny === '1';
        const chain = buildOfficialChainFromId(id, shiny);
        if (chain.length && img.src !== chain[0]) {
          img.dataset.step = "0";
          img.src = chain[0];
          img.dataset.fallbacks = JSON.stringify(chain.slice(1));
        }
      });
      return id;
    }
  } catch {}
  return null;
}

// Helper: construct official-artwork fallback chain from a numeric id
function buildOfficialChainFromId(numId, shiny){
  const idShiny = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${numId}.png`;
  const idNorm  = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${numId}.png`;
  return shiny ? [idShiny, idNorm] : [idNorm];
}

// Return official-artwork URL for a form if we can, else official-artwork by base ID (string URL only, used in previews)
function spriteUrlForMon(p, shiny) {
  const variety = varietySlugFromMon(p);
  if (variety) {
    const artId = artIdCache[variety];
    if (artId) {
      return shiny
        ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${artId}.png`
        : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${artId}.png`;
    }
    // try slug first; kick off async resolve
    ensureArtworkIdForVariety(variety);
    return shiny
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${variety}.png`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${variety}.png`;
  }
  // Fall back to base species official-artwork by ID
  return spriteUrl(p.id, shiny);
}

// OFFICIAL-ARTWORK ONLY fallback chain with numeric-ID preference:
// variety (numeric cached) -> variety (slug) -> base (id)
function getImageTag(monOrId, shiny = false, alt = "") {
  const p = (typeof monOrId === 'object' && monOrId)
    ? monOrId
    : { id: monOrId, shiny, name: nameCache[monOrId] };

  const wantShiny = !!(p.shiny ?? shiny);
  const variety = varietySlugFromMon(p);

  let chain = [];

  if (variety) {
    const artId = artIdCache[variety] || null;
    if (artId) {
      chain.push(...buildOfficialChainFromId(artId, wantShiny));
    } else {
      const vShiny = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${variety}.png`;
      const vNorm  = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${variety}.png`;
      chain.push(...(wantShiny ? [vShiny, vNorm] : [vNorm]));
      ensureArtworkIdForVariety(variety);
    }
  }

  const baseIdShiny = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${p.id}.png`;
  const baseIdNorm  = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`;
  chain.push(...(wantShiny ? [baseIdShiny, baseIdNorm] : [baseIdNorm]));

  const first = chain[0];
  const safeAlt = alt || (p.name || nameCache[p.id] || "");

  return `<img
  src="${first}"
  alt="${safeAlt}"
  style="visibility:hidden"
  width="256" height="256"
  data-variety="${variety || ''}"
  data-shiny="${wantShiny ? '1' : '0'}"
  data-step="0"
  data-fallbacks='${JSON.stringify(chain.slice(1))}'
  onload="this.style.visibility='visible'"
    onerror="
      try {
        this.style.visibility='hidden';
        const steps = JSON.parse(this.dataset.fallbacks||'[]');
        let i = parseInt(this.dataset.step||'0',10);
        if (i < steps.length) { this.dataset.step = String(++i); this.src = steps[i-1]; }
        else { this.onerror=null; }
      } catch(e) { this.onerror=null; }
    ">`;
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
  requestAnimationFrame(() => window.scrollTo({ top: y, left: 0, behavior: 'instant' }));
}

// monKey alias for compatibility with starters.js snippets
const monKey = (p) => {
  if (!p) return "";
  const v = p.variety ? `-${p.variety}` : "";
  return `${p.id}-${p.shiny ? 1 : 0}${v}`;
};


// --- Post-tournament global win map (used for THIRD seeding) ---
const bracketWinsByMon = Object.create(null); // monKey -> count

// --- Tracking for post-tournament mini-brackets ---
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
function updateUndoButton() {
  const btn = document.getElementById("btnUndo");
  if (!btn) return;

    const inPost = !!postMode && (post.phase === 'RU' || post.phase === 'THIRD');
  if (inPost) {
    // Only allow single-step undo within RU/THIRD — no cross-boundary jump
    btn.disabled = !post.lastSnap;
  } else {
    btn.disabled = history.length === 0; // normal KOTH history
  }

}

function undoLast() {
  // Post-phase undo (single-step only; no cross-boundary jump)
  if (post.phase === 'RU' || post.phase === 'THIRD') {
    if (!post.lastSnap) return; // stay in RU/THIRD; nothing to undo
    postRestoreLastSnapshot();
    return;
  }


  // KOTH undo (unchanged single-step)
  if (history.length === 0) return;
  const prev = history.pop();
  restoreState(prev);
  history = [];
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
// Create "Main Menu" button on the ranking screen
(function addMainMenuButton(){
  const container = document.getElementById('ingame-controls');
  if (!container || document.getElementById('btnMainMenu')) return;

  const btn = document.createElement('button');
  btn.id = 'btnMainMenu';
  btn.textContent = 'Main Menu';
  btn.addEventListener('click', goToMainMenu);

  // Put it at the end of the controls row
  container.appendChild(btn);
})();


// ----- Rendering
function labelHTML(p){
  const nm = p.name || nameCache[p.id] || "";
  const text = nm ? (p.shiny ? `⭐ ${nm}` : nm) : ""; // no "#NNN" placeholder
  // keep the height stable a bit with &nbsp; if totally empty
  return `<p data-id="${p.id}">${text || "&nbsp;"}</p>`;
}

// 🔹 Track last rendered mon on each side to skip left re-renders
let lastLeftKey = null;
let lastRightKey = null;

// Update only the label text inside an existing side
function updateLabelText(containerEl, mon){
  const p = containerEl.querySelector('p');
  if (p) {
    const nm = mon?.name || nameCache[mon?.id] || "";
    p.textContent = mon?.shiny ? (nm ? `⭐ ${nm}` : "") : nm;
  }
}

// Prefetch next image (best-effort) to reduce perceived delay
function ensurePrefetch(mon){
  try {
    if (!mon) return;
    const urls = spriteUrls(mon, !!mon.shiny);
    if (urls && urls[0]) {
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = urls[0];
    }
  } catch {}
}

// --- Right-side smooth swap: keep old visible until the new one is fully loaded ---
let pendingRightTemp = null;

function renderOpponentSmooth(mon){
  const rightEl = document.getElementById("right");

  // Clean up any previous offscreen pre-render
  if (pendingRightTemp && pendingRightTemp.isConnected) {
    try { document.body.removeChild(pendingRightTemp); } catch {}
  }
  pendingRightTemp = null;

  if (!mon) { rightEl.innerHTML = ""; return; }

  // Offscreen temp container that will pre-load the new opponent
  const temp = document.createElement('div');
  temp.style.position = 'absolute';
  temp.style.left = '-9999px';
  temp.style.top = '0';
  temp.innerHTML = `${getImageTag(mon)}${labelHTML(mon)}`;
  document.body.appendChild(temp);
  pendingRightTemp = temp;

  const img = temp.querySelector('img');

  const swapIn = () => {
    if (!temp.isConnected) return;                      // already cleaned
    rightEl.innerHTML = temp.innerHTML;                 // swap DOM in one go
    try { document.body.removeChild(temp); } catch {}
    pendingRightTemp = null;
    lastRightKey = monKey(mon);
  };

  let swapped = false;
  const done = () => { if (!swapped) { swapped = true; swapIn(); } };

  if (img) {
    // When the image actually finishes (after any fallback retries), we swap.
    img.addEventListener('load', done, { once: true });

    // If first URL fails, the inline onerror on the <img> will rotate through fallbacks.
    // We attach a "safety cap" so we don't hang forever if everything 404s.
    img.addEventListener('error', () => {
      setTimeout(done, 1600); // cap — still better than flashing an empty slot
    }, { once: true });
  } else {
    // No <img> tag (shouldn't happen), just swap
    swapIn();
  }
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

  const lk = monKey(current);
  const rk = monKey(next);

  // LEFT: only re-render if mon changed (prevents the “champion” flash)
  if (lk !== lastLeftKey) {
    leftEl.innerHTML = `${getImageTag(current)}${labelHTML(current)}`;
    lastLeftKey = lk;
  } else {
    updateLabelText(leftEl, current); // keep text fresh without touching the <img>
  }

  // RIGHT: do a flicker-free swap — keep the old one visible until the new image has fully loaded
  if (rk !== lastRightKey) {
    renderOpponentSmooth(next);
  } else {
    // same mon as before (rare), just refresh label
    updateLabelText(rightEl, next);
  }

  // Lazy name fetches
  ensureName(current.id);
  ensureName(next.id);

  // Prefetch the *upcoming* opponent to shrink perceived latency
  const upcoming = remaining[remaining.length - 1];
  if (upcoming) ensurePrefetch(upcoming);
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

  const left = Math.max(0, post.totalMatches - post.doneMatches - 1);
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
  // Keep KOTH history so Undo can return across the boundary
  updateUndoButton();

  // Enter RU bracket
  postMode = 'RU';
  post.phase = 'RU';

  // reset per-phase wins and maps for RU
  post.ruWins = 0;
  post.ruWinsByMon = Object.create(null);
  post.lastSnap = null;  // single-step undo starts clean for RU
  updateUndoButton();

  const champKey = monKey(finalChampion);

  // --- Build base RU pool: everyone who lost directly to the champion
  const lostKeys = Object.keys(lostTo).filter(k => lostTo[k] === champKey);
  let poolRU = lostKeys.map(k => {
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
  const placedNow = new Set([champKey]);
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
  if (round1List.length % 2 === 1) {
    post.nextRound.push(round1List[Math.floor(round1List.length / 2)]);
  }
  post.currentRound = pairs;

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
  // Clear snapshot so Undo is disabled (faded) at THIRD start.
  post.lastSnap = null;
  updateUndoButton();


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
        // Save RU final state so a single Undo in Third returns here
        postSaveLastSnapshot();
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
  // Save snapshot BEFORE mutation so Undo rolls back one step
  if (post.phase === 'RU' || post.phase === 'THIRD') {
    postSaveLastSnapshot();
  }

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
          ${getImageTag(p)}
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
        ${getImageTag(p)}
        <p>${displayName(p)}</p>
        ${survivedLine}
        <p class="rounds-text" style="visibility:hidden;">placeholder</p>
        <p class="placement-tag">${title}</p>
      </div>
    `;
  };

  const g = window.rankConfig?.filters?.generation || 1;

  document.getElementById("result").innerHTML = `
    <h2>Your Favorite (Gen ${g}) Pokemon is:</h2>
    <div class="champion-card">
      <div class="champion-image-wrapper">
        ${getImageTag(champion).replace('<img ', '<img class="champion-img" ')}
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

// Returns the numeric sprite id for 96×96 "game sprites".
// Prefers a regional/alt *form id* if we have it in artIdCache; else falls back to species id.
function formSpriteIdForMon(p){
  const v = varietySlugFromMon(p);
  if (!v) return p.id;
  const id = artIdCache[v];
  if (typeof id === 'number' && id > 0) return id;
  // Kick off async resolve for next time; fallback to species for now.
  ensureArtworkIdForVariety(v);
  return p.id;
}


function saveResults(){
  const { champion, runnerUp, thirdPlace, honorable } = computeResults();

  const pack = (p, role) => {
    if (!p) return null;
    const variety = varietySlugFromMon(p) || null;
    const obj = {
  id: p.id,
  formId: formSpriteIdForMon(p), // 👈 add this
  name: nameCache[p.id] || p.name || null,
  shiny: !!p.shiny,
  roundsSurvived: p.roundsSurvived || 0,
  variety, // keep for reference
  sprite: spriteUrlForMon({ id: p.id, name: nameCache[p.id] || p.name || null, variety }, !!p.shiny)
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

// Sprite URLs (OFFICIAL-ARTWORK ONLY, prefer numeric variety ids if cached)
function spriteUrls(pOrId, shiny) {
  const p = (typeof pOrId === 'object' && pOrId) ? pOrId : { id: pOrId, shiny, name: nameCache[pOrId] };
  const wantShiny = !!(p.shiny ?? shiny);
  const variety = varietySlugFromMon(p);

  const urls = [];

  if (variety) {
    const artId = artIdCache[variety] || null;
    if (artId) {
      const arr = buildOfficialChainFromId(artId, wantShiny);
      urls.push(...arr);
    } else {
      // Try slug first; queue resolve for next export
      if (wantShiny) {
        urls.push(
          `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${variety}.png`,
          `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${variety}.png`
        );
      } else {
        urls.push(
          `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${variety}.png`
        );
      }
      ensureArtworkIdForVariety(variety); // async, improves subsequent runs
    }
  }

  // Base species numeric id (last resort)
  if (wantShiny) {
    urls.push(
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${p.id}.png`,
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`
    );
  } else {
    urls.push(
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`
    );
  }

  return urls;
}

// Fetch → ImageBitmap (prevents canvas taint)
async function loadSpriteBitmap(p){
  const urls = spriteUrls(p, !!p.shiny);
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

function goToMainMenu(){
  // Consider it "in progress" if you’ve done anything beyond the initial state
  const atStart =
    eliminated.length === 0 &&
    !postMode &&
    history.length === 0 &&
    roundNum === 0 &&
    remaining.length === (pool.length - 2);

  if (!atStart) {
    const ok = confirm("This session has not been saved! Are you sure you want to go back to the main menu?");
    if (!ok) return;
  }
  window.location.href = 'index.html';
}


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
