// =========================
// PokéRankr — rankingEngine.js (v0 shell)
// Purpose: single shared engine API (no behavior yet)
// =========================

(function (global) {
  /**
   * Factory: returns an engine instance with a stable API.
   * For now, these are stubs that we’ll wire up gradually.
   */
  function createRankingEngine() {
    // internal placeholder state (we'll fill this in step-by-step)
    let _callbacks = {};
    let _seed = null;
    let _options = {};
    let _pool = [];

    return {
      // --- lifecycle ---
      init({ pool = [], options = {}, seed = null, callbacks = {} } = {}) {
        _pool = pool;
        _options = options;
        _seed = seed;
        _callbacks = callbacks || {};
        // No behavior yet; return instance for chaining
        return this;
      },

      // --- queries ---
      getState() {
        // Minimal placeholder so UI can call safely once we start integrating
        return {
          phase: "KOTH",        // "KOTH" | "RU" | "THIRD" | "DONE" (future)
          total: _pool.length,  // placeholder
          done: 0,              // placeholder
          currentMatch: null,   // {leftId, rightId} (future)
        };
      },

      // --- actions ---
      choose(/* side: 'left' | 'right' */) {
        // Will route to KOTH or post-phase pick later
        throw new Error("Engine.choose() not implemented (shell)");
      },
      undo() {
        throw new Error("Engine.undo() not implemented (shell)");
      },
      reset() {
        throw new Error("Engine.reset() not implemented (shell)");
      },

      // --- persistence ---
      serialize() {
        // Will return compact snapshot of state
        throw new Error("Engine.serialize() not implemented (shell)");
      },
      hydrate(/* snapshot */) {
        // Will restore state from snapshot
        throw new Error("Engine.hydrate() not implemented (shell)");
      },

      // --- results ---
      computeResults() {
        // Will return { champion, runnerUp, thirdPlace, honorable }
        throw new Error("Engine.computeResults() not implemented (shell)");
      },
    };
  }

  // Expose globally (no modules needed in current app setup)
  global.PokeRankrEngine = { create: createRankingEngine };
})(window);
