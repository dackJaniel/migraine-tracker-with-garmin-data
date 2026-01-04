import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import 'fake-indexeddb/auto';

// Cleanup nach jedem Test
afterEach(() => {
  cleanup();
});
