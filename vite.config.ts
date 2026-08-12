/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
const isCapacitor = process.env.BUILD_TARGET === 'capacitor'

export default defineConfig({
  plugins: [svelte()],
  base: isCapacitor ? './' : '/palan/',
  test: {
    include: ['src/**/*.test.ts'],
  },
})
