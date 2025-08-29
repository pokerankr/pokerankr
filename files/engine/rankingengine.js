// =========================
// PokéRankr — rankingEngine.js (Phased v2)
// Phases: KOTH → RU → THIRD → DONE
// Shared across categories (Starters, Gen 1/2, etc.)
// =========================

(function (global) {
  function createRankingEngine() {
    // ----- internal options / callbacks -----
    let _options = {};
    let _callbacks = {};
    let _seed = null;

    // ----- KOTH state -----
    let pool = [];
    let remaining = [];
    let eliminated = [];
    let current = null;
    let next = null;

    // tracking for results / seeding
    let leftHistory = [];
    let lostTo = Object.create(null);     // loserKey -> winnerKey
    let roundIndex = Object.create(null); // loserKey -> round number they lost
    let roundNum = 0;                     // main pass counter
    let gameOver = false;

    // ----- Phase machine -----
    // "KOTH" | "RU" | "THIRD" | "DONE"
    let phase = "KOTH";

    // post-phase (engine-owned; mirrored to UI when needed)
 const post = {
  phase: null,              // "RU" | "THIRD" | null
  currentRound: [],
  nextRound: [],
  index: 0,
  totalMatches: 0,
  doneMatches: 0,
  // NEW: fixed totals captured at bracket start
  ruTotal: 0,
  thirdTotal: 0,

  ruWins: 0,
  thirdWins: 0,
  runnerUp: null,
  third: null,
  // avoid RU Round-1 rematches in THIRD
  ruR1Pairs: new Set(),
  // per-mon bracket win counts
  ruWinsByMon: Object.create(null),
  thirdWinsByMon: Object.create(null),
  // single-step undo snapshot for post only
  lastSnap: null
};

// Single-step undo snapshot for KOTH
let kothLastSnap = null;

    // ----- helpers -----
    const monKey = (p) => p ? `${p.id}-${p.shiny ? 1 : 0}` : "";

    function cloneMon(p){ return p ? { ...p } : null; }
    function deepCopyArr(arr){ return arr.map(x => ({...x})); }
    function copyMapFrom(dest, src){
      for (const k in dest) delete dest[k];
      if (!src) return;
      for (const k in src) dest[k] = src[k];
    }

    // Compute total entrants currently alive in the post bracket (RU/THIRD)
function postAliveEntrantsCount() {
  const seen = new Set();
  const push = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const p of arr) if (p) seen.add(monKey(p));
  };
  push(post.currentRound);
  push(post.nextRound);
  return seen.size;
}


    function snapshot() {
      // Full snapshot (used both for UI sync and KOTH undo)
      return {
        // phase + core
        phase,
        total: pool.length,
        done: eliminated.length,
        currentMatch: (current && next) ? { leftId: current.id, rightId: next.id } : null,

        // KOTH
        pool: deepCopyArr(pool),
        remaining: deepCopyArr(remaining),
        eliminated: deepCopyArr(eliminated),
        current: cloneMon(current),
        next: cloneMon(next),
        leftHistory: deepCopyArr(leftHistory),
        lostTo: { ...lostTo },
        roundIndex: { ...roundIndex },
        roundNum,
        gameOver,

        // post
        post: {
        phase: post.phase,
        currentRound: deepCopyArr(post.currentRound),
        nextRound: deepCopyArr(post.nextRound),
        index: post.index,
        totalMatches: post.totalMatches,
        doneMatches: post.doneMatches,
        ruTotal: post.ruTotal,
        thirdTotal: post.thirdTotal,
        ruWins: post.ruWins,
        thirdWins: post.thirdWins,
        runnerUp: cloneMon(post.runnerUp),
        third: cloneMon(post.third),
        ruWinsByMon: { ...(post.ruWinsByMon || {}) },
        thirdWinsByMon: { ...(post.thirdWinsByMon || {}) },
        // NEW: persist RU Round-1 pairs
        ruR1Pairs: Array.from(post.ruR1Pairs || [])
        }
      };
    }

function restore(s) {
      phase = s.phase || "KOTH";

      pool = deepCopyArr(s.pool || []);
      remaining = deepCopyArr(s.remaining || []);
      eliminated = deepCopyArr(s.eliminated || []);
      current = cloneMon(s.current);
      next = cloneMon(s.next);

      leftHistory = deepCopyArr(s.leftHistory || []);
      lostTo = { ...(s.lostTo || {}) };
      roundIndex = { ...(s.roundIndex || {}) };
      roundNum = typeof s.roundNum === 'number' ? s.roundNum : 0;
      gameOver = !!s.gameOver;

      // post
      const P = s.post || {};
      post.phase = P.phase || null;
      post.currentRound = deepCopyArr(P.currentRound || []);
      post.nextRound    = deepCopyArr(P.nextRound || []);
      post.index        = typeof P.index === 'number' ? P.index : 0;
      post.totalMatches = typeof P.totalMatches === 'number' ? P.totalMatches : 0;
post.doneMatches  = typeof P.doneMatches  === 'number' ? P.doneMatches  : 0;
post.ruTotal      = typeof P.ruTotal      === 'number' ? P.ruTotal      : 0;
post.thirdTotal   = typeof P.thirdTotal   === 'number' ? P.thirdTotal   : 0;
post.ruWins       = typeof P.ruWins       === 'number' ? P.ruWins       : 0;
post.thirdWins    = typeof P.thirdWins    === 'number' ? P.thirdWins    : 0;
      post.runnerUp     = cloneMon(P.runnerUp);
      post.third        = cloneMon(P.third);
      post.ruWinsByMon    = { ...(P.ruWinsByMon || {}) };
post.thirdWinsByMon = { ...(P.thirdWinsByMon || {}) };
post.lastSnap = null;
// Keep (or hydrate) the RU Round-1 pairs
post.ruR1Pairs = new Set(Array.isArray(P.ruR1Pairs) ? P.ruR1Pairs : []);
// After hydrating state, ensure a visible pair if we’re in RU/THIRD
if ((post.phase === 'RU' || post.phase === 'THIRD') && (!current || !next)) {
  try { scheduleNextPostMatch(); } catch {}
}
}

    function emitMatchReady() {
      try { _callbacks.onMatchReady?.({ phase, current, next, roundNum }); } catch {}
    }
    function emitProgress() {
      try {
        const total = pool.length;
        const seen = (phase === "KOTH")
          ? (eliminated.length + 2)
          : (post.doneMatches);
        _callbacks.onProgress?.({ phase, total, seen, roundNum, post });
      } catch {}
    }
    function emitPhaseChange() {
      try { _callbacks.onPhaseChange?.({ phase, post }); } catch {}
    }

    // ---- seeding comparators (same semantics you used in starters.js) ----
    function seedCmp(a, b) {
      const sA = a?.roundsSurvived || 0, sB = b?.roundsSurvived || 0;
      if (sA !== sB) return sB - sA;
      const rA = roundIndex[monKey(a)] || 0, rB = roundIndex[monKey(b)] || 0;
      if (rA !== rB) return rB - rA;
      return String(a?.name||'').localeCompare(String(b?.name||''));
    }
    function thirdSeedCmp(a, b) {
      const wA = post.ruWinsByMon[monKey(a)] || 0;
      const wB = post.ruWinsByMon[monKey(b)] || 0;
      if (wA !== wB) return wB - wA;
      return seedCmp(a, b);
    }
    function pairKey(a, b) {
      const ak = monKey(a), bk = monKey(b);
      return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
    }

    // ---- build RU from KOTH outcomes ----
    function buildRunnerUpPool(champ) {
      const champKey = monKey(champ);
      // All mons who lost directly to champion
      const lostKeys = Object.keys(lostTo).filter(k => lostTo[k] === champKey);
      const list = lostKeys.map(k => {
        // find in remaining/current/next/eliminated
        if (current && monKey(current) === k) return current;
        if (next && monKey(next) === k) return next;
        const e = eliminated.find(p => monKey(p) === k);
        return e || null;
      }).filter(Boolean);

      // de-dup
      const seen = new Set();
      const out = [];
      for (const p of list) {
        const pk = monKey(p);
        if (seen.has(pk)) continue;
        seen.add(pk);
        out.push(p);
      }

      // Honorable mention candidate may join RU if not already included:
      // (highest unique survivals >0)
      const placedNow = new Set([champKey]);
      const hmPool = eliminated.filter(p => !placedNow.has(monKey(p))).sort(seedCmp);
      if (hmPool.length) {
        const top = hmPool[0];
        const topS = top?.roundsSurvived || 0;
        const tied = hmPool.filter(p => (p.roundsSurvived || 0) === topS);
        if (topS > 0 && tied.length === 1) {
          const hmKey = monKey(top);
          if (!out.some(p => monKey(p) === hmKey)) out.push(top);
        }
      }

      return out;
    }

    // ---- post-phase transitions ----
    function beginRunnerUp(champion) {
      phase = "RU";
      post.phase = "RU";
      post.ruWins = 0;
      post.ruWinsByMon = Object.create(null);
      post.lastSnap = null;

      const poolRU = buildRunnerUpPool(champion);
      if (poolRU.length === 0) {
        // edge: no RU bracket, pick next best
        post.runnerUp = [...eliminated].sort(seedCmp)[0] || null;
        return beginThird(champion);
      }
      if (poolRU.length === 1) {
        post.runnerUp = poolRU[0];
        return beginThird(champion);
      }

      // seed and form Round 1
      const seeded = [...poolRU].sort(seedCmp);
      post.nextRound = [];
      post.index = 0;

      let r1 = [...seeded];
      if (r1.length % 2 === 1) {
        const bye = r1.shift();
        post.nextRound.push(bye);
      }

      // record Round-1 pairs to avoid in THIRD
      post.currentRound = r1;

// Derive total from entrants actually alive in the bracket (handles byes)
{
  const entrants = postAliveEntrantsCount(); // currentRound + nextRound, unique
  post.totalMatches = Math.max(0, entrants - 1);
  post.doneMatches = 0;
}
post.ruTotal = post.totalMatches;

// put first match into current/next
scheduleNextPostMatch();
emitPhaseChange();

    }

    function beginThird(champion) {
      phase = "THIRD";
      post.phase = "THIRD";
      post.thirdWins = 0;
      post.thirdWinsByMon = Object.create(null);
      post.lastSnap = null;

      const champKey = monKey(champion);
      const ruKey = post.runnerUp ? monKey(post.runnerUp) : null;

      const lostToChamp = Object.keys(lostTo).filter(k => lostTo[k] === champKey);
      const lostToRunnerUp = ruKey ? Object.keys(lostTo).filter(k => lostTo[k] === ruKey) : [];

      const list = [
        ...lostToRunnerUp,
        ...lostToChamp.filter(k => k !== ruKey)
      ].map(k => {
        if (current && monKey(current) === k) return current;
        if (next && monKey(next) === k) return next;
        const e = eliminated.find(p => monKey(p) === k);
        return e || null;
      }).filter(Boolean);

      // remove champion / RU and duplicates
      const placed = new Set([champKey, ruKey].filter(Boolean));
      const seen = new Set(); const dedup = [];
      for (const p of list) {
        const pk = monKey(p);
        if (placed.has(pk) || seen.has(pk)) continue;
        seen.add(pk);
        dedup.push(p);
      }

      if (dedup.length === 0) {
        post.third = null;
        return finishToDone();
      }
      if (dedup.length === 1) {
        post.third = dedup[0];
        return finishToDone();
      }

      const seeded = dedup.sort(thirdSeedCmp);
      post.nextRound = [];
      post.index = 0;

      let r1 = seeded;
      if (r1.length % 2 === 1) {
        const bye = r1.shift();
        post.nextRound.push(bye);
      }

      // avoid RU Round-1 rematches in THIRD
post.currentRound = avoidRematch(r1, post.ruR1Pairs);

// Derive total from actual alive entrants (handles odd sizes & byes)
{
  const entrants = postAliveEntrantsCount();
  post.totalMatches = Math.max(0, entrants - 1);
  post.doneMatches = 0;
}
post.thirdTotal = post.totalMatches;

scheduleNextPostMatch();
emitPhaseChange();
    }

    function avoidRematch(sortedArr, avoidSet) {
      const arr = [...sortedArr];
      for (let i = 0; i < arr.length - 1; i += 2) {
        const a = arr[i], b = arr[i+1]; if (!b) break;
        if (avoidSet.has(pairKey(a,b))) {
          for (let j = i + 2; j < arr.length; j++) {
            if (!arr[j]) continue;
            if (!avoidSet.has(pairKey(a, arr[j]))) { [arr[i+1], arr[j]] = [arr[j], arr[i+1]]; break; }
          }
        }
      }
      return arr;
    }

    function scheduleNextPostMatch() {
      // advance rounds until we have a proper pair or a winner
      while (post.index >= post.currentRound.length) {
        if (post.nextRound.length <= 1) {
          const bracketWinner = post.nextRound[0] || post.currentRound[0] || null;
          if (post.phase === "RU") {
            post.runnerUp = bracketWinner;
            return beginThird(leftHistory[leftHistory.length - 1]);
          } else {
            post.third = bracketWinner;
            return finishToDone();
          }
        }
        // reseed each round
        let seededNext = (post.phase === "THIRD")
          ? post.nextRound.sort(thirdSeedCmp)
          : post.nextRound.sort(seedCmp);

        post.nextRound = [];
        post.index = 0;

        if (seededNext.length % 2 === 1) {
          const byeTop = seededNext.shift();
          post.nextRound.push(byeTop);
        }
        post.currentRound = seededNext;
      }

      const i = post.index;
      const a = post.currentRound[i];
      const b = post.currentRound[i + 1];

      // auto-advance identical pair
      if (a && b && monKey(a) === monKey(b)) {
        post.nextRound.push(a);
        post.index += 2;
        return scheduleNextPostMatch();
      }

      if (!b) {
        // bye
        post.nextRound.push(a);
        post.index += 2;
        return scheduleNextPostMatch();
      }

      // render via core slots
      current = a;
      next = b;
      emitMatchReady();
      emitProgress();
    }

    function finishToDone() {
      phase = "DONE";
      post.phase = null;
      current = leftHistory[leftHistory.length - 1] || current;
      next = null;
      gameOver = true;
      emitPhaseChange();
      emitProgress();
      _callbacks.onResults?.(this.computeResults());
    }

   function chooseKoth(side) {
  if (!current || !next) return;
  
  kothLastSnap = snapshot();
  
  const winner = (side === "left") ? current : next;
  const loser = (side === "left") ? next : current;
  
  // Make sure this line exists and is working:
  winner.roundsSurvived = (winner.roundsSurvived || 0) + 1;

      const lKey = monKey(loser);
      const wKey = monKey(winner);
      lostTo[lKey] = wKey;
      roundIndex[lKey] = roundNum + 1;

      eliminated.push(loser);
      current = winner;
      next = remaining.pop() || null;

      if (leftHistory.length === 0 || monKey(leftHistory[leftHistory.length - 1]) !== monKey(winner)) {
        leftHistory.push({ ...winner });
      }

      roundNum += 1;

      if (!next && remaining.length === 0) {
        // Transition to RU
        const champion = current;
        beginRunnerUp(champion);
        return;
      }

      emitMatchReady();
      emitProgress();
    }

    function postSaveSnapshot() {
      post.lastSnap = snapshot();
    }
    function postUndoToSnapshot() {
      if (!post.lastSnap) return;
      restore(post.lastSnap);
      post.lastSnap = null;
      emitMatchReady();
      emitProgress();
    }

    // ----- public api -----
    return {
      init({ pool: _pool = [], options = {}, seed = null, callbacks = {} } = {}) {
        _options = options || {};
        _seed = seed || null;
        _callbacks = callbacks || {};

        // initialize KOTH containers (UI will hydrate shortly)
        pool = deepCopyArr(_pool);
        remaining = [];
        eliminated = [];
        current = null; next = null;
        leftHistory = [];
        lostTo = Object.create(null);
        roundIndex = Object.create(null);
        roundNum = 0; gameOver = false; phase = "KOTH";

        return this;
      },

      hydrate({ state } = {}) {
        if (!state) return this;

        // If a KOTH-only state came from caller, accept it and start from there
        restore({
          phase: state.phase || "KOTH",
          pool: pool.length ? pool : (state.pool || pool),
          remaining: state.remaining,
          eliminated: state.eliminated,
          current: state.current,
          next: state.next,
          leftHistory: state.leftHistory,
          lostTo: state.lostTo,
          roundIndex: state.roundIndex,
          roundNum: state.roundNum,
          gameOver: !!state.gameOver,
          post: state.post || null
        });

        if (current && leftHistory.length === 0) leftHistory.push({ ...current });
        if (!current && !next && remaining.length === 0) gameOver = true;

        emitMatchReady();
        emitProgress();
        return this;
      },

      getState() { return snapshot(); },

      choose(side /* 'left' | 'right' */) {
        if (phase === "DONE") return snapshot();

        if (phase === "KOTH") {
          chooseKoth(side);
          return snapshot();
        }

        // RU / THIRD
        if (!current || !next) return snapshot();
        postSaveSnapshot();

        const winner = (side === 'left') ? current : next;
        const wKey = monKey(winner);

        if (phase === "RU") {
          post.ruWins += 1;
          post.ruWinsByMon[wKey] = (post.ruWinsByMon[wKey] || 0) + 1;
        } else if (phase === "THIRD") {
          post.thirdWins += 1;
          post.thirdWinsByMon[wKey] = (post.thirdWinsByMon[wKey] || 0) + 1;
        }

        post.doneMatches += 1;
        post.nextRound.push(winner);
        post.index += 2;

        scheduleNextPostMatch();
        emitProgress();
        return snapshot();
      },

      undo() {
        // AFTER
      if (phase === "KOTH") {
        if (!kothLastSnap) return null;  // no-op: nothing to undo
        const prev = kothLastSnap;
        kothLastSnap = null;             // consume the one-step snapshot
        restore(prev);
        emitMatchReady();
        emitProgress();
        return snapshot();
      }


        // RU/THIRD single-step
        postUndoToSnapshot();
        return snapshot();
      },

      reset() {
        pool = [];
        remaining = [];
        eliminated = [];
        current = null; next = null;
        leftHistory = [];
        lostTo = Object.create(null);
        roundIndex = Object.create(null);
        roundNum = 0; gameOver = false;
        phase = "KOTH";

        post.phase = null;
        post.currentRound = [];
        post.nextRound = [];
        post.index = 0;
        post.totalMatches = 0;
        post.doneMatches = 0;
        post.ruTotal = 0;
        post.thirdTotal = 0;
        post.ruWins = 0;
        post.thirdWins = 0; 
        post.runnerUp = null;
        post.third = null;
        post.ruWinsByMon = Object.create(null);
        post.thirdWinsByMon = Object.create(null);
        post.lastSnap = null;
        post.ruR1Pairs.clear();

        // AFTER (end of reset)
        kothLastSnap = null;
        emitMatchReady();
        emitProgress();
        return this;
      },

      serialize() { return snapshot(); },
      hydrateSnapshot(snap) {
  restore(snap || {});
  // If resuming in RU/THIRD with no visible pair yet, schedule one now.
  if (phase !== "KOTH" && (!current || !next)) {
    scheduleNextPostMatch(); // will emit match + progress
  } else {
    emitMatchReady();
    emitProgress();
  }
  return this;
},

      // Optional: engine-native results (Starters already has computeResults; you can keep using that)
      computeResults() {
        const champion = leftHistory[leftHistory.length - 1] || current || null;
        return {
          champion,
          runnerUp: post.runnerUp || null,
          thirdPlace: post.third || null,
          honorable: null // let file-level computeResults decide HM using your rules
        };
      }
    };
  }

  global.PokeRankrEngine = { create: createRankingEngine };
})(window);
