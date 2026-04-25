// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PluginRegistryEntry } from '../../shared/types.js';

const PLUGINS: PluginRegistryEntry[] = [
  { id: 'fractal-pulse', config: { name: 'Fractal Pulse', type: 'shader' } },
  { id: 'kaleidoscope-wave', config: { name: 'Kaleidoscope Wave', type: 'shader' } },
  { id: 'butterchurn:Flexi - mindblob', config: { name: 'Flexi - mindblob', type: 'butterchurn' } },
  { id: 'butterchurn:Zylot - True Visionary', config: { name: 'Zylot - True Visionary', type: 'butterchurn' } },
  { id: 'band-photos', config: { name: 'Band Photos', type: 'slideshow' } },
];

let container: HTMLDivElement;
let mockSocket: { emit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> };

beforeEach(() => {
  container = document.createElement('div');
  mockSocket = { emit: vi.fn(), on: vi.fn() };
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
    renderUI(container, mockSocket as any, { activePlugin: null, gain: 1, plugins: PLUGINS });
    for (const p of PLUGINS) {
      expect(container.innerHTML).toContain(p.config.name);
    }
  });

  it('renders type badges on plugin buttons', async () => {
    const renderUI = await loadUI();
    renderUI(container, mockSocket as any, { activePlugin: null, gain: 1, plugins: PLUGINS });
    expect(container.innerHTML).toContain('shader');
    expect(container.innerHTML).toContain('milkdrop');
    expect(container.innerHTML).toContain('slideshow');
  });

  it('highlights active plugin', async () => {
    const renderUI = await loadUI();
    renderUI(container, mockSocket as any, { activePlugin: 'fractal-pulse', gain: 1, plugins: PLUGINS });
    expect(container.innerHTML).toContain('active');
  });

  it('renders gain slider with current value', async () => {
    const renderUI = await loadUI();
    renderUI(container, mockSocket as any, { activePlugin: null, gain: 1.5, plugins: PLUGINS });
    expect(container.innerHTML).toContain('1.5');
  });

  it('renders connection status', async () => {
    const renderUI = await loadUI();
    renderUI(container, mockSocket as any, { activePlugin: null, gain: 1, plugins: PLUGINS });
    expect(container.innerHTML.toLowerCase()).toContain('connect');
  });

  it('shows error notification when errorPluginId is set', async () => {
    const renderUI = await loadUI();
    renderUI(container, mockSocket as any, { activePlugin: null, gain: 1, plugins: PLUGINS, errorPluginId: 'fractal-pulse' });
    expect(container.innerHTML.toLowerCase()).toContain('error');
    expect(container.innerHTML).toContain('Fractal Pulse');
  });

  it('groups plugins by type with section headers showing count', async () => {
    const renderUI = await loadUI();
    renderUI(container, mockSocket as any, { activePlugin: null, gain: 1, plugins: PLUGINS });
    expect(container.innerHTML).toContain('Shaders (2)');
    expect(container.innerHTML).toContain('MilkDrop (2)');
    expect(container.innerHTML).toContain('Slideshows (1)');
  });

  it('strips butterchurn: prefix from display names', async () => {
    const renderUI = await loadUI();
    renderUI(container, mockSocket as any, { activePlugin: null, gain: 1, plugins: PLUGINS });
    const names = container.querySelectorAll('.plugin-name');
    const nameTexts = Array.from(names).map(n => n.textContent);
    expect(nameTexts).toContain('Flexi - mindblob');
    expect(nameTexts.some(t => t?.startsWith('butterchurn:'))).toBe(false);
  });

  it('renders a search input', async () => {
    const renderUI = await loadUI();
    renderUI(container, mockSocket as any, { activePlugin: null, gain: 1, plugins: PLUGINS });
    const input = container.querySelector('.search-input');
    expect(input).toBeTruthy();
  });

  it('MilkDrop section starts collapsed', async () => {
    const renderUI = await loadUI();
    renderUI(container, mockSocket as any, { activePlugin: null, gain: 1, plugins: PLUGINS });
    const milkdropSection = container.querySelector('[data-type="butterchurn"]');
    expect(milkdropSection).toBeTruthy();
    const pluginList = milkdropSection!.querySelector('.section-plugins');
    expect(pluginList!.classList.contains('collapsed')).toBe(true);
  });
});
