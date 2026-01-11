# Technology Stack

**Analysis Date:** 2026-01-11

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code (`package.json`)

**Secondary:**
- JavaScript - Build scripts, config files

## Runtime

**Environment:**
- Node.js (ES Modules) - Build and development
- Browser - Web application runtime
- Android (Capacitor) - Mobile native wrapper

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 19.2.0 - UI framework (`package.json`)
- React Router DOM 7.11.0 - Client-side routing
- Capacitor 8.0.0 - Cross-platform mobile bridge (`capacitor.config.ts`)

**Testing:**
- Vitest 4.0.16 - Unit tests (`vitest.config.ts`)
- Playwright 1.57.0 - E2E tests (`playwright.config.ts`)
- @testing-library/react 16.3.1 - Component testing

**Build/Dev:**
- Vite 7.2.4 - Build tool and dev server (`vite.config.ts`)
- TypeScript 5.9.3 - Compilation and type checking
- @vitejs/plugin-react 5.1.1 - React JSX support

## Key Dependencies

**Critical:**
- Dexie 4.2.1 - IndexedDB wrapper for local database (`src/lib/db.ts`)
- dexie-encrypted 2.0.0 - Encrypted database tables
- Zustand 5.0.9 - Lightweight state management
- Zod 4.3.5 - TypeScript-first schema validation
- React Hook Form 7.70.0 - Form state management

**UI:**
- Tailwind CSS 4.1.18 - Utility-first CSS (`src/index.css`)
- Radix UI (v1.1-2.2.x) - Headless UI components
- shadcn/ui - Styled components (`components.json`)
- Lucide React 0.562.0 - Icon library
- Recharts 3.6.0 - Charting library

**Infrastructure:**
- @capacitor/core 8.0.0 - Native platform bridge
- @capacitor/android 8.0.0 - Android platform
- @capacitor/filesystem 8.0.0 - File system access
- @capacitor/preferences 8.0.0 - Device storage
- date-fns 4.1.0 - Date manipulation

## Configuration

**Environment:**
- No .env files required - configuration in source
- Development mode detection via `import.meta.env.DEV`
- Platform detection via `Capacitor.isNativePlatform()`

**Build:**
- `vite.config.ts` - Build configuration with dev proxies
- `tsconfig.json` - TypeScript configuration with path aliases (`@/*` → `./src/*`)
- `capacitor.config.ts` - App ID: `com.example.migrainetracker`

## Platform Requirements

**Development:**
- Any platform with Node.js
- No external dependencies (no Docker required)

**Production:**
- Web: Any modern browser
- Mobile: Android via Capacitor WebView
- Build output: `dist/` directory

---

*Stack analysis: 2026-01-11*
*Update after major dependency changes*
