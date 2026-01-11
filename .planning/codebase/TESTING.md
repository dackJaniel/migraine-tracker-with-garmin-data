# Testing Patterns

**Analysis Date:** 2026-01-11

## Test Framework

**Runner:**
- Vitest 4.0.16
- Config: `vitest.config.ts` in project root

**Assertion Library:**
- Vitest built-in expect
- @testing-library/jest-dom matchers

**Run Commands:**
```bash
npm test                              # Run all tests (watch mode)
npm run test:ui                       # Vitest with UI dashboard
npm run test:coverage                 # Generate coverage report
npm run test:e2e                      # Run Playwright E2E tests
npm run test:e2e:ui                   # Playwright with UI
```

## Test File Organization

**Location:**
- Dedicated `tests/` directory (not colocated)
- Unit tests: `tests/unit/*.test.ts`
- E2E tests: `tests/e2e/` (configured, currently empty)

**Naming:**
- Unit tests: `{feature-name}.test.ts`
- No distinction between unit/integration in filename

**Structure:**
```
tests/
├── unit/
│   ├── encryption.test.ts
│   ├── db.test.ts
│   ├── garmin-sync.test.ts
│   ├── garmin-client.test.ts
│   ├── garmin-endpoints.test.ts
│   ├── correlation-service.test.ts
│   ├── weather-client.test.ts
│   ├── weather-correlation.test.ts
│   ├── symptom-service.test.ts
│   ├── intensity-history.test.ts
│   ├── night-onset.test.ts
│   └── backup-service.test.ts
├── e2e/                              # Playwright E2E tests
└── setup.ts                          # Test configuration
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Feature/Service Name', () => {
    beforeEach(async () => {
        // Setup test data, clear DB
        await db.episodes.clear();
    });

    describe('Specific Function', () => {
        it('should do expected behavior', async () => {
            // Arrange
            const testData = { ... };

            // Act
            const result = await functionUnderTest(testData);

            // Assert
            expect(result).toBe(expectedValue);
        });
    });
});
```

**Patterns:**
- Use beforeEach for per-test setup
- Use afterEach to restore mocks: `vi.restoreAllMocks()`
- Explicit arrange/act/assert in complex tests
- One assertion focus per test (multiple expects OK)

## Mocking

**Framework:**
- Vitest built-in mocking (vi)
- Module mocking via vi.mock() at top of test file

**Patterns:**
```typescript
import { vi } from 'vitest';

// Mock module
vi.mock('@/lib/garmin/endpoints', () => ({
    getSleepData: vi.fn().mockResolvedValue({ ... }),
    getStressData: vi.fn().mockResolvedValue({ ... }),
}));

// Use in test
const mockFn = vi.mocked(getSleepData);
mockFn.mockResolvedValue({ sleepScore: 85 });
expect(mockFn).toHaveBeenCalledWith('2026-01-11');
```

**What to Mock:**
- External API calls (Garmin, Weather)
- File system operations
- IndexedDB (via fake-indexeddb)
- Time/dates when needed

**What NOT to Mock:**
- Internal pure functions
- Simple utilities
- Database operations (use fake-indexeddb instead)

## Fixtures and Factories

**Test Data:**
```typescript
// Factory functions in test file
function createTestEpisode(overrides?: Partial<Episode>): Episode {
    return {
        id: 1,
        startTime: new Date().toISOString(),
        intensity: 5,
        triggers: [],
        medicines: [],
        ...overrides
    };
}
```

**Location:**
- Factory functions: Define in test file near usage
- Shared fixtures: `tests/fixtures/` if needed
- Mock data: Inline in test when simple

## Coverage

**Requirements:**
- No enforced coverage target
- Coverage tracked for awareness
- Focus on critical paths

**Configuration:**
```typescript
// vitest.config.ts
coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    exclude: ['node_modules/', 'tests/', '**/*.d.ts', '**/*.config.*', '**/dist/**']
}
```

**View Coverage:**
```bash
npm run test:coverage
# Open coverage/index.html
```

## Test Types

**Unit Tests:**
- Scope: Single function/service in isolation
- Mocking: Mock external dependencies
- Speed: Each test <100ms
- Examples: `encryption.test.ts`, `db.test.ts`

**Integration Tests:**
- Scope: Multiple modules together
- Mocking: Only external APIs
- Examples: `garmin-sync.test.ts` (service + endpoints)

**E2E Tests:**
- Framework: Playwright
- Scope: Full user flows
- Location: `tests/e2e/`
- Status: Configured but no tests yet

## Common Patterns

**Async Testing:**
```typescript
it('should handle async operation', async () => {
    const result = await asyncFunction();
    expect(result).toBe('expected');
});
```

**Error Testing:**
```typescript
it('should throw on invalid input', () => {
    expect(() => functionCall(null)).toThrow('error message');
});

// Async error
it('should reject on failure', async () => {
    await expect(asyncCall()).rejects.toThrow('error message');
});
```

**Database Testing:**
```typescript
import 'fake-indexeddb/auto';
import { db } from '@/lib/db';

beforeEach(async () => {
    await db.episodes.clear();
    await db.garminData.clear();
});

it('should save to database', async () => {
    const id = await db.episodes.add(testEpisode);
    const saved = await db.episodes.get(id);
    expect(saved).toMatchObject(testEpisode);
});
```

**Snapshot Testing:**
- Not used in this codebase
- Prefer explicit assertions for clarity

## Playwright Configuration

```typescript
// playwright.config.ts
{
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure'
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI
    }
}
```

---

*Testing analysis: 2026-01-11*
*Update when test patterns change*
