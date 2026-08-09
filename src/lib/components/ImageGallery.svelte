<script lang="ts">
  import type { PlantImage } from '../types/plant'

  let { images = [] }: { images?: PlantImage[] } = $props()

  let selected = $state<number | null>(null)

  function openImage(index: number) {
    selected = index
  }

  function closeImage() {
    selected = null
  }
</script>

{#if images.length > 0}
  <div class="gallery">
    <div class="gallery-grid">
      {#each images as img, i}
        <button class="gallery-thumb" onclick={() => openImage(i)}>
          <img src={img.value} alt={img.label || `Image ${i + 1}`} loading="lazy" />
        </button>
      {/each}
    </div>

    {#if selected !== null}
      <div
        class="gallery-overlay"
        onclick={closeImage}
        onkeydown={closeImage}
        role="button"
        tabindex="0"
      >
        <img
          class="gallery-full"
          src={images[selected].value}
          alt={images[selected].label || 'Plant image'}
        />
        {#if images[selected].label}
          <p class="gallery-label">{images[selected].label}</p>
        {/if}
        <button class="gallery-close" onclick={closeImage}>✕</button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.5rem;
  }

  .gallery-thumb {
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
    border: none;
    padding: 0;
    cursor: pointer;
    background: #e9ecef;
  }

  .gallery-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .gallery-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 1rem;
  }

  .gallery-full {
    max-width: 90vw;
    max-height: 80vh;
    border-radius: 8px;
    object-fit: contain;
  }

  .gallery-label {
    color: white;
    margin-top: 0.5rem;
    font-size: 0.9rem;
  }

  .gallery-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    font-size: 1.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
