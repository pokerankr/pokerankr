// PokeRankr Data Sync Service
window.PokeRankrSync = (function() {
  const auth = window.PokeRankrAuth;
  
  // Sync status tracking
  let syncInProgress = false;
  let lastSyncTime = null;
  
  // Helper to get current user
  async function getCurrentUserId() {
    const user = auth.getCurrentUser();
    return user?.id || null;
  }

  // --- helpers for saved rankings ---
function buildRankingKey(r) {
  return r?.key || `${r?.category || 'Unknown'}_${!!r?.includeShinies}_${!!r?.shinyOnly}`;
}
function normalizeSavedRankings(list) {
  return (list || []).map(r => ({
    ...r,
    key: buildRankingKey(r),
    date: r?.date || r?.lastModified || new Date().toISOString()
  }));
}

/**
 * Overwrite the cloud copy of saved rankings for this user and keep local in sync.
 * This makes deletes "stick" across sessions/devices.
 */
async function overwriteSavedRankings(newList) {
  const userId = await getCurrentUserId();

  // Normalize + persist locally first
  const rankings = normalizeSavedRankings(newList);
  localStorage.setItem('savedRankings', JSON.stringify(rankings));

  // If not logged in, we’re done (local-only mode)
  if (!userId) {
    console.log('Saved rankings updated locally (not logged in).');
    return;
  }

  const payload = {
    user_id: userId,
    rankings,
    updated_at: new Date().toISOString()
  };

  const { error } = await auth.supabase
    .from('user_saved_rankings')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    console.error('Cloud overwrite for saved rankings failed:', error);
    throw error;
  }
  console.log(`Cloud overwrite OK: ${rankings.length} ranking(s).`);
}

  
  // Sync local data to Supabase when user logs in
  async function syncLocalToCloud() {
    const userId = await getCurrentUserId();
    if (!userId || syncInProgress) return;
    
    syncInProgress = true;
    console.log('Starting sync to cloud...');
    
    try {
      // 1. Sync Achievements
      const localAchievements = JSON.parse(localStorage.getItem('PR_ACHIEVEMENTS') || '{}');
      if (Object.keys(localAchievements).length > 0) {
        const { data: existingAch } = await auth.supabase
          .from('user_achievements')
          .select('achievements')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (existingAch) {
          // Merge with existing
          const merged = { ...existingAch.achievements, ...localAchievements };
          await auth.supabase
            .from('user_achievements')
            .update({ achievements: merged, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        } else {
          // Create new
          await auth.supabase
            .from('user_achievements')
            .insert({ user_id: userId, achievements: localAchievements });
        }
      }
      
      // 2. Sync Completions
      const localCompletions = JSON.parse(localStorage.getItem('PR_COMPLETIONS') || '[]');
      if (localCompletions.length > 0) {
        const { data: existingComp } = await auth.supabase
          .from('user_completions')
          .select('completions')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (existingComp) {
          // Merge arrays, avoiding duplicates
          const merged = [...existingComp.completions];
          localCompletions.forEach(lc => {
            const exists = merged.some(mc => 
              mc.date === lc.date && mc.category === lc.category
            );
            if (!exists) merged.push(lc);
          });
          
          await auth.supabase
            .from('user_completions')
            .update({ completions: merged, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        } else {
          await auth.supabase
            .from('user_completions')
            .insert({ user_id: userId, completions: localCompletions });
        }
      }
      
// 3. Sync Save Slots - Smart merge that uses all available slots
const localSlots = JSON.parse(localStorage.getItem('PR_SAVE_SLOTS_V1') || '[]');
const { data: existingSlots } = await auth.supabase
  .from('user_save_slots')
  .select('slots')
  .eq('user_id', userId)
  .maybeSingle();

// Collect all non-null slots from both sources
const allSlots = [];

// Add cloud slots
if (existingSlots?.slots) {
  existingSlots.slots.forEach(slot => {
    if (slot) allSlots.push(slot);
  });
}

// Add local slots
localSlots.forEach(slot => {
  if (slot) allSlots.push(slot);
});

// Remove duplicates (same matchup at same time)
const uniqueSlots = allSlots.filter((slot, index, self) => {
  return index === self.findIndex(s => 
    s.meta?.savedAt === slot.meta?.savedAt &&
    s.currentMatchup?.a?.id === slot.currentMatchup?.a?.id &&
    s.currentMatchup?.b?.id === slot.currentMatchup?.b?.id
  );
});

// Sort by newest first
uniqueSlots.sort((a, b) => {
  const aTime = new Date(a.meta?.savedAt || 0).getTime();
  const bTime = new Date(b.meta?.savedAt || 0).getTime();
  return bTime - aTime;
});

// Take the 3 newest and arrange them in slots
const finalSlots = [null, null, null];
for (let i = 0; i < Math.min(3, uniqueSlots.length); i++) {
  finalSlots[i] = uniqueSlots[i];
}

// Save to cloud
if (existingSlots) {
  await auth.supabase
    .from('user_save_slots')
    .update({ slots: finalSlots, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
} else {
  await auth.supabase
    .from('user_save_slots')
    .insert({ user_id: userId, slots: finalSlots });
}
      
      // 4. Sync Saved Rankings (robust upsert + visible errors)
const localRankings = JSON.parse(localStorage.getItem('savedRankings') || '[]');

// Normalize: make sure every ranking has a stable key and timestamp
const normed = localRankings.map(r => ({
  ...r,
  key: r?.key || `${r?.category || 'Unknown'}_${!!r?.includeShinies}_${!!r?.shinyOnly}`,
  date: r?.date || r?.lastModified || new Date().toISOString()
}));

// Pull existing cloud copy (ok if it doesn't exist yet)
const { data: existing, error: fetchErr } = await auth.supabase
  .from('user_saved_rankings')
  .select('rankings')
  .eq('user_id', userId)
  .maybeSingle();

if (fetchErr) throw fetchErr;

// Merge newest-per-key across cloud + local
const byKey = {};
(existing?.rankings || []).forEach(r => {
  const k = r?.key || `${r?.category || 'Unknown'}_${!!r?.includeShinies}_${!!r?.shinyOnly}`;
  byKey[k] = r;
});
normed.forEach(r => {
  const k = r.key;
  if (!byKey[k] || new Date(r.date) > new Date(byKey[k].date)) {
    byKey[k] = r;
  }
});

// Upsert on user_id so we don't need to branch update/insert
const payload = {
  user_id: userId,
  rankings: Object.values(byKey),
  updated_at: new Date().toISOString()
};

const { error: upsertErr } = await auth.supabase
  .from('user_saved_rankings')
  .upsert(payload, { onConflict: 'user_id' });

if (upsertErr) {
  console.error('Saved Rankings sync failed:', upsertErr);
  alert(`Saved Rankings sync failed: ${upsertErr.message}`);
  throw upsertErr; // let outer catch log too
}

console.log(`Synced ${payload.rankings.length} ranking(s) to cloud`);

      
      console.log('Sync to cloud complete!');
      lastSyncTime = new Date();
      
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      syncInProgress = false;
    }
  }
  
  // Load cloud data to local
  async function syncCloudToLocal() {
    const userId = await getCurrentUserId();
    if (!userId) return;
    
    console.log('Loading data from cloud...');
    
    try {
      // Load all user data
      const [achResult, compResult, slotsResult, rankResult] = await Promise.all([
        auth.supabase.from('user_achievements').select('achievements').eq('user_id', userId).maybeSingle(),
        auth.supabase.from('user_completions').select('completions').eq('user_id', userId).maybeSingle(),
        auth.supabase.from('user_save_slots').select('slots').eq('user_id', userId).maybeSingle(),
        auth.supabase.from('user_saved_rankings').select('rankings').eq('user_id', userId).maybeSingle()
      ]);
      
      // Update local storage with cloud data
      if (achResult.data?.achievements) {
        const local = JSON.parse(localStorage.getItem('PR_ACHIEVEMENTS') || '{}');
        const merged = { ...achResult.data.achievements, ...local };
        localStorage.setItem('PR_ACHIEVEMENTS', JSON.stringify(merged));
      }
      
      if (compResult.data?.completions) {
        const local = JSON.parse(localStorage.getItem('PR_COMPLETIONS') || '[]');
        const merged = [...compResult.data.completions, ...local];
        // Remove duplicates
        const unique = merged.filter((item, index, self) =>
          index === self.findIndex((t) => t.date === item.date && t.category === item.category)
        );
        localStorage.setItem('PR_COMPLETIONS', JSON.stringify(unique));
      }
      
      if (slotsResult.data?.slots) {
  // For save slots, don't overwrite if we have local data
  // This prevents cloud from overwriting recent local changes
  const existingLocal = localStorage.getItem('PR_SAVE_SLOTS_V1');
  if (!existingLocal || existingLocal === '[]' || existingLocal === '[null,null,null]') {
    // Only update from cloud if local is empty
    localStorage.setItem('PR_SAVE_SLOTS_V1', JSON.stringify(slotsResult.data.slots));
  }
  // If we have local data, keep it (it will sync to cloud on next write)
}
      
      if (rankResult.data?.rankings) {
  const localRankings = JSON.parse(localStorage.getItem('savedRankings') || '[]');
  
  // If we have local rankings and this is NOT right after a sync choice,
  // merge them properly using the same logic as syncLocalToCloud
  if (localRankings.length > 0) {
    const rankingMap = {};
    
    // Use the same merge logic as index.html
    const canonicalKey = (run) =>
      run?.key || run?.id || `${(run?.category || 'Unknown')}_${!!run?.includeShinies}_${!!run?.shinyOnly}`;
    
    const parseWhen = (run) => {
      const s = run?.lastModified || run?.date || new Date().toISOString();
      return new Date(s).getTime();
    };
    
    // Add cloud rankings first
    rankResult.data.rankings.forEach(r => {
      if (r) {
        const key = canonicalKey(r);
        rankingMap[key] = r;
      }
    });
    
    // Then add/update with local rankings if newer
    localRankings.forEach(r => {
      if (r) {
        const key = canonicalKey(r);
        const existing = rankingMap[key];
        if (!existing || parseWhen(r) > parseWhen(existing)) {
          rankingMap[key] = r;
        }
      }
    });
    
    localStorage.setItem('savedRankings', JSON.stringify(Object.values(rankingMap)));
  } else {
    // No local rankings, just use cloud
    localStorage.setItem('savedRankings', JSON.stringify(rankResult.data.rankings));
  }
}
      
      console.log('Cloud data loaded!');
      
    } catch (error) {
      console.error('Error loading cloud data:', error);
    }
  }
  
  // Show sync prompt
// Show sync prompt
function showSyncPrompt() {
  const hasLocalData = 
    localStorage.getItem('PR_COMPLETIONS') ||
    localStorage.getItem('PR_ACHIEVEMENTS') ||
    localStorage.getItem('savedRankings') ||
    localStorage.getItem('PR_SAVE_SLOTS_V1');
  
  if (!hasLocalData) return;
  
  const modalId = 'syncPromptModal';
  
  // Remove any existing modal
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = modalId;
  modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:1300; display:flex; align-items:center; justify-content:center;';
  
  modal.innerHTML = `
    <div style="background:#fff; padding:24px; border-radius:12px; width:min(450px, 90%); text-align:center;">
      <h3 style="margin:0 0 16px; color:var(--text);">Local Data Found</h3>
      <p style="margin:0 0 20px; color:var(--text-soft); line-height:1.5;">
        You have existing PokeRankr data on this device. Would you like to:
      </p>
      <div style="text-align:left; margin:0 0 20px; padding:0 20px;">
        <p style="margin:0 0 12px;"><strong>Merge with cloud:</strong> Combine your local progress with your account data (keeping the newest version of each ranking)</p>
        <p style="margin:0;"><strong>Use cloud data only:</strong> Replace all local data with your account data</p>
      </div>
      <div style="display:flex; gap:12px; justify-content:center;">
        <button id="syncYesBtn" class="menu-button">
          <span class="button_top">Merge with Cloud</span>
        </button>
        <button id="syncNoBtn" class="menu-button">
          <span class="button_top">Use Cloud Data Only</span>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners
  document.getElementById('syncYesBtn').addEventListener('click', async () => {
    document.body.removeChild(modal);
    await handleSyncYes();
  });
  
  document.getElementById('syncNoBtn').addEventListener('click', async () => {
    document.body.removeChild(modal);
    await handleSyncNo();
  });
}

// Handler for "Merge with Cloud" option
async function handleSyncYes() {
  const userId = await getCurrentUserId();
  if (!userId) return;
  
  console.log('User chose to merge local and cloud data...');
  
  try {
    // First sync local to cloud (merge) - WAIT for it to complete!
    await syncLocalToCloud();
    
    // Small delay to ensure the sync fully completes
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get ALL auth-related keys (Supabase stores several)
    const keysToKeep = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || 
      key.includes('PR_USER_SYNCED_') ||
      key === 'PR_PLAY_MODE'
    );
    
    // Also keep some cache keys that don't need to be cleared
    const cacheKeys = ['PR_POKEMON_NAMES', 'namesMap', 'artIdCache'];
    cacheKeys.forEach(key => {
      if (localStorage.getItem(key)) keysToKeep.push(key);
    });
    
    const valuesToKeep = {};
    keysToKeep.forEach(key => {
      valuesToKeep[key] = localStorage.getItem(key);
    });
    
    // Clear only PokeRankr game data
    const gameDataKeys = [
      'PR_ACHIEVEMENTS',
      'PR_COMPLETIONS',
      'savedRankings',
      'PR_SAVE_SLOTS_V1',
      'pokeRankr.rankings',
      'rankConfig',
      'includeShinies',
      'shinyOnly',
      'category'
    ];
    
    gameDataKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Mark this user as synced
    localStorage.setItem(`PR_USER_SYNCED_${userId}`, 'true');
    
    // Now reload cloud data to populate local storage
    await syncCloudToLocal();
    
    alert('Your data has been merged with the cloud!');
    window.location.reload();
    
  } catch (error) {
    console.error('Error during sync:', error);
    alert('There was an error syncing your data. Please try again.');
  }
}

// Handler for "Use Cloud Data Only" option
async function handleSyncNo() {
  const userId = await getCurrentUserId();
  if (!userId) return;
  
  console.log('User chose to use cloud data only...');
  
  try {
    // Get ALL auth-related keys
    const keysToKeep = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || 
      key.includes('PR_USER_SYNCED_') ||
      key === 'PR_PLAY_MODE'
    );
    
    // Also keep cache keys
    const cacheKeys = ['PR_POKEMON_NAMES', 'namesMap', 'artIdCache'];
    cacheKeys.forEach(key => {
      if (localStorage.getItem(key)) keysToKeep.push(key);
    });
    
    const valuesToKeep = {};
    keysToKeep.forEach(key => {
      valuesToKeep[key] = localStorage.getItem(key);
    });
    
    // Clear only game data
    const gameDataKeys = [
      'PR_ACHIEVEMENTS',
      'PR_COMPLETIONS',
      'savedRankings',
      'PR_SAVE_SLOTS_V1',
      'pokeRankr.rankings',
      'rankConfig',
      'includeShinies',
      'shinyOnly',
      'category'
    ];
    
    gameDataKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Now load cloud data
    await syncCloudToLocal();
    
    // Mark this user as synced
    localStorage.setItem(`PR_USER_SYNCED_${userId}`, 'true');
    
    alert('Your local data has been replaced with your cloud data.');
    window.location.reload();
    
  } catch (error) {
    console.error('Error loading cloud data:', error);
    alert('There was an error loading your cloud data. Please try again.');
  }
}
  
// Auto-sync on auth change
let authChangeHandled = false;
auth.onAuthChange(async (user) => {
  if (user) {
    // Prevent multiple executions during the same session
    if (authChangeHandled) return;
    authChangeHandled = true;
    
    // Reset flag after a delay (for future logins in same session)
    setTimeout(() => { authChangeHandled = false; }, 5000);
    
    // Check if this user has ever synced before
    const userSyncKey = `PR_USER_SYNCED_${user.id}`;
    const hasUserSynced = localStorage.getItem(userSyncKey);
    
    if (!hasUserSynced) {
      // First time this user is logging in on this device
      const hasLocalData = 
        localStorage.getItem('PR_COMPLETIONS') ||
        localStorage.getItem('PR_ACHIEVEMENTS') ||
        localStorage.getItem('savedRankings') ||
        localStorage.getItem('PR_SAVE_SLOTS_V1');
      
      if (hasLocalData) {
        // Show sync prompt for this user
        // DO NOT load cloud data yet - wait for user choice!
        setTimeout(() => {
          showSyncPrompt();
        }, 1000);
      } else {
        // No local data, just load cloud data
        await syncCloudToLocal();
        localStorage.setItem(userSyncKey, 'true');
      }
    } else {
      // User has synced before, load cloud data BUT don't overwrite save slots
      // since they might have just made changes
      await syncCloudToLocal();
    }
  }
});
  
  // Public API
 return {
  syncLocalToCloud,
  syncCloudToLocal,
  showSyncPrompt,
  overwriteSavedRankings // NEW
};

})();