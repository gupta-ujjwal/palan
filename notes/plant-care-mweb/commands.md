# Detected commands

- **Sync**: skip — greenfield single repo, no sync needed
- **Build**: `npm run build` (Vite production build)
- **Format**: `npx prettier --write` (Svelte + TS files)
- **Lint / typecheck**: `npm run check` (svelte-check for type checking)
- **Test**: `npx vitest run` (Vitest for unit tests)
- **Branch naming**: `plant-care-mweb` (topic slug, no prefix convention)
- **Source**: Spec file defines tech stack (Svelte 5 + Vite + TypeScript + Dexie); commands inferred from standard Svelte/Vite ecosystem conventions
