# Feature Implementation Plan

**Overall Progress:** `93%`

## TLDR
A nautical-themed AI productivity web app. Chat with it to define goals, it schedules time blocks on your Google Calendar, tracks your productivity score, and rewards you with a growing pirate crew. Built with Next.js on Vercel + Supabase backend + Claude API.

## Critical Decisions
- **Web app first** - Works on all devices via browser; native iOS deferred
- **Next.js + TypeScript** - Best ecosystem for Vercel, strong community, good for a first project
- **Supabase** - Free tier covers auth, database, and API; Google OAuth built-in
- **Claude API** - Powers the chat, scheduling questions, and curated suggestions
- **Single user for v1** - Architected with user_id on all tables so multi-user is a later toggle, not a rewrite
- **Text chat first** - Voice conversation deferred to Phase 2
- **Curated suggestions** - AI recommends from known resource categories; live internet search deferred

## Phase 1: Core App + Gamification

### Setup & Infrastructure

- [x] 🟩 **Step 1: Development Environment Setup**
  - [x] 🟩 Install Node.js (LTS) and verify in terminal
  - [x] 🟩 Install VS Code (code editor)
  - [x] 🟩 Install Git and create a GitHub account
  - [x] 🟩 Basic terminal commands walkthrough (cd, ls, npm)

- [x] 🟩 **Step 2: Accounts & Services**
  - [x] 🟩 Create Vercel account (sign in with GitHub)
  - [x] 🟩 Create Supabase account and new project
  - [x] 🟩 Set up Google Cloud Console project for Calendar API + OAuth credentials
  - [x] 🟩 Get Claude API key from Anthropic console

- [x] 🟩 **Step 3: Project Scaffolding**
  - [x] 🟩 Create Next.js app with TypeScript and Tailwind CSS
  - [x] 🟩 Set up project folder structure (pages, components, lib, api)
  - [x] 🟩 Configure environment variables (.env.local for API keys)
  - [x] 🟩 Connect GitHub repo to Vercel for auto-deploy
  - [x] 🟩 Verify "Hello World" deploys successfully

### Authentication & Calendar

- [x] 🟩 **Step 4: Google Authentication**
  - [x] 🟩 Configure Supabase Google OAuth provider
  - [x] 🟩 Build sign-in page with Google button
  - [x] 🟩 Handle auth session and redirect after login
  - [x] 🟩 Store user profile in Supabase `users` table

- [x] 🟩 **Step 5: Google Calendar Integration**
  - [x] 🟩 Request Calendar API scopes during Google OAuth (read + write)
  - [x] 🟩 Store and refresh Google OAuth tokens in Supabase
  - [x] 🟩 Build API route: fetch all events from both calendars (personal + work)
  - [x] 🟩 Build API route: create event on specified calendar
  - [x] 🟩 Build API route: delete app-created events (tag with custom property to identify)
  - [x] 🟩 Verify integration — read existing events, create a test event, delete it

### Database Schema

- [x] 🟩 **Step 6: Supabase Database Tables**
  - [x] 🟩 `users` — id, email, google_tokens, work_calendar_id, personal_calendar_id, created_at
  - [x] 🟩 `goals` — id, user_id, title, description, due_date, estimated_hours, is_hard_deadline, priority (1-5), is_work, status, created_at
  - [x] 🟩 `scheduled_blocks` — id, user_id, goal_id, google_event_id, calendar_type, start_time, end_time, is_completed
  - [x] 🟩 `productivity_score` — id, user_id, month, year, total_points, created_at
  - [x] 🟩 `pirates` — id, user_id, goal_id, trait_description, image_key, month, year, created_at
  - [x] 🟩 Enable Row Level Security on all tables with user_id policies

### Chat & Scheduling Engine

- [x] 🟩 **Step 7: AI Chat Interface**
  - [x] 🟩 Build chat UI component (message list + text input)
  - [x] 🟩 Build API route that sends messages to Claude API
  - [x] 🟩 System prompt: instruct Claude to ask the 4 questions (due date, hours, hard/flexible, priority, work/personal) and extract structured data
  - [x] 🟩 Parse Claude's structured response into a goal object and save to `goals` table

- [x] 🟩 **Step 8: Scheduling Algorithm**
  - [x] 🟩 Fetch all existing events from both calendars as "busy" blocks
  - [x] 🟩 Fetch all app-created blocks that are already scheduled
  - [x] 🟩 For each unscheduled goal: find available 15-min+ slots respecting priority order
  - [x] 🟩 For multi-day tasks: ask user preferred hours/day, distribute across available days
  - [x] 🟩 Hard deadlines scheduled first, flexible goals fill remaining gaps
  - [x] 🟩 Generate proposed week as a list of time blocks (not yet written to calendar)

- [x] 🟩 **Step 9: Week View & Approval Flow**
  - [x] 🟩 Build weekly calendar view showing proposed time blocks
  - [x] 🟩 Drag-and-drop to move/resize blocks (within available slots only)
  - [x] 🟩 Chat-based modification: "move workout to Thursday" → Claude adjusts schedule
  - [x] 🟩 Approve button: writes all blocks to Google Calendar, saves to `scheduled_blocks`
  - [x] 🟩 Redo button: clears proposed blocks, reruns scheduling algorithm

### Productivity Score & Pirate Crew

- [x] 🟩 **Step 10: Daily Review & Scoring**
  - [x] 🟩 End-of-day review screen: list today's blocks, checkbox to mark complete
  - [x] 🟩 Calculate points: 1 point per 10 minutes of completed block time
  - [x] 🟩 Update `productivity_score` for current month
  - [x] 🟩 Display running score on dashboard

- [x] 🟩 **Step 11: Pirate Crew System**
  - [x] 🟩 Create/source a set of pirate character illustrations with varied traits (telescope, map, compass, book, hammer, etc.)
  - [x] 🟩 On task completion: assign a pirate with trait matching the goal category
  - [x] 🟩 Save pirate to `pirates` table with current month/year
  - [x] 🟩 Ship view: display pirate ship with crew members aboard
  - [x] 🟩 Overflow logic: when ship exceeds capacity (e.g., 12 pirates), second ship appears
  - [x] 🟩 Monthly reset: pirates clear at start of new month, fresh ship

### Notifications

- [x] 🟩 **Step 12: Notification System**
  - [x] 🟩 Set up browser push notifications (service worker)
  - [x] 🟩 Daily end-of-day notification: "Review your day, Captain"
  - [x] 🟩 Sunday 10am notification: "Plan your week ahead"
  - [x] 🟩 2-3x per week motivational nudge: "Your crew is waiting — 3 tasks left this week"

### Suggestions

- [x] 🟩 **Step 13: Curated Suggestions Engine**
  - [x] 🟩 Define goal categories (learning, fitness, career, creative, etc.)
  - [x] 🟩 Build a curated resource map: category → list of vetted resources (videos, articles, tools)
  - [x] 🟩 Claude analyzes user goals, matches to categories, surfaces 1-2 relevant suggestions
  - [x] 🟩 Display suggestions in dashboard as "Captain's Recommendations"

### Theme & Visual Design

- [x] 🟩 **Step 14: Nautical Theme & UI Polish**
  - [x] 🟩 Color palette: deep navy, gold, cream, weathered wood tones
  - [x] 🟩 Typography: serif headers (captain's log feel), clean sans-serif body
  - [x] 🟩 Background: subtle ocean/parchment textures
  - [x] 🟩 Ship illustration for pirate crew view
  - [x] 🟩 Completion animation: new pirate boards the ship with a flourish
  - [x] 🟩 Overall feel: calm, luxury, 1800s captain's quarters

- [ ] 🟨 **Step 15: Deploy & Test**
  - [x] 🟩 Full end-to-end test: sign in → create goal → schedule → approve → complete → score
  - [ ] 🟥 Test both calendar integrations (personal + work)
  - [ ] 🟥 Test drag-and-drop + chat modifications on week view
  - [ ] 🟥 Test on mobile browser (iPhone Safari)
  - [x] 🟩 Verify Vercel production deployment
  - [ ] 🟥 Share link with friends for testing

---

## Phase 2 (Future)
- Voice conversation (speech-to-text + text-to-speech with Claude)
- Live internet search for suggestions
- Multi-user support
- Native iOS app (TestFlight → App Store)
