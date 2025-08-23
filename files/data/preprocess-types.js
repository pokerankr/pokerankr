/**
 * Build a FULL pokemon.db.json for PokeRankr (with forms/varieties).
 * Output schema per species:
 * {
 *   id: <base species numeric id>,
 *   name: "Bulbasaur",
 *   types: ["Grass","Poison"],          // base (is_default form)
 *   forms: [                            // OPTIONAL; only if non-default varieties exist
 *     { id: <numeric id>, name: "Rotom-heat",   types: ["Electric","Fire"] },
 *     { id: <numeric id>, name: "Lycanroc-midnight", types: ["Rock"] },
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

// Name normalizer: keep slugs (your UI already prettifies many)
function normalizeName(s) {
  // Keep hyphens so your existing friendly-name logic can work.
  return Cap(String(s || "").trim());
}

async function httpJson(url, attempt = 1) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    if (attempt < RETRIES) {
      // backoff: 150ms, 400ms, 800ms…
      const backoff = 150 * Math.pow(2, attempt - 1);
      await sleep(backoff);
      return httpJson(url, attempt + 1);
    }
    throw e;
  }
}

function typesFromPokemonJson(poke) {
  // slots preserve order (1, then 2)
  return (poke.types || [])
    .sort((a, b) => (a?.slot ?? 99) - (b?.slot ?? 99))
    .map(t => Cap(t?.type?.name || "").replace(/-/g, " "));
}

async function fetchPokemonByNameOrId(nameOrId) {
  const data = await httpJson(POKEMON_API + nameOrId);
  return {
    id: data.id,
    name: normalizeName(data.name),    // keep slug; UI handles nice names
    types: typesFromPokemonJson(data),
  };
}

async function buildSpeciesEntry(speciesId) {
  // Species endpoint gives us the list of varieties (forms)
  const species = await httpJson(SPECIES_API + speciesId);

  // Some species are completely missing/unused; tolerate that
  const varieties = Array.isArray(species.varieties) ? species.varieties : [];
  if (!varieties.length) {
    // Fallback: try fetching pokemon by the same id as species id
    try {
      const base = await fetchPokemonByNameOrId(speciesId);
      return { id: base.id, name: base.name, types: base.types, forms: [] };
    } catch {
      throw new Error("No varieties and base fetch failed");
    }
  }

  // Identify default form (is_default = true)
  const defVar = varieties.find(v => v.is_default) || varieties[0];
  const defName = defVar?.pokemon?.name;
  if (!defName) throw new Error("Malformed species varieties");

  const base = await fetchPokemonByNameOrId(defName);

  // Gather all non-default varieties as form entries
  const forms = [];
  for (const v of varieties) {
    if (!v?.pokemon?.name) continue;
    if (v.is_default) continue; // skip base
    try {
      const f = await fetchPokemonByNameOrId(v.pokemon.name);
      // Only include if it’s truly distinct (different id OR different name OR different types)
      const sameId    = f.id === base.id;
      const sameName  = f.name.toLowerCase() === base.name.toLowerCase();
      const sameTypes = JSON.stringify(f.types) === JSON.stringify(base.types);
      if (!(sameId && sameName && sameTypes)) {
        forms.push({ id: f.id, name: f.name, types: f.types });
      }
    } catch (e) {
      // Some forms 404; just skip
      // console.warn(`Skip form ${v.pokemon.name}: ${e.message}`);
    }
    // politeness delay so we don't hammer the API
    await sleep(DELAY_MS);
  }

  // Some species’ “default” form isn’t the national dex id (rare). We still use speciesId as the top-level id
  // because your UI expects base species numeric id for official-artwork, and you handle variety artwork IDs separately.
  // However, to stay consistent with your current DB structure, use base.id as top-level id.
  return forms.length
    ? { id: base.id, name: base.name, types: base.types, forms }
    : { id: base.id, name: base.name, types: base.types };
}

async function main() {
  const out = [];
  let ok = 0, skip = 0;

  console.log(`🔎 Building pokemon.db.json with forms (species 1..${MAX_SPECIES_ID})`);

  for (let i = 1; i <= MAX_SPECIES_ID; i++) {
    try {
      const entry = await buildSpeciesEntry(i);
      out.push(entry);
      ok++;
      if (ok % 10 === 0) console.log(`…built ${ok} species (latest base: #${entry.id} ${entry.name})`);
    } catch (e) {
      skip++;
      // Many gaps/unused species IDs will 404; that’s fine.
      // console.warn(`Skip species ${i}: ${e.message}`);
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
