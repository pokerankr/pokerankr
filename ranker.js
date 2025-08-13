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
  if (btn) btn.disabled = history.length === 0;
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
    type: 'ranker', // used by index.html to route back to this page
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
      leftHistory
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
  if (gameOver) return;
  if (!current || !next) return;

  history.push(snapshotState());
  updateUndoButton();

  const prevLeft = current;
  const winner = (side === "left") ? current : next;
  const loser  = (side === "left") ? next    : current;

  loser.roundsSurvived  = loser.roundsSurvived  || 0;
  winner.roundsSurvived = (winner.roundsSurvived|| 0) + 1;
  eliminated.push(loser);

  if (key(winner) !== key(prevLeft)) leftHistory.push(winner);
  current = winner;

  if (remaining.length === 0){
    showWinner(winner);
    return;
  }
  next = remaining.pop();
  next.roundsSurvived = 0;

  displayMatchup();
  updateProgress();
  updateUndoButton();
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

  const champion   = leftHistory[leftHistory.length-1] || finalWinner;
  const runnerUp   = leftHistory[leftHistory.length-2] || null;
  const thirdPlace = leftHistory[leftHistory.length-3] || null;

  const top3 = new Set([key(champion), key(runnerUp), key(thirdPlace)]);
  const honorable = eliminated
    .filter(p => !top3.has(key(p)))
    .sort((a,b)=>{
      const d = (b.roundsSurvived||0) - (a.roundsSurvived||0);
      return d !== 0 ? d : eliminated.lastIndexOf(b) - eliminated.lastIndexOf(a);
    })[0] || null;

  const card = (title,p)=> p ? `
    <div class="pokemon-card compact-card">
      ${getImageTag(p.id, p.shiny)}
      <p>${displayName(p)}</p>
      <p class="rounds-text">Survived ${p.roundsSurvived||0} rounds</p>
      <p class="placement-tag">${title}</p>
    </div>` : "";

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
      <p class="rounds-text">Survived ${champion.roundsSurvived||0} rounds</p>
    </div>
    <div class="compact-grid">
      ${card("Runner-up",   runnerUp)}
      ${card("Third Place", thirdPlace)}
      ${card("Honorable Mention", honorable)}
    </div>
    <div class="button-group">
      <button onclick="restart()">Start Over</button>
      <button onclick="window.location.href='index.html'">Back to Menu</button>
      <button onclick="saveResults()">Save Results</button>
      <button onclick="exportRankingImage()">Export Image</button>
    </div>
  `;
  document.getElementById("result").style.display = "block";

  // kick off name fetches for visible finals (so UI labels update if needed)
  [champion, runnerUp, thirdPlace, honorable].filter(Boolean).forEach(m=>ensureName(m.id));
}

function saveResults(){
  const champion   = leftHistory[leftHistory.length-1];
  const runnerUp   = leftHistory[leftHistory.length-2] || null;
  const thirdPlace = leftHistory[leftHistory.length-3] || null;

  const top3Keys = new Set([key(champion), key(runnerUp), key(thirdPlace)]);
  const honorable = eliminated
    .filter(p => !top3Keys.has(key(p)))
    .sort((a,b)=>{
      const d = (b.roundsSurvived||0) - (a.roundsSurvived||0);
      return d !== 0 ? d : eliminated.lastIndexOf(b) - eliminated.lastIndexOf(a);
    })[0] || null;

  const pack = (p)=> p ? ({
    id: p.id, name: nameCache[p.id] || p.name || null,
    shiny: !!p.shiny, roundsSurvived: p.roundsSurvived||0
  }) : null;

  const g = window.rankConfig?.filters?.generation || 1;
  const category = `Gen ${g}`;
  const comboKey = `${category}_${!!window.includeShinies}_${!!window.shinyOnly}`;
  const nowIso = new Date().toISOString();

  let saved = [];
  try { saved = JSON.parse(localStorage.getItem("savedRankings") || "[]"); } catch {}
  saved = saved.filter(r => (r.key || r.id) !== comboKey);
  saved.push({
    key: comboKey,
    // v1.0.0: prefer lastModified; keep date for back-compat
    lastModified: nowIso,
    date: nowIso,
    category,
    includeShinies: !!window.includeShinies,
    shinyOnly: !!window.shinyOnly,
    champion:   pack(champion),
    runnerUp:   pack(runnerUp),
    thirdPlace: pack(thirdPlace),
    honorable:  pack(honorable)
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
  card=false, rounds
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

  let nameY, tagY, roundsY;

  if (card){
    const CARD_W = 280, CARD_H = 300;
    const cx = x - CARD_W/2, cy = y - CARD_H/2;

    // shadow + fill
    ctx.save();
    ctx.shadowColor = 'rgba(27,56,120,.15)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#ffffff';
    roundedPath(cx, cy, CARD_W, CARD_H, 22);
    ctx.fill();
    ctx.restore();

    // blue frame + inner outline
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#d2deff';
    roundedPath(cx, cy, CARD_W, CARD_H, 22);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#eef3ff';
    roundedPath(cx+3, cy+3, CARD_W-6, CARD_H-6, 18);
    ctx.stroke();

    // top-anchored sprite inside card
    const PAD_TOP = 18;
    const IMG_MAX_W = Math.min(maxW || 200, 200);
    const IMG_MAX_H = Math.min(maxH || 160, 160);
    if (bmp){
      const s = fitContain(bmp.width, bmp.height, IMG_MAX_W, IMG_MAX_H);
      const imgX = x - s.w/2;
      const imgY = cy + PAD_TOP;
      ctx.drawImage(bmp, imgX, imgY, s.w, s.h);
      nameY   = imgY + s.h + 18;
      tagY    = nameY + 28;
      roundsY = tagY  + 26;
    } else {
      nameY   = cy + 190;
      tagY    = nameY + 28;
      roundsY = tagY  + 26;
    }
  } else {
    // Champion (centered), text anchored to image bottom (with comfy gaps)
    let imgBottom = y;
    if (bmp){
      const s = fitContain(bmp.width, bmp.height, maxW, maxH);
      const imgX = x - s.w/2;
      const imgY = y - s.h/2;
      ctx.drawImage(bmp, imgX, imgY, s.w, s.h);
      imgBottom = imgY + s.h;
    }
    const GAP_NAME = 32, GAP_TAG = 30, GAP_ROUNDS = 26;
    nameY   = imgBottom + GAP_NAME;
    tagY    = nameY     + GAP_TAG;
    roundsY = tagY      + GAP_ROUNDS;
  }

  // Text
  ctx.textAlign = 'center';

  ctx.fillStyle = '#0d1b2a';
  ctx.font = mini ? '700 24px Poppins, sans-serif' : '800 32px Poppins, sans-serif';
  ctx.fillText(name, x, nameY);

  if (tag){
    ctx.fillStyle = '#ffb200';
    ctx.font = mini ? '800 20px Poppins, sans-serif' : '800 24px Poppins, sans-serif';
    ctx.fillText(tag, x, tagY);
  }

  if (typeof rounds === 'number'){
    ctx.fillStyle = '#5a6a8a';
    ctx.font = mini ? '700 18px Poppins, sans-serif' : '700 20px Poppins, sans-serif';
    ctx.fillText(`Survived ${rounds} rounds`, x, roundsY);
  }
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

  // Title uses Gen from rankConfig
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
    bmp: champBmp, name: displayNameCanvas(champion),
    x: size/2, y: champY, maxW: CHAMP_MAX, maxH: CHAMP_MAX,
    tag: '🏆 Champion', rounds: champion.roundsSurvived || 0
  });

  // Bottom row cards
  const rowY = 840;
  const slots = [
    runnerUp   ? { bmp: ruBmp,    name: displayNameCanvas(runnerUp),   tag: 'Runner-up',   rounds: runnerUp.roundsSurvived   || 0 } : null,
    thirdPlace ? { bmp: thirdBmp, name: displayNameCanvas(thirdPlace), tag: 'Third Place', rounds: thirdPlace.roundsSurvived || 0 } : null,
    honorable  ? { bmp: hmBmp,    name: displayNameCanvas(honorable),  tag: 'Hon. Mention',rounds: honorable.roundsSurvived  || 0 } : null,
  ].filter(Boolean);

  const total = slots.length;
  if (total > 0){
    const spacing = 300;
    const startX = size/2 - ((total - 1) * spacing)/2;
    for (let i=0;i<total;i++){
      const slot = slots[i];
      await drawMon(ctx, {
        bmp: slot.bmp, name: slot.name,
        x: startX + i*spacing, y: rowY,
        maxW: 200, maxH: 160,
        tag: slot.tag, mini:true, card:true,
        rounds: slot.rounds
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
  const lh = leftHistory || [];
  const champion   = lh[lh.length - 1] || finalWinner || null;
  const runnerUp   = lh[lh.length - 2] || null;
  const thirdPlace = lh[lh.length - 3] || null;

  if (!champion) return { champion:null, runnerUp:null, thirdPlace:null, honorable:null };

  const top3Keys = new Set([key(champion), key(runnerUp), key(thirdPlace)]);
  const honorable = eliminated
    .filter(p => !top3Keys.has(key(p)))
    .sort((a, b) => {
      const byRounds = (b.roundsSurvived || 0) - (a.roundsSurvived || 0);
      return byRounds !== 0 ? byRounds : eliminated.lastIndexOf(b) - eliminated.lastIndexOf(a);
    })[0] || null;

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

  // Restore state (reuse helper)
  restoreState({
    remaining:   s.state?.remaining   || [],
    eliminated:  s.state?.eliminated  || [],
    current:     s.state?.current     || null,
    next:        s.state?.next        || null,
    leftHistory: s.state?.leftHistory || [],
  });
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
