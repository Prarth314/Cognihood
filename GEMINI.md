# Cognihood Project Instructions

## Project Overview
CogniHood is a human-centered driver eligibility and coaching platform featuring real-time fatigue/hypnosis detection, cloud trip persistence via Supabase, Google Gemini-powered coaching insights, and post-drive performance analytics.

### Tech Stack
* Frontend: React, TypeScript, Tailwind CSS, Vite
* State Management & Live Monitoring: Zustand, Presage API (Facial Landmark Tracking & Bio-Telemetry)
* AI & Intelligence: Google Gemini API (@google/genai or @google/generative-ai)
* Backend & Database: Supabase (PostgreSQL, Row Level Security, Auth)
* Legacy Local Storage: IndexedDB (automatic migration to Supabase on first sign-in)

### Main Entry Points
* src/main.tsx / src/App.tsx: Application entry point and view routing logic.
* supabase/migrations/001_initial_schema.sql: Primary database schema definition, RLS policies, and triggers.
* .env.local: Local environment secrets and API endpoints configuration.

### Core Application Flow
1. Authentication: Quick Start (Anonymous sign-in) or Email Sign-up/Sign-in via Supabase Auth.
2. Pre-Drive Scan: 15-second pre-drive calibration scan capturing driver baseline vitals.
3. Live Vitals & Monitoring: Real-time facial landmark tracking and fatigue detection processing loop.
4. Trip Termination: Trip telemetry, incident logs, and Gemini-generated coaching summaries saved to Supabase.
5. Performance & Archives: Cloud-synced trip archives, driver baseline analysis, and national percentile metrics.

---

## Directory Layout

src/
  components/         # React UI components (Live Vitals, Archives, Performance, Auth)
  hooks/              # Custom hooks for Presage API, camera streams, and telemetry
  store/              # Zustand global state stores
  lib/                # Supabase client setup, Gemini API client, IndexedDB helpers
  types/              # TypeScript interfaces (Trips, Profiles, Cognitive Fingerprints)
  utils/              # Math calculations, EAR/MAR ratios, safety index algorithms
  App.tsx             # Root component and navigation container
supabase/
  migrations/         # SQL migration scripts (Tables, RLS policies, triggers)
public/                 # Static assets and media files
.env.example            # Environment variables template
.env.local              # Local environment variables (Do NOT commit)
package.json            # Project dependencies and script runner
vite.config.ts          # Vite configuration

---

## Database Architecture (Supabase)

| Table | Purpose | Access Control |
| :--- | :--- | :--- |
| profiles | CogniID, display name (auto-created via sign-up triggers) | Row Level Security (auth.uid()) |
| trips | Full trip records, telemetry events, and AI coaching tips | Row Level Security (auth.uid()) |
| cognitive_fingerprints | Personal driving baseline derived from pre-drive scans and trip history | Row Level Security (auth.uid()) |

> Note: Row Level Security (RLS) is strictly enforced across all tables to ensure users can only access their own data. Anonymous auth providers must be enabled in Supabase.

---

## Engineering & Development Rules

### 1. Codebase Conventions & Formatting
* TypeScript Strictness: Always maintain explicit typing for telemetry structures, database payloads, and API parameters. Avoid using any.
* Naming Standards:
  * UI Components: PascalCase.tsx
  * Hooks & Helpers: camelCase.ts
  * Database Columns & SQL Entities: snake_case

### 2. Security & Secrets Policy
* Never hardcode sensitive parameters or keys. All keys (GEMINI_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) must strictly reside in .env.local and be accessed via import.meta.env.
* Keep .env.local listed in .gitignore at all times.

### 3. State & Performance Guidelines
* Decouple Telemetry from React Rendering: Frame processing and landmark detection occur at high frequencies. Route high-frequency vision data through custom hooks or Zustand stores rather than top-level React state to prevent UI main-thread lag.
* Data Migration Compatibility: Preserve the local IndexedDB migration helper to ensure legacy pre-Supabase local trips smoothly transition to Supabase upon first user sign-in.

### 4. AI CLI Execution Protocol
* Review Before Multi-File Editing: Explain structural changes, database schema updates, or dependency modifications before applying edits across multiple files.
* Database Updates: Any schema modifications, table creations, or RLS policy changes must be accompanied by an incremental migration file inside supabase/migrations/.