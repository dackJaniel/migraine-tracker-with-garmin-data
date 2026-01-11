# Coding Conventions

**Analysis Date:** 2026-01-11

## Naming Patterns

**Files:**
- kebab-case for services: `episode-service.ts`, `backup-service.ts`
- PascalCase for components: `EpisodeForm.tsx`, `WeatherCard.tsx`
- use- prefix for hooks: `use-episodes.ts`
- *-schema.ts for validation: `episode-schema.ts`
- index.ts for barrel exports

**Functions:**
- camelCase for all functions: `createEpisode()`, `syncAllMissingData()`
- Async functions: No special prefix
- Handlers: handle prefix: `handleSubmit`, `handleClick`

**Variables:**
- camelCase for variables: `episodes`, `garminData`
- SCREAMING_SNAKE_CASE for constants: `PBKDF2_ITERATIONS`, `MAX_REQUESTS_PER_MINUTE`
- No underscore prefix for private members

**Types:**
- PascalCase for interfaces: `Episode`, `GarminData`, `WeatherData`
- PascalCase for type aliases: `CorrelationResult`, `EpisodeFormData`
- No I prefix for interfaces

## Code Style

**Formatting:**
- Prettier with `.prettierrc.json`
- Print width: 80 characters
- Single quotes for strings
- Semicolons required
- 2 space indentation
- Trailing commas: ES5 compatible
- LF line endings

**Linting:**
- ESLint with `eslint.config.js` (flat config)
- TypeScript ESLint for strict type checking
- `@typescript-eslint/no-explicit-any`: Error
- React Hooks and React Refresh plugins
- Prettier integration via eslint-plugin-prettier

## Import Organization

**Order:**
1. React and React libraries (react, react-dom, react-router-dom)
2. External packages (date-fns, zod, dexie)
3. Internal modules (@/lib, @/features)
4. Relative imports (./utils, ../types)
5. Type imports (import type { })

**Grouping:**
- Blank line between groups
- Alphabetical within each group

**Path Aliases:**
- `@/` maps to `src/`
- Used throughout: `@/lib/db`, `@/components/ui`, `@/hooks`

## Error Handling

**Patterns:**
- Throw errors, catch at boundaries
- ErrorBoundary wraps entire app
- Services throw Error with descriptive messages
- Use try/catch, avoid .catch() chains

**Error Types:**
- Throw on invalid input, missing dependencies
- Log error with context before throwing
- Include cause in error message when wrapping

**Logging:**
- `logAuth()` for authentication events (saves to DB + console)
- `logSync()` for sync operations
- `addLog()` helper for general logging
- Avoid bare console.log in production code

## Logging

**Framework:**
- Custom logging to Dexie `logs` table
- Console output for development
- Structured logs with timestamps

**Patterns:**
- Log at service boundaries
- Log state transitions and external API calls
- Include context: `[Garmin Auth] message`, `[Garmin Sync] message`

## Comments

**When to Comment:**
- Explain why, not what
- Document business rules (German domain language used)
- Explain non-obvious algorithms or workarounds
- Mark areas needing attention: `// TODO:`, `// FIXME:`

**JSDoc/TSDoc:**
- Required for public API functions
- German comments for domain-specific logic
- Use `@param`, `@returns`, `@throws` tags

**TODO Comments:**
- Format: `// TODO: description`
- Some existing TODOs in codebase for future improvements

## Function Design

**Size:**
- Keep under 50 lines where practical
- Extract helpers for complex logic
- Note: Some large files exist (auth.ts: 1238 lines)

**Parameters:**
- Max 3-4 parameters
- Use options object for more: `function create(options: CreateOptions)`
- Destructure in parameter list

**Return Values:**
- Explicit return statements
- Return early for guard clauses
- Use `| null` for optional returns (not undefined)

## Module Design

**Exports:**
- Named exports preferred
- Default exports only for React page components
- Export public API from index.ts barrel files

**Barrel Files:**
- index.ts re-exports public API per feature
- Keep internal helpers private
- Avoid circular dependencies

## React Patterns

**Components:**
- Functional components with hooks
- Props destructured in parameter list
- Event handlers defined inside component

**State:**
- Local state via useState
- Form state via React Hook Form
- Persistent data via Dexie hooks

**Hooks:**
- Custom hooks for data fetching
- useLiveQuery for reactive DB subscriptions
- Memoization where beneficial

---

*Convention analysis: 2026-01-11*
*Update when patterns change*
