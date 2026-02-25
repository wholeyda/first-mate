# Instructions Modal — Implementation Plan

**Overall Progress:** `100%`

## TLDR
Build a paginated onboarding carousel modal with 5-6 text-only slides. Opens automatically on first login (tracked via new DB column), and manually via an "Instructions" button in the header. Navigation via dots, arrows, and a "Get Started" button on the final slide.

## Critical Decisions
- **First-visit tracking:** New DB column (`has_seen_onboarding` on `users` table) — persists across devices
- **Content format:** Text-only slides for now (no screenshots) — easy to swap in images later
- **Slide config:** Data-driven array so slides can be added/removed without touching component logic
- **Navigation:** Dots + left/right arrows + "Get Started" final button
- **Header-to-client communication:** Custom DOM event (`open-instructions`) bridges the server-rendered header button to client-managed modal state

## Tasks:

- [x] **Step 1: Database migration**
  - [x] Add `has_seen_onboarding` boolean column (default `false`) to users table
  - [x] Update `supabase-migrations.sql` and `User` type in `database.ts`

- [x] **Step 2: API route for onboarding status**
  - [x] Create `GET /api/onboarding` — returns `{ hasSeenOnboarding: boolean }`
  - [x] Create `PUT /api/onboarding` — sets `has_seen_onboarding = true`

- [x] **Step 3: Create InstructionsModal component**
  - [x] Define slide config array (title, body text, icon, highlights per slide)
  - [x] 6 slides: Welcome, Chat, Goals, Calendar, Solar System, Tips
  - [x] Dot indicators (clickable) at bottom center
  - [x] Left/right arrow buttons on sides
  - [x] "Get Started" button on final slide (replaces right arrow)
  - [x] Skip/Close button (top-right corner)
  - [x] Dark mode support throughout

- [x] **Step 4: Wire into dashboard header**
  - [x] Create `InstructionsButton` client component (dispatches custom event)
  - [x] Add to header near email in `dashboard/page.tsx`
  - [x] `DashboardClient` listens for event and opens modal

- [x] **Step 5: First-visit auto-open**
  - [x] Fetch `has_seen_onboarding` in server component
  - [x] Pass `hasSeenOnboarding` prop to `DashboardClient`
  - [x] Auto-open modal on mount if `hasSeenOnboarding === false`
  - [x] Call `PUT /api/onboarding` on modal close

- [x] **Step 6: Build & verify**
  - [x] Build passes
  - [x] Committed and pushed
