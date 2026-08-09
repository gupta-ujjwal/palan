<script lang="ts">
  import { onMount } from 'svelte'
  import type { Plant } from './lib/types/plant'
  import { plantsStore } from './lib/stores/plants'
  import { getAllPlants } from './lib/db/plants'
  import {
    registerServiceWorker,
    startNotificationTimer,
    stopNotificationTimer,
    checkAndNotify,
  } from './lib/notifications/notifier'
  import BottomNav from './lib/components/BottomNav.svelte'
  import Dashboard from './routes/Dashboard.svelte'
  import Catalog from './routes/Catalog.svelte'
  import PlantDetail from './routes/PlantDetail.svelte'
  import PlantEdit from './routes/PlantEdit.svelte'
  import Settings from './routes/Settings.svelte'

  type View = 'tasks' | 'plants' | 'settings' | 'plant-detail' | 'plant-edit'

  let currentView = $state<View>('tasks')
  let selectedPlantId = $state<string | null>(null)
  let previousTab = $state<'tasks' | 'plants' | 'settings'>('tasks')

  const activeTab = $derived(
    currentView === 'plant-detail' || currentView === 'plant-edit' ? previousTab : currentView,
  )

  function navigate(tab: string) {
    currentView = tab as View
  }

  function selectPlant(id: string) {
    previousTab = currentView as 'tasks' | 'plants' | 'settings'
    selectedPlantId = id
    currentView = 'plant-detail'
  }

  function editPlant(id: string) {
    selectedPlantId = id
    currentView = 'plant-edit'
  }

  function backFromDetail() {
    currentView = previousTab
    selectedPlantId = null
  }

  function backFromEdit() {
    currentView = 'plant-detail'
  }

  onMount(() => {
    const init = async () => {
      await plantsStore.load()
      await registerServiceWorker()
      startNotificationTimer(() => {
        let plants: Plant[] = []
        plantsStore.subscribe((p) => (plants = p))()
        return plants
      })
      checkAndNotify(await getAllPlants())
    }
    init()

    return () => {
      stopNotificationTimer()
    }
  })
</script>

<main class="app">
  {#if currentView === 'tasks'}
    <Dashboard onSelectPlant={selectPlant} onNavigate={navigate} />
  {:else if currentView === 'plants'}
    <Catalog onSelectPlant={selectPlant} />
  {:else if currentView === 'settings'}
    <Settings />
  {:else if currentView === 'plant-detail' && selectedPlantId}
    <PlantDetail plantId={selectedPlantId} onEdit={editPlant} onBack={backFromDetail} />
  {:else if currentView === 'plant-edit' && selectedPlantId}
    <PlantEdit plantId={selectedPlantId} onBack={backFromEdit} />
  {/if}

  {#if currentView !== 'plant-edit'}
    <BottomNav active={activeTab} onNavigate={navigate} />
  {/if}
</main>

<style>
  .app {
    max-width: 600px;
    margin: 0 auto;
    min-height: 100vh;
    background: #f8f9fa;
  }
</style>
