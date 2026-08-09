<script lang="ts">
  let { active, onNavigate } = $props()

  const tabs = [
    { id: 'tasks', label: 'Tasks', icon: '📋' },
    { id: 'plants', label: 'Plants', icon: '🌿' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ]
</script>

<nav class="bottom-nav">
  {#each tabs as tab (tab.id)}
    <button class="nav-item" class:active={active === tab.id} onclick={() => onNavigate(tab.id)}>
      <span class="nav-icon">{tab.icon}</span>
      <span class="nav-label">{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-around;
    background: #ffffff;
    border-top: 1px solid #e9ecef;
    padding: 0.5rem 0;
    z-index: 100;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem 1rem;
    min-width: 44px;
    min-height: 44px;
    color: #6c757d;
    transition: color 0.2s;
  }

  .nav-item.active {
    color: #2d6a4f;
  }

  .nav-icon {
    font-size: 1.5rem;
    line-height: 1;
  }

  .nav-label {
    font-size: 0.75rem;
    font-weight: 500;
  }
</style>
