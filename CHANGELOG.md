# Changelog

## System Architecture

```
+------------------------------------------------------------------+
|                         USER'S BROWSER                            |
|                                                                   |
|  +--------------------+  +-------------------+  +--------------+  |
|  |    3D Globe (R3F)  |  |   Chat Panel      |  |   Sidebar    |  |
|  |  - Central planet  |  | - Message input   |  | - Goals      |  |
|  |  - Orbiting planets|  | - AI responses    |  | - Tips       |  |
|  |  - Rocket ships    |  | - Quick replies   |  | - Resources  |  |
|  +--------------------+  +-------------------+  +--------------+  |
|           |                       |                     |         |
|  +---------------------------------------------------------------+|
|  |              DashboardClient (orchestrator)                    ||
|  |  Manages: tabs, modals, goals state, islands, star config     ||
|  +---------------------------------------------------------------+|
+------------------------------------------------------------------+
          |                    |                    |
          v                    v                    v
+------------------------------------------------------------------+
|                     NEXT.JS API ROUTES                            |
|                                                                   |
|  /api/chat      /api/goals     /api/calendar    /api/onboarding  |
|  /api/islands   /api/news      /api/suggestions  /api/star-prefs |
+------------------------------------------------------------------+
          |                    |                    |
          v                    v                    v
+------------------+  +------------------+  +------------------+
|   Claude API     |  |    Supabase      |  | Google Calendar  |
|  (Anthropic)     |  |   (Postgres)     |  |     API          |
|                  |  |                  |  |                  |
|  Chat responses  |  |  Users, Goals,   |  |  Events, Busy    |
|  Goal parsing    |  |  Islands, etc.   |  |  slots, Sync     |
+------------------+  +------------------+  +------------------+
```

## Chat & Goal Creation Flow

```
User types: "I want to learn Spanish"
        |
        v
+---------------------------+
| chat.tsx                  |
| POST /api/chat            |
| { messages: [...] }       |
+---------------------------+
        |
        v
+---------------------------+
| /api/chat/route.ts        |
|                           |
| 1. Auth check             |
| 2. Fetch AEIOU history    |
| 3. Build system prompt    |
| 4. Call Claude API        |
| 5. Stream SSE response    |
+---------------------------+
        |
        v
+---------------------------+
| chat.tsx (receives stream)|
|                           |
| 1. Display streamed text  |
| 2. Parse goal JSON        |
| 3. POST /api/goals        |
| 4. Dispatch goal-created  |
|    event → calendar       |
+---------------------------+
        |
        v
+---------------------------+
| /api/goals/route.ts       |
|                           |
| 1. Validate goal fields   |
| 2. Check for duplicates   |
| 3. Save to goals table    |
| 4. Fetch Google Cal tokens|
| 5. Get busy time slots    |
| 6. Find available slots   |
| 7. Create calendar events |
| 8. Save scheduled blocks  |
| 9. Return goal + blocks   |
+---------------------------+
        |
        v
+---------------------------+
| dashboard-client.tsx      |
|                           |
| 1. Add goal to sidebar    |
| 2. New planet appears     |
|    in 3D solar system     |
+---------------------------+
```

## Calendar Integration

```
+---------------------------+     +---------------------------+
| Goal Created              |     | Calendar View             |
| (auto-schedule)           |     | (calendar-view.tsx)       |
+---------------------------+     +---------------------------+
        |                                  |
        v                                  v
+---------------------------+     +---------------------------+
| Find available time slots |     | GET /api/calendar/events  |
|                           |     | Fetch from Google Calendar|
| 1. Get busy slots from    |     |   - Work calendar         |
|    work + personal cals   |     |   - Personal calendar     |
| 2. Respect preferred time |     |   - Deduplicate           |
| 3. Avoid conflicts        |     +---------------------------+
| 4. Handle recurring goals |              |
+---------------------------+              v
        |                         +---------------------------+
        v                         | Weekly Grid Display       |
+---------------------------+     |                           |
| Create Google Cal event   |     | - 6am to midnight (PST)  |
| Save scheduled_block      |     | - Overlap handling        |
|   status: "approved"      |     | - Pending blocks panel    |
+---------------------------+     | - Approve/reject/edit     |
                                  +---------------------------+
```

## 3D Solar System Architecture

```
+--------------------------------------------------+
|  chat.tsx (host)                                  |
|  +--------------------------------------------+  |
|  | div.absolute.inset-0.z-0                   |  |
|  |                                            |  |
|  |  Globe -> Globe3DCanvas                    |  |
|  |  +--------------------------------------+  |  |
|  |  | R3F Canvas (fills entire panel)      |  |  |
|  |  |                                      |  |  |
|  |  |  SceneThemeProvider (isDark)         |  |  |
|  |  |  |                                  |  |  |
|  |  |  +-- Stars (dark mode only)         |  |  |
|  |  |  +-- CentralStar                    |  |  |
|  |  |  |   Glass sphere + atmosphere      |  |  |
|  |  |  +-- BasePlanet (per goal)          |  |  |
|  |  |  |   Orbits at distance 6.0         |  |  |
|  |  |  +-- RocketShip (x4)               |  |  |
|  |  |  +-- Bloom (postprocessing)         |  |  |
|  |  +--------------------------------------+  |  |
|  +--------------------------------------------+  |
|                                                  |
|  +--------------------------------------------+  |
|  | div.relative.z-10.pointer-events-none      |  |
|  |   Messages + Input (pointer-events-auto)   |  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
```

## Database Schema

```
+------------------+       +------------------+       +------------------+
|     users        |       |     goals        |       | scheduled_blocks |
|------------------|       |------------------|       |------------------|
| id (PK, UUID)   |<------| user_id (FK)     |<------| goal_id (FK)     |
| email            |       | title            |       | user_id (FK)     |
| google_*_token   |       | description      |       | google_event_id  |
| star_preferences |       | due_date         |       | calendar_type    |
| has_seen_onboard.|       | estimated_hours  |       | start_time       |
| work_calendar_id |       | is_hard_deadline |       | end_time         |
| personal_cal_id  |       | priority (1-5)   |       | status           |
+------------------+       | is_work          |       +------------------+
        |                  | preferred_time   |
        |                  | duration_minutes |
        |                  | recurring        |
        |                  +------------------+
        |                          |
        |                          v
        |                  +------------------+
        |                  |    sub_goals     |
        |                  |------------------|
        |                  | parent_goal_id   |
        |                  | title            |
        |                  | status           |
        |                  | sort_order       |
        |                  +------------------+
        |
        +-------->+------------------+       +------------------+
                  |    islands       |       | aeiou_responses  |
                  |------------------|       |------------------|
                  | goal_id (FK)     |       | goal_id (FK)     |
                  | island_type      |       | activities       |
                  | color_palette[]  |       | environments     |
                  | name             |       | interactions     |
                  | position_theta   |       | objects          |
                  +------------------+       | excitement_level |
                                             | ai_assessment    |
                                             +------------------+
```

---

## Unreleased

### Fixed
- **Goal save errors silently hidden** — `stripGoalJson` was called AFTER appending status/error messages, overwriting them. Now strips the `goal_json` block from display first, then appends status messages on top of the clean content. Error messages (validation failures, scheduling errors) are now visible in chat.
  - Files: `chat.tsx`

- **Calendar events on wrong days** — replaced `new Date(toLocaleString())` timezone pattern (breaks on DST boundaries) with `Intl.DateTimeFormat.formatToParts()` in `getPSTparts()`; day-index diff now uses `Date.UTC()` to avoid DST skew
  - Files: `calendar-view.tsx`
- **"Today" highlight wrong day** — all `isToday` comparisons now use PST calendar date via `getPSTparts()` + `Date.UTC()`
  - Files: `calendar-view.tsx`
- **Goals not saving** — `max_tokens` was 800 (too low for conversational text + goal JSON block); increased to 2000
  - Files: `api/chat/route.ts`
- **Due date rejected for PST users** — `due_date` validation used UTC date; now uses PST date via `toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })`
  - Files: `api/goals/route.ts`

### Added
- **Calendar auto-refresh on goal creation** — `chat.tsx` dispatches `goal-created` CustomEvent after saving; `CalendarView` listens and calls `fetchAll()` so calendar is fresh without manual refresh
  - Files: `chat.tsx`, `calendar-view.tsx`

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
