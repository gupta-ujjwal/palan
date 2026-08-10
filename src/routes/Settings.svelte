<script lang="ts">
  import { db, DEFAULT_SETTINGS } from '../lib/db/database'
  import { exportAllData, clearAllData } from '../lib/db/plants'
  import { plantsStore } from '../lib/stores/plants'
  import type { AppSettings } from '../lib/types/plant'

  let settings = $state<AppSettings>({ ...DEFAULT_SETTINGS })
  let showClearConfirm = $state(false)

  $effect(() => {
    const load = async () => {
      const s = await db.appSettings.get('settings')
      if (s) settings = s
    }
    load()
  })

  async function updateSettings(updates: Partial<AppSettings>) {
    const newSettings = { ...settings, ...updates }
    settings = newSettings
    await db.appSettings.put(newSettings)
  }

  async function handleNotificationToggle(enabled: boolean) {
    if (enabled) {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        await updateSettings({ notificationsEnabled: true })
      }
    } else {
      await updateSettings({ notificationsEnabled: false })
    }
  }

  function handleExportAll() {
    exportAllData().then((plants) => {
      const blob = new Blob([JSON.stringify(plants, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `palan-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  async function handleClearAll() {
    await clearAllData()
    plantsStore.reset()
    showClearConfirm = false
  }
</script>

<div class="settings">
  <h1>Settings</h1>

  <section class="settings-section">
    <h2>Notifications</h2>
    <div class="setting-row">
      <div>
        <p class="setting-label">Enable Push Notifications</p>
        <p class="setting-desc">Get reminders for plant care tasks</p>
      </div>
      <label class="toggle">
        <input
          type="checkbox"
          checked={settings.notificationsEnabled}
          onchange={(e) => handleNotificationToggle(e.currentTarget.checked)}
        />
        <span class="toggle-slider"></span>
      </label>
    </div>
    <div class="setting-row">
      <div>
        <p class="setting-label">Notification Time</p>
        <p class="setting-desc">When to receive daily reminders</p>
      </div>
      <input
        type="time"
        value={settings.notificationTime}
        disabled={!settings.notificationsEnabled}
        onchange={(e) => updateSettings({ notificationTime: e.currentTarget.value })}
      />
    </div>
  </section>

  <section class="settings-section">
    <h2>Data Management</h2>
    <button class="setting-btn" onclick={handleExportAll}> 📥 Export All Data </button>
    {#if showClearConfirm}
      <div class="confirm-dialog">
        <p>Are you sure? This will delete all plants and settings. This cannot be undone.</p>
        <div class="confirm-actions">
          <button class="btn-danger" onclick={handleClearAll}>Yes, Delete Everything</button>
          <button class="btn-secondary" onclick={() => (showClearConfirm = false)}>Cancel</button>
        </div>
      </div>
    {:else}
      <button class="setting-btn danger" onclick={() => (showClearConfirm = true)}>
        🗑️ Clear All Data
      </button>
    {/if}
  </section>

  <section class="settings-section">
    <h2>About</h2>
    <p class="about-text">Palan v0.1.0</p>
    <p class="about-text">
      A fully client-side plant care manager. Your data never leaves your device.
    </p>
  </section>
</div>

<style>
  .settings {
    padding: 1rem;
    padding-bottom: 80px;
  }

  h1 {
    font-size: 1.75rem;
    color: #212529;
    margin: 0 0 1rem;
  }

  .settings-section {
    margin-bottom: 1.5rem;
  }

  .settings-section h2 {
    font-size: 1.1rem;
    color: #212529;
    margin: 0 0 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e9ecef;
  }

  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    gap: 1rem;
  }

  .setting-label {
    font-weight: 500;
    font-size: 0.95rem;
    color: #212529;
    margin: 0;
  }

  .setting-desc {
    font-size: 0.8rem;
    color: #6c757d;
    margin: 0.125rem 0 0;
  }

  .toggle {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 28px;
    flex-shrink: 0;
  }

  .toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: #ced4da;
    border-radius: 999px;
    transition: 0.2s;
  }

  .toggle-slider::before {
    content: '';
    position: absolute;
    height: 22px;
    width: 22px;
    left: 3px;
    bottom: 3px;
    background: white;
    border-radius: 50%;
    transition: 0.2s;
  }

  .toggle input:checked + .toggle-slider {
    background: #2d6a4f;
  }

  .toggle input:checked + .toggle-slider::before {
    transform: translateX(20px);
  }

  input[type='time'] {
    padding: 0.4rem;
    border: 1px solid #ced4da;
    border-radius: 8px;
    font-size: 1rem;
  }

  input[type='time']:disabled {
    opacity: 0.5;
    background: #f8f9fa;
  }

  .setting-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ced4da;
    border-radius: 12px;
    background: #ffffff;
    cursor: pointer;
    font-size: 0.95rem;
    color: #212529;
    margin-bottom: 0.5rem;
  }

  .setting-btn.danger {
    color: #e63946;
    border-color: #e63946;
  }

  .confirm-dialog {
    background: #fde8e8;
    border: 1px solid #e63946;
    border-radius: 12px;
    padding: 1rem;
    margin-top: 0.5rem;
  }

  .confirm-dialog p {
    margin: 0 0 0.75rem;
    font-size: 0.9rem;
    color: #212529;
  }

  .confirm-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-danger {
    background: #e63946;
    color: white;
    border: none;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
  }

  .btn-secondary {
    background: #e9ecef;
    color: #495057;
    border: none;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
  }

  .about-text {
    font-size: 0.9rem;
    color: #6c757d;
    margin: 0.25rem 0;
  }
</style>
