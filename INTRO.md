# First Mate — Technical Introduction

A comprehensive guide to how First Mate works, from architecture to data flow.

---

## What Is First Mate?

First Mate is an AI-powered productivity app. You tell it what you want to accomplish, it creates structured goals, schedules time on your Google Calendar, and rewards you with planets in a 3D solar system as you complete goals.

---

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

---

## Page Load Flow

```
User visits /dashboard
        |
        v
+---------------------------+
| Server Component          |
| (dashboard/page.tsx)      |
|                           |
| 1. Check auth (Supabase)  |
| 2. Not logged in? -> /login|
| 3. Fetch goals            |
| 4. Fetch sub-goals        |
| 5. Fetch onboarding flag  |
| 6. Render header (server) |
| 7. Pass data to client    |
+---------------------------+
        |
        v
+---------------------------+
| Client Component          |
| (dashboard-client.tsx)    |
|                           |
| Receives server data as   |
| props, then takes over:   |
| - Tab switching           |
| - Modal management        |
| - Goal CRUD               |
| - Island management       |
| - Star customization      |
| - Instructions modal      |
+---------------------------+
        |
        +---> Chat tab ---> chat.tsx + globe.tsx
        |
        +---> Calendar tab ---> calendar-view.tsx
        |
        +---> Resume tab ---> resume-panel.tsx
```

---

## Chat & Goal Creation Flow

This is the core loop of the app:

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
|    (past reflections)     |
| 3. Build system prompt    |
|    with user context      |
| 4. Call Claude API        |
| 5. Stream SSE response    |
|    data: {"text":"..."}   |
|    data: [DONE]           |
+---------------------------+
        |
        v
+---------------------------+
| chat.tsx (receives stream)|
|                           |
| 1. Display streamed text  |
| 2. Parse goal JSON from   |
|    response (if present)  |
| 3. Call POST /api/goals   |
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

---

## Goal Completion Flow

```
User clicks checkmark on goal card
        |
        v
+---------------------------+
| AEIOU Reflection Modal    |
| (aeiou-modal.tsx)         |
|                           |
| User answers:             |
| - Activities              |
| - Environments            |
| - Interactions            |
| - Objects                 |
| - Users present           |
| - Excitement level        |
| - Peak moments            |
+---------------------------+
        |
        v
+---------------------------+
| POST /api/aeiou           |
| Save reflection to DB     |
+---------------------------+
        |
        v
+---------------------------+
| POST /api/islands         |
| Create reward planet      |
| (random type + colors)    |
+---------------------------+
        |
        v
+---------------------------+
| Island Reveal Animation   |
| (island-reveal.tsx)       |
|                           |
| New planet appears in     |
| the 3D solar system,      |
| orbiting the central star |
+---------------------------+
```

---

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

---

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
|  |  |  |                                  |  |  |
|  |  |  +-- CentralStar                    |  |  |
|  |  |  |   Glass sphere + atmosphere      |  |  |
|  |  |  |   Clickable -> customize         |  |  |
|  |  |  |                                  |  |  |
|  |  |  +-- BasePlanet (per goal)          |  |  |
|  |  |  |   Orbits at distance 6.0         |  |  |
|  |  |  |   Clickable -> remove modal      |  |  |
|  |  |  |                                  |  |  |
|  |  |  +-- RocketShip (x4)               |  |  |
|  |  |  |   Fly between planets            |  |  |
|  |  |  |                                  |  |  |
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

**Theme handling across the Canvas boundary:**

```
Outside Canvas (React):          Inside Canvas (R3F):
useTheme() -> isDark             useSceneTheme() -> isDark
        |                                ^
        v                                |
Globe3DCanvas reads isDark       SceneThemeProvider wraps
and passes to Scene component    all children inside Canvas
```

React context does not cross the R3F Canvas boundary, so `SceneThemeContext` re-creates the context inside the Canvas tree.

---

## Database Schema

```
+------------------+       +------------------+       +------------------+
|     users        |       |     goals        |       | scheduled_blocks |
|------------------|       |------------------|       |------------------|
| id (PK, UUID)   |<------| user_id (FK)     |<------| goal_id (FK)     |
| email            |       | title            |       | user_id (FK)     |
| google_*_token   |       | description      |       | google_event_id  |
| spotify_*_token  |       | due_date         |       | calendar_type    |
| star_preferences |       | estimated_hours  |       | start_time       |
| has_seen_onboard.|       | is_hard_deadline |       | end_time         |
| work_calendar_id |       | priority (1-5)   |       | status           |
| personal_cal_id  |       | is_work          |       +------------------+
+------------------+       | status           |
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
        |                  | estimated_hours  |
        |                  | start/end_date   |
        |                  | status           |
        |                  | sort_order       |
        |                  | depends_on[]     |
        |                  +------------------+
        |
        +-------->+------------------+       +------------------+
                  |    islands       |       | aeiou_responses  |
                  |------------------|       |------------------|
                  | goal_id (FK)     |       | goal_id (FK)     |
                  | aeiou_resp_id    |       | activities       |
                  | island_type      |       | environments     |
                  | color_palette[]  |       | interactions     |
                  | name             |       | objects          |
                  | position_theta   |       | users_present    |
                  | position_phi     |       | excitement_level |
                  +------------------+       | peak_moments     |
                                             | ai_assessment    |
                                             | was_successful   |
                                             +------------------+
```

All tables use Row Level Security (RLS) — users can only read/write their own data.

---

## File Structure

```
src/
+-- app/                          # URL-mapped pages and API routes
|   +-- dashboard/
|   |   +-- page.tsx              # Main dashboard (server component)
|   |   +-- goals/[goalId]/
|   |       +-- page.tsx          # Individual goal detail page
|   +-- login/
|   |   +-- page.tsx              # Login screen
|   +-- api/
|       +-- chat/route.ts         # Claude AI streaming endpoint
|       +-- goals/route.ts        # Goal CRUD + auto-scheduling
|       +-- calendar/             # Calendar events, pending blocks
|       +-- islands/route.ts      # Reward planet CRUD
|       +-- onboarding/route.ts   # First-visit tracking
|       +-- news/route.ts         # AI-curated tips
|       +-- suggestions/route.ts  # Resource recommendations
|       +-- star-preferences/     # Central star customization
|       +-- aeiou/                # Goal completion reflections
|
+-- components/
|   +-- dashboard-client.tsx      # Main client orchestrator
|   +-- chat.tsx                  # Chat interface + globe host
|   +-- globe.tsx                 # Globe wrapper (Suspense)
|   +-- globe/
|   |   +-- Globe3D.tsx           # R3F Canvas + Scene
|   |   +-- CentralStar.tsx       # Hero planet (glass sphere)
|   |   +-- RocketShip.tsx        # Animated rockets
|   |   +-- SceneThemeContext.tsx  # Theme bridge for Canvas
|   |   +-- constants.ts          # Sizes, speeds, distances
|   |   +-- planet-types/
|   |   |   +-- BasePlanet.tsx    # Orbiting goal planets
|   |   |   +-- FloatingPlanet.tsx# Reveal animation planet
|   |   +-- shaders/
|   |       +-- glassSphere.glsl.ts
|   |       +-- atmosphereRim.glsl.ts
|   |       +-- accretionDisk.glsl.ts
|   +-- goals-sidebar.tsx         # Right panel: goals + tips
|   +-- calendar-view.tsx         # Weekly calendar grid
|   +-- instructions-modal.tsx    # Onboarding carousel
|   +-- instructions-button.tsx   # Header button (custom event)
|   +-- aeiou-modal.tsx           # Goal completion reflection
|   +-- island-reveal.tsx         # Planet unlock animation
|   +-- star-customization-panel.tsx
|   +-- news-panel.tsx            # AI-curated tips
|   +-- suggestions-panel.tsx     # Resource recommendations
|   +-- theme-provider.tsx        # Dark/light mode context
|   +-- dark-mode-toggle.tsx
|   +-- sign-out-button.tsx
|
+-- lib/
|   +-- supabase/server.ts        # Supabase SSR client
|   +-- parse-goal.ts             # Extract goal JSON from AI text
|   +-- chat-system-prompt.ts     # Claude system prompt builder
|   +-- google-calendar.ts        # Google Cal API helpers
|   +-- notifications.ts          # Browser push notifications
|
+-- types/
    +-- database.ts               # All DB table interfaces
    +-- star-config.ts            # Star customization types
```

---

## Key Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Server vs Client components | Server for auth/data fetch, Client for interactivity | Security: DB tokens never reach browser |
| User prefs storage | Columns on `users` table | Simple; no join needed; matches Supabase pattern |
| Theme in 3D scene | SceneThemeContext bridge | React context cannot cross R3F Canvas boundary |
| Globe positioning | Absolute background in chat | Seamless look; no box-in-box; full bleed |
| Pointer events | `pointer-events-none` overlay | Globe stays interactive under chat UI |
| Header-to-modal comm | Custom DOM events | Server component can't hold client state |
| Chat streaming | Server-Sent Events (SSE) | Simple, one-direction stream; no WebSocket needed |
| Calendar scheduling | Auto-schedule on goal creation | Reduces friction; user can adjust in Calendar tab |

---

## External Services

| Service | Purpose | Cost |
|---------|---------|------|
| **Supabase** | Auth, Postgres database, RLS | Free tier (500MB, 50K requests) |
| **Anthropic (Claude)** | AI chat, goal parsing, tips | Pay per token (~$3/M input, $15/M output) |
| **Google Calendar** | Event sync, availability | Free (OAuth) |
| **Vercel** (deployment) | Hosting, serverless functions | Free tier available |
