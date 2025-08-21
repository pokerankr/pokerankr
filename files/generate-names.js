// tools/generate-names.js
// Usage: node tools/generate-names.js
// Writes: data/names.en.min.json  (id -> Pretty English name)
// ~80KB gzipped for 1..1010. Safe to commit & serve with the site.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_PATH = path.join(__dirname, '..', 'data', 'names.en.min.json');

// Pretty-casing and form cleanup to match what the UI shows
function titleize(s){ return (s||'').split('-').map(w=>w? w[0].toUpperCase()+w.slice(1):w).join('-'); }
function normalizeFormHyphen(name){
  return String(name || '')
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
    .replace(/-Ordinary$/i, ' (Ordinary)')
    .replace(/^Zygarde-50$/i, 'Zygarde (50%)')
    .replace(/^Deoxys-Normal$/i, 'Deoxys (Normal)');
}

async function fetchName(id){
  const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`, { cache: 'no-store' });
  if (!r.ok) throw new Error('bad status');
  const j = await r.json();
  const pretty = normalizeFormHyphen(titleize(j?.name || ''));
  return pretty || String(id);
}

async function main(){
  const MAX_ID = 1025; // adjust as new gens arrive
  const out = {};
  const CONCURRENCY = 30;
  let i = 1;
  const queue = new Set();

  async function kick(){
    while (i <= MAX_ID && queue.size < CONCURRENCY){
      const id = i++;
      const p = fetchName(id)
        .then(name => { out[id] = name; })
        .catch(() => { out[id] = String(id); })
        .finally(() => queue.delete(p));
      queue.add(p);
    }
    if (queue.size) {
      await Promise.race(queue);
      return kick();
    }
  }
  await kick();

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out));
  console.log(`Wrote ${OUT_PATH} with ${Object.keys(out).length} entries.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
