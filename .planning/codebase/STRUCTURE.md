# Codebase Structure

**Analysis Date:** 2026-01-11

## Directory Layout

```
garmin/
├── src/                    # Application source code
│   ├── pages/             # Route page components
│   ├── components/        # Shared UI components
│   │   └── ui/           # shadcn/Radix styled primitives
│   ├── features/          # Domain-driven feature modules
│   │   ├── episodes/     # Migraine episode tracking
│   │   ├── garmin/       # Garmin data display
│   │   ├── weather/      # Weather integration
│   │   ├── analytics/    # Correlation insights
│   │   ├── auth/         # PIN authentication
│   │   └── backup/       # Data backup/restore
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Core libraries and services
│   │   ├── garmin/       # Garmin API integration
│   │   └── weather/      # Weather API integration
│   ├── assets/            # Static assets
│   └── store/             # Reserved for state management
├── tests/                  # Test files
│   ├── unit/             # Unit tests
│   ├── e2e/              # E2E tests (Playwright)
│   └── setup.ts          # Test configuration
├── android/                # Capacitor Android project
├── mcp-server/            # MCP testing infrastructure
└── dist/                   # Build output (gitignored)
```

## Directory Purposes

**src/pages/**
- Purpose: Top-level route page components
- Contains: Full-page components mapped to routes
- Key files: `Dashboard.tsx`, `Analytics.tsx`, `GarminPage.tsx`, `Settings.tsx`, `PinSetup.tsx`, `PinUnlock.tsx`

**src/components/**
- Purpose: Shared, reusable UI components
- Contains: Layout, ProtectedRoute, ErrorBoundary
- Key files: `Layout.tsx`, `ProtectedRoute.tsx`, `ErrorBoundary.tsx`

**src/components/ui/**
- Purpose: shadcn/Radix UI styled primitives
- Contains: button, card, dialog, input, select, tabs, etc.
- Key files: `button.tsx`, `card.tsx`, `dialog.tsx`, `sonner.tsx`

**src/features/episodes/**
- Purpose: Migraine episode tracking feature
- Contains: Forms, detail views, services, schemas
- Key files: `EpisodeForm.tsx`, `EpisodeDetail.tsx`, `episode-service.ts`, `episode-schema.ts`

**src/features/garmin/**
- Purpose: Garmin health data display
- Contains: Data display components, sync controls
- Key files: `components/GarminDataDisplay.tsx`, `components/SyncControls.tsx`, `components/MetricCard.tsx`

**src/features/analytics/**
- Purpose: Correlation insights and statistics
- Contains: Charts, analysis components, correlation service
- Key files: `CorrelationInsights.tsx`, `correlation-service.ts`

**src/lib/garmin/**
- Purpose: Garmin Connect API integration
- Contains: Auth, HTTP client, sync, endpoints
- Key files: `client.ts`, `auth.ts`, `http-client.ts`, `sync-service.ts`, `constants.ts`
- Subdirectories: `endpoints/` (sleep.ts, stress.ts, activity.ts, misc.ts)

**src/lib/weather/**
- Purpose: Weather API integration
- Contains: API client, sync service, location
- Key files: `client.ts`, `sync-service.ts`, `location-service.ts`, `types.ts`

**src/hooks/**
- Purpose: Custom React hooks for data binding
- Contains: Dexie live query hooks
- Key files: `use-episodes.ts`

## Key File Locations

**Entry Points:**
- `src/main.tsx` - React DOM entry point
- `src/App.tsx` - Router setup and route definitions

**Configuration:**
- `vite.config.ts` - Build configuration with dev proxies
- `tsconfig.json` - TypeScript configuration
- `capacitor.config.ts` - Mobile app configuration
- `components.json` - shadcn/ui configuration

**Core Logic:**
- `src/lib/db.ts` - Dexie database schema and helpers
- `src/lib/encryption.ts` - PIN hashing and backup encryption
- `src/lib/garmin/client.ts` - Garmin API facade
- `src/features/episodes/episode-service.ts` - Episode CRUD operations

**Testing:**
- `tests/unit/` - Unit tests (12 files)
- `tests/e2e/` - E2E tests (Playwright)
- `tests/setup.ts` - Test configuration
- `vitest.config.ts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration

## Naming Conventions

**Files:**
- kebab-case for services: `episode-service.ts`, `sync-service.ts`
- PascalCase for components: `EpisodeForm.tsx`, `Dashboard.tsx`
- use- prefix for hooks: `use-episodes.ts`
- *.test.ts for tests: `encryption.test.ts`

**Directories:**
- kebab-case for all directories
- Plural names for collections: `features/`, `components/`, `pages/`

**Special Patterns:**
- index.ts for barrel exports in each feature
- *-schema.ts for Zod validation schemas
- *-service.ts for business logic modules

## Where to Add New Code

**New Feature:**
- Primary code: `src/features/{feature-name}/`
- Components: `src/features/{feature-name}/*.tsx`
- Services: `src/features/{feature-name}/*-service.ts`
- Tests: `tests/unit/{feature-name}.test.ts`

**New Page:**
- Implementation: `src/pages/{PageName}.tsx`
- Route: Add to `src/App.tsx`
- Layout: Use existing `Layout.tsx` wrapper

**New API Integration:**
- Implementation: `src/lib/{api-name}/`
- Client: `src/lib/{api-name}/client.ts`
- Types: `src/lib/{api-name}/types.ts`
- Tests: `tests/unit/{api-name}.test.ts`

**New UI Component:**
- Shared: `src/components/{ComponentName}.tsx`
- Feature-specific: `src/features/{feature}/components/`
- Primitives: `src/components/ui/` (via shadcn CLI)

**Utilities:**
- Shared helpers: `src/lib/utils.ts`
- Type definitions: Inline or `src/lib/{domain}/types.ts`

## Special Directories

**android/**
- Purpose: Capacitor Android project
- Source: Generated by `npx cap add android`
- Committed: Yes (required for Android builds)

**mcp-server/**
- Purpose: MCP testing infrastructure
- Source: Separate npm project for autonomous debugging
- Committed: Yes

**dist/**
- Purpose: Build output
- Source: Generated by `npm run build`
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-01-11*
*Update when directory structure changes*
