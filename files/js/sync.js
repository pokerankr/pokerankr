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
      
     // 3. Sync Save Slots  
        const localSlots = JSON.parse(localStorage.getItem('PR_SAVE_SLOTS_V1') || '[]');
        // Always sync save slots (including when all are null/deleted)
        const { data: existingSlots } = await auth.supabase
          .from('user_save_slots')
          .select('slots')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingSlots) {
          // Just replace cloud with local entirely - local is always the source of truth for save slots
          await auth.supabase
            .from('user_save_slots')
            .update({ slots: localSlots, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        } else {
          await auth.supabase
            .from('user_save_slots')
            .insert({ user_id: userId, slots: localSlots });
        }
      
      // 4. Sync Saved Rankings
      const localRankings = JSON.parse(localStorage.getItem('savedRankings') || '[]');
      if (localRankings.length > 0) {
        const { data: existingRankings } = await auth.supabase
          .from('user_saved_rankings')
          .select('rankings')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (existingRankings) {
          // Merge, using newest version of each ranking
          const rankingMap = {};
          [...existingRankings.rankings, ...localRankings].forEach(r => {
            const key = r.key || `${r.category}_${r.includeShinies}_${r.shinyOnly}`;
            if (!rankingMap[key] || new Date(r.date) > new Date(rankingMap[key].date)) {
              rankingMap[key] = r;
            }
          });
          
          await auth.supabase
            .from('user_saved_rankings')
            .update({ rankings: Object.values(rankingMap), updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        } else {
          await auth.supabase
            .from('user_saved_rankings')
            .insert({ user_id: userId, rankings: localRankings });
        }
      }
      
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
        localStorage.setItem('savedRankings', JSON.stringify(rankResult.data.rankings));
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
      <h3 style="margin:0 0 16px; color:var(--text);">Sync Local Data?</h3>
      <p style="margin:0 0 20px; color:var(--text-soft); line-height:1.5;">
        We found existing PokeRankr data on this device. Would you like to sync it with your account?
        This will merge your local progress with any existing cloud data.
      </p>
      <div style="display:flex; gap:12px; justify-content:center;">
        <button id="syncYesBtn" class="menu-button">
          <span class="button_top">Yes, Sync Data</span>
        </button>
        <button id="syncNoBtn" class="menu-button">
          <span class="button_top">No, Keep Separate</span>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners AFTER the modal is in the DOM
document.getElementById('syncYesBtn').addEventListener('click', async () => {
  console.log('Sync Yes clicked');
  const user = auth.getCurrentUser();
  if (user) {
    localStorage.setItem(`PR_USER_SYNCED_${user.id}`, 'true');
  }
  document.body.removeChild(modal);
  await syncLocalToCloud();
  alert('Your data has been synced to the cloud!');
  window.location.reload();
});
}
  
  // Auto-sync on auth change
auth.onAuthChange(async (user) => {
  if (user) {
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
        setTimeout(() => {
          showSyncPrompt();
        }, 1000);
      } else {
        // No local data, just load cloud data
        await syncCloudToLocal();
        localStorage.setItem(userSyncKey, 'true');
      }
    } else {
      // User has synced before, just load latest cloud data
      await syncCloudToLocal();
    }
  }
});
  
  // Public API
  return {
    syncLocalToCloud,
    syncCloudToLocal,
    showSyncPrompt
  };
})();