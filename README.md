# CogniHood Driver Safety System

Human-centered driver eligibility and coaching platform with real-time fatigue/hypnosis detection, trip persistence via Supabase, and post-drive performance analytics.

## Prerequisites

- Node.js 18+
- A [Google Gemini API key](https://ai.google.dev/)
- A [Supabase](https://supabase.com) project

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```env
GEMINI_API_KEY=your_gemini_key
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Supabase database

1. Open your Supabase project → **SQL Editor**
2. Run the full contents of `supabase/migrations/001_initial_schema.sql`
3. Enable **Anonymous sign-ins**: Authentication → Providers → Anonymous → Enable

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

## Application flow

1. **Authenticate** — Quick Start (anonymous) or email sign-up/sign-in
2. **Live Vitals** → 15s pre-drive scan → real-time monitoring
3. **End trip** (stop button) → trip saved to Supabase → coaching summary
4. **Performance** → cloud-synced trip archives, baseline, national percentiles

## Data stored in Supabase

| Table | Purpose |
|-------|---------|
| `profiles` | CogniID, display name (auto-created on sign-up) |
| `trips` | Full trip records, events, coaching tips |
| `cognitive_fingerprints` | Personal driving baseline |

Row Level Security ensures users only access their own data.

## Legacy migration

If you used the app before Supabase, local IndexedDB trips are automatically migrated to your account on first sign-in.

## Build

```bash
npm run build
npm run preview
```
