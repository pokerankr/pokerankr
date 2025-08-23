// =========================
// PokéRankr — ranker.js
// Purpose: run generic rankings (Gen 1 & Gen 2)
// =========================
// --- Engine bootstrap (shared logic engine) ---
window.prEngine = (window.PokeRankrEngine && typeof PokeRankrEngine.create === 'function')
  ? PokeRankrEngine.create()
  : null;

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
  if (g === "ALL") {
    label = "All Generations";
  } else if (g) {
    label = `Generation ${g} (${regionByGen[g] || "??"})`;
  }
} else if (rc?.category === "legendaries") {
    label = "Legendaries";
  }

  titleEl.textContent = label + (window.shinyOnly ? " • Shiny-only✨" : window.includeShinies ? " • +Shinies✨" : " • No Shinies");
})();

// ===== Type Mode — data loader + filter (additive) =====
async function _prLoadPokemonDb() {
  if (window._pokemonDbCache) return window._pokemonDbCache;
  const resp = await fetch('data/pokemon.db.json', { cache: 'no-store' });
  const data = await resp.json();
  window._pokemonDbCache = Array.isArray(data) ? data : [];
  return window._pokemonDbCache;
}

function _prFilterByTypes(db, mode, typeA, typeB) {
  const A = String(typeA || '').trim();
  const B = String(typeB || '').trim();
  const dual = (mode === 'dual');

  // Each entry may have base + forms. Consider both.
  const out = [];
  for (const e of db) {
    const variants = [e, ...(Array.isArray(e.forms) ? e.forms : [])];

    for (const v of variants) {
      const t = Array.isArray(v.types) ? v.types : [];
      if (!dual) {
        // Monotype = include any Pokémon that HAS the chosen type (even if it's a dual-type mon).
        if (t.includes(A)) out.push({ id: v.id, name: v.name });
      } else {
        // Dual = exactly A + B in any order, and exactly 2 slots
        if (t.length === 2 && ((t[0] === A && t[1] === B) || (t[0] === B && t[1] === A))) {
          out.push({ id: v.id, name: v.name });
        }
      }
    }
  }
  // de-dupe by id (in case base + form share id in some listings)
  const seen = new Set();
  return out.filter(p => (p && !seen.has(p.id) && seen.add(p.id)));
}


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

  "mimikyu-disguised": "Mimikyu",
  "squawkabilly-green-plumage": "Squawkabilly",

  "tauros-paldea-combat-breed":    "Combat Paldean Tauros",
};

// Minimal starter set for Alternate/Battle forms by generation.
// IMPORTANT: we pass a base national dex id (id), plus a variety slug (variety).
// Images will use the slug; keys use (id + variety) so entries are distinct.
const ALT_BATTLE_FORMS_BY_GEN = {
  7: [
    // Lycanroc (default = Midday)
    { id: 745, variety: "lycanroc-midday" },   // default
    { id: 745, variety: "lycanroc-midnight" },
    { id: 745, variety: "lycanroc-dusk" },

    // Oricorio (default = Baile)
    { id: 741, variety: "oricorio-baile" },    // default
    { id: 741, variety: "oricorio-pom-pom" },
    { id: 741, variety: "oricorio-pau" },
    { id: 741, variety: "oricorio-sensu" },

    // Necrozma (default = base Necrozma)
    { id: 800, variety: "necrozma-dusk" },
    { id: 800, variety: "necrozma-dawn" },
    { id: 800, variety: "necrozma-ultra" },
  ],

  8: [
    // Urshifu (default = Single-Strike)
    { id: 892, variety: "urshifu-single-strike" },   // default
    { id: 892, variety: "urshifu-rapid-strike" },

    // Zarude (default = base Zarude)
    { id: 893, variety: "zarude-dada" },

    // Calyrex (default = base Calyrex)
    { id: 898, variety: "calyrex-ice" },
    { id: 898, variety: "calyrex-shadow" },

    // Enamorus (default = Incarnate)
    { id: 905, variety: "enamorus-incarnate" },      // default
    { id: 905, variety: "enamorus-therian" },
  ],

  9: [
    // Tauros (Paldea breeds) — FIXED slugs
{ id: 128, variety: "tauros-paldea-combat-breed" },
{ id: 128, variety: "tauros-paldea-blaze-breed"  },
{ id: 128, variety: "tauros-paldea-aqua-breed"   },


    // Oinkologne (default = Male)
    { id: 916, variety: "oinkologne-male" },         // default
    { id: 916, variety: "oinkologne-female" },

    // Tatsugiri (default = Curly)
    { id: 978, variety: "tatsugiri-curly" },         // default
    { id: 978, variety: "tatsugiri-droopy" },
    { id: 978, variety: "tatsugiri-stretchy" },

    // Palafin (default = Zero Form)
    { id: 964, variety: "palafin-zero" },            // default
    { id: 964, variety: "palafin-hero" },

    // Gimmighoul (default = Chest)
    { id: 999, variety: "gimmighoul-chest" },        // default
    { id: 999, variety: "gimmighoul-roaming" },
  ],
};



// Helper: build a nice display name for an alt/battle entry
function friendlyNameForVariety(variety){
  // 1) exact curated override
  if (FRIENDLY_NAME_OVERRIDES[variety]) return FRIENDLY_NAME_OVERRIDES[variety];

  const slug = String(variety || '');

  // 2) Megas → "Mega <Base> (X/Y if present)"
  //    Handles: "charizard-mega-x", "charizard-mega-y", "beedrill-mega", "rayquaza-mega", "mewtwo-mega-x|y", etc.
  if (/-mega(?:-[xy])?$/i.test(slug)) {
    const base = slug.replace(/-mega(?:-[xy])?$/i, '');
    let suffix = '';
    if (/-mega-x$/i.test(slug)) suffix = ' (X)';
    if (/-mega-y$/i.test(slug)) suffix = ' (Y)';
    const prettyBase = base.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    return `Mega ${prettyBase}${suffix}`;
  }

  // 3) fallback: derive "Base (Form ...)" from the slug
  const parts = slug.split('-').filter(Boolean);
  if (!parts.length) return '';
  const base = parts.shift();
  const form = parts.join(' ');
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  const capWords = (s) => s.split(' ').map(cap).join(' ');
  return `${cap(base)} (${capWords(form)})`;
}
// ---------- Legendaries data (IDs only, no Paradox, no Megas) ----------
const LEGENDS_CORE = [
  // Gen 1
  144,145,146,150,
  // Gen 2
  243,244,245,249,250,
  // Gen 3
  377,378,379,380,381,382,383,384,
  // Gen 4
  480,481,482,483,484,485,486,487,488,
  // Gen 5
  638,639,640,641,642,643,644,645,646,
  // Gen 6
  716,717,718,
  // Gen 7 (not UBs, not Mythicals)
  785,786,787,788,789,790,791,792,800,
  // Gen 8
  888,889,890,894,895,896,897,898,905,
  // Gen 9 (no Paradox here; include Treasures of Ruin + box legends)
  1001,1002,1003,1004,1007,1008
];

const LEGENDS_MYTHICALS = [
  151,251,385,386,490,491,492,493,494,647,648,649,719,720,721,801,802,807,808,809,893,1020
];

const LEGENDS_ULTRA_BEASTS = [
  793,794,795,796,797,798,799,803,804,805,806
];

// Forms to include when "Forms" toggle is ON (variety slugs line up with PokeAPI)
const LEGENDARY_FORMS = [
  // Tornadus/Thundurus/Landorus Therian
  { id: 641, variety: "tornadus-therian" },
  { id: 642, variety: "thundurus-therian" },
  { id: 645, variety: "landorus-therian" },

    // Deoxys forms (Mythical)
  { id: 386, variety: "deoxys-attack" },
  { id: 386, variety: "deoxys-defense" },
  { id: 386, variety: "deoxys-speed" },

  // Zygarde 10% and Complete
  { id: 718, variety: "zygarde-10" },
  { id: 718, variety: "zygarde-complete" },

  // Giratina Origin
  { id: 487, variety: "giratina-origin" },

  // Kyurem forms
  { id: 646, variety: "kyurem-black" },
  { id: 646, variety: "kyurem-white" },

  // Necrozma (also listed for Gen7 alt forms; harmless duplicate guard below)
  { id: 800, variety: "necrozma-dusk" },
  { id: 800, variety: "necrozma-dawn" },
  { id: 800, variety: "necrozma-ultra" },

  // Enamorus Therian
  { id: 905, variety: "enamorus-therian" },

  // Calyrex riders
  { id: 898, variety: "calyrex-ice" },
  { id: 898, variety: "calyrex-shadow" },

  // Shaymin Sky (only appears if Mythicals toggle is also ON; we’ll gate it later)
  { id: 492, variety: "shaymin-sky" }
];

// Some form names look nicer with overrides; we already have the mechanism in this file.
FRIENDLY_NAME_OVERRIDES["tornadus-therian"]  = "Tornadus (Therian)";
FRIENDLY_NAME_OVERRIDES["thundurus-therian"] = "Thundurus (Therian)";
FRIENDLY_NAME_OVERRIDES["landorus-therian"]  = "Landorus (Therian)";
FRIENDLY_NAME_OVERRIDES["tornadus-incarnate"]  = "Tornadus (Incarnate)";
FRIENDLY_NAME_OVERRIDES["thundurus-incarnate"] = "Thundurus (Incarnate)";
FRIENDLY_NAME_OVERRIDES["landorus-incarnate"]  = "Landorus (Incarnate)";
FRIENDLY_NAME_OVERRIDES["enamorus-incarnate"] = "Enamorus (Incarnate)";
FRIENDLY_NAME_OVERRIDES["enamorus-therian"]  = "Enamorus (Therian)";
FRIENDLY_NAME_OVERRIDES["zygarde-10"]        = "Zygarde (10%)";
FRIENDLY_NAME_OVERRIDES["zygarde-complete"]  = "Zygarde (Complete)";
FRIENDLY_NAME_OVERRIDES["giratina-origin"]   = "Giratina (Origin)";
FRIENDLY_NAME_OVERRIDES["kyurem-black"]      = "Kyurem (Black)";
FRIENDLY_NAME_OVERRIDES["kyurem-white"]      = "Kyurem (White)";
FRIENDLY_NAME_OVERRIDES["shaymin-sky"]       = "Shaymin (Sky)";
FRIENDLY_NAME_OVERRIDES["deoxys-attack"]  = "Deoxys (Attack)";
FRIENDLY_NAME_OVERRIDES["deoxys-defense"] = "Deoxys (Defense)";
FRIENDLY_NAME_OVERRIDES["deoxys-speed"]   = "Deoxys (Speed)";
FRIENDLY_NAME_OVERRIDES["mimikyu"] = "Mimikyu"; // safeguard
FRIENDLY_NAME_OVERRIDES["mimikyu-disguised"] = "Mimikyu"; // already there, but keep
FRIENDLY_NAME_OVERRIDES["mimikyu-busted"] = "Mimikyu";    // safety, though busted is skipped
FRIENDLY_NAME_OVERRIDES["squawkabilly-green-plumage"] = "Squawkabilly (Green)";


function buildLegendariesPool() {
  const toggles = (window.rankConfig && window.rankConfig.toggles) || {};
  const mythMode = toggles.mythMode || (toggles.mythicals ? 'include' : 'off'); // backwards compat
  const wantMyth = (mythMode === 'include' || mythMode === 'only');
  const mythOnly = (mythMode === 'only');
  const wantUBs  = !mythOnly && !!toggles.ultraBeasts; // ignore UBs if Mythicals Only
  const wantForms = !!toggles.forms;


  // Helper uses global shiny settings exactly like generation builder
  function entriesFor(id, name) {
    const base = { id, name: name || null };
    if (window.shinyOnly)         return [{ ...base, shiny: true }];
    if (window.includeShinies)    return [{ ...base, shiny: false }, { ...base, shiny: true }];
    return [{ ...base, shiny: false }];
  }

  // Base IDs (Paradox + Megas are simply not present in these lists)
  let ids = mythOnly ? [...LEGENDS_MYTHICALS] : [...LEGENDS_CORE];
  if (wantMyth && !mythOnly) ids = ids.concat(LEGENDS_MYTHICALS);
  if (wantUBs)               ids = ids.concat(LEGENDS_ULTRA_BEASTS);


  // Build base pool
  const pool = [];
  const seen = new Set();
  ids.forEach(id => {
    if (seen.has(id)) return;
    seen.add(id);
    pool.push(...entriesFor(id, null));
  });

  if (wantForms) {
  // Build forms respecting Mythicals toggle
  const forms = LEGENDARY_FORMS.filter(f => {
    // Shaymin-Sky requires Mythicals to be on at all
    if (f.id === 492 && !wantMyth) return false;
    // If Mythicals Only, include only Mythical species’ forms
    if (mythOnly && !LEGENDS_MYTHICALS.includes(f.id)) return false;
    return true;
  });


    const existingNames = new Set(pool.map(m => (m.name || '').toLowerCase()).filter(Boolean));
    forms.forEach(entry => {
      const display = friendlyNameForVariety(entry.variety);
      if (existingNames.has(display.toLowerCase())) return;

      const base = { id: entry.id, name: display, variety: entry.variety };
      if (window.shinyOnly) {
        pool.push({ ...base, shiny: true });
      } else if (window.includeShinies) {
        pool.push({ ...base, shiny: false }, { ...base, shiny: true });
      } else {
        pool.push({ ...base, shiny: false });
      }
      existingNames.add(display.toLowerCase());
    });
  }

  return pool;
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
  const isDefaultLycanroc    = (entry.id === 745 && entry.variety === 'lycanroc-midday');
const isDefaultOricorio    = (entry.id === 741 && entry.variety === 'oricorio-baile');
const isDefaultUrshifu     = (entry.id === 892 && entry.variety === 'urshifu-single-strike');
const isDefaultEnamorus    = (entry.id === 905 && entry.variety === 'enamorus-incarnate');
const isDefaultTaurosPaldea = (entry.id === 128 && entry.variety === 'tauros-paldea-combat-breed');
const isDefaultOinkologne  = (entry.id === 916 && entry.variety === 'oinkologne-male');
const isDefaultTatsugiri   = (entry.id === 978 && entry.variety === 'tatsugiri-curly');
const isDefaultPalafin     = (entry.id === 964 && entry.variety === 'palafin-zero');
const isDefaultGimmighoul  = (entry.id === 999 && entry.variety === 'gimmighoul-chest');

if (
  (isDefaultLycanroc || isDefaultOricorio || isDefaultUrshifu ||
   isDefaultEnamorus || isDefaultTaurosPaldea || isDefaultOinkologne ||
   isDefaultTatsugiri || isDefaultPalafin || isDefaultGimmighoul) &&
  byId.has(entry.id)
) {
  const idxs = byId.get(entry.id) || [];
  idxs.forEach(i => {
    pool[i].name = display;          // curated label (from friendlyNameForVariety or override)
    pool[i].variety = entry.variety; // remember variety for sprites/keys
  });
  existingNames.add(display.toLowerCase());
  return; // don’t add a duplicate entry for the default
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

// Build a pool containing every Gen (1–9), honoring the same toggles
function buildAllPool(){
  const gens = [1,2,3,4,5,6,7,8,9];
  let out = [];
  const seenKey = new Set();

  // reuse your per-gen builder so we get the exact same form/alt logic
  gens.forEach(g => {
    const chunk = buildGenPool(g) || [];
    // de-dupe by id|name|shiny to be safe if any label collides
    chunk.forEach(p => {
      const key = `${p.id}|${p.name || ''}|${p.shiny ? 1 : 0}|${p.variety || ''}`;
      if (seenKey.has(key)) return;
      seenKey.add(key);
      out.push(p);
    });
  });

  return out;
}

// Registry: add new categories here → no duplication elsewhere.
const POOL_BUILDERS = {
  generation: (rc) => {
    const g = rc?.filters?.generation;
    return (g === 'ALL') ? buildAllPool() : buildGenPool(g);
  },
  legendaries: () => buildLegendariesPool(),
  // region: (rc) => buildRegionPool(rc?.filters?.region),
  // etc...
};


// ---- Type Mode support: load DB + build pool async, then boot engine ----
(async function initRanker() {
  const rc = window.rankConfig || {};
  let pool = [];

  // Small cache for the DB (base + forms)
  if (!window.__POKERANKR_DB__) {
    try {
      const res = await fetch('data/pokemon.db.json', { cache: 'no-store' });
      window.__POKERANKR_DB__ = await res.json();
    } catch (e) {
      console.error('Failed to load pokemon.db.json', e);
      window.__POKERANKR_DB__ = [];
    }
  }
  const DB = Array.isArray(window.__POKERANKR_DB__) ? window.__POKERANKR_DB__ : [];

  // Helper: flatten forms into base array and normalize names with our overrides
function flattenWithForms(list) {
  const out = [];

  // Map slug → friendly label using existing helpers/overrides
function toFriendly(raw) {
  const n = String(raw || '');

  // 1) Exact curated override first (already populated above)
  if (FRIENDLY_NAME_OVERRIDES[n]) return FRIENDLY_NAME_OVERRIDES[n];

  // 2) Megas → "Mega <Base> (X/Y if present)"
  if (/-mega(?:-[xy])?$/i.test(n)) {
    const base = n.replace(/-mega(?:-[xy])?$/i, '');
    let suffix = '';
    if (/-mega-x$/i.test(n)) suffix = ' (X)';
    if (/-mega-y$/i.test(n)) suffix = ' (Y)';
    return `Mega ${titleize(base).replace(/-/g, ' ')}${suffix}`.trim();
  }

  // 3) Regional slugs → "Galarian / Alolan / Hisuian / Paldean <Base>"
if (/-galar$/i.test(n)) {
  const base = n.replace(/-galar$/i, '');
  return `Galarian ${titleize(base).replace(/-/g, ' ')}`.trim();
}
if (/-alola$/i.test(n)) {
  const base = n.replace(/-alola$/i, '');
  return `Alolan ${titleize(base).replace(/-/g, ' ')}`.trim();
}
if (/-hisui$/i.test(n) || /-hisuan$/i.test(n)) {
  const base = n.replace(/-hisui$/i, '').replace(/-hisuan$/i, '');
  return `Hisuian ${titleize(base).replace(/-/g, ' ')}`.trim();
}
// NEW: Paldea regional forms (optionally with extra form/breed)
if (/-paldea(?:-.+)?$/i.test(n)) {
  const base = n.replace(/-paldea(?:-.+)?$/i, '');
  const rest = (n.match(/-paldea-(.+)$/i)?.[1] || '').replace(/-/g, ' ');
  const suffix = rest ? ` (${titleize(rest)})` : '';
  return `Paldean ${titleize(base).replace(/-/g, ' ')}${suffix}`.trim();
}
  // 4) Default: Title-Case the slug, then apply our hyphen→(Form) normalizer
  //    e.g. "thundurus-therian" -> "Thundurus (Therian)"
  return normalizeFormHyphen(titleize(n).replace(/-/g, '-'));
}

  for (const p of list) {
    if (!p) continue;
    out.push({ id: p.id, name: toFriendly(p.name), types: p.types });
   if (Array.isArray(p.forms)) {
      for (const f of p.forms) {
        if (!f) continue;
        // 🚫 Skip busted Mimikyu form
        if (/^mimikyu-busted$/i.test(f.name)) continue;

        // 🚫 Skip Squawkabilly non-green forms
        if (/^squawkabilly-(blue|yellow|white)-plumage$/i.test(f.name)) continue;

        out.push({ id: f.id, name: toFriendly(f.name), types: f.types });
      }
    }
  }
  return out;
}


  // Build the pool per category (reuse existing builders if present)
  if (rc.category === 'type') {
    const includeShinies = window.includeShinies;
    const shinyOnly = window.shinyOnly;
    const mode = rc?.filters?.type?.mode || 'mono';           // 'mono' | 'dual'
    const types = rc?.filters?.type?.types || [];              // ['Fire'] or ['Fire','Flying']
    const wantDual = (mode === 'dual');

    // Normalize user types defensively (Fire/Flying === Flying/Fire)
    const norm = [...types].sort();
    const [T1, T2] = norm;

    // For Type mode we consider base mons + any forms that match
    const ALL = flattenWithForms(DB);

    const strictMono = !!rc?.filters?.type?.strictMono;

function matchesType(m) {
  const t = Array.isArray(m.types) ? m.types : [];
  if (!t.length) return false;

  if (!wantDual) {
    if (!T1) return false;
    if (strictMono) {
      // Only single-typed mons whose sole type is T1
      return t.length === 1 && t[0] === T1;
    }
    // Broad mono: any mon that includes T1 (single or dual)
    return t.includes(T1);
  }

  // Dual: must contain both, order-agnostic
  if (!T1 || !T2 || T1 === T2) return false;
  return t.includes(T1) && t.includes(T2);
}


    const basePool = ALL.filter(matchesType).map(p => ({ id: p.id, name: p.name, shiny: false }));

    if (shinyOnly) {
      pool = basePool.map(p => ({ ...p, shiny: true }));
    } else if (includeShinies) {
      pool = [
        ...basePool.map(p => ({ ...p, shiny: false })),
        ...basePool.map(p => ({ ...p, shiny: true }))
      ];
    } else {
      pool = basePool;
    }
  } else {
    // Existing flow for other categories
    const builder = POOL_BUILDERS[rc.category];
    if (builder) {
      pool = builder(rc);
    } else {
      const g = rc?.filters?.generation;
      pool = buildGenPool(g);
    }
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

  // Continue original boot sequence now that we have the pool
  window.pool = pool; // if other code expects it
  // Initialize state now that we have a pool
remaining  = shuffle([...pool]);
eliminated = [];
current    = remaining.pop() || null;
next       = remaining.pop() || null;
if (current) current.roundsSurvived = 0;
if (next)    next.roundsSurvived    = 0;

leftHistory.length = 0;
if (current) leftHistory.push(current);

// --- Engine init + hydrate (now that state is ready) ---
if (window.prEngine && typeof prEngine.init === 'function') {
  prEngine.init({
    pool: [...pool],
    options: {
      includeShinies: !!window.includeShinies,
      shinyOnly: !!window.shinyOnly,
    },
    seed: null,
    callbacks: {
      onMatchReady: () => { /* we render via our own functions */ },
      onProgress:   () => { /* no-op */ },
      onPhaseChange: ({ phase }) => {
        postMode = (phase === 'RU' || phase === 'THIRD') ? phase : null;
      },
      onResults: ({ champion }) => {
        try { showWinner(champion || (leftHistory?.[leftHistory.length - 1]) || current); } catch {}
      }
    }
  });

  if (typeof prEngine.hydrate === 'function') {
    try {
      prEngine.hydrate({
        state: {
          remaining, eliminated, current, next,
          leftHistory,
          lostTo, roundIndex, roundNum,
          post: {
            phase: post.phase,
            currentRound: post.currentRound,
            nextRound:    post.nextRound,
            index:        post.index,
            totalMatches: post.totalMatches,
            doneMatches:  post.doneMatches,
            ruWins:       post.ruWins,
            thirdWins:    post.thirdWins,
            ruWinsByMon:    post.ruWinsByMon,
            thirdWinsByMon: post.thirdWinsByMon,
            runnerUp: post.runnerUp,
            third:    post.third,
            ruTotal:  post.ruTotal,
            thirdTotal: post.thirdTotal,
          }
        }
      });
    } catch {}
  }
}

// First render + UI
displayMatchupFirstGate();
updateProgress();
updateUndoButton();

  // If your file initializes the engine after this point, leave as-is.
  // Otherwise, if needed, you can kick engine hydration here.
})();

// Fire-and-forget: warm the local names map
loadNamesMapOnce().catch(()=>{});

// 🔥 Removed bulk warm-up to avoid flooding the network on huge pools (e.g., All Gen + forms + shinies).
// We already ensure names for the first two mons in firstRenderSync(), and exporter re-checks names for finalists.
// If you ever want a *tiny* background warm-up, you can safely do a small subset like:
// try { ensureNames(pool.slice(0, 50)); } catch {/* ignore */}

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
      1:"Kanto", 2:"Johto", 3:"Hoenn", 4:"Sinnoh", 5:"Unova",
      6:"Kalos", 7:"Alola", 8:"Galar/Hisui", 9:"Paldea"
    };
    if (g === "ALL") {
      label = "All Generations";
    } else if (g) {
      label = `Generation ${g} (${regionByGen[g] || "??"})`;
    }

  } else if (rc?.category === "legendaries") {
    label = "Legendaries";

  } else if (rc?.category === "type") {
    const t = rc?.filters?.type || {};
    if (t.mode === "dual" && Array.isArray(t.types) && t.types.length === 2) {
      label = `Type: ${t.types[0]}/${t.types[1]}`;
    } else if (t.mode === "mono" && Array.isArray(t.types) && t.types.length === 1) {
      label = `Type: ${t.types[0]}${t.strictMono ? " (Strict)" : ""}`;
    } else {
      label = "Type";
    }
  }

  return label + (window.shinyOnly ? " • Shiny-only✨" : window.includeShinies ? " • +Shinies✨" : " • No Shinies");
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

function normalizeFormHyphen(name){
  return String(name || '')
    // 👇 Core “dash to (Form)” mappings
    .replace(/-Incarnate$/i, ' (Incarnate)')
    .replace(/-Therian$/i,   ' (Therian)')
    .replace(/-Midday$/i,    ' (Midday)')
    .replace(/-Midnight$/i,  ' (Midnight)')
    .replace(/-Dusk$/i,      ' (Dusk)')
    .replace(/-Baile$/i,     ' (Baile)')
    .replace(/-Pom-Pom$/i,   ' (Pom-Pom)')
    .replace(/-Pau$/i,       " (Pa'u)")
    .replace(/-Sensu$/i,     ' (Sensu)')
    .replace(/-Altered$/i,   ' (Altered)')
    .replace(/-Land$/i,      ' (Land)')
    .replace(/^Meloetta-Aria$/i, 'Meloetta (Aria)')
    .replace(/-Ordinary$/i,  ' (Ordinary)')
    .replace(/^Zygarde-50$/i,   'Zygarde (50%)')
    .replace(/^Deoxys-Normal$/i,'Deoxys (Normal)')

    // 👇 Mimikyu special-case: collapse both default & busted to plain "Mimikyu"
    .replace(/^Mimikyu-Disguised$/i, 'Mimikyu')
    .replace(/^Mimikyu-Busted$/i,    'Mimikyu')

    // ✅ Squawkabilly: show only Green nicely; other colors are filtered elsewhere
    .replace(/^Squawkabilly-Green-Plumage$/i,  'Squawkabilly (Green)')
    // (If your names map ever returns lowercase slugs as display names, this catches them too)
    .replace(/^squawkabilly-green-plumage$/i,  'Squawkabilly (Green)')

    .replace(/^Groudon-Primal$/i, 'Groudon (Primal)')
}

// One-time normalization pass over existing cached names
(function migrateNameCache(){
  let changed = false;
  for (const k in nameCache){
    const oldVal = nameCache[k];
    const newVal = normalizeFormHyphen(oldVal);
    if (oldVal !== newVal){
      nameCache[k] = newVal;
      changed = true;
    }
  }
  if (changed) saveNameCache();
})();

let NAMES_MAP = null;
let NAMES_MAP_WARNED = false;

async function loadNamesMapOnce() {
  if (NAMES_MAP) return NAMES_MAP;
  try {
    const res = await fetch('data/names.en.min.json', { cache: 'force-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    NAMES_MAP = await res.json();
  } catch (e) {
    if (!NAMES_MAP_WARNED) {
      console.warn('[PokeRankr] names.en.min.json is missing; falling back to live API for names (slower).');
      NAMES_MAP_WARNED = true;
    }
    NAMES_MAP = {}; // still set to empty object so callers proceed
  }
  return NAMES_MAP;
}



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
  const id = p.id;
  const fromCache = p.name || nameCache[id];
  const fromMap = NAMES_MAP && NAMES_MAP[id];
  const nm = fromCache || fromMap;
  return (p.shiny ? "⭐ " : "") + (nm || `#${String(id).padStart(3,"0")}`);
}

// Lazy fetch for on-screen labels (non-blocking)
async function ensureName(id){
  if (nameCache[id]) return;

  // 1) Try the local names dictionary
  try {
    const map = await loadNamesMapOnce();
    const hit = map && map[id];
    if (hit) {
      nameCache[id] = hit;
      saveNameCache();
      updateLabelsIfVisible(id);
      return;
    }
  } catch {}

  // 2) Fallback to PokeAPI (edge cases / forms)
  try {
    const resp = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`, { cache: 'force-cache' });
    if (!resp.ok) return;
    const data = await resp.json();
    const pretty = normalizeFormHyphen(titleize(data?.name || ""));
    nameCache[id] = pretty || `#${String(id).padStart(3,"0")}`;
    saveNameCache();
    updateLabelsIfVisible(id);
  } catch {}
}

// ensure a list of mons have names (used by exporter)
async function ensureNames(list){
  const mons = (list || []).filter(Boolean);
  const map = await loadNamesMapOnce().catch(()=> ({}));

  await Promise.all(mons.map(async p => {
    if (p.name) return;

    const id = p.id;
    if (nameCache[id]) { p.name = nameCache[id]; return; }

    // 1) Local map first
    if (map && map[id]) {
      p.name = map[id];
      nameCache[id] = p.name;
      return;
    }

    // 2) Fallback to API
    try {
      const resp = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`, { cache: 'force-cache' });
      const data = await resp.json();
      const nm = normalizeFormHyphen(titleize(data?.name || ""));
      p.name = nm || `#${String(id).padStart(3,"0")}`;
      nameCache[id] = p.name;
      saveNameCache();
    } catch {
      p.name = `#${String(id).padStart(3,"0")}`;
    }
  }));
}
// ---- Sliding-window name warm-up (preloads upcoming labels without flooding) ----
const warmedMonKeys = new Set();

function warmNextBatch(count = 50) {
  try {
    const batch = [];

    // Always include the visible 'next' (cheap no-op if already cached)
    if (next) batch.push(next);

    // Take the last N entries from 'remaining' (those will appear soonest)
    const len = Array.isArray(remaining) ? remaining.length : 0;
    const start = Math.max(0, len - count);
    for (let i = start; i < len; i++) {
      const p = remaining[i];
      if (!p) continue;
      const k = `${p.id}|${p.shiny ? 1 : 0}|${p.variety || ''}`;
      if (warmedMonKeys.has(k)) continue;
      warmedMonKeys.add(k);
      batch.push(p);
    }

    if (batch.length) {
      // Uses local names map first; falls back to PokeAPI only for true edge cases
      ensureNames(batch);
    }
  } catch {/* swallow */}
}


// Promise: resolve when we have a display name in cache (no UI updates)
function awaitName(id){
  if (nameCache[id]) return Promise.resolve(nameCache[id]);
  return fetch(`https://pokeapi.co/api/v2/pokemon/${id}`, { cache: 'force-cache' })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      const nm = normalizeFormHyphen(titleize(data?.name || "")) || `#${String(id).padStart(3,"0")}`;
      nameCache[id] = nm;
      saveNameCache();
      return nm;
    })
    .catch(() => nameCache[id] || `#${String(id).padStart(3,"0")}`);
}

// Resolve when an <img> actually loads, or when all fallbacks are exhausted—no fixed delay.
function awaitImgLoaded(img){
  return new Promise((resolve) => {
    if (!img) return resolve();
    if (img.complete && img.naturalWidth > 0) return resolve();

    const onLoad = () => { cleanup(); resolve(); };
    const onError = () => {
      // If there are still fallback URLs to try, the inline onerror will advance img.src.
      // Keep listening. If there are no more, resolve so UI can continue gracefully.
      try {
        const steps = JSON.parse(img.dataset.fallbacks || '[]');
        const i = parseInt(img.dataset.step || '0', 10);
        if (i < steps.length) return; // more fallbacks pending; wait
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

// Slug aliases for API lookups and file attempts
const VARIETY_SLUG_ALIASES = {
  "gimmighoul-chest": "gimmighoul",
  "palafin-zero": "palafin",
  // add more here if needed
};


async function ensureArtworkIdForVariety(varietySlug){
  if (!varietySlug) return null;

  // Use alias for lookup if we have one (e.g., gimmighoul-chest → gimmighoul)
  const key = VARIETY_SLUG_ALIASES[varietySlug] || varietySlug;

  // If we’ve already resolved (number) or marked as missing (-1), return it
  if (Object.prototype.hasOwnProperty.call(artIdCache, key)) return artIdCache[key];

  try {
    const resp = await fetch(`https://pokeapi.co/api/v2/pokemon/${key}`, { cache: 'force-cache' });
    if (!resp.ok) {
      artIdCache[key] = -1; // negative cache: don’t keep retrying this slug
      saveArtIdCache();
      return null;
    }
    const data = await resp.json();
    const id = data?.id;
    if (typeof id === 'number' && id > 0) {
      artIdCache[key] = id;
      saveArtIdCache();

      // Update any imgs already on the page that were waiting on this id
      const nodes = document.querySelectorAll(`img[data-variety="${varietySlug}"], img[data-variety="${key}"]`);
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
  } catch {
    artIdCache[key] = -1;
    saveArtIdCache();
  }
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
function getImageTag(monOrId, shiny = false, alt = "", forResults = false) {
  const p = (typeof monOrId === 'object' && monOrId)
    ? monOrId
    : { id: monOrId, shiny, name: nameCache[monOrId] };

  const wantShiny = !!(p.shiny ?? shiny);
  const variety = varietySlugFromMon(p);

  let chain = [];

if (variety) {
  const cached = artIdCache[variety];
  if (typeof cached === 'number' && cached > 0) {
    chain.push(...buildOfficialChainFromId(cached, wantShiny));
  } else if (cached === -1) {
    // Known-bad slug → skip slug URLs entirely (go straight to base numeric below)
  } else {
    // Try alias for prettier slug hit (then fall back to base)
    const slug = VARIETY_SLUG_ALIASES[variety] || variety;
    const vShiny = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${slug}.png`;
    const vNorm  = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${slug}.png`;
    chain.push(...(wantShiny ? [vShiny, vNorm] : [vNorm]));
    ensureArtworkIdForVariety(variety);
  }
}

  // Always append base-ID artwork as a final safety net.
  // This prevents empty images when a variety slug (e.g., palafin-zero shiny) 404s
  // before we've resolved its numeric artwork ID.
  const baseIdShiny = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${p.id}.png`;
  const baseIdNorm  = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`;
  const baseChain   = wantShiny ? [baseIdShiny, baseIdNorm] : [baseIdNorm];

  // Keep any variety slug attempts at the front (we push those above),
  // and always add base numeric last as a guaranteed fallback.
  chain.push(...baseChain);
  

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


// ----- State (initialized AFTER we build the pool in initRanker)
let remaining = [];
let eliminated = [];
let current = null;
let next = null;
const leftHistory = [];


// Undo stack (legacy KOTH stack — we’ll keep it defined for compatibility)
let history = [];

// Single-step undo flag for KOTH when using the engine (mirrors starters.js)
let kothLastSnap = false;

function restoreState(s){
  remaining  = s.remaining.map(p=>({...p}));
  eliminated = s.eliminated.map(p=>({...p}));
  current    = s.current ? {...s.current} : null;
  next       = s.next    ? {...s.next}    : null;
  leftHistory.length = 0;
  leftHistory.push(...s.leftHistory.map(p=>({...p})));
  displayMatchupFirstGate();
  updateProgress();
  updateUndoButton();

}
function updateUndoButton() {
  const btn = document.getElementById("btnUndo");
  if (!btn) return;

  const inPost = (post.phase === 'RU' || post.phase === 'THIRD');
  if (inPost) {
    // RU/THIRD uses one-step snapshot
    btn.disabled = !post.lastSnap;
  } else {
    // KOTH uses one-step engine-undo flag now (not the old stack)
    btn.disabled = !kothLastSnap;
  }
}


function undoLast() {
  if (!window.prEngine || typeof prEngine.undo !== 'function') return;

  const state = prEngine.undo();
  if (!state) return;

  // ---- Mirror engine → local ----
  remaining  = state.remaining  || [];
  eliminated = state.eliminated || [];
  current    = state.current    || null;
  next       = state.next       || null;
  roundNum   = state.roundNum   || 0;
  gameOver   = !!state.gameOver;

  // containers: clear then copy
  if (state.lostTo) {
    for (const k in lostTo) delete lostTo[k];
    Object.assign(lostTo, state.lostTo);
  } else {
    for (const k in lostTo) delete lostTo[k];
  }

  if (state.roundIndex) {
    for (const k in roundIndex) delete roundIndex[k];
    Object.assign(roundIndex, state.roundIndex);
  } else {
    for (const k in roundIndex) delete roundIndex[k];
  }

  const lh = Array.isArray(state.leftHistory) ? state.leftHistory : [];
  leftHistory.splice(0, leftHistory.length, ...lh);

  // post-phase mirror
  const p = state.post || {};
  postMode          = (state.phase === 'RU' || state.phase === 'THIRD') ? state.phase : null;
  post.phase        = p.phase || null;
  post.currentRound = Array.isArray(p.currentRound) ? p.currentRound.map(x => ({...x})) : [];
  post.nextRound    = Array.isArray(p.nextRound)    ? p.nextRound.map(x => ({...x}))    : [];
  post.index        = Number.isFinite(p.index) ? p.index : 0;
  post.totalMatches = Number.isFinite(p.totalMatches) ? p.totalMatches : 0;
  post.doneMatches  = Number.isFinite(p.doneMatches)  ? p.doneMatches  : 0;
  post.ruWins       = Number.isFinite(p.ruWins)       ? p.ruWins       : 0;
  post.thirdWins    = Number.isFinite(p.thirdWins)    ? p.thirdWins    : 0;
  post.runnerUp     = p.runnerUp ? { ...p.runnerUp } : null;
  post.third        = p.third ? { ...p.third } : null;
  post.ruWinsByMon    = { ...(p.ruWinsByMon || {}) };
  post.thirdWinsByMon = { ...(p.thirdWinsByMon || {}) };

  // If we undid into the start of a bracket, leave undo disabled
  if ((state.phase === 'RU' || state.phase === 'THIRD') &&
      post.doneMatches === 0 && post.index === 0) {
    post.lastSnap = null;
  }

  // After an undo, clear KOTH one-step flag so button disables
  kothLastSnap = false;

  withScrollLock(() => {
    displayMatchup();
    (state.phase === 'RU' || state.phase === 'THIRD') ? updatePostProgress() : updateProgress();
    updateUndoButton();
  });
}

function renderSaveSlots(){
  const grid = document.getElementById('saveSlotsGrid');
  const slots = slotsRead();

  grid.innerHTML = slots.map((slot, i) => {
  const remainingText = (() => {
  // Prefer new post-aware fields if present
  let label = slot?.progress?.displayLabel;

  // If missing (older saves), derive from saved state
  if (!label) {
    const inPost = !!slot?.state?.postMode &&
                   (slot?.state?.post?.phase === 'RU' || slot?.state?.post?.phase === 'THIRD');

    if (inPost) {
      const total = (typeof slot?.state?.post?.totalMatches === 'number')
        ? slot.state.post.totalMatches : 0;
      const done  = (typeof slot?.state?.post?.doneMatches === 'number')
        ? slot.state.post.doneMatches : 0;
      const left  = Math.max(0, total - done - 1);

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
    ? `<div style="text-align:center; font-size:.85rem; color:#374151; margin-top:6px;">${label}</div>`
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
              <button class="button" data-action="save" data-idx="${i}" style="flex:1;">
  <span class="button_top">Save Here</span>
</button>

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
            <button class="button" data-action="save" data-idx="${i}" style="flex:1;">
  <span class="button_top">Overwrite</span>
</button>
<button class="button" data-action="delete" data-idx="${i}" style="flex:1;">
  <span class="button_top">Delete</span>
</button>
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

// ---- Build a portable save payload for Ranker (Gen) ----
function serializeRankerSession(){
  return {
    type: 'ranker',
    label: rankerLabel(),
    context: {
      includeShinies: !!window.includeShinies,
      shinyOnly: !!window.shinyOnly,
      config: window.rankConfig || {}
    },
    state: {
      // --- KOTH
      remaining, eliminated, current, next, leftHistory,
      lostTo, roundIndex, roundNum,

      // 👇 NEW: persist the engine phase at the root
      phase: (post.phase || null),

      // --- Post (RU/THIRD)
      postMode, // optional mirror
      post: {
        phase: post.phase || null,
        currentRound: [...(post.currentRound || [])],
        nextRound:    [...(post.nextRound || [])],
        index:        Number(post.index || 0),
        totalMatches: Number(post.totalMatches || 0),
        doneMatches:  Number(post.doneMatches  || 0),
        ruWins:       Number(post.ruWins || 0),
        thirdWins:    Number(post.thirdWins || 0),
        runnerUp:     post.runnerUp ? { ...post.runnerUp } : null,
        third:        post.third    ? { ...post.third }    : null,
        ruWinsByMon:   { ...(post.ruWinsByMon   || {}) },
        thirdWinsByMon:{ ...(post.thirdWinsByMon|| {}) },
        ruTotal:       Number(post.ruTotal || 0),
        thirdTotal:    Number(post.thirdTotal || 0),
      },

      // used for THIRD seeding on export
      bracketWinsByMon: { ...(bracketWinsByMon || {}) }
    },
    meta: {
      savedAt: Date.now()
    },
    // for the Save Slots grid preview
    currentMatchup: {
      a: current || null,
      b: next || null
    },
    progress: (() => {
      if (post.phase === 'RU' || post.phase === 'THIRD') {
        const left = Math.max(0, (post.totalMatches || 0) - (post.doneMatches || 0) - 1);
        return {
          displayLabel: (post.phase === 'RU'
            ? 'Runner-up bracket — '
            : 'Third-place bracket — ') + `${left} matchups remaining`
        };
      }
      return { displayLabel: `${remaining.length} matchups remaining` };
    })()
  };
}


// Also expose globally (some pages may call it)
window.serializeRankerSession = serializeRankerSession;


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

// ✅ Ensure Main Menu works whether the button is in HTML or created dynamically
document.getElementById('btnMainMenu')?.addEventListener('click', goToMainMenu);

// Keep the dynamic fallback for pages that don't include the button
(function ensureMainMenuButton(){
  const container = document.getElementById('ingame-controls');
  if (!container) return;
  let btn = document.getElementById('btnMainMenu');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'btnMainMenu';
    btn.innerHTML = '<span class="button_top">Main Menu</span>';
    container.appendChild(btn);
  } else if (!btn.querySelector('.button_top')) {
    // match styling if the HTML button lacks the .button_top span
    const span = document.createElement('span');
    span.className = 'button_top';
    while (btn.firstChild) span.appendChild(btn.firstChild);
    btn.appendChild(span);
  }
  // guard against double-binding
  if (!btn.dataset.wired) {
    btn.addEventListener('click', goToMainMenu);
    btn.dataset.wired = '1';
  }
})();

// ----- Rendering
function labelHTML(p){
  const nm = p.name || nameCache[p.id] || "";
  const text = nm ? (p.shiny ? `⭐ ${nm}` : nm) : "";
  // Lock one text line height and prevent wrapping; always reserve space even when empty.
  return `<p data-id="${p.id}" class="pkr-label"
            style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.2; min-height:1.2em; margin:6px 0 0; text-align:center;">
            ${text || "&nbsp;"}
          </p>`;
}


// 🔹 Track last rendered mon on each side to skip left re-renders
let lastLeftKey = null;
let lastRightKey = null;

// Update only the label text inside an existing side
function updateLabelText(containerEl, mon){
  const p = containerEl.querySelector('p');
  if (p) {
    const nm = mon?.name || nameCache[mon?.id] || "";
    if (nm) {
  p.textContent = mon?.shiny ? `⭐ ${nm}` : nm;
}
// else: keep whatever is there (likely the &nbsp; placeholder)
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

// --- Right-side smooth swap (versioned): keep card visible, hide only the image during preload ---
let pendingRightTemp = null;
let rightRenderVersion = 0;

function renderOpponentSmooth(mon){
  const rightEl = document.getElementById("right");
  rightRenderVersion = (typeof rightRenderVersion === 'number' ? rightRenderVersion : 0) + 1;
  const myVersion = rightRenderVersion;

  // Clean previous offscreen prerender
  if (pendingRightTemp && pendingRightTemp.isConnected) {
    try { document.body.removeChild(pendingRightTemp); } catch {}
  }
  pendingRightTemp = null;

  if (!mon) { rightEl.innerHTML = ""; return; }

 // 🔒 Lock height so the frame never changes during the swap (use a safe baseline)
const BASELINE_CARD_HEIGHT = 320; // image (256) + label/padding headroom
const prevMinHeight = rightEl.style.minHeight;           // 👈 remember previous value
const lockedHeight = Math.max(rightEl.offsetHeight || 0, BASELINE_CARD_HEIGHT);
rightEl.style.minHeight = `${lockedHeight}px`;

  // Offscreen prerender (real nodes, not strings)
  const temp = document.createElement('div');
  temp.style.position = 'absolute';
  temp.style.left = '-9999px';
  temp.style.top = '0';
  temp.innerHTML = `${getImageTag(mon)}${labelHTML(mon)}`;
  document.body.appendChild(temp);
  pendingRightTemp = temp;

  const img   = temp.querySelector('img');
  const label = temp.querySelector('p');
  const pImg  = img ? awaitImgLoaded(img) : Promise.resolve();

  pImg.then(() => {
    if (myVersion !== rightRenderVersion) {
      try { document.body.removeChild(temp); } catch {}
      return;
    }

    // Ensure label text is populated before we move the nodes in
    const nm = mon.name || nameCache[mon.id] || "";
// Only update if we actually have a name; otherwise keep the &nbsp; placeholder
if (label && nm) {
  label.textContent = mon.shiny ? `⭐ ${nm}` : nm;
}

    // Move the already-loaded nodes into place (no innerHTML)
    while (rightEl.firstChild) rightEl.removeChild(rightEl.firstChild);
    while (temp.firstChild) {
      const node = temp.firstChild;
      temp.removeChild(node);
      if (node.tagName === 'IMG') {
        node.style.visibility = 'visible'; // force-visible if onload fired offscreen
      }
      rightEl.appendChild(node);
    }

    try { document.body.removeChild(temp); } catch {}
    pendingRightTemp = null;
    lastRightKey = monKey(mon);

    // Cache the name asynchronously for future swaps
    ensureName(mon.id);
  }).finally(() => {
    requestAnimationFrame(() => {
      rightEl.style.minHeight = prevMinHeight || '';
    });
  });
}




function renderLeftSmooth(mon){
  const leftEl = document.getElementById("left");
  if (!mon) { leftEl.innerHTML = ""; return; }

  const temp = document.createElement('div');
  temp.style.position = 'absolute';
  temp.style.left = '-9999px';
  temp.style.top = '0';
  temp.innerHTML = `${getImageTag(mon)}${labelHTML(mon)}`;
  document.body.appendChild(temp);

  const img = temp.querySelector('img');
  const pEl = temp.querySelector('p');

  const pImg = img ? awaitImgLoaded(img) : Promise.resolve();

  pImg.then(() => {
    const nm = mon.name || nameCache[mon.id] || "";
if (pEl && nm) {
  pEl.textContent = mon.shiny ? `⭐ ${nm}` : nm;
}

    if (temp.isConnected) {
      leftEl.innerHTML = temp.innerHTML;
      try { document.body.removeChild(temp); } catch {}
      lastLeftKey = monKey(mon);
    }
    ensureName(mon.id); // upgrade label later if needed
  });
}

// --- First-render sync: ensure names for current+next before the very first display
let didFirstSyncRender = false;

async function firstRenderSync(){
  const mons = [current, next].filter(Boolean);
  try {
    // Only fetch names for the two mons that will appear first
    await ensureNames(mons);
  } catch {}
  // Now do a normal render (images are already preloaded off-DOM in the smooth renderers)
  displayMatchup();
}

// Small gate that runs the first render synchronously, then defers to normal path
function displayMatchupFirstGate(){
  if (!didFirstSyncRender){
    didFirstSyncRender = true;
    // fire-and-forget; this function handles its own await
    firstRenderSync();
  } else {
    displayMatchup();
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
  renderLeftSmooth(current);           // wait for both name + image
} else {
  // no change; already synced on screen
}


  // RIGHT: do a flicker-free swap — keep the old one visible until the new image has fully loaded
  if (rk !== lastRightKey) {
    renderOpponentSmooth(next);
  } else {
    // same mon as before (rare), just refresh label
    updateLabelText(rightEl, next);
  }

// Silent name prefetch (cache only; the smooth render will swap when ready)
awaitName(current.id);
awaitName(next.id);


  // Prefetch the *upcoming* opponent to shrink perceived latency
  const upcoming = remaining[remaining.length - 1];
  if (upcoming) ensurePrefetch(upcoming);

  // Preload names for the next 50 mons to eliminate label pop-in
  warmNextBatch(50);
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

function pick(side) {
  if (!window.prEngine || typeof prEngine.choose !== 'function') return;
  if (gameOver) return;

  const inPost = (post.phase === 'RU' || post.phase === 'THIRD');

  if (inPost) {
    // RU/THIRD: snapshot so Undo enables immediately
    postSaveLastSnapshot();
  } else {
    // KOTH: arm one-step undo
    kothLastSnap = true;
  }
  updateUndoButton();

  const state = prEngine.choose(side === 'left' ? 'left' : 'right');
  if (!state) return;

  // ---- Mirror engine → local ----
  remaining  = state.remaining  || [];
  eliminated = state.eliminated || [];
  current    = state.current    || null;
  next       = state.next       || null;
  roundNum   = state.roundNum   || 0;
  gameOver   = !!state.gameOver;

  // containers: clear then copy
  if (state.lostTo) {
    for (const k in lostTo) delete lostTo[k];
    Object.assign(lostTo, state.lostTo);
  } else {
    for (const k in lostTo) delete lostTo[k];
  }

  if (state.roundIndex) {
    for (const k in roundIndex) delete roundIndex[k];
    Object.assign(roundIndex, state.roundIndex);
  } else {
    for (const k in roundIndex) delete roundIndex[k];
  }

  const lh = Array.isArray(state.leftHistory) ? state.leftHistory : [];
  leftHistory.splice(0, leftHistory.length, ...lh);

  // post-phase mirror
  const p = state.post || {};
  postMode          = (state.phase === 'RU' || state.phase === 'THIRD') ? state.phase : null;
  post.phase        = p.phase || null;
  post.currentRound = Array.isArray(p.currentRound) ? p.currentRound.map(x => ({...x})) : [];
  post.nextRound    = Array.isArray(p.nextRound)    ? p.nextRound.map(x => ({...x}))    : [];
  post.index        = Number.isFinite(p.index) ? p.index : 0;
  post.totalMatches = Number.isFinite(p.totalMatches) ? p.totalMatches : 0;
  post.doneMatches  = Number.isFinite(p.doneMatches)  ? p.doneMatches  : 0;
  post.ruWins       = Number.isFinite(p.ruWins)       ? p.ruWins       : 0;
  post.thirdWins    = Number.isFinite(p.thirdWins)    ? p.thirdWins    : 0;
  post.runnerUp     = p.runnerUp ? { ...p.runnerUp } : null;
  post.third        = p.third ? { ...p.third } : null;
  post.ruWinsByMon    = { ...(p.ruWinsByMon || {}) };
  post.thirdWinsByMon = { ...(p.thirdWinsByMon || {}) };

  // If we just entered a bracket with no matches played yet, keep undo disabled
  if ((state.phase === 'RU' || state.phase === 'THIRD') &&
      post.doneMatches === 0 && post.index === 0) {
    post.lastSnap = null;
  }

  if (state.phase === 'DONE') {
    showWinner(leftHistory[leftHistory.length - 1] || current);
    return;
  }

  withScrollLock(() => {
    displayMatchup();
    (state.phase === 'RU' || state.phase === 'THIRD') ? updatePostProgress() : updateProgress();
    updateUndoButton();
  });
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
    const k = monKey(mon);
    if (title === "Runner-up")  return (post.ruWinsByMon && post.ruWinsByMon[k]) || 0;
    if (title === "Third Place")return (post.thirdWinsByMon && post.thirdWinsByMon[k]) || 0;
    return 0;
  }

  const renderCard = (title, p) => {
    if (!p) return "";
    const survivedLine = `<p class="rounds-text">Survived ${pluralize(p.roundsSurvived || 0, "Round", "Rounds")}</p>`;
    if (title === "Runner-up" || title === "Third Place") {
      const wins = bracketWinsFor(title, p);
      const total = (title === "Runner-up") ? (post.ruTotal || 0) : (post.thirdTotal || 0);
      const winsLine = (wins > 0)
        ? `<p class="rounds-text">Won ${pluralize(wins, "Match", "Matches")}</p>`
        : `<p class="rounds-text">Auto-advanced</p>`;
      return `
        <div class="pokemon-card compact-card">
          ${getImageTag(p, p.shiny, displayName(p), true)}

          <p>${displayName(p)}</p>
          ${survivedLine}
          ${total === 0 ? `<p class="rounds-text">Auto-advanced</p>` : winsLine}
          <p class="placement-tag">${title}</p>
        </div>
      `;
    }
    return `
      <div class="pokemon-card compact-card">
        ${getImageTag(p, p.shiny, displayName(p), true)}

        <p>${displayName(p)}</p>
        ${survivedLine}
        <p class="rounds-text" style="visibility:hidden;">placeholder</p>
        <p class="placement-tag">${title}</p>
      </div>
    `;
  };

const rc  = window.rankConfig || {};
const g   = rc?.filters?.generation || 1;
let headerText;

if (rc?.category === 'legendaries') {
  headerText = 'Your Favorite Legendary Pokémon is:';

} else if (rc?.category === 'type') {
  const t = rc?.filters?.type || {};
  if (t.mode === 'dual' && Array.isArray(t.types) && t.types.length === 2) {
    headerText = `Your Favorite ${t.types[0]}/${t.types[1]} Pokémon is:`;
  } else if (t.mode === 'mono' && Array.isArray(t.types) && t.types.length === 1) {
    headerText = `Your Favorite ${t.types[0]} Pokémon is:`;
  } else {
    headerText = 'Your Favorite Type Pokémon is:';
  }

} else if (rc?.category === 'starters') {
  headerText = 'Your Favorite Starter Pokémon is:';

} else if (g === 'ALL') {
  headerText = 'Your All Time Favorite Pokémon Is:';

} else {
  headerText = `Your Favorite (Gen ${g}) Pokémon is:`;
}
document.getElementById("result").innerHTML = `
  <h2>${headerText}</h2>
    <div class="champion-card">
      <div class="champion-image-wrapper">
        ${getImageTag(champion).replace('<img ', '<img class="champion-img" ')}
        <img src="assets/confetti.gif" class="confetti" alt="Confetti">
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
      <button id="btnRestart" type="button"><span class="button_top">Start Over</span></button>
      <button id="btnBack" type="button"><span class="button_top">Back to Menu</span></button>
      <button id="btnSaveResults" type="button"><span class="button_top">Save Results</span></button>
      <button id="btnExport" type="button"><span class="button_top">Export Image</span></button>
    </div>
  `;
  document.getElementById("result").style.display = "block";

  // Wire result-screen buttons
  document.getElementById('btnRestart')?.addEventListener('click', restart);
  document.getElementById('btnBack')?.addEventListener('click', () => { window.location.href = 'index.html'; });
  document.getElementById('btnSaveResults')?.addEventListener('click', saveResults);
  document.getElementById('btnExport')?.addEventListener('click', exportRankingImage);

  // Ensure names fill in if they weren’t cached yet
  [champion, runnerUp, thirdPlace, honorable].filter(Boolean).forEach(m => ensureName(m.id));
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
   // Derive a friendly display name, prioritizing pool label, then variety label, then cache.
const friendlyFromVariety = (slug) => {
  if (!slug) return null;
  // Use our existing formatter if present, else a minimal inline fallback.
  if (typeof friendlyNameForVariety === 'function') return friendlyNameForVariety(slug);

  // Fallbacks for environments without the helper (shouldn’t happen here):
  if (/-mega(?:-[xy])?$/i.test(slug)) {
    const base = slug.replace(/-mega(?:-[xy])?$/i, '');
    let suffix = '';
    if (/-mega-x$/i.test(slug)) suffix = ' (X)';
    if (/-mega-y$/i.test(slug)) suffix = ' (Y)';
    const prettyBase = base.split('-').map(s => s[0].toUpperCase()+s.slice(1)).join(' ');
    return `Mega ${prettyBase}${suffix}`;
  }
  if (/-paldea(?:-.+)?$/i.test(slug)) {
    const base = slug.replace(/-paldea(?:-.+)?$/i, '');
    const rest = (slug.match(/-paldea-(.+)$/i)?.[1] || '').replace(/-/g, ' ');
    const suffix = rest ? ` (${rest.split(' ').map(s=>s[0].toUpperCase()+s.slice(1)).join(' ')})` : '';
    const prettyBase = base.split('-').map(s => s[0].toUpperCase()+s.slice(1)).join(' ');
    return `Paldean ${prettyBase}${suffix}`;
  }
  return null;
};

const displayNameSafe =
  p.name                                    // already-friendly from the pool
  || friendlyFromVariety(variety)           // derive from variety slug (Megas, Paldea, etc.)
  || nameCache[p.id]                        // as a last resort, base species cached name
  || null;

const obj = {
  id: p.id,
  formId: formSpriteIdForMon(p),
  name: displayNameSafe,
  shiny: !!p.shiny,
  roundsSurvived: p.roundsSurvived || 0,
  variety,
  sprite: spriteUrlForMon(
    { id: p.id, name: displayNameSafe, variety },
    !!p.shiny
  )
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

  const rc = window.rankConfig || {};
  let category = 'PokéRankr';

  if (rc?.category === 'generation') {
    const g = rc?.filters?.generation || 1;
    category = (g === 'ALL') ? 'All Generations' : `Gen ${g}`;

  } else if (rc?.category === 'legendaries') {
    category = 'Legendaries';

  } else if (rc?.category === 'type') {
    const t = rc?.filters?.type || {};
    if (t.mode === 'dual' && Array.isArray(t.types) && t.types.length === 2) {
      category = `Type: ${t.types[0]}/${t.types[1]}`;
    } else if (t.mode === 'mono' && Array.isArray(t.types) && t.types.length === 1) {
      category = `Type: ${t.types[0]}${t.strictMono ? ' (Strict)' : ''}`;
    } else {
      category = 'Type';
    }
  }

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
    alert(`Saved! Your ${category} ranking (${window.shinyOnly ? "shiny only✨" : window.includeShinies ? "+ shinies✨" : "no shinies"}) has been updated.`);
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

 const rc = window.rankConfig || {};
const MODE = (window.shinyOnly ? 'Shiny-only✨' : (window.includeShinies ? '+Shinies✨' : 'No Shinies'));

let TITLE = 'PokéRankr';
let fileStub = 'pokerankr';

if (rc?.category === 'generation') {
  const g = rc?.filters?.generation || 1;
  if (g === "ALL") {
    TITLE = 'PokéRankr — All Generations';
    fileStub = 'pokerankr-all';
  } else {
    const regionByGen = {
      1:"Kanto", 2:"Johto", 3:"Hoenn", 4:"Sinnoh", 5:"Unova",
      6:"Kalos", 7:"Alola", 8:"Galar/Hisui", 9:"Paldea"
    };
    TITLE = `PokéRankr — Gen ${g} (${regionByGen[g] || "??"})`;
    fileStub = `pokerankr-gen${g}`;
  }
} else if (rc?.category === 'legendaries') {
  TITLE = 'PokéRankr — Legendary Pokémon';
  fileStub = 'pokerankr-legendaries';
}


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
    a.download = `${fileStub}-${Date.now()}.png`;
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

  // 1) Restore settings first (so pool/labels make sense)
  window.includeShinies = !!s.context?.includeShinies;
  window.shinyOnly      = !!s.context?.shinyOnly;
  window.rankConfig     = s.context?.config || window.rankConfig || {};
  try {
    localStorage.setItem('includeShinies', String(window.includeShinies));
    localStorage.setItem('shinyOnly', String(window.shinyOnly));
    localStorage.setItem('rankConfig', JSON.stringify(window.rankConfig));
  } catch {}

  // 2) Restore KOTH core state (arrays + current/next + leftHistory)
  //    Do NOT render yet; we’ll render after engine hydrate.
  const sRemaining   = s.state?.remaining   || [];
  const sEliminated  = s.state?.eliminated  || [];
  const sCurrent     = s.state?.current     || null;
  const sNext        = s.state?.next        || null;
  const sLeftHistory = s.state?.leftHistory || [];

  remaining  = sRemaining.map(p => ({ ...p }));
  eliminated = sEliminated.map(p => ({ ...p }));
  current    = sCurrent   ? { ...sCurrent } : null;
  next       = sNext      ? { ...sNext }    : null;

  leftHistory.length = 0;
  leftHistory.push(...sLeftHistory.map(p => ({ ...p })));

  // 3) Restore KOTH trackers (lostTo / roundIndex / roundNum)
  for (const k of Object.keys(lostTo)) delete lostTo[k];
  Object.assign(lostTo, s.state?.lostTo || {});

  for (const k of Object.keys(roundIndex)) delete roundIndex[k];
  Object.assign(roundIndex, s.state?.roundIndex || {});

  roundNum = Number.isFinite(s.state?.roundNum) ? s.state.roundNum : 0;

  // 4) Restore per‑mon post‑bracket wins (affects THIRD reseeding + exports)
  for (const k of Object.keys(bracketWinsByMon)) delete bracketWinsByMon[k];
  Object.assign(bracketWinsByMon, s.state?.bracketWinsByMon || {});

  // 5) Restore post‑bracket state COMPLETELY before hydrating engine
  postMode = s.state?.postMode || null;

  // Reset post object to clean defaults, then apply saved values
  post.phase        = null;
  post.currentRound = [];
  post.nextRound    = [];
  post.index        = 0;
  post.totalMatches = 0;
  post.doneMatches  = 0;
  post.ruWins       = 0;
  post.thirdWins    = 0;
  post.runnerUp     = null;
  post.third        = null;
  post.ruWinsByMon   = Object.create(null);
  post.thirdWinsByMon= Object.create(null);
  post.ruTotal       = 0;
  post.thirdTotal    = 0;
  post.lastSnap      = null;   // no pending undo on resume

  if (s.state?.post) {
    const P = s.state.post;
    post.phase         = P.phase || null;
    post.currentRound  = Array.isArray(P.currentRound) ? P.currentRound.map(x => ({ ...x })) : [];
    post.nextRound     = Array.isArray(P.nextRound)    ? P.nextRound.map(x => ({ ...x }))    : [];
    post.index         = Number.isFinite(P.index)         ? P.index         : 0;
    post.totalMatches  = Number.isFinite(P.totalMatches)  ? P.totalMatches  : 0;
    post.doneMatches   = Number.isFinite(P.doneMatches)   ? P.doneMatches   : 0;
    post.ruWins        = Number.isFinite(P.ruWins)        ? P.ruWins        : 0;
    post.thirdWins     = Number.isFinite(P.thirdWins)     ? P.thirdWins     : 0;
    post.runnerUp      = P.runnerUp ? { ...P.runnerUp } : null;
    post.third         = P.third    ? { ...P.third }    : null;
    post.ruWinsByMon    = { ...(P.ruWinsByMon   || {}) };
    post.thirdWinsByMon = { ...(P.thirdWinsByMon|| {}) };
    post.ruTotal        = Number.isFinite(P.ruTotal)    ? P.ruTotal    : 0;
    post.thirdTotal     = Number.isFinite(P.thirdTotal) ? P.thirdTotal : 0;
  }

  // 6) Hydrate engine with the FULLY RESTORED state
 if (window.prEngine && typeof prEngine.hydrate === 'function') {
  prEngine.hydrate({
    state: {
      // 👇 NEW: tell the engine which phase we’re in (null | 'RU' | 'THIRD' | 'DONE')
      phase: post.phase || null,

      // KOTH mirrors
      remaining, eliminated, current, next, leftHistory,
      lostTo, roundIndex, roundNum,

      // Post phase mirrors
      post: {
        phase: post.phase,
        currentRound: post.currentRound,
        nextRound:    post.nextRound,
        index:        post.index,
        totalMatches: post.totalMatches,
        doneMatches:  post.doneMatches,
        ruWins:       post.ruWins,
        thirdWins:    post.thirdWins,
        ruWinsByMon:    post.ruWinsByMon,
        thirdWinsByMon: post.thirdWinsByMon,
        runnerUp:     post.runnerUp,
        third:        post.third,
        ruTotal:      post.ruTotal,
        thirdTotal:   post.thirdTotal,
      }
    }
  });
}


  // 7) Now render the correct screen
  //    If resuming in RU/THIRD and no current pair is set, schedule one.
  if (postMode === 'RU' || postMode === 'THIRD' || post.phase === 'RU' || post.phase === 'THIRD') {
    if (!current || !next) {
      scheduleNextPostMatch();
    } else {
      displayMatchup();
      updatePostProgress();
    }
  } else {
    displayMatchup();
    updateProgress();
  }

  updateUndoButton();
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
// Initial render is performed after pool construction inside initRanker()

