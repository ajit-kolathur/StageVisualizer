import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AudioEngine } from '../../shared/audio-engine.js';
import type { VisualizerPlugin, AudioData } from '../../shared/types.js';

// Mock the renderer factory so plugin-manager tests don't need WebGL
vi.mock('../renderers/factory.js', () => ({
  createRenderer: vi.fn(() => ({
    type: 'shader',
    init: vi.fn().mockResolvedValue(undefined),
    render: vi.fn(),
    resize: vi.fn(),
    destroy: vi.fn(),
  })),
}));

// Mock transition manager
let fadeOutResolve: (() => void) | null;
let fadeInResolve: (() => void) | null;
vi.mock('../transition.js', () => {
  return {
    TransitionManager: class {
      fadeOut() { return new Promise<void>(r => { fadeOutResolve = r; }); }
      fadeIn() { return new Promise<void>(r => { fadeInResolve = r; }); }
    },
  };
});

const EMPTY_AUDIO: AudioData = {
  frequencyData: new Uint8Array(1024),
  timeDomainData: new Uint8Array(1024),
  bass: 0, mids: 0, treble: 0, volume: 0,
};

function mockAudioEngine(): AudioEngine {
  return { getData: () => EMPTY_AUDIO, init: vi.fn(), setGain: vi.fn(), micDenied: false } as unknown as AudioEngine;
}

function mockCanvas(): HTMLCanvasElement {
  return { width: 800, height: 600, getContext: vi.fn() } as unknown as HTMLCanvasElement;
}

const TEST_PLUGINS = [
  { id: 'test-gradient', config: { name: 'Test Gradient', type: 'shader' as const } },
];

let resizeHandlers: (() => void)[];
let rafCallbacks: ((ts: number) => void)[];

beforeEach(() => {
  resizeHandlers = [];
  rafCallbacks = [];
  fadeOutResolve = null;
  fadeInResolve = null;

  vi.stubGlobal('window', {
    addEventListener: vi.fn((event: string, handler: () => void) => {
      if (event === 'resize') resizeHandlers.push(handler);
    }),
    removeEventListener: vi.fn(),
    innerWidth: 800,
    innerHeight: 600,
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve(TEST_PLUGINS) }));
  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: (ts: number) => void) => { rafCallbacks.push(cb); return rafCallbacks.length; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('PluginManager', () => {
  async function createManager() {
    const { PluginManager } = await import('../plugin-manager.js');
    return new PluginManager(mockCanvas(), mockAudioEngine());
  }

  describe('loadPlugin', () => {
    it('fetches plugin list from /api/plugins', async () => {
      const mgr = await createManager();
      await mgr.loadPlugin('test-gradient');
      expect(fetch).toHaveBeenCalledWith('/api/plugins');
      mgr.dispose();
    });

    it('stores the active plugin entry', async () => {
      const mgr = await createManager();
      await mgr.loadPlugin('test-gradient');
      expect(mgr.activePlugin).toEqual(TEST_PLUGINS[0]);
      mgr.dispose();
    });

    it('throws for unknown plugin id', async () => {
      const mgr = await createManager();
      await expect(mgr.loadPlugin('nonexistent')).rejects.toThrow('Plugin not found');
      mgr.dispose();
    });

    it('starts the render loop', async () => {
      const mgr = await createManager();
      await mgr.loadPlugin('test-gradient');
      expect(requestAnimationFrame).toHaveBeenCalled();
      mgr.dispose();
    });

    it('destroys previous plugin before loading new one', async () => {
      const mgr = await createManager();
      await mgr.loadPlugin('test-gradient');
      await mgr.loadPlugin('test-gradient');
      expect(cancelAnimationFrame).toHaveBeenCalled();
      mgr.dispose();
    });
  });

  describe('destroyPlugin', () => {
    it('stops the render loop', async () => {
      const mgr = await createManager();
      await mgr.loadPlugin('test-gradient');
      mgr.destroyPlugin();
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it('clears active plugin', async () => {
      const mgr = await createManager();
      await mgr.loadPlugin('test-gradient');
      mgr.destroyPlugin();
      expect(mgr.activePlugin).toBeNull();
    });
  });

  describe('render loop', () => {
    it('calls plugin render on each frame', async () => {
      const mgr = await createManager();
      await mgr.loadPlugin('test-gradient');

      const mockPlugin: VisualizerPlugin = {
        type: 'shader', init: vi.fn(), render: vi.fn(), resize: vi.fn(), destroy: vi.fn(),
      };
      (mgr as unknown as { plugin: VisualizerPlugin }).plugin = mockPlugin;

      rafCallbacks[rafCallbacks.length - 1](16.67);
      expect(mockPlugin.render).toHaveBeenCalledWith(16.67, EMPTY_AUDIO);
      mgr.dispose();
    });
  });

  describe('resize', () => {
    it('calls plugin resize on window resize', async () => {
      const mgr = await createManager();
      await mgr.loadPlugin('test-gradient');

      const mockPlugin: VisualizerPlugin = {
        type: 'shader', init: vi.fn(), render: vi.fn(), resize: vi.fn(), destroy: vi.fn(),
      };
      (mgr as unknown as { plugin: VisualizerPlugin }).plugin = mockPlugin;

      (window as unknown as Record<string, number>).innerWidth = 1920;
      (window as unknown as Record<string, number>).innerHeight = 1080;
      resizeHandlers[0]();

      expect(mockPlugin.resize).toHaveBeenCalledWith(1920, 1080);
      mgr.dispose();
    });
  });

  describe('dispose', () => {
    it('removes resize listener', async () => {
      const mgr = await createManager();
      mgr.dispose();
      expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('switchPlugin', () => {
    it('performs fade-out then load then fade-in', async () => {
      const mgr = await createManager();
      await mgr.loadPlugin('test-gradient');

      const switchPromise = mgr.switchPlugin('test-gradient');
      fadeOutResolve!();
      await vi.waitFor(() => { if (!fadeInResolve) throw new Error('waiting'); });
      fadeInResolve!();
      await switchPromise;
      expect(mgr.activePlugin).toEqual(TEST_PLUGINS[0]);
      mgr.dispose();
    });

    it('skips fadeOut on first switch when no plugin is active', async () => {
      const mgr = await createManager();
      const switchPromise = mgr.switchPlugin('test-gradient');
      await vi.waitFor(() => { if (!fadeInResolve) throw new Error('waiting'); });
      fadeInResolve!();
      await switchPromise;
      expect(mgr.activePlugin).toEqual(TEST_PLUGINS[0]);
      mgr.dispose();
    });

    it('ignores switch while transition is in progress', async () => {
      const mgr = await createManager();
      const first = mgr.switchPlugin('test-gradient');
      const second = mgr.switchPlugin('test-gradient');
      await second;
      await vi.waitFor(() => { if (!fadeInResolve) throw new Error('waiting'); });
      fadeInResolve!();
      await first;
      mgr.dispose();
    });
  });

  describe('error handling', () => {
    it('resets error count on successful render', async () => {
      const mgr = await createManager();
      await mgr.loadPlugin('test-gradient');

      const mockPlugin: VisualizerPlugin = {
        type: 'shader', init: vi.fn(), render: vi.fn(), resize: vi.fn(), destroy: vi.fn(),
      };
      (mgr as unknown as { plugin: VisualizerPlugin }).plugin = mockPlugin;

      // Render a few frames successfully
      rafCallbacks[rafCallbacks.length - 1](16.67);
      rafCallbacks[rafCallbacks.length - 1](33.34);
      expect(mockPlugin.render).toHaveBeenCalledTimes(2);
      expect(mockPlugin.destroy).not.toHaveBeenCalled();
      mgr.dispose();
    });

    it('loads fallback after 3 consecutive render errors', async () => {
      const { createRenderer } = await import('../renderers/factory.js');
      const mgr = await createManager();
      await mgr.loadPlugin('test-gradient');

      const errorPlugin: VisualizerPlugin = {
        type: 'shader', init: vi.fn(), resize: vi.fn(), destroy: vi.fn(),
        render: vi.fn(() => { throw new Error('render crash'); }),
      };
      (mgr as unknown as { plugin: VisualizerPlugin }).plugin = errorPlugin;

      // Trigger 3 consecutive errors
      for (let i = 0; i < 3; i++) {
        rafCallbacks[rafCallbacks.length - 1](i * 16.67);
      }

      expect(errorPlugin.destroy).toHaveBeenCalled();
      // After fallback, a new loadPlugin call should have been made for _fallback
      expect(fetch).toHaveBeenCalledWith('/api/plugins');
      mgr.dispose();
    });

    it('calls onError callback when fallback is triggered', async () => {
      const mgr = await createManager();
      const onError = vi.fn();
      mgr.onError = onError;
      await mgr.loadPlugin('test-gradient');

      const errorPlugin: VisualizerPlugin = {
        type: 'shader', init: vi.fn(), resize: vi.fn(), destroy: vi.fn(),
        render: vi.fn(() => { throw new Error('crash'); }),
      };
      (mgr as unknown as { plugin: VisualizerPlugin }).plugin = errorPlugin;

      for (let i = 0; i < 3; i++) {
        rafCallbacks[rafCallbacks.length - 1](i * 16.67);
      }

      expect(onError).toHaveBeenCalledWith('test-gradient');
      mgr.dispose();
    });

    it('loads fallback immediately on init failure', async () => {
      const { createRenderer } = await import('../renderers/factory.js');
      const onError = vi.fn();

      // Make createRenderer return a plugin that fails on init
      (createRenderer as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        type: 'shader',
        init: vi.fn().mockRejectedValue(new Error('init crash')),
        render: vi.fn(), resize: vi.fn(), destroy: vi.fn(),
      });

      const mgr = await createManager();
      mgr.onError = onError;

      await mgr.loadPlugin('test-gradient');

      expect(onError).toHaveBeenCalledWith('test-gradient');
      mgr.dispose();
    });
  });
});
