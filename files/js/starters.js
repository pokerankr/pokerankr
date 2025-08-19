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

// ----- Preferences
const includeShinies = localStorage.getItem("includeShinies") === "true";
const shinyOnly      = localStorage.getItem("shinyOnly") === "true";

// ----- Build pool
let pool = [];
if (shinyOnly) {
  pool = baseStarters.map(p => ({ ...p, shiny: true }));
} else if (includeShinies) {
  pool = [
    ...baseStarters.map(p => ({ ...p, shiny: false })),
    ...baseStarters.map(p => ({ ...p, shiny: true }))
  ];
} else {
  pool = baseStarters.map(p => ({ ...p, shiny: false }));
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
    data-step="0"
    data-fallbacks='${fallbacks}'
    onload="this.style.visibility='visible'"
    onerror=" … "
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
function writeSlots(slots) {
  localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(slots));
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
  return `Starters – ${shinyOnly ? 'Shinies Only' : includeShinies ? 'Include Shinies' : 'No Shinies'}`;
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

// Per-Pokémon total bracket wins (for THIRD seeding)
const bracketWinsByMon = Object.create(null); // monKey -> count

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

      // (optional) keeps future seeding parity consistent if you use it elsewhere
      bracketWinsByMon: { ...(bracketWinsByMon || {}) },

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
      writeSlots(slots);
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
  writeSlots(slots);
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

  // keep THIRD seeding stable after resume
  for (const k of Object.keys(bracketWinsByMon)) delete bracketWinsByMon[k];
  Object.assign(
    bracketWinsByMon,
    s?.state?.bracketWinsByMon || post.ruWinsByMon || {}
  );

  // 3) Render — NEVER call engine internals like scheduleNextPostMatch() here unless needed to build a missing pair
  const resultBox = document.getElementById("result");
  if (resultBox) resultBox.style.display = "none";

  if (isInPost()) {
    // Normalize to an even index and ensure we have a pair to show
    if (Number.isFinite(post.index)) post.index -= (post.index % 2);

    const needsScheduling =
      !current || !next ||
      post.index >= post.currentRound.length ||
      !post.currentRound[post.index + 1];

    if (needsScheduling) {
      scheduleNextPostMatch();     // schedules + renders + updates progress/undo
    } else {
      displayMatchup();
      updatePostProgress();
      updateUndoButton();
    }
    return;
  }

  // KOTH-only: if nothing is on screen and nothing remains, go to RU
  if (!current && remaining.length === 0 && pool.length > 0) {
    startRunnerUpBracket(null);
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

// --- UNDO state ---
let history = [];
function snapshotState() {
  return {
    remaining: remaining.map(p => ({ ...p })),
    eliminated: eliminated.map(p => ({ ...p })),
    current: current ? { ...current } : null,
    next: next ? { ...next } : null,
    leftHistory: leftHistory.map(p => ({ ...p })),
  };
}
function restoreState(s) {
  remaining  = s.remaining.map(p => ({ ...p }));
  eliminated = s.eliminated.map(p => ({ ...p }));
  current    = s.current ? { ...s.current } : null;
  next       = s.next ? { ...s.next } : null;

  leftHistory.length = 0;
  leftHistory.push(...s.leftHistory.map(p => ({ ...p })));
  // Sync the engine to this save (so choose/undo work correctly)
  try {
    if (window.prEngine && typeof prEngine.restore === 'function') {
      prEngine.restore({
        // Derive engine phase (KOTH/RU/THIRD) from the saved postMode/phase
        phase: (s.state?.postMode && s.state?.post?.phase) ? s.state.post.phase : 'KOTH',

        pool:        (s.state?.pool || []).map(x => ({ ...x })),
        remaining:   (s.state?.remaining || []).map(x => ({ ...x })),
        eliminated:  (s.state?.eliminated || []).map(x => ({ ...x })),
        current:      s.state?.current ? { ...s.state.current } : null,
        next:         s.state?.next    ? { ...s.state.next }    : null,
        leftHistory: (s.state?.leftHistory || []).map(x => ({ ...x })),
        lostTo:      { ...(s.state?.lostTo || {}) },
        roundIndex:  { ...(s.state?.roundIndex || {}) },
        roundNum:     typeof s.state?.roundNum === 'number' ? s.state.roundNum : 0,
        gameOver:     false,

        post: {
          phase: s.state?.post?.phase || null,
          currentRound: Array.isArray(s.state?.post?.currentRound) ? s.state.post.currentRound.map(x => ({ ...x })) : [],
          nextRound:    Array.isArray(s.state?.post?.nextRound)    ? s.state.post.nextRound.map(x => ({ ...x }))    : [],
          index:        typeof s.state?.post?.index        === 'number' ? s.state.post.index        : 0,
          totalMatches: typeof s.state?.post?.totalMatches === 'number' ? s.state.post.totalMatches : 0,
          doneMatches:  typeof s.state?.post?.doneMatches  === 'number' ? s.state.post.doneMatches  : 0,
          ruTotal:      typeof s.state?.post?.ruTotal      === 'number' ? s.state.post.ruTotal      : 0,
          thirdTotal:   typeof s.state?.post?.thirdTotal   === 'number' ? s.state.post.thirdTotal   : 0,
          ruWins:       typeof s.state?.post?.ruWins       === 'number' ? s.state.post.ruWins       : 0,
          thirdWins:    typeof s.state?.post?.thirdWins    === 'number' ? s.state.post.thirdWins    : 0,
          runnerUp:     s.state?.post?.runnerUp ? { ...s.state.post.runnerUp } : null,
          third:        s.state?.post?.third    ? { ...s.state.post.third }    : null,
          ruWinsByMon:  { ...(s.state?.post?.ruWinsByMon || {}) },
          thirdWinsByMon: { ...(s.state?.post?.thirdWinsByMon || {}) }
        }
      });
    }
  } catch (e) {
    console.warn('Engine restore failed (continuing anyway):', e);
  }

  displayMatchup();
  updateProgress();
  updateUndoButton();
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
function labelHTML(p){
  const text = p.name ? (p.shiny ? `⭐ ${p.name}` : p.name) : "";
  return `<p>${text || "&nbsp;"}</p>`;
}

// Track what’s currently shown on each side so we don’t re-render unnecessarily
let _prevLeftKey = '';
let _prevRightKey = '';

function _monKeyForSide(p){ return p ? `${p.id}-${p.shiny?1:0}` : ''; }

// Ensure a side container has an <img> + <p>, then update only if the mon changed
function buildOrUpdateSide(sideId, mon){
  const container = document.getElementById(sideId);
  if (!container) return;

  // create once (now with a square wrapper to prevent layout shift)
  let img = container.querySelector('img[data-role="poke"]');
  let nameP = container.querySelector('p[data-role="label"]');
  if (!img) {
    // clear any old junk
    container.innerHTML = '';

    // square wrapper reserves space immediately (CSS uses aspect-ratio)
    const wrap = document.createElement('div');
    wrap.className = 'matchup-img-wrap';

    img = document.createElement('img');
    img.setAttribute('data-role', 'poke');
    img.setAttribute('width', '256');
    img.setAttribute('height', '256');
    img.style.visibility = 'hidden'; // will show onload
    wrap.appendChild(img);
    container.appendChild(wrap);

    nameP = document.createElement('p');
    nameP.setAttribute('data-role', 'label');
    container.appendChild(nameP);
  }

  const key = _monKeyForSide(mon);
  const isLeft = (sideId === 'left');
  const prevKey = isLeft ? _prevLeftKey : _prevRightKey;

  // Name text updates are cheap—always keep them in sync
  nameP.textContent = (mon.shiny ? '⭐ ' : '') + (mon.name || '');

  // If same mon as before, do nothing else (prevents flash)
  if (key === prevKey) {
    img.style.visibility = 'visible';
    return;
  }

  // New mon → (re)wire fallback chain & load
  const chain = spriteUrlChain(mon.id, !!mon.shiny);
  const first = chain[0];
  const fallbacks = chain.slice(1);

  img.style.visibility = 'hidden';
  img.dataset.step = '0';
  img.dataset.fallbacks = JSON.stringify(fallbacks);

  img.onload = () => { img.style.visibility = 'visible'; };
  img.onerror = () => {
    try {
      img.style.visibility = 'hidden';
      const steps = JSON.parse(img.dataset.fallbacks || '[]');
      let i = parseInt(img.dataset.step || '0', 10);
      if (i < steps.length) {
        img.dataset.step = String(++i);
        img.src = steps[i-1];
      } else {
        img.onerror = null; // give up
      }
    } catch {
      img.onerror = null;
    }
  };

  img.src = first;

  if (isLeft) _prevLeftKey = key; else _prevRightKey = key;
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

  buildOrUpdateSide('left',  current);
  buildOrUpdateSide('right', next);
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

  if (inPost) {
    // RU/THIRD: create our local one-step snapshot so the Undo button enables immediately
    postSaveLastSnapshot();
  } else {
    // KOTH: arm single-step undo for exactly one revert
    kothLastSnap = true;
  }
  updateUndoButton();

  const state = prEngine.choose(side === 'left' ? 'left' : 'right');
  if (!state) return;

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

// Helpers to pluck mons by key
function findByKey(key){
  if (!key) return null;
  if (current && monKey(current) === key) return current;
  if (next && monKey(next) === key) return next;
  const e = eliminated.find(p => monKey(p) === key);
  return e || null;
}

function pairKey(a, b) {
  const ak = monKey(a), bk = monKey(b);
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
}

function startRunnerUpBracket(finalChampion){
  updateUndoButton();

  // Enter RU bracket
  postMode = 'RU';
  post.phase = 'RU';

  post.ruWins = 0;
  post.ruWinsByMon = Object.create(null);
  post.lastSnap = null;
  updateUndoButton();

  const champKey = monKey(finalChampion);

  // Everyone who lost directly to the champion
  const lostKeys = Object.keys(lostTo).filter(k => lostTo[k] === champKey);
  let poolRU = lostKeys.map(findByKey).filter(Boolean);

  // De-dupe
  {
    const seen = new Set();
    poolRU = poolRU.filter(p => {
      const k = monKey(p);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  // Honorable Mention candidate (highest unique survivals > 0)
  const placedNow = new Set([champKey]);
  const hmPool = eliminated.filter(p => !placedNow.has(monKey(p)));
  hmPool.sort(seedCmp);

  let hmCandidate = null;
  if (hmPool.length) {
    const top = hmPool[0];
    const topSurvivals = (top?.roundsSurvived || 0);
    const tiedForTop = hmPool.filter(p => (p.roundsSurvived || 0) === topSurvivals);
    if (topSurvivals > 0 && tiedForTop.length === 1) hmCandidate = top;
  }
  if (hmCandidate) {
    const hmKey = monKey(hmCandidate);
    const inRU = poolRU.some(p => monKey(p) === hmKey);
    if (!inRU) poolRU.push(hmCandidate);
  }

  post.totalMatches = Math.max(0, poolRU.length - 1);
  post.doneMatches  = 0;
  post.thirdWins = 0;

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

  // If odd, top seed gets a bye into next round
  let round1List = [...seededRU];
  if (round1List.length % 2 === 1) {
    const bye = round1List.shift();
    post.nextRound.push(bye);
  }

  // Build Round 1 pairs (1 vs N, 2 vs N-1, ...)
  post.currentRound = round1List;

  // Record RU Round-1 pairs to avoid rematches in Third bracket
  post.ruR1Pairs.clear();
  for (let i = 0; i < post.currentRound.length; i += 2) {
    const a = post.currentRound[i];
    const b = post.currentRound[i + 1];
    if (b) post.ruR1Pairs.add(pairKey(a, b));
  }

  updatePostProgress();
  scheduleNextPostMatch();
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

function startThirdBracket(finalChampion){
  postMode = 'THIRD';
  post.phase = 'THIRD';
  post.thirdWins = 0;
  post.thirdWinsByMon = Object.create(null);
  // Clear snapshot so Undo is disabled (faded) at THIRD start.
  post.lastSnap = null;
  updateUndoButton();

  post.thirdWins = 0;
  post.thirdWinsByMon = Object.create(null);

  const champKey = monKey(finalChampion);
  const ruKey = post.runnerUp ? monKey(post.runnerUp) : null;

  const lostToChampKeys = Object.keys(lostTo).filter(k => lostTo[k] === champKey);
  const lostToChampList = lostToChampKeys.map(findByKey).filter(Boolean);

  const lostToRunnerUp = ruKey
    ? Object.keys(lostTo).filter(k => lostTo[k] === ruKey).map(findByKey).filter(Boolean)
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

  const seeded = dedup.sort(thirdSeedCmp);

  post.nextRound = [];
  post.index = 0;

  let round1List = seeded;
  if (seeded.length % 2 === 1) {
    const bye = round1List.shift();
    post.nextRound.push(bye);
  }

  // Avoid RU Round-1 rematches
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
        // Do NOT keep a boundary snapshot — THIRD should start with Undo disabled
        return startThirdBracket(leftHistory[leftHistory.length - 1]);
      } else {
        post.third = bracketWinner;
        return finishToResults(leftHistory[leftHistory.length - 1]);
      }
    }

    // Reseed each round
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
  updateUndoButton();
}

function handlePostPick(side){
  // Save snapshot BEFORE mutation so Undo rolls back one step
  if (isInPost()) {
    postSaveLastSnapshot();
    updateUndoButton();
  }

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
  updateUndoButton();
}

function finishToResults(finalChampion){
  showWinner(finalChampion);
}

// ----- Results (page UI)
function showWinner(finalWinner) {
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

  const category = "Starters";
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
    alert(`Saved! Your ${category} ranking (${shinyOnly ? "shiny only" : includeShinies ? "+ shinies" : "no shinies"}) has been updated.`);
  } catch (e) {
    console.error(e);
    alert("Could not save rankings (storage might be full or blocked).");
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

// Optional: expose resume helper globally if we decide to deep-link
window._PR_loadStarterSession = loadStarterSession;

function goToMainMenu(){
  // Consider it "in progress" if you’ve done anything beyond the initial state
  const atStart =
    eliminated.length === 0 &&
    !isInPost() &&
    history.length === 0 &&
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
        return;
      }
    }
  } catch {}
  // No pending resume → render current phase correctly
  displayMatchup();
  (isInPost() ? updatePostProgress() : updateProgress());
  updateUndoButton();
});
