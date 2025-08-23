/**
 * Build a pokemon.db.json for PokeRankr, including only gameplay‑relevant forms.
 * We KEEP: Regionals (Alola/Galar/Hisui/Paldea), Megas, Gigantamax, and battle‑relevant alternates
 * (e.g., Rotom appliances, Lycanroc forms, Darmanitan Zen, Zygarde 10/50/Complete, etc.).
 * We DROP: Totem variants and cosmetic/costume/special‑event caps, cosplay, spiky‑eared, eternal, etc.
 *
 * Output schema per species:
 * {
 *   id: <base species numeric id>,
 *   name: "Bulbasaur",
 *   types: ["Grass","Poison"],
 *   forms: [ // OPTIONAL
 *     { id: <numeric id>, name: "Rotom-heat", types: ["Electric","Fire"] },
 *     ...
 *   ]
 * }
 *
 * Where it saves: SAME folder as this script (./pokemon.db.json)
 *
 * Run:
 *   node preprocess-types.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ——— Config ————————————————————————————————————————————————
const MAX_SPECIES_ID = 1025;  // bump as new dex entries land
const SPECIES_API    = "https://pokeapi.co/api/v2/pokemon-species/";
const POKEMON_API    = "https://pokeapi.co/api/v2/pokemon/";
const DELAY_MS       = 60;    // polite throttle
const RETRIES        = 3;     // retry network hiccups
// ————————————————————————————————————————————————————————————

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const Cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

// Name normalizer: keep hyphens so your UI prettifier can do its thing
function normalizeName(s) {
  return Cap(String(s || "").trim());
}

async function httpJson(url, attempt = 1) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    if (attempt < RETRIES) {
      const backoff = 150 * Math.pow(2, attempt - 1);
      await sleep(backoff);
      return httpJson(url, attempt + 1);
    }
    throw e;
  }
}

function typesFromPokemonJson(poke) {
  return (poke.types || [])
    .sort((a, b) => (a?.slot ?? 99) - (b?.slot ?? 99))
    .map(t => Cap(t?.type?.name || "").replace(/-/g, " "));
}

async function fetchPokemonByNameOrId(nameOrId) {
  const data = await httpJson(POKEMON_API + nameOrId);
  return {
    id: data.id,
    name: normalizeName(data.name),
    types: typesFromPokemonJson(data),
  };
}

/**
 * Exclusion logic:
 * We exclude forms that are clearly Totem or cosmetic/event/caps/cosplay.
 * NOTE: Use substring checks; PokéAPI variety names are hyphenated slugs.
 */
const EXCLUDE_PATTERNS = [
  "totem",           // Totem Raticate, etc.
  "cap",             // pikachu-*-cap (original-cap, world-cap, etc.)
  "cosplay",         // pikachu-cosplay
  "spiky-eared",     // pichu-spiky-eared
  "eternal",         // floette-eternal
  // common cosplay/cap variants
  "rock-star", "pop-star", "phd", "belle", "libre", "original", "partner", "world"
];

// Some edge costumes have mixed naming; centralize the decision here.
function shouldExcludeForm(slugName) {
  const n = String(slugName || "").toLowerCase();
  return EXCLUDE_PATTERNS.some(p => n.includes(p));
}

/**
 * Build one species entry (base + filtered forms)
 */
async function buildSpeciesEntry(speciesId) {
  const species = await httpJson(SPECIES_API + speciesId);

  const varieties = Array.isArray(species.varieties) ? species.varieties : [];
  if (!varieties.length) {
    // Fallback: try fetching by id as a pokemon
    try {
      const base = await fetchPokemonByNameOrId(speciesId);
      return { id: base.id, name: base.name, types: base.types, forms: [] };
    } catch {
      throw new Error("No varieties and base fetch failed");
    }
  }

  const defVar  = varieties.find(v => v.is_default) || varieties[0];
  const defName = defVar?.pokemon?.name;
  if (!defName) throw new Error("Malformed species varieties");

  const base = await fetchPokemonByNameOrId(defName);

  const forms = [];
  for (const v of varieties) {
    const varName = v?.pokemon?.name;
    if (!varName) continue;
    if (v.is_default) continue; // skip base

    // Skip unwanted costumes/totems *before* doing the heavy fetch
    if (shouldExcludeForm(varName)) {
      await sleep(DELAY_MS);
      continue;
    }

    try {
      const f = await fetchPokemonByNameOrId(varName);

      // Extra safety: also exclude if the fetched proper name matches exclusion
      if (shouldExcludeForm(f.name)) {
        await sleep(DELAY_MS);
        continue;
      }

      // Only include if meaningfully distinct
      const sameId    = f.id === base.id;
      const sameName  = f.name.toLowerCase() === base.name.toLowerCase();
      const sameTypes = JSON.stringify(f.types) === JSON.stringify(base.types);
      if (!(sameId && sameName && sameTypes)) {
        forms.push({ id: f.id, name: f.name, types: f.types });
      }
    } catch {
      // Some forms 404; just skip
    }

    await sleep(DELAY_MS);
  }

  return forms.length
    ? { id: base.id, name: base.name, types: base.types, forms }
    : { id: base.id, name: base.name, types: base.types };
}

async function main() {
  const out = [];
  let ok = 0, skip = 0;

  console.log(`🔎 Building pokemon.db.json with filtered forms (species 1..${MAX_SPECIES_ID})`);

  for (let i = 1; i <= MAX_SPECIES_ID; i++) {
    try {
      const entry = await buildSpeciesEntry(i);
      out.push(entry);
      ok++;
      if (ok % 10 === 0) {
        console.log(`…built ${ok} species (latest base: #${entry.id} ${entry.name})`);
      }
    } catch {
      skip++;
    }
    if (i < MAX_SPECIES_ID) await sleep(DELAY_MS);
  }

  const dest = path.join(__dirname, "pokemon.db.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log(`✅ Saved ${out.length} species entries to:\n${dest}`);
  if (skip) console.log(`ℹ️ Skipped ${skip} species (gaps/HTTP errors).`);
}

main().catch(err => {
  console.error("💥 Failed to build pokemon.db.json:", err);
  process.exit(1);
});
