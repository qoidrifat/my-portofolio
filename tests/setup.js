import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Smart-router tests build their capability registry from OPENCODE_CONFIG_DIR.
// Left unset, that resolves to the developer's ~/.config/opencode, so the suite
// passed locally and failed on CI where no such directory exists. Point it at
// the sanitised fixture instead: deterministic on every machine, no machine
// config, no credentials.
process.env.OPENCODE_CONFIG_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'opencode'
);

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver = IntersectionObserverMock;

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });
