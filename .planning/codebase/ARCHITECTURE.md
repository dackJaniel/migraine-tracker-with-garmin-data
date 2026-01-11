# Architecture

**Analysis Date:** 2026-01-11

## Pattern Overview

**Overall:** Hybrid Monolith with Feature-Based Architecture

**Key Characteristics:**
- Single-page React application built with Vite
- Progressive Web App (PWA) with Capacitor for Android native support
- Client-side data persistence using Dexie (IndexedDB wrapper)
- Modular feature-based organization with shared service layer

## Layers

**Presentation Layer:**
- Purpose: React components and pages
- Contains: UI components, feature components, pages
- Location: `src/pages/`, `src/components/`, `src/features/*/`
- Depends on: Service layer, hooks
- Used by: Router (App.tsx)

**Service Layer:**
- Purpose: Business logic and data operations
- Contains: Episode CRUD, Garmin sync, Weather sync, Analytics
- Location: `src/features/*/`, `src/lib/*/`
- Depends on: Data layer, external APIs
- Used by: Presentation layer via hooks

**Data Access Layer:**
- Purpose: Dexie ORM for IndexedDB persistence
- Contains: Database schema, migrations, helper functions
- Location: `src/lib/db.ts`
- Depends on: Dexie library
- Used by: Service layer

**Hooks & Utilities Layer:**
- Purpose: React hooks for data binding
- Contains: Live query hooks, utility functions
- Location: `src/hooks/`, `src/lib/utils.ts`
- Depends on: Data layer
- Used by: Presentation layer

## Data Flow

**Episode Creation:**

1. User fills form in `EpisodeForm.tsx`
2. Form handler calls `episode-service.ts::createEpisode()`
3. Service calls `db.episodes.add()` (Dexie ORM)
4. Data persisted to IndexedDB
5. `useEpisodes()` hook reactively updates UI

**Garmin Sync:**

1. User triggers sync from Dashboard/GarminPage
2. `garminClient.syncAllMissingData()` orchestrates sync
3. `sync-service.ts::syncSingleDate()` called for each date
4. Parallel fetch via `src/lib/garmin/endpoints/*.ts`
5. `http-client.ts` handles rate limiting and native HTTP
6. Data stored via `db.garminData.put()`
7. `useGarminData()` hook updates UI reactively

**State Management:**
- Dexie (IndexedDB) for all persistent data
- No global state - data flows through hooks
- Each component fetches what it needs via `useLiveQuery()`

## Key Abstractions

**Service Facade:**
- Purpose: Main entry point for external integrations
- Examples: `garminClient` singleton (`src/lib/garmin/client.ts`)
- Pattern: Facade delegating to auth, http, sync modules

**Custom Hooks:**
- Purpose: Reactive data subscriptions
- Examples: `useEpisodes()`, `useGarminData()`, `useStats()` (`src/hooks/use-episodes.ts`)
- Pattern: Dexie `useLiveQuery()` wrapper with filtering

**Encryption:**
- Purpose: PIN hashing and backup encryption
- Examples: `hashPin()`, `encryptBackup()` (`src/lib/encryption.ts`)
- Pattern: Web Crypto API with PBKDF2 + AES-GCM

**Rate Limiting:**
- Purpose: Prevent API rate limit errors
- Examples: `http-client.ts` request tracking
- Pattern: Token bucket (60 requests/minute for Garmin)

## Entry Points

**Web Entry:**
- Location: `src/main.tsx`
- Triggers: Browser navigation to app
- Responsibilities: Create React root, render App with ErrorBoundary

**Router Entry:**
- Location: `src/App.tsx`
- Triggers: Route navigation
- Responsibilities: Define routes, wrap protected routes, layout management

## Error Handling

**Strategy:** Throw exceptions, catch at boundaries, log to DB

**Patterns:**
- ErrorBoundary wraps entire app (`src/components/ErrorBoundary.tsx`)
- Services throw Error with descriptive messages
- Toast notifications via Sonner for user feedback
- DB logging for persistent error tracking (`db.logs.add()`)

## Cross-Cutting Concerns

**Logging:**
- `logAuth()` for authentication events → DB + console
- `logSync()` for sync operations → DB + console
- `addLog()` helper for general logging

**Validation:**
- Zod schemas for form validation (`src/features/episodes/episode-schema.ts`)
- React Hook Form for form state management
- Fail fast on invalid input

**Authentication:**
- PIN-based app lock (`src/features/auth/pin-service.ts`)
- Garmin OAuth 1.0 + 2.0 (`src/lib/garmin/auth.ts`)
- Protected routes via `ProtectedRoute.tsx`

---

*Architecture analysis: 2026-01-11*
*Update when major patterns change*
