// data/preprocess.js
// Usage: node data/preprocess.js gen-names-from-pokeapi
// Output: data/names.en.min.json  (id -> "Display Name")

const fs = require('fs');
const path = require('path');

// --- fetch polyfill for Node < 18 ---
let fetchFn = global.fetch;
if (!fetchFn) {
  try {
    fetchFn = require('node-fetch');
  } catch {
    console.error('Node < 18 detected. Run: npm i node-fetch@3  (then re-run this script)');
    process.exit(1);
  }
}
const fetch = (...args) => fetchFn(...args);

const OUT_PATH = path.join(__dirname, 'names.en.min.json');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function titleizeSlug(slug) {
  return String(slug || '')
    .split('-')
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join('-');
}

// Turn common region/form slugs into nice labels
function friendlyFromSlug(slug) {
  const t = titleizeSlug(slug);

  // Regionals
  if (/-Alola$/i.test(t))    return t.replace(/-Alola$/i, ' (Alolan)');
  if (/-Galar$/i.test(t))    return t.replace(/-Galar$/i, ' (Galarian)');
  if (/-Hisui$/i.test(t))    return t.replace(/-Hisui$/i, ' (Hisuian)');
  if (/-Paldea$/i.test(t))   return t.replace(/-Paldea$/i, ' (Paldean)');

  // Form parentheticals (common cases)
  return t
    .replace(/-Pom-Pom$/i,   ' (Pom-Pom)')
    .replace(/-Baile$/i,     ' (Baile)')
    .replace(/-Pau$/i,       " (Pa'u)")
    .replace(/-Sensu$/i,     ' (Sensu)')
    .replace(/-Midday$/i,    ' (Midday)')
    .replace(/-Midnight$/i,  ' (Midnight)')
    .replace(/-Dusk$/i,      ' (Dusk)')
    .replace(/-Incarnate$/i, ' (Incarnate)')
    .replace(/-Therian$/i,   ' (Therian)')
    .replace(/-Altered$/i,   ' (Altered)')
    .replace(/-Origin$/i,    ' (Origin)')
    .replace(/-Ordinary$/i,  ' (Ordinary)')
    .replace(/-Zero$/i,      ' (Zero)')
    // Specific legendaries / edge cases
    .replace(/^Necrozma-Dusk$/i,  'Necrozma (Dusk Mane)')
    .replace(/^Necrozma-Dawn$/i,  'Necrozma (Dawn Wings)')
    .replace(/^Necrozma-Ultra$/i, 'Necrozma (Ultra)')
    .replace(/^Zygarde-50$/i,     'Zygarde (50%)')
    .replace(/^Deoxys-Normal$/i,  'Deoxys (Normal)');
}

async function fetchJson(url, {retries = 3, backoffMs = 300} = {}) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (res.status >= 500 || res.status === 429) {
      await sleep(backoffMs * (i + 1));
      continue;
    }
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  throw new Error(`Failed after ${retries} retries: ${url}`);
}

async function run() {
  console.log('Fetching full pokemon list...');
  const listUrl = 'https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0';
  const list = await fetchJson(listUrl);

  if (!list || !Array.isArray(list.results)) {
    throw new Error('Unexpected response for /pokemon list');
  }

  // /pokemon includes all forms; extract numeric ID from URL
  const entries = list.results.map(r => {
    const m = String(r.url).match(/\/pokemon\/(\d+)\/?$/);
    return m ? { id: parseInt(m[1], 10), slug: r.name } : null;
  }).filter(Boolean);

  // Build map id -> display name from slugs with friendly transforms
  const out = {};
  for (const e of entries) {
    out[e.id] = friendlyFromSlug(e.slug);
  }

  // Write file
  fs.writeFileSync(OUT_PATH, JSON.stringify(out), 'utf8');
  console.log(`Wrote ${OUT_PATH} with ${Object.keys(out).length} entries`);
}

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'gen-names-from-pokeapi') {
    run().catch(err => {
      console.error('Failed to generate names map:', err.message);
      process.exit(1);
    });
  } else {
    console.log('Usage: node data/preprocess.js gen-names-from-pokeapi');
  }
}
