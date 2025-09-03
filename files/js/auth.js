// PokeRankr Authentication System
window.PokeRankrAuth = (function() {
  // Initialize Supabase
  const SUPABASE_URL = 'https://nfelacjsvcilwfrqiftm.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZWxhY2pzdmNpbHdmcnFpZnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDUxMzgsImV4cCI6MjA3MjIyMTEzOH0.sB-DDRwLGWxKksO9TCKf_7Tv3suDWxloYE0uEXpZ61w';
  
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  });

  // Track auth state
  let currentUser = null;
  let authInitialized = false;
  const authCallbacks = [];

  // Initialize auth listener
  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    authInitialized = true;
    
    // Store session info for persistence
    if (session) {
      localStorage.setItem('PR_AUTH_SESSION', JSON.stringify({
        userId: session.user.id,
        email: session.user.email,
        expiresAt: session.expires_at
      }));
    } else {
      localStorage.removeItem('PR_AUTH_SESSION');
    }
    
    // Notify all callbacks
    authCallbacks.forEach(cb => cb(currentUser));
  });

  // Check for existing session on load
  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;
    authInitialized = true;
    return currentUser;
  }

  // Public API
  return {
    supabase,
    
    async waitForAuth() {
      if (authInitialized) return currentUser;
      await checkSession();
      return currentUser;
    },

    onAuthChange(callback) {
      authCallbacks.push(callback);
      if (authInitialized) callback(currentUser);
    },

    getCurrentUser() {
      return currentUser;
    },

    async signUp(email, password) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      return { data, error };
    },

    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      return { data, error };
    },

    async signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (!error) {
    // Clear all game data on successful logout
    const gameDataKeys = [
      'PR_ACHIEVEMENTS',
      'PR_COMPLETIONS',
      'savedRankings',
      'PR_SAVE_SLOTS_V1',
      'pokeRankr.rankings',
      'rankConfig',
      'includeShinies',
      'shinyOnly',
      'category',
      'addPikaEevee',
      'includeStarterLines',
      'PR_PENDING_RESUME_SLOT'
    ];
    
    gameDataKeys.forEach(key => {
      localStorage.removeItem(key);
    });
  }
  
  return { error };
},
    isLoggedIn() {
      return !!currentUser;
    }
  };
})();