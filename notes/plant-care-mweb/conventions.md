# Conventions

Greenfield project — no existing convention docs (no CONTRIBUTING.md, no README.md, no CLAUDE.md, no AGENTS.md, no productContext/).

Conventions inferred from the spec:
- **Tech stack**: Svelte 5 + Vite + TypeScript + Dexie.js (per spec § Tech Stack)
- **Code style**: TypeScript strict mode, Svelte 5 runes ($state, $derived, $effect)
- **File structure**: Follow spec § Project Structure exactly
- **Data validation**: Unknown JSON fields preserved in `metadata` object — never discard user data (per spec § Validation Rules)
- **Date handling**: ISO format (YYYY-MM-DD), future `lastDone` treated as today, missing `lastDone` defaults to `acquiredDate` or today (per spec § Date Edge Cases)
- **Color palette**: soft greens (#2d6a4f, #74c69d), warm neutrals (#f8f9fa, #e9ecef), alert reds (#e63946), warm amber (#f4a261) (per spec § Visual Style)
- **Touch targets**: 44px+ minimum, bottom nav thumb-reachable (per spec § Visual Style)
- **Deployment**: GitHub Pages, Vite `base` path set to `/plants/` (per spec § Deployment)
- **Commit messages**: Conventional commits (inferred — no existing convention to follow)
- **Tests**: Vitest, colocated with source or in `src/lib/**/__tests__/` pattern
