// =========================
// PokéRankr — ranker.js
// Purpose: run generic rankings (Gen 1 & Gen 2)
// =========================
// --- Engine bootstrap (shared logic engine) ---
window.prEngine = (window.PokeRankrEngine && typeof PokeRankrEngine.create === 'function')
  ? PokeRankrEngine.create()
  : null;

// ----- Title / Mode label
// Replace the existing setTitle function in ranker.js with this:
(function setTitle(){
  const titleEl = document.getElementById("modeTitle");
  if (!titleEl) return; // Page has no modeTitle; skip without breaking the app
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
    // Handle legendaries with dynamic toggles
    const mythMode = rc?.toggles?.mythMode || 'none';     // 'none' | 'include' | 'only'
    const ubsMode  = rc?.toggles?.ubsMode  || 'exclude';  // 'exclude' | 'include' | 'only'
    
    if (mythMode === 'only') {
      label = "Mythicals";
    } else if (ubsMode === 'only') {
      label = "Ultra Beasts";
    } else {
      // Build composite label
      const parts = [];
      
      // Base legendaries (unless excluded by "only" modes)
      if (mythMode !== 'only' && ubsMode !== 'only') {
        parts.push("Legendaries");
      }
      
      // Add mythicals if included
      if (mythMode === 'include') {
        parts.push("Mythicals");
      }
      
      // Add ultra beasts if included
      if (ubsMode === 'include') {
        parts.push("Ultra Beasts");
      }
      
      label = parts.length > 1 ? parts.join(" + ") : (parts[0] || "Legendaries");
    }
  } else if (rc?.category === "type") {
    // NEW: Handle Type category properly
    const t = rc?.filters?.type || {};
    if (t.mode === "dual" && Array.isArray(t.types) && t.types.length === 2) {
      label = `${t.types[0]}/${t.types[1]} Type`;
    } else if (t.mode === "mono" && Array.isArray(t.types) && t.types.length === 1) {
      const typeLabel = t.strictMono ? `Pure ${t.types[0]}` : `Mono ${t.types[0]}`;
      label = `${typeLabel} Type`;
    } else {
      label = "Type";
    }
  }

  // Include Forms tag when any forms are enabled
  const t = rc?.toggles || {};

  const regionalMode  = (typeof t.regionalMode === 'string')
    ? t.regionalMode
    : (t.regional ? 'include' : 'off');

  const altBattleMode = (typeof t.altBattleMode === 'string')
    ? t.altBattleMode
    : (t.altBattle ? 'include' : 'off');

  const specialFormsMode = (typeof t.formsMode === 'string')
    ? t.formsMode
    : ((typeof t.formsSpecialMode === 'string') ? t.formsSpecialMode : 'off');

  const formsTag = (
    regionalMode === 'include' ||
    altBattleMode === 'include' ||
    specialFormsMode !== 'off'
  ) ? " • +Forms" : "";

  const shinyTag = window.shinyOnly
    ? " • Shiny-only✨"
    : (window.includeShinies ? " • +Shinies✨" : " • No Shinies");

  const gmaxTag = t.gmax
    ? (t.gmaxOnly ? " • G-Max only" : " • +G-Max")
    : "";

  // Order: Label • +Forms • +Shinies • (+G-Max)
  titleEl.textContent = label + formsTag + shinyTag + gmaxTag;
})();

// ===== Type Mode — data loader + filter (additive) =====
async function _prLoadPokemonDb() {
  if (window._pokemonDbCache) return window._pokemonDbCache;
  const resp = await fetch('data/pokemon.db.json', { cache: 'no-store' });
  const data = await resp.json();
  window._pokemonDbCache = Array.isArray(data) ? data : [];
  return window._pokemonDbCache;
}
// Helper to safely escape any slug we add (future-proof)
const _reEscape = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Maintain the list here (lowercase, kebab-case slugs)
const EXCLUDED_SLUGS = [
  // Starters / special
  'pikachu-starter',
  'eevee-starter',

  // Maushold/Dudunsparce
  'dudunsparce-three-segment',
  'maushold-family-of-three',

  // Terapagos
  'terapagos-stellar',

  // Miraidon travel modes
  'miraidon-aquatic-mode',
  'miraidon-drive-mode',
  'miraidon-glide-mode',
  'miraidon-low-power-mode',

  // Koraidon builds
  'koraidon-sprinting-build',
  'koraidon-limited-build',
  'koraidon-gliding-build',
  'koraidon-swimming-build',
];

// Auto-build the same regex name used everywhere else (so no other code changes needed)
const EXCLUDED_TYPE_MODE_RE = new RegExp(
  `^(?:${EXCLUDED_SLUGS.map(_reEscape).join('|')})$`,
  'i'
);


// Track completion for achievements (separate from saving)
function trackRankingCompletion(category, pokemonCount) {
  // Get the champion from your results
  const { champion } = computeResults();
  
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
    includeShinies: window.includeShinies || false,
    shinyOnly: window.shinyOnly || false,
    championId: champion?.id || null,
    championShiny: champion?.shiny || false
  });
  
  if (completions.length > 100) {
    completions = completions.slice(-100);
  }
  
  localStorage.setItem('PR_COMPLETIONS', JSON.stringify(completions));
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
  // Skip ride/travel forms for Koraidon/Miraidon (normalize spaces → hyphens first)
  const slugName = String(v.name || '').toLowerCase().replace(/\s+/g, '-');
  if (EXCLUDED_TYPE_MODE_RE.test(slugName)) continue;

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

  // Urshifu G-Max, shorter for layout
  "urshifu-rapid-strike-gmax":  "Urshifu (Rapid) (G-Max)",
  "urshifu-single-strike-gmax": "Urshifu (Single) (G-Max)",
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
{ id: 800, variety: "necrozma-dusk-mane" },
{ id: 800, variety: "necrozma-dawn-wings" },
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

// NEW: Gigantamax (and Eternamax) forms that should be available when toggled on.
// We treat Eternamax alongside G-Max, per your request to “include each of those listed”.
const GMAX_FORMS_BY_GEN = {
  8: [
    // Kanto & others brought forward into SwSh (Gen 8)
    { id: 3,   variety: 'venusaur-gmax' },
    { id: 6,   variety: 'charizard-gmax' },
    { id: 9,   variety: 'blastoise-gmax' },
    { id: 12,  variety: 'butterfree-gmax' },
    { id: 25,  variety: 'pikachu-gmax' },
    { id: 52,  variety: 'meowth-gmax' },
    { id: 68,  variety: 'machamp-gmax' },
    { id: 94,  variety: 'gengar-gmax' },
    { id: 99,  variety: 'kingler-gmax' },
    { id: 131, variety: 'lapras-gmax' },
    { id: 133, variety: 'eevee-gmax' },
    { id: 143, variety: 'snorlax-gmax' },
    { id: 569, variety: 'garbodor-gmax' },
    { id: 809, variety: 'melmetal-gmax' },

    // Native Gen 8
    { id: 812, variety: 'rillaboom-gmax' },
    { id: 815, variety: 'cinderace-gmax' },
    { id: 818, variety: 'inteleon-gmax' },
    { id: 823, variety: 'corviknight-gmax' },
    { id: 826, variety: 'orbeetle-gmax' },
    { id: 834, variety: 'drednaw-gmax' },
    { id: 839, variety: 'coalossal-gmax' },
    // Use a single entry for the shared Appletun/Flapple G-Max (we’ll override the label next)
    { id: 842, variety: 'appletun-gmax' },
    { id: 844, variety: 'sandaconda-gmax' },
    // Use a single entry for the shared Toxtricity G-Max (Amped/Low Key share the same G-Max)
    { id: 849, variety: 'toxtricity-amped-gmax' },
    { id: 851, variety: 'centiskorch-gmax' },
    { id: 858, variety: 'hatterene-gmax' },
    { id: 861, variety: 'grimmsnarl-gmax' },
    { id: 869, variety: 'alcremie-gmax' },
    { id: 879, variety: 'copperajah-gmax' },
    { id: 884, variety: 'duraludon-gmax' },
    { id: 892, variety: 'urshifu-single-strike-gmax' },
    { id: 892, variety: 'urshifu-rapid-strike-gmax' },

    // Eternamax (include with G-Max toggle per your request)
    { id: 890, variety: 'eternatus-eternamax' },
  ],
};


// Helper: build a nice display name for an alt/battle entry (and G-Max/Eternamax)
function friendlyNameForVariety(variety){
  // 1) exact curated override
  if (FRIENDLY_NAME_OVERRIDES[variety]) return FRIENDLY_NAME_OVERRIDES[variety];

  const slug = String(variety || '');

    // SPECIAL-CASE: Toxtricity (Amped/Low Key) share the same G-Max
  if (/^toxtricity-(?:amped|low-key)-gmax$/i.test(slug)) {
    return 'Toxtricity (G-Max)';
  }

  // SPECIAL-CASE: Appletun/Flapple share the same G-Max
  if (/^(?:appletun|flapple)-gmax$/i.test(slug)) {
    return 'Appletun/Flapple (G-Max)';
  }

  // 2) Megas → "Mega <Base> (X/Y if present)"
  if (/-mega(?:-[xy])?$/i.test(slug)) {
    const base = slug.replace(/-mega(?:-[xy])?$/i, '');
    let suffix = '';
    if (/-mega-x$/i.test(slug)) suffix = ' (X)';
    if (/-mega-y$/i.test(slug)) suffix = ' (Y)';
    return `Mega ${titleize(base).replace(/-/g, ' ')}${suffix}`.trim();
  }

  // just above the generic G-Max block inside friendlyNameForVariety()
if (/^urshifu-(rapid|single)-strike-gmax$/i.test(slug)) {
  const kind = /rapid/i.test(slug) ? "Rapid" : "Single";
  return `Urshifu (${kind}) (G-Max)`;
}

  // 3) G-Max → "<Base> (…optional form…) (G-Max)"
  if (/-gmax$/i.test(slug)) {
    const parts = slug.split('-');
    const base = parts[0];
    const pre = parts.slice(1, -1); // tokens before the trailing gmax
    const preLabel = pre.length ? ` (${pre.map(s => titleize(s).replace(/-/g, ' ')).join(' ')})` : '';
    return `${titleize(base).replace(/-/g, ' ')}${preLabel} (G-Max)`;
  }

  // 4) Eternamax → "Eternatus (Eternamax)"
  if (/-eternamax$/i.test(slug)) {
    const base = slug.replace(/-eternamax$/i, '');
    return `${titleize(base).replace(/-/g, ' ')} (Eternamax)`;
  }

    // 5) Regional variants → "Galarian/Alolan/Hisuian/Paldean <Base>"
  if (/-galar$/i.test(slug)) {
    const base = slug.replace(/-galar$/i, '');
    return `Galarian ${titleize(base).replace(/-/g, ' ')}`.trim();
  }
  if (/-alola$/i.test(slug)) {
    const base = slug.replace(/-alola$/i, '');
    return `Alolan ${titleize(base).replace(/-/g, ' ')}`.trim();
  }
  if (/-hisui$/i.test(slug) || /-hisuan$/i.test(slug)) {
    const base = slug.replace(/-hisui$/i, '').replace(/-hisuan$/i, '');
    return `Hisuian ${titleize(base).replace(/-/g, ' ')}`.trim();
  }
  if (/-paldea(?:-.+)?$/i.test(slug)) {
    const base = slug.replace(/-paldea(?:-.+)?$/i, '');
    const rest = (slug.match(/-paldea-(.+)$/i)?.[1] || '').replace(/-/g, ' ');
    const suffix = rest ? ` (${titleize(rest)})` : '';
    return `Paldean ${titleize(base).replace(/-/g, ' ')}${suffix}`.trim();
  }

  // 6) Fallback: "<Base> (Form)" for common dashy slugs
  const titled = titleize(slug).replace(/-/g, '-');
  return normalizeFormHyphen(titled).replace(/-/g, ' ');
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
  399,480,481,482,483,484,485,486,487,488,
  // Gen 5
  638,639,640,641,642,643,644,645,646,
  // Gen 6
  716,717,718,
  // Gen 7 (not UBs, not Mythicals)
  772,773,785,786,787,788,789,790,791,792,800,
  // Gen 8
  888,889,890,891,892,894,895,896,897,898,905,
  // Gen 9 (no Paradox here; include Treasures of Ruin + box legends)
  1001,1002,1003,1004,1007,1008,1014,1015,1016,1017,1024 
];


const LEGENDS_MYTHICALS = [
  // 151 Mew, 251 Celebi, 385 Jirachi, 386 Deoxys,489 phione, 490 Manaphy, 491 Darkrai, 492 Shaymin,
  // 493 Arceus, 494 Victini, 647 Keldeo, 648 Meloetta, 649 Genesect, 719 Diancie,
  // 720 Hoopa, 721 Volcanion, 801 Magearna, 802 Marshadow, 807 Zeraora, 808 Meltan,
  // 809 Melmetal, 893 Zarude, 1025 Pecharunt
  151,251,385,386,489,490,491,492,493,494,647,648,649,719,720,721,801,802,807,808,809,893,1025
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

   // Galarian legendary birds (regional variants)
  { id: 144, variety: "articuno-galar" },
  { id: 145, variety: "zapdos-galar"  },
  { id: 146, variety: "moltres-galar" },

  // Kyurem forms
  { id: 646, variety: "kyurem-black" },
  { id: 646, variety: "kyurem-white" },

  // Zacian / Zamazenta crowned forms
{ id: 888, variety: "zacian-crowned" },
{ id: 889, variety: "zamazenta-crowned" },

  // Necrozma forms
{ id: 800, variety: "necrozma-dusk-mane" },
{ id: 800, variety: "necrozma-dawn-wings" },
{ id: 800, variety: "necrozma-ultra" },

  // Hoopa Unbound (Mythical)
  { id: 720, variety: "hoopa-unbound" },

  // Origin (Legends Arceus)
  { id: 483, variety: "dialga-origin" },
  { id: 484, variety: "palkia-origin" },

  // Enamorus Therian
  { id: 905, variety: "enamorus-therian" },

  // Calyrex riders
  { id: 898, variety: "calyrex-ice" },
  { id: 898, variety: "calyrex-shadow" },

    // ⭐ NEW: Gen 5 Mythicals/forms
  { id: 648, variety: "meloetta-pirouette" }, // shows as "Meloetta (Pirouette)"
  { id: 647, variety: "keldeo-resolute" },    // shows as "Keldeo (Resolute)"

   // Urshifu forms (base is Single-Strike, but base gets skipped when Forms are ON)
  { id: 892, variety: "urshifu-single-strike" },
  { id: 892, variety: "urshifu-rapid-strike" },

  // Shaymin Sky (Mythical)
  { id: 492, variety: "shaymin-sky" },

   // Mythical: Zarude (Dada)
  { id: 893, variety: "zarude-dada" },

  // Ogerpon masks (base = Teal Mask; these are the other three)
  { id: 1017, variety: "ogerpon-wellspring-mask" },
  { id: 1017, variety: "ogerpon-hearthflame-mask" },
  { id: 1017, variety: "ogerpon-cornerstone-mask" },

  // Terapagos forms
  { id: 1024, variety: "terapagos-terastal" },
];

// NEW: Mega forms we want to treat as legendary forms
const LEGENDARY_MEGA_FORMS = [
  { id: 150, variety: "mewtwo-mega-x" },
  { id: 150, variety: "mewtwo-mega-y" },
  { id: 380, variety: "latias-mega" },
  { id: 381, variety: "latios-mega" },
  { id: 384, variety: "rayquaza-mega" },
   // 👇 Add Primals here
  { id: 382, variety: "kyogre-primal" },
  { id: 383, variety: "groudon-primal" },
   // ⭐ NEW:
  { id: 719, variety: "diancie-mega" },
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
FRIENDLY_NAME_OVERRIDES["meloetta-pirouette"] = "Meloetta (Pirouette)";
FRIENDLY_NAME_OVERRIDES["keldeo-resolute"]    = "Keldeo (Resolute)";
// add these lines alongside the other overrides
FRIENDLY_NAME_OVERRIDES["hoopa-unbound"]  = "Hoopa (Unbound)";
FRIENDLY_NAME_OVERRIDES["dialga-origin"]  = "Dialga (Origin)";
FRIENDLY_NAME_OVERRIDES["palkia-origin"]  = "Palkia (Origin)";
FRIENDLY_NAME_OVERRIDES["calyrex-ice"]    = "Calyrex (Ice)";
FRIENDLY_NAME_OVERRIDES["calyrex-shadow"] = "Calyrex (Shadow)";
FRIENDLY_NAME_OVERRIDES["articuno-galar"] = "Galarian Articuno";
FRIENDLY_NAME_OVERRIDES["zapdos-galar"]  = "Galarian Zapdos";
FRIENDLY_NAME_OVERRIDES["moltres-galar"] = "Galarian Moltres";
// Urshifu G-Max — shorter for card width
FRIENDLY_NAME_OVERRIDES["urshifu-rapid-strike-gmax"]  = "Urshifu (Rapid) (G-Max)";
FRIENDLY_NAME_OVERRIDES["urshifu-single-strike-gmax"] = "Urshifu (Single) (G-Max)";
FRIENDLY_NAME_OVERRIDES["zarude-dada"]               = "Zarude (Dada)";
FRIENDLY_NAME_OVERRIDES["ogerpon-wellspring-mask"]   = "Ogerpon (Wellspring)";
FRIENDLY_NAME_OVERRIDES["ogerpon-hearthflame-mask"]  = "Ogerpon (Hearthflame)";
FRIENDLY_NAME_OVERRIDES["ogerpon-cornerstone-mask"]  = "Ogerpon (Cornerstone)";
FRIENDLY_NAME_OVERRIDES["terapagos-terastal"]        = "Terapagos (Terastal)";
//Necrozma Trials
FRIENDLY_NAME_OVERRIDES["necrozma-dusk-mane"] = "Necrozma (Dusk Mane)";
FRIENDLY_NAME_OVERRIDES["necrozma-dawn-wings"] = "Necrozma (Dawn Wings)";
FRIENDLY_NAME_OVERRIDES["necrozma-ultra"]     = "Necrozma (Ultra)";

FRIENDLY_NAME_OVERRIDES["zacian-crowned"]    = "Zacian (Crowned Sword)";
FRIENDLY_NAME_OVERRIDES["zamazenta-crowned"] = "Zamazenta (Crowned Shield)";
FRIENDLY_NAME_OVERRIDES["tapu-koko"] = "Tapu Koko";
FRIENDLY_NAME_OVERRIDES["tapu-bulu"] = "Tapu Bulu";
FRIENDLY_NAME_OVERRIDES["tapu-lele"] = "Tapu Lele";
FRIENDLY_NAME_OVERRIDES["tapu-fini"] = "Tapu Fini";
FRIENDLY_NAME_OVERRIDES["type-null"] = "Type: Null";

function buildLegendariesPool() {
  const toggles = (window.rankConfig && window.rankConfig.toggles) || {};

  // --- Read modes (with backward-compat fallbacks) -------------------------
  let mythMode  = (typeof toggles.mythMode  === 'string')
    ? toggles.mythMode                      // 'none' | 'include' | 'only'
    : (toggles.mythicals ? 'include' : 'none');

  let ubsMode   = (typeof toggles.ubsMode   === 'string')
    ? toggles.ubsMode                       // 'exclude' | 'include' | 'only'
    : (toggles.ultraBeasts ? 'include' : 'exclude');

    // Support old name 'formsSpecialMode' just in case, else 'formsMode', else legacy boolean
  let formsMode = (typeof toggles.formsMode === 'string')
    ? toggles.formsMode
    : ((typeof toggles.formsSpecialMode === 'string')
        ? toggles.formsSpecialMode
        : (toggles.forms ? 'both' : 'off'));

  // 🔧 Normalize: accept UI label "all" as "both" (and make it case-insensitive)
  formsMode = String(formsMode || 'off').toLowerCase();
  if (formsMode === 'all') formsMode = 'both';


  // --- HARDENING: make "Only" mutually exclusive ---------------------------
  // If both arrive as "only", prefer UBs=Only and force Mythicals=Excluded.
  if (mythMode === 'only' && ubsMode === 'only') {
    mythMode = 'none';
  } else if (ubsMode === 'only') {
    mythMode = 'none';
  } else if (mythMode === 'only') {
    ubsMode = 'exclude';
  }

  const wantMyth = (mythMode === 'include' || mythMode === 'only');
  const mythOnly = (mythMode === 'only');

  // --- 1) Build base species ID set ---------------------------------------
  let ids = [];
  if (ubsMode === 'only') {
    ids = [...LEGENDS_ULTRA_BEASTS];
  } else if (mythOnly) {
    ids = [...LEGENDS_MYTHICALS];
  } else {
    ids = [...LEGENDS_CORE];
    if (wantMyth) ids = ids.concat(LEGENDS_MYTHICALS);
    if (ubsMode === 'include') ids = ids.concat(LEGENDS_ULTRA_BEASTS);
  }

  // Dedupe IDs
  const seenIds = new Set();
  ids = ids.filter(id => (seenIds.has(id) ? false : (seenIds.add(id), true)));

  // Helper to apply shiny flags consistently
  function entriesFor(id, name) {
    const base = { id, name: name || null };
    if (window.shinyOnly)      return [{ ...base, shiny: true }];
    if (window.includeShinies) return [{ ...base, shiny: false }, { ...base, shiny: true }];
    return [{ ...base, shiny: false }];
  }

// Base pool from species IDs
const pool = [];
ids.forEach(id => {
  // Special-case: Urshifu
  if (id === 892) {
    const includeAnyForms = (formsMode !== 'off');
    if (includeAnyForms) {
      // When forms are ON, skip the base Urshifu entirely.
      return;
    }
    // When forms are OFF, force the name to plain "Urshifu".
    pool.push(...entriesFor(892, 'Urshifu'));
    return;
  }

  // Default behavior for everyone else
  pool.push(...entriesFor(id, null));
});

  // --- 2) Add forms (standard + special per dropdown) ----------------------
const includeAnyForms = (formsMode !== 'off');
if (includeAnyForms) {
  const idset = new Set(ids);

  // ✅ Only include "standard forms" (Therian/Origin/Primal/Riders/etc.)
  // when the dropdown is BOTH/ALL. Do NOT include them for Mega-only or G-Max-only.
  const includeStdForms = (formsMode === 'both'); // 'all' is normalized to 'both' earlier
  const stdForms = includeStdForms
    ? LEGENDARY_FORMS.filter(f => {
        if (!wantMyth && LEGENDS_MYTHICALS.includes(f.id)) return false;
        if (mythOnly && !LEGENDS_MYTHICALS.includes(f.id)) return false;
        return idset.has(f.id);
      })
    : [];

  // Special forms from the dropdown: Mega / G-Max(+Eternamax)
  let special = [];
  if (formsMode === 'mega' || formsMode === 'both') {
    special = special.concat(
      (Array.isArray(LEGENDARY_MEGA_FORMS) ? LEGENDARY_MEGA_FORMS : []).filter(f => idset.has(f.id))
    );
  }
  if (formsMode === 'gmax' || formsMode === 'both') {
    const g8 = (GMAX_FORMS_BY_GEN && Array.isArray(GMAX_FORMS_BY_GEN[8])) ? GMAX_FORMS_BY_GEN[8] : [];
    special = special.concat(g8.filter(f => idset.has(f.id)));
  }

  // Mythicals gating also applies to special forms
  special = special.filter(f => {
    if (!wantMyth && LEGENDS_MYTHICALS.includes(f.id)) return false;
    if (mythOnly && !LEGENDS_MYTHICALS.includes(f.id)) return false;
    return true;
  });

  const allForms = stdForms.concat(special);

  // Push unique display names only (avoid duplicates when forms share names)
  const existingNames = new Set(pool.map(m => (m.name || '').toLowerCase()).filter(Boolean));
  allForms.forEach(entry => {
    const display = friendlyNameForVariety(entry.variety);
    const key = (display || '').toLowerCase();
    if (!display || existingNames.has(key)) return;

    const base = { id: entry.id, name: display, variety: entry.variety };
    if (window.shinyOnly) {
      pool.push({ ...base, shiny: true });
    } else if (window.includeShinies) {
      pool.push({ ...base, shiny: false }, { ...base, shiny: true });
    } else {
      pool.push({ ...base, shiny: false });
    }
    existingNames.add(key);
  });
}
  return pool;
}



// ----- Pool builder (Gen 1–2)
function buildGenPool(gen){
  const toggles = (window.rankConfig && window.rankConfig.toggles) || window.toggles || {};

  // Read new string modes first, fall back to legacy booleans for old saves.
  const regionalMode  = (typeof toggles.regionalMode === 'string')
    ? toggles.regionalMode                     // 'off' | 'include'
    : (toggles.regional ? 'include' : 'off');  // legacy boolean -> mode

  const altBattleMode = (typeof toggles.altBattleMode === 'string')
    ? toggles.altBattleMode                    // 'off' | 'include'
    : (toggles.altBattle ? 'include' : 'off'); // legacy boolean -> mode

  const includeRegional  = (regionalMode  === 'include');   // Regional forms (Alola/Galar/Hisui)
  const includeAltBattle = (altBattleMode === 'include');   // Alt/Battle forms (Lycanroc, etc.)
  const includeGmax      = !!toggles.gmax;                  // unchanged
  const gmaxOnly         = includeGmax && !!toggles.gmaxOnly;


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
    { id: 83,  name: "Galarian Farfetchd", gen: 8 },
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
if (!gmaxOnly) {
  ids.forEach(id => { pool.push(...entriesFor(id, null)); });
}

    // ✅ Inject Regional forms for this gen ONLY if toggle is on
  if (includeRegional && !gmaxOnly) {
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

// ✅ Inject Alternate/Battle forms (disabled when G-Max only)
if (!gmaxOnly && includeAltBattle && ALT_BATTLE_FORMS_BY_GEN[gen]?.length) {
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
  // ✅ Inject G-Max/Eternamax (Gen 8 or All) only if toggle is on
  if (includeGmax && GMAX_FORMS_BY_GEN[gen]?.length) {
    const existingNames = new Set(
      pool.map(m => (m.name || '').toLowerCase()).filter(Boolean)
    );
    GMAX_FORMS_BY_GEN[gen].forEach(entry => {
      const display = friendlyNameForVariety(entry.variety);
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
  // Check for pending resume FIRST, before doing anything else
  const slotIdxStr = localStorage.getItem('PR_PENDING_RESUME_SLOT');
  let resumeSession = null;
  
  if (slotIdxStr) {
    localStorage.removeItem('PR_PENDING_RESUME_SLOT');
    const idx = parseInt(slotIdxStr, 10);
    if (!Number.isNaN(idx)) {
      try {
        const slots = JSON.parse(localStorage.getItem('PR_SAVE_SLOTS_V1') || '[]');
        const s = Array.isArray(slots) ? slots[idx] : null;
        if (s && s.type === 'ranker') {
          resumeSession = s;
        }
      } catch (e) {
        console.warn('Could not resume slot:', e);
      }
    }
  }

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

  function toFriendlyWithGmax(rawSlug) {
    const slug = String(rawSlug || '');

    // 1) exact curated override
    if (FRIENDLY_NAME_OVERRIDES[slug]) return FRIENDLY_NAME_OVERRIDES[slug];

    // 2) G-Max / Eternamax: use our central formatter so we get “Cinderace (G-Max)”, etc.
    if (/-gmax$/i.test(slug) || /-eternamax$/i.test(slug)) {
      return friendlyNameForVariety(slug);
    }

    // 3) Megas, regionals, paldea (what you already had)
    if (/-mega(?:-[xy])?$/i.test(slug)) {
      const base = slug.replace(/-mega(?:-[xy])?$/i, '');
      let suffix = '';
      if (/-mega-x$/i.test(slug)) suffix = ' (X)';
      if (/-mega-y$/i.test(slug)) suffix = ' (Y)';
      return `Mega ${titleize(base).replace(/-/g, ' ')}${suffix}`.trim();
    }
    if (/-galar$/i.test(slug)) {
      const base = slug.replace(/-galar$/i, '');
      return `Galarian ${titleize(base).replace(/-/g, ' ')}`.trim();
    }
    if (/-alola$/i.test(slug)) {
      const base = slug.replace(/-alola$/i, '');
      return `Alolan ${titleize(base).replace(/-/g, ' ')}`.trim();
    }
    if (/-hisui$/i.test(slug) || /-hisuan$/i.test(slug)) {
      const base = slug.replace(/-hisui$/i, '').replace(/-hisuan$/i, '');
      return `Hisuian ${titleize(base).replace(/-/g, ' ')}`.trim();
    }
    if (/-paldea(?:-.+)?$/i.test(slug)) {
      const base = slug.replace(/-paldea(?:-.+)?$/i, '');
      const rest = (slug.match(/-paldea-(.+)$/i)?.[1] || '').replace(/-/g, ' ');
      const suffix = rest ? ` (${titleize(rest)})` : '';
      return `Paldean ${titleize(base).replace(/-/g, ' ')}${suffix}`.trim();
    }

    // 4) default dash → (Form) prettifier
    return normalizeFormHyphen(titleize(slug).replace(/-/g, '-'));
  }

  for (const p of list) {
    if (!p) continue;

    // base species (no variety)
    out.push({ id: p.id, name: toFriendlyWithGmax(p.name), types: p.types });

    if (Array.isArray(p.forms)) {
  for (const f of p.forms) {
    if (!f) continue;

    // 🚫 Skip busted Mimikyu + non-green Squawkabilly
    if (/^mimikyu-busted$/i.test(f.name)) continue;
    if (/^squawkabilly-(blue|yellow|white)-plumage$/i.test(f.name)) continue;

    // 🚫 NEW: Skip non-battle ride/build forms for Koraidon/Miraidon
    // (we already define EXCLUDED_TYPE_MODE_RE earlier in the file)
    const formSlug = String(f.name || '').toLowerCase().replace(/\s+/g, '-');
    if (EXCLUDED_TYPE_MODE_RE.test(formSlug)) continue;

    // ✅ Push the actual FORM, with its own id/types/slug
    out.push({
      id: f.id,
      name: toFriendlyWithGmax(f.name),
      types: f.types,
      variety: f.name
    });
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
      // Guard: hard-drop any Koraidon/Miraidon travel forms (in case data changes later)
  const ALL = flattenWithForms(DB).filter(p => {
    const nm = String(p.variety || p.name || '').toLowerCase().replace(/\s+/g, '-');
    return !EXCLUDED_TYPE_MODE_RE.test(nm);
  });
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


// --- collapse special G-Max duplicates (Toxtricity & Appletun/Flapple) ---
function collapseGmaxSpecials(list) {
  const TARGETS = new Map([
    // Canonical slugs to use for artwork:
    ['Toxtricity (G-Max)',       { id: 849, name: 'Toxtricity (G-Max)',       variety: 'toxtricity-amped-gmax' }],
    ['Appletun/Flapple (G-Max)', { id: 842, name: 'Appletun/Flapple (G-Max)', variety: 'appletun-gmax' }],
  ]);

  const used = new Set();
  const out = [];

  for (const p of list) {
    const nm = (p.name || '').trim();
    if (TARGETS.has(nm)) {
      if (used.has(nm)) continue; // drop duplicates
      const t = TARGETS.get(nm);
      out.push({ ...p, id: t.id, name: t.name, variety: t.variety }); // ✅ force variety
      used.add(nm);
    } else {
      out.push(p);
    }
  }
  return out;
}


let basePool = ALL
  .filter(matchesType)
  .map(p => ({ id: p.id, name: p.name, shiny: false }));

// 🔧 collapse the two shared G-Max labels down to one each
basePool = collapseGmaxSpecials(basePool);

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
// Only initialize fresh state if we're not resuming from a save
if (!resumeSession) {
  // Fresh start - initialize state normally
  remaining  = shuffle([...pool]);
  eliminated = [];
  current    = remaining.pop() || null;
  next       = remaining.pop() || null;
  if (current) current.roundsSurvived = 0;
  if (next)    next.roundsSurvived    = 0;

  leftHistory.length = 0;
  if (current) leftHistory.push(current);
} else {
  // Resuming - restore the saved session immediately
  loadRankerSession(resumeSession);
  return; // Exit early, don't do the normal initialization
}

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

// ✳️ Targeted warm-up: when the pool is G-Max only, pre-resolve artwork IDs so swaps are instant.
async function warmGmaxArtworkIdsIfSmallPool() {
  try {
    const toggles = (window.rankConfig && window.rankConfig.toggles) || {};
    // Only do this when the user explicitly chose G-Max Only
    if (!(toggles.gmax && toggles.gmaxOnly)) return;

    const list = Array.isArray(window.pool) ? window.pool : [];
    // Grab unique G-Max / Eternamax variety slugs from the pool
    const seen = new Set();
    const slugs = [];
    for (const p of list) {
      if (!p) continue;
      const v = p.variety || varietySlugFromMon(p);
      if (!v) continue;
      if (!/-gmax$/i.test(v) && !/-eternamax$/i.test(v)) continue;
      const key = VARIETY_SLUG_ALIASES[v] || v;
      if (seen.has(key)) continue;
      seen.add(key);
      slugs.push(key);
    }
    if (!slugs.length) return;

    // Throttle concurrency so we don’t spam the API
    const CONCURRENCY = 4;
    let i = 0;
    async function worker() {
      while (i < slugs.length) {
        const slug = slugs[i++];
        try { await ensureArtworkIdForVariety(slug); } catch {}
      }
    }
    const workers = Array.from({ length: Math.min(CONCURRENCY, slugs.length) }, worker);
    await Promise.all(workers);
  } catch {}
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

// Replace the rankerLabel() function in ranker.js with this updated version:

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
    // NEW: Handle legendaries with dynamic toggles (same logic as page title)
    const mythMode = rc?.toggles?.mythMode || 'none';
    const ubsMode  = rc?.toggles?.ubsMode  || 'exclude';
    
    if (mythMode === 'only') {
      label = "Mythicals";
    } else if (ubsMode === 'only') {
      label = "Ultra Beasts";
    } else {
      const parts = [];
      
      if (mythMode !== 'only' && ubsMode !== 'only') {
        parts.push("Legendaries");
      }
      
      if (mythMode === 'include') {
        parts.push("Mythicals");
      }
      
      if (ubsMode === 'include') {
        parts.push("Ultra Beasts");
      }
      
      label = parts.length > 1 ? parts.join(" + ") : (parts[0] || "Legendaries");
    }

  } else if (rc?.category === "type") {
    const t = rc?.filters?.type || {};
    if (t.mode === "dual" && Array.isArray(t.types) && t.types.length === 2) {
      label = `${t.types[0]}/${t.types[1]} Type`;
    } else if (t.mode === "mono" && Array.isArray(t.types) && t.types.length === 1) {
      const typeLabel = t.strictMono ? `Pure ${t.types[0]}` : `Mono ${t.types[0]}`;
      label = `${typeLabel} Type`;
    } else {
      label = "Type";
    }
  }

  // Include Forms tag when any forms are enabled
  const t = (window.rankConfig && window.rankConfig.toggles) || {};

  const regionalMode  = (typeof t.regionalMode === 'string')
    ? t.regionalMode
    : (t.regional ? 'include' : 'off');

  const altBattleMode = (typeof t.altBattleMode === 'string')
    ? t.altBattleMode
    : (t.altBattle ? 'include' : 'off');

  const specialFormsMode = (typeof t.formsMode === 'string')
    ? t.formsMode
    : ((typeof t.formsSpecialMode === 'string') ? t.formsSpecialMode : 'off');

  const formsTag = (
    regionalMode === 'include' ||
    altBattleMode === 'include' ||
    specialFormsMode !== 'off'
  ) ? " • +Forms" : "";

  const shinyTag = window.shinyOnly
    ? " • Shiny-only✨"
    : (window.includeShinies ? " • +Shinies✨" : " • No Shinies");

  const gmaxTag = t.gmax
    ? (t.gmaxOnly ? " • G-Max only" : " • +G-Max")
    : "";

  return label + formsTag + shinyTag + gmaxTag;
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
    // 👇 First, catch Type: Null explicitly so it doesn’t get mangled
    .replace(/^Type[-:\s]*Null$/i, 'Type: Null')

    // ✅ Paradox species: use spaces instead of hyphens
    // (Safe list of known prefixes so we don't touch Ho-Oh, Porygon-Z, Kommo-o, etc.)
    .replace(
      /\b(Iron|Great|Scream|Brute|Flutter|Slither|Sandy|Roaring|Walking|Raging|Gouging)-([A-Z][a-z]+)\b/g,
      (_m, a, b) => `${a} ${b}`
    )
    // 👇 Core “dash to (Form)” mappings
    .replace(/-Incarnate$/i, ' (Incarnate)')
    .replace(/-Therian$/i,   ' (Therian)')
    .replace(/-Midday$/i,    ' (Midday)')
    .replace(/-Midnight$/i,  ' (Midnight)')
    .replace(/-Dusk$/i,      ' (Dusk)')
    // Urshifu forms
    .replace(/-Single-Strike$/i, ' (Single Strike)')
    .replace(/-Rapid-Strike$/i,  ' (Rapid Strike)')

    // === Your requested fixes (generic so they work everywhere) ===
    .replace(/-Unbound$/i, ' (Unbound)')   // Hoopa (Unbound)
    .replace(/-Origin$/i,  ' (Origin)')    // Dialga/Palkia (Origin)
    .replace(/-Ice$/i,     ' (Ice)')       // Calyrex (Ice)
    .replace(/-Shadow$/i,  ' (Shadow)')    // Calyrex (Shadow)
    .replace(/-Dusk-Mane$/i,   ' (Dusk Mane)')
    .replace(/-Dawn-Wings$/i,  ' (Dawn Wings)')
    .replace(/-Ultra$/i,       ' (Ultra)')


    // Tapu-Lele → Tapu Lele (safety if it ever sneaks in hyphenated)
    .replace(/^Tapu-Lele$/i, 'Tapu Lele')
    .replace(/^Tapu-Fini$/i, 'Tapu Fini')
    .replace(/^Tapu-Koko$/i, 'Tapu Koko')
    .replace(/^Tapu-Bulu$/i, 'Tapu Bulu')

    // Other existing mappings you already had
    .replace(/-Pirouette$/i, ' (Pirouette)')
    .replace(/-Resolute$/i,  ' (Resolute)')
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

   // 👇 Mimikyu special-case
.replace(/^Mimikyu-Disguised$/i, 'Mimikyu')
.replace(/^Mimikyu-Busted$/i,    'Mimikyu')

// ✅ Squawkabilly (Green only shown)
.replace(/^Squawkabilly-Green-Plumage$/i, 'Squawkabilly (Green)')

// ✅ Rotom appliance forms → "Rotom (Wash/Heat/Frost/Mow/Fan)"
.replace(/^Rotom-Wash$/i,  'Rotom (Wash)')
.replace(/^Rotom-Heat$/i,  'Rotom (Heat)')
.replace(/^Rotom-Frost$/i, 'Rotom (Frost)')
.replace(/^Rotom-Mow$/i,   'Rotom (Mow)')
.replace(/^Rotom-Fan$/i,   'Rotom (Fan)')

// ✅ Morpeko modes → "Morpeko (Full Belly/Hangry)"
.replace(/^Morpeko-Full-Belly$/i, 'Morpeko (Full Belly)')
.replace(/^Morpeko-Hangry$/i,     'Morpeko (Hangry)')

// ✅ Basculin forms → "Basculin (stripes)"
.replace(/^Basculin-Blue-Striped$/i,   'Basculin (Blue Striped)')
.replace(/^Basculin-White-Striped$/i, 'Basculin (White Striped)')
.replace(/^Basculin-Red-Striped$/i, 'Basculin (Red Striped)')

// ✅ Basculegion forms → "Basculegion (M/f)"
.replace(/^Basculegion-Male$/i,   'Basculin (Male)')
.replace(/^Basculin-Female$/i, 'Basculin (Female)')

// ✅ Toxtricity forms → "Toxtricity (Amped/Low Key)"
.replace(/^Toxtricity-Amped$/i,   'Toxtricity (Amped)')
.replace(/^Toxtricity-Low-Key$/i, 'Toxtricity (Low Key)')

// ✅ Tatsugiri forms → "Tatsugiri (Droopy/Stretchy)"
.replace(/^Tatsugiri-Droopy$/i,   'Tatsugiri (Droopy)')
.replace(/^Tatsugiri-Stretchy$/i,   'Tatsugiri (Stretchy)')
.replace(/^Tatsugiri-Stretchy$/i,   'Tatsugiri (Curly)')

// ✅ Maushold Annoyance Name
.replace(/^Maushold-family-of-four$/i, 'Maushold')

// ✅ Maushold Annoyance Name
.replace(/^Castform-Sunny$/i, 'Castform (Sunny)')

// Primals
.replace(/^Groudon-Primal$/i, 'Groudon (Primal)')
.replace(/^Kyogre-Primal$/i, 'Kyogre (Primal)');

}
//
// Final pass used everywhere before showing a name.
// Keeps formatting consistent across all screens.
//
function finalizeName(raw){
  let n = String(raw || '').trim();

  // General dash → (Form)
  n = normalizeFormHyphen(n);

  // Canon cleanup (your requested fixes, resilient to punctuation)
  n = n
    .replace(/\bFarfetchd\b/gi, "Farfetch'd")          // ← NEW: global fix
    .replace(/^Type[-:\s]*Null$/i, 'Type: Null')
    .replace(/^Hoopa Unbound$/i, 'Hoopa (Unbound)');

  return n;
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
    const res = await fetch('data/names.en.min.json?v=' + new Date().getTime(), { cache: 'no-store' });
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

// ✅ Known artwork-id overrides for forms that we want to resolve instantly
const ARTWORK_ID_OVERRIDES = {
  "necrozma-dusk-mane": 10155,
  "necrozma-dawn-wings": 10156,
  "necrozma-ultra": 10157 // keep if you want Ultra to resolve instantly too
};

const artIdCache = (() => {
  let cached = {};
  try { cached = JSON.parse(localStorage.getItem(ART_ID_CACHE_KEY) || "{}"); }
  catch { cached = {}; }
  // Merge our overrides (don’t clobber if user already has a value)
  for (const [k, v] of Object.entries(ARTWORK_ID_OVERRIDES)) {
    if (typeof cached[k] !== 'number' || cached[k] <= 0) cached[k] = v;
  }
  return cached;
})();
function saveArtIdCache(){
  try { localStorage.setItem(ART_ID_CACHE_KEY, JSON.stringify(artIdCache)); } catch {}
}

// UI display name (uses p.name, then cache, else #NNN)
function displayName(p){
  const id = p.id;
  const fromCache = p.name || nameCache[id];
  const fromMap = NAMES_MAP && NAMES_MAP[id];
  const nm0 = fromCache || fromMap;
  const nm  = nm0 ? finalizeName(nm0) : null;
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
    const pretty = finalizeName(titleize(data?.name || ""));
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
        p.name = finalizeName(map[id]);
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

function awaitImgLoaded(img){
  return new Promise((resolve) => {
    if (!img) return resolve();

    const isRealSrc = () => img && typeof img.src === 'string' && !img.src.startsWith('data:');

    // Only resolve immediately if a non-data image is already loaded
    if (img.complete && img.naturalWidth > 0 && isRealSrc()) return resolve();

    const onLoad = () => {
      // Gate on REAL src (not the 1x1 data URI)
      if (isRealSrc()) { cleanup(); resolve(); }
    };
    const onError = () => {
      // Wait through any queued fallbacks
      try {
        const steps = JSON.parse(img.dataset.fallbacks || '[]');
        const i = parseInt(img.dataset.step || '0', 10);
        if (i < steps.length) return;
      } catch {}
      // If we've errored on a real URL (not data:), allow UI to continue
      if (isRealSrc()) { cleanup(); resolve(); }
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

  // ⬇️ NEW: Any images on the page waiting on this variety should fall back to base art
  const nodes = document.querySelectorAll(`img[data-variety="${varietySlug}"], img[data-variety="${key}"]`);
  nodes.forEach(img => {
    const baseId = parseInt(img.dataset.pid || '0', 10);
    if (baseId > 0) {
      const shiny = img.dataset.shiny === '1';
      const chain = buildOfficialChainFromId(baseId, shiny);
      img.dataset.step = "0";
      img.src = chain[0];
      img.dataset.fallbacks = JSON.stringify(chain.slice(1));
      img.style.visibility = 'visible';
    }
  });

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
          img.style.visibility = 'visible';
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
  // ✅ Use override immediately if present
  if (ARTWORK_ID_OVERRIDES[variety]) {
    const artId = ARTWORK_ID_OVERRIDES[variety];
    // also persist in the cache so results/export paths use numeric immediately
    if (artIdCache[variety] !== artId) {
      artIdCache[variety] = artId;
      try { localStorage.setItem(ART_ID_CACHE_KEY, JSON.stringify(artIdCache)); } catch {}
    }
    return shiny
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${artId}.png`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${artId}.png`;
  }

  const artId = artIdCache[variety];
  if (artId && artId > 0) {
    return shiny
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${artId}.png`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${artId}.png`;
  }

  // Kick off async resolve; fall back briefly only if needed
  ensureArtworkIdForVariety(variety);
  return shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${p.id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`;
}
}

// OFFICIAL-ARTWORK ONLY fallback chain with numeric-ID preference:
// variety (numeric cached) -> variety (slug) -> base (id)
// Builds an <img> tag with a robust fallback chain.
// - For base species: use official-artwork by numeric ID.
// - For forms: if we already know the numeric artwork ID, use it immediately;
//   otherwise, during LIVE matchups we show a tiny transparent placeholder and
//   resolve the numeric ID in the background (no slug requests, no 404 spam).
//   On RESULTS/EXPORT screens, we still show base art while resolving so exports are never blank.
function getImageTag(p, opts = {}) {
  const { alt = "", forResults = false } = opts;
  const wantShiny =
    (typeof opts.wantShiny === "boolean" ? opts.wantShiny : undefined) ??
    (typeof p.shiny === "boolean" ? p.shiny : undefined) ??
    !!window.shinyOnly;

  // Variety slug if present (e.g., "rayquaza-mega", "dialga-origin", etc.)
  // Prefer explicit opts.variety, then the mon object, then a helper if available.
  const variety =
    opts.variety ||
    p.variety ||
    (typeof varietySlugFromMon === "function" ? varietySlugFromMon(p) : null) ||
    null;

  const chain = [];

  // Base artwork URLs by numeric species id
  const baseIdShiny = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${p.id}.png`;
  const baseIdNorm  = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`;
  const baseChain   = wantShiny ? [baseIdShiny, baseIdNorm] : [baseIdNorm];

  // 1×1 transparent data URI (no network request)
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

  if (variety) {
    const cached = artIdCache[variety];

    if (typeof cached === 'number' && cached > 0) {
      // We already know the numeric artwork id for this form → use it directly.
      chain.push(...buildOfficialChainFromId(cached, wantShiny));

    } else if (cached === -1) {
      // Known-bad slug (PokeAPI has no slug asset for this form) → fall back to base art.
      // We choose base art for both live & results here so it never stays blank.
      chain.push(...baseChain);

    } else {
      // Unknown numeric id:
      // - Live matchup: push a blank to avoid a slug request (and 404),
      //   then resolve the numeric id in the background and swap in.
      // - Results/export: push base art while we resolve (keeps exports bullet-proof).
      if (typeof ensureArtworkIdForVariety === "function") {
        ensureArtworkIdForVariety(variety);
      }
      if (forResults) {
        chain.push(...baseChain);
      } else {
        chain.push(BLANK);
      }
    }
  } else {
    // Base species (no form)
    chain.push(...baseChain);
  }

  // Safety: ensure we never return an empty chain
  if (chain.length === 0) chain.push(baseIdNorm);

  const first   = chain[0];
  const safeAlt = alt || (p.name || (nameCache && nameCache[p.id]) || "");

 return `<img
    src="${first}"
    alt="${safeAlt}"
    style="visibility:hidden"
    width="256" height="256"
    decoding="async"
    loading="eager"
    fetchpriority="high"
    data-variety="${variety || ''}"
    data-shiny="${wantShiny ? '1' : '0'}"
    data-step="0"
    data-fallbacks='${JSON.stringify(chain.slice(1))}'
    onload="if (this.src.indexOf('data:')!==0) this.style.visibility='visible'"
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

// --- Head-to-Head (per run; shows rematch context) ---
const H2H = Object.create(null); // "ak|bk" -> { aKey, bKey, aWins, bWins, total, last }

function h2hRecord(winner, loser) {
  if (!winner || !loser) return;
  const k = pairKey(winner, loser);          // uses monKey() ordering under the hood
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
  if (mw + tw === 0) return '';                    // first meeting → no badge
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

// Fire a targeted warm-up for G-Max-only pools (non-blocking)
setTimeout(() => { try { warmGmaxArtworkIdsIfSmallPool(); } catch {} }, 0);

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

// Restore H2H state (KOTH or post-phase)
const inPostUndo = (state.phase === 'RU' || state.phase === 'THIRD');

if (inPostUndo && post?.lastSnap?.h2h) {
  for (const k in H2H) delete H2H[k];
  Object.assign(H2H, post.lastSnap.h2h);
} else if (window.lastH2HSnapshot) {
  for (const k in H2H) delete H2H[k];
  Object.assign(H2H, window.lastH2HSnapshot);
  window.lastH2HSnapshot = null;
}


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

  // If the last move was Pick For Me, restore the use
  if (lastMoveWasPickForMe) {
    pickForMeUsesLeft++;
    updatePickForMeButton();
    lastMoveWasPickForMe = false; // Reset the flag
  }

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
function labelHTML(p, side){
  const nm = p.name || nameCache[p.id] || "";
  const text = nm ? (p.shiny ? `⭐ ${nm}` : nm) : "";
  return `<p data-id="${p.id}" class="pkr-label"
            style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.2; min-height:1.2em; margin:6px 0 0; text-align:center;">
            ${text || "&nbsp;"}
          </p>
          <div class="h2h-badge" data-side="${side || ''}"
               style="text-align:center; font-size:.8rem; color:#6b7280; min-height:1em; margin-top:2px;"></div>`;
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

  if (!mon) { rightEl.innerHTML = ""; return Promise.resolve(); }

  const BASELINE_CARD_HEIGHT = 320;
  const prevMinHeight = rightEl.style.minHeight;
  const lockedHeight = Math.max(rightEl.offsetHeight || 0, BASELINE_CARD_HEIGHT);
  rightEl.style.minHeight = `${lockedHeight}px`;

  const temp = document.createElement('div');
  temp.style.position = 'absolute';
  temp.style.left = '-9999px';
  temp.style.top = '0';
  temp.innerHTML = `${getImageTag(mon)}${labelHTML(mon, 'right')}`;

  document.body.appendChild(temp);
  pendingRightTemp = temp;

 const img   = temp.querySelector('img');
const label = temp.querySelector('p');

if (img) {
  img.fetchPriority = 'high';
  img.decoding = 'async';
  img.loading = 'eager';
}

const pImg  = img ? awaitImgLoaded(img) : Promise.resolve();


  return pImg.then(() => {
    if (myVersion !== rightRenderVersion) {
      try { document.body.removeChild(temp); } catch {}
      return;
    }
    const nm = mon.name || nameCache[mon.id] || "";
    if (label && nm) label.textContent = mon.shiny ? `⭐ ${nm}` : nm;

    while (rightEl.firstChild) rightEl.removeChild(rightEl.firstChild);
    while (temp.firstChild) {
      const node = temp.firstChild;
      temp.removeChild(node);
      if (node.tagName === 'IMG') node.style.visibility = 'visible';
      rightEl.appendChild(node);
    }

    try { document.body.removeChild(temp); } catch {}
    pendingRightTemp = null;
    lastRightKey = monKey(mon);
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
  temp.innerHTML = `${getImageTag(mon)}${labelHTML(mon, 'left')}`;
  document.body.appendChild(temp);

  const img = temp.querySelector('img');
const pEl = temp.querySelector('p');

// Hint the browser this image is critical
if (img) {
  img.fetchPriority = 'high';
  img.decoding = 'async';
  img.loading = 'eager';
}

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

// --- First-render sync: ensure names AND form artwork IDs for current+next
let didFirstSyncRender = false;

async function firstRenderSync(){
  const mons = [current, next].filter(Boolean);
  try {
    // 1) Names first (prevents label pop-in)
    await ensureNames(mons);

    // 2) If either mon is a form (Mega, G-Max, regional, etc.), resolve its artwork numeric ID now
    const slugs = mons
      .map(m => varietySlugFromMon(m))
      .filter(Boolean);

    if (slugs.length) {
      // Resolve in parallel; tiny one-time cost to avoid the base-art "blink"
      await Promise.all(slugs.map(s => ensureArtworkIdForVariety(s)));
    }
  } catch {}
  // 3) Now do a normal render; URLs will prefer the numeric form ID immediately
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
    const rightEl = document.getElementById("right");
    if (rightEl && lastRightKey && lastRightKey === lk) {
      rightEl.classList.add('recycling');
    }
    renderOpponentSmooth(next)?.finally(() => {
      rightEl?.classList.remove('recycling');
      refreshH2HBadges(); // ← update badges after the new opponent is in the DOM
    });
  } else {
    updateLabelText(rightEl, next);
    refreshH2HBadges();   // ← also update if the right didn’t re-render
  }

// Silent name prefetch (cache only; the smooth render will swap when ready)
awaitName(current.id);
awaitName(next.id);

// Prefetch the *upcoming* opponent (the one after "next") to shrink perceived latency
const upcoming = remaining[remaining.length - 1];
if (upcoming) {
  // 1) Preload the first sprite URL (helps pure base species)
  ensurePrefetch(upcoming);

  // 2) If it's a FORM, resolve its numeric artwork id now
  //    (prevents any base-form flash when it reaches the screen)
  const v = varietySlugFromMon(upcoming);
  if (v && (artIdCache[v] == null || artIdCache[v] <= 0)) {
    // Fire-and-forget; cached for when it becomes "next"
    ensureArtworkIdForVariety(v);
  }
}

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

function pick(side) {
  
  if (!window.prEngine || typeof prEngine.choose !== 'function') return;
  if (gameOver) return;

  const inPost = (post.phase === 'RU' || post.phase === 'THIRD');

  // Save H2H state before making the pick
  const h2hSnapshot = JSON.parse(JSON.stringify(H2H));

  if (inPost) {
    // RU/THIRD: snapshot so Undo enables immediately
    postSaveLastSnapshot();
  } else {
    // KOTH: arm one-step undo
    kothLastSnap = true;
    // Store H2H snapshot for KOTH undo
    window.lastH2HSnapshot = h2hSnapshot;
  }
    updateUndoButton();

  // Capture the pair BEFORE calling the engine, so we know who fought
  const beforeLeft  = current;
  const beforeRight = next;

  const state = prEngine.choose(side === 'left' ? 'left' : 'right');
  if (!state) return;

  // Record the head-to-head result for this exact pair
  const winnerMon = (side === 'left') ? beforeLeft : beforeRight;
  const loserMon  = (side === 'left') ? beforeRight : beforeLeft;
  if (winnerMon && loserMon) h2hRecord(winnerMon, loserMon);

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
  // 🔒 RU safety: strip the champion from the RU bracket if it slipped in (stale state, resume, etc.)
  if (post.phase === 'RU' && !post._ruSanitized) {
    const champ = leftHistory[leftHistory.length - 1] || null;
    if (champ) {
      const ck = monKey(champ);
      const strip = arr => (Array.isArray(arr) ? arr.filter(p => p && monKey(p) !== ck) : []);
      post.currentRound = strip(post.currentRound);
      post.nextRound    = strip(post.nextRound);
    }
    post._ruSanitized = true;
  }

  // Finish a round -> roll into next or finish bracket
  while (post.index >= post.currentRound.length) {
    if (post.nextRound.length <= 1) {
      const bracketWinner = post.nextRound[0] || post.currentRound[0] || null;

      if (post.phase === 'RU') {
        // Final guard: runner-up must not be the champion
        const champ = leftHistory[leftHistory.length - 1] || null;
        if (champ && bracketWinner && monKey(bracketWinner) === monKey(champ)) {
          // Try to pick an alternative non-champion from whatever remains (may be null if none)
          const alt = [...(post.currentRound||[]), ...(post.nextRound||[])]
            .find(p => p && monKey(p) !== monKey(champ)) || null;
          post.runnerUp = alt;
        } else {
          post.runnerUp = bracketWinner;
        }

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
  // Track completion for achievements (NEW!)
  if (!gameOver) {  // Only track if we haven't already finished
    const category = window.rankConfig?.category || 'unknown';
    trackRankingCompletion(category, pool.length);
  }
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
      : (total === 0 ? `<p class="rounds-text">Auto-advanced</p>`
                     : `<p class="rounds-text">Won 0 Matches</p>`);
    
    return `
      <div class="pokemon-card compact-card">
        ${getImageTag(p, p.shiny, displayName(p), true)}
        <p>${displayName(p)}</p>
        ${survivedLine}
        ${winsLine}
        <p class="placement-tag">${title}</p>
      </div>
    `;
  }
  
  // THIS WAS MISSING - Honorable Mention case:
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
  const mythMode = rc?.toggles?.mythMode || 'none';
  const ubsMode  = rc?.toggles?.ubsMode  || 'exclude';
  
  if (mythMode === 'only') {
    headerText = 'Your Favorite Mythical Pokémon is:';
  } else if (ubsMode === 'only') {
    headerText = 'Your Favorite Ultra Beast is:';
  } else {
    const parts = [];
    
    if (mythMode !== 'only' && ubsMode !== 'only') {
      parts.push("Legendary");
    }
    
    if (mythMode === 'include') {
      parts.push("Mythical");
    }
    
    if (ubsMode === 'include') {
      parts.push("Ultra Beast");
    }
    
    const typeText = parts.length > 1 ? parts.join("/") : (parts[0] || "Legendary");
    headerText = `Your Favorite ${typeText} Pokémon is:`;
  }
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
  headerText = `Your Favorite Gen ${g} Pokémon is:`;
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

// Always normalize the final label to catch any stray hyphens (e.g., Iron-Thorns)
const displayNameSafe = finalizeName(
  p.name
  || friendlyFromVariety(variety)
  || nameCache[p.id]
  || ''
) || null;


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

let category = rankerLabel(); // Use the dynamic label we just created'

// after computing `category` in saveResults()…
const t = (window.rankConfig && window.rankConfig.toggles) || {};
const gmaxTag = t.gmax ? (t.gmaxOnly ? " • G-Max only" : " • +G-Max") : "";
category = category + gmaxTag;   // <- include G-Max in the saved label

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
  toggles: (window.rankConfig && window.rankConfig.toggles) || {},
  label: rankerLabel(),  // <- full label e.g., "Gen 8 • No Shinies • +G-Max"
  champion:   pack(champion, 'CHAMP'),
  runnerUp:   pack(runnerUp, 'RU'),
  thirdPlace: pack(thirdPlace, 'THIRD'),
  honorable:  pack(honorable, 'HM')
});


  try {
    localStorage.setItem("savedRankings", JSON.stringify(saved));
    alert(`Saved! Your ${category} ranking has been updated.`);
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

 function buildLinesFor(title, mon) {
  if (!mon) return [];
  const survived = `Survived ${pluralize(mon.roundsSurvived || 0, "Round", "Rounds")}`;

  if (title === 'Runner-up') {
    const wins = (post?.ruWinsByMon?.[monKey(mon)] || 0);
    const total = (typeof post?.ruTotal === 'number' ? post.ruTotal : 0);
    return (wins > 0) 
      ? [survived, `Won ${pluralize(wins, "Match", "Matches")}`]
      : (total === 0 ? [survived, 'Auto-advanced'] 
                     : [survived, 'Won 0 Matches']);
  }

  if (title === 'Third Place') {
    const wins = (post?.thirdWinsByMon?.[monKey(mon)] || 0);
    const total = (typeof post?.thirdTotal === 'number' ? post.thirdTotal : 0);
    return (wins > 0)
      ? [survived, `Won ${pluralize(wins, "Match", "Matches")}`]
      : (total === 0 ? [survived, 'Auto-advanced']
                     : [survived, 'Won 0 Matches']);
  }

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
