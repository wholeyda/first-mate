# Changelog

## Unreleased

### Added
- **Instructions modal** — 6-slide onboarding carousel (welcome + 5 feature walkthroughs)
  - Dot navigation, arrow buttons, "Get Started" on final slide
  - Auto-opens on first login via `has_seen_onboarding` DB column
  - Reopens via "Instructions" button in header
  - API: `GET/PUT /api/onboarding`
  - Files: `instructions-modal.tsx`, `instructions-button.tsx`, `api/onboarding/route.ts`

- **Light mode B&W theme** for 3D globe
  - All planets, rockets, and atmosphere render grayscale with dark outlines in light mode
  - `SceneThemeContext` bridges theme state into R3F Canvas tree
  - `uIsDark` uniform in all GLSL shaders
  - Files: `SceneThemeContext.tsx`, all `shaders/*.glsl.ts`, `BasePlanet.tsx`, `FloatingPlanet.tsx`, `RocketShip.tsx`

- **Rocket ships** — animated rockets flying between orbiting planets
  - Replaced sparkle particles
  - File: `RocketShip.tsx`

- **Glass planet visual overhaul**
  - Central star replaced with hero glass sphere planet
  - All orbiting planets upgraded to glass material with atmosphere rims
  - Custom GLSL shaders: `glassSphere.glsl.ts`, `atmosphereRim.glsl.ts`, `accretionDisk.glsl.ts`

### Changed
- **Globe fills entire chat panel** — absolute positioned background, no box/container
  - Canvas: `w-full h-full` with `absolute inset-0 z-0`
  - Content overlays with `pointer-events-none` (only text/input gets `pointer-events-auto`)

- **Removed center planet rings** — accretion disk rings stripped from CentralStar
  - `HERO_RING_INNER/OUTER` constants deleted
  - Planet orbit distance tightened: 8.5 → 6.0

- **Sidebar spacing improved** — `w-80` → `w-96`, card padding `p-3` → `p-4`, more vertical gaps

- **Header aligned** — "First Mate" left-aligned with Chat tab (removed `max-w-7xl mx-auto`)

- **Removed placeholder text** — "What would you like to accomplish?" removed from chat panel

### Database
- Added `has_seen_onboarding BOOLEAN DEFAULT false` to `users` table
  - Migration #8 in `supabase-migrations.sql`
  - Updated `User` type in `src/types/database.ts`
