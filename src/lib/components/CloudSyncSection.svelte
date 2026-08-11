<script lang="ts">
  import type { User } from '@supabase/supabase-js'
  import { isCloudSyncEnabled, getCurrentUser, signInWithEmail, signOut } from '../../lib/sync/supabase'
  import { pushPlants, pullPlants } from '../../lib/sync/sync'
  import { plantsStore } from '../../lib/stores/plants'

  let enabled = $state(isCloudSyncEnabled())
  let user = $state<User | null>(null)
  let email = $state('')
  let busy = $state(false)
  let message = $state<string | null>(null)
  let error = $state<string | null>(null)

  $effect(() => {
    if (!enabled) return
    getCurrentUser().then((u) => (user = u))
  })

  async function handleSignIn() {
    error = null
    message = null
    if (!email) return
    busy = true
    const result = await signInWithEmail(email)
    busy = false
    if (result.error) {
      error = result.error
    } else {
      message = 'Check your email for a magic link.'
    }
  }

  async function handleSignOut() {
    busy = true
    await signOut()
    user = null
    busy = false
  }

  async function handleSyncNow() {
    if (!user) return
    error = null
    message = null
    busy = true

    let plants: import('../../lib/types/plant').Plant[] = []
    const unsub = plantsStore.subscribe((p) => (plants = p))
    unsub()

    const pushResult = await pushPlants(plants, user.id)
    if (pushResult.error) {
      error = pushResult.error
      busy = false
      return
    }

    const pullResult = await pullPlants(user.id)
    busy = false
    if (pullResult.error) {
      error = pullResult.error
    } else {
      message = `Synced ${pullResult.plants.length} remote plant(s). ${plants.length} local. Last write wins.`
    }
  }
</script>

{#if !enabled}
  <div class="notice">
    <p>
      Cloud sync is disabled for this build. Set <code>VITE_SUPABASE_URL</code> and
      <code>VITE_SUPABASE_ANON_KEY</code> at build time to enable it.
    </p>
  </div>
{:else}
  <div class="sync-box">
    {#if !user}
      <p class="setting-desc">
        Optional. Sign in to sync your garden across devices and see friends' streaks. The app
        keeps working offline if you skip this.
      </p>
      <div class="signin-row">
        <input
          type="email"
          placeholder="you@example.com"
          bind:value={email}
          onkeydown={(e) => e.key === 'Enter' && handleSignIn()}
        />
        <button class="btn-primary" onclick={handleSignIn} disabled={busy || !email}>
          {busy ? '…' : 'Sign in'}
        </button>
      </div>
    {:else}
      <p class="signed-in">Signed in as {user.email}</p>
      <div class="actions">
        <button class="btn-primary" onclick={handleSyncNow} disabled={busy}>
          {busy ? 'Syncing…' : 'Sync now'}
        </button>
        <button class="btn-secondary" onclick={handleSignOut} disabled={busy}> Sign out </button>
      </div>
    {/if}

    {#if message}
      <p class="notice-text">{message}</p>
    {/if}
    {#if error}
      <p class="error-text">{error}</p>
    {/if}
  </div>
{/if}

<style>
  .notice {
    padding: 0.5rem 0;
    font-size: 0.85rem;
    color: #6c757d;
  }

  .sync-box {
    padding: 0.5rem 0;
  }

  .signin-row {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .signin-row input {
    flex: 1;
    padding: 0.6rem;
    border: 1px solid #ced4da;
    border-radius: 8px;
    font-size: 0.95rem;
  }

  .btn-primary {
    background: #2d6a4f;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .btn-secondary {
    background: #e9ecef;
    color: #495057;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .signed-in {
    margin: 0 0 0.5rem;
    font-size: 0.9rem;
    color: #212529;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .notice-text {
    margin: 0.5rem 0 0;
    font-size: 0.85rem;
    color: #2d6a4f;
  }

  .error-text {
    margin: 0.5rem 0 0;
    font-size: 0.85rem;
    color: #e63946;
  }
</style>
