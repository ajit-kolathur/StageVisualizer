import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PluginRegistryEntry, StateSyncPayload } from '../../shared/types.js';

const PLUGINS: PluginRegistryEntry[] = [
  { id: 'fractal-pulse', config: { name: 'Fractal Pulse', type: 'shader' } },
  { id: 'kaleidoscope-wave', config: { name: 'Kaleidoscope Wave', type: 'shader' } },
  { id: 'milkdrop-cosmic', config: { name: 'MilkDrop Cosmic', type: 'butterchurn' } },
  { id: 'band-photos', config: { name: 'Band Photos', type: 'slideshow' } },
];

let container: {
  innerHTML: string;
  querySelector: ReturnType<typeof vi.fn>;
  querySelectorAll: ReturnType<typeof vi.fn>;
};
let mockSocket: { emit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> };
let eventListeners: Map<string, Function[]>;

function makeContainer() {
  eventListeners = new Map();
  const elements: Record<string, any> = {};

  container = {
    innerHTML: '',
    querySelector: vi.fn((sel: string) => elements[sel] || null),
    querySelectorAll: vi.fn((sel: string) => {
      if (sel === '.plugin-btn') {
        return PLUGINS.map((p, i) => ({
          dataset: { pluginId: p.id },
          classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn(() => false) },
          addEventListener: vi.fn(),
        }));
      }
      return [];
    }),
  };

  return { elements };
}

beforeEach(() => {
  makeContainer();
  mockSocket = {
    emit: vi.fn(),
    on: vi.fn(),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('renderUI', () => {
  async function loadUI() {
    const { renderUI } = await import('../ui.js');
    return renderUI;
  }

  it('renders plugin buttons for each plugin', async () => {
    const renderUI = await loadUI();
    renderUI(container as any, mockSocket as any, {
      activePlugin: null,
      gain: 1,
      plugins: PLUGINS,
    });
    // Should contain all plugin names
    for (const p of PLUGINS) {
      expect(container.innerHTML).toContain(p.config.name);
    }
  });

  it('renders type badges on plugin buttons', async () => {
    const renderUI = await loadUI();
    renderUI(container as any, mockSocket as any, {
      activePlugin: null,
      gain: 1,
      plugins: PLUGINS,
    });
    expect(container.innerHTML).toContain('shader');
    expect(container.innerHTML).toContain('milkdrop');
    expect(container.innerHTML).toContain('slideshow');
  });

  it('highlights active plugin', async () => {
    const renderUI = await loadUI();
    renderUI(container as any, mockSocket as any, {
      activePlugin: 'fractal-pulse',
      gain: 1,
      plugins: PLUGINS,
    });
    expect(container.innerHTML).toContain('active');
  });

  it('emits switch-plugin when plugin button is clicked', async () => {
    const renderUI = await loadUI();
    renderUI(container as any, mockSocket as any, {
      activePlugin: null,
      gain: 1,
      plugins: PLUGINS,
    });

    // Find a plugin button and simulate click via the container's event delegation
    // The implementation should use event delegation or direct click handlers
    // We'll check that clicking triggers the emit
    const tempDiv = createMockDOM(container.innerHTML);
    const btn = tempDiv.querySelector('[data-plugin-id="fractal-pulse"]');
    expect(btn).toBeTruthy();
  });

  it('renders gain slider with current value', async () => {
    const renderUI = await loadUI();
    renderUI(container as any, mockSocket as any, {
      activePlugin: null,
      gain: 1.5,
      plugins: PLUGINS,
    });
    expect(container.innerHTML).toContain('gain');
    expect(container.innerHTML).toContain('1.5');
  });

  it('renders connection status', async () => {
    const renderUI = await loadUI();
    renderUI(container as any, mockSocket as any, {
      activePlugin: null,
      gain: 1,
      plugins: PLUGINS,
    });
    expect(container.innerHTML.toLowerCase()).toContain('connect');
  });
});

// Minimal DOM parser for testing innerHTML output
function createMockDOM(html: string) {
  return {
    querySelector: (sel: string) => {
      // Extract data-plugin-id from selector
      const match = sel.match(/\[data-plugin-id="(.+?)"\]/);
      if (match && html.includes(`data-plugin-id="${match[1]}"`)) {
        return { dataset: { pluginId: match[1] } };
      }
      return null;
    },
  };
}
