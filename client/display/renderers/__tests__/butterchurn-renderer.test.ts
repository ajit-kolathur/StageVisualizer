import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockVisualizer = {
  connectAudio: vi.fn(),
  loadPreset: vi.fn(),
  render: vi.fn(),
  setRendererSize: vi.fn(),
};

vi.mock('butterchurn', () => ({
  default: {
    default: {
      createVisualizer: vi.fn(() => mockVisualizer),
    },
  },
}));

const mockPreset = { baseVals: { rating: 5 } };
const mockBundlePreset = { baseVals: { rating: 3 }, shapes: [] };

vi.mock('butterchurn-presets', () => ({
  default: { getPresets: () => ({ 'Flexi - mindblob': mockBundlePreset }) },
}));
vi.mock('butterchurn-presets/lib/butterchurnPresetsExtra.min', () => ({
  default: { getPresets: () => ({ 'Extra Preset': { baseVals: {} } }) },
}));
vi.mock('butterchurn-presets/lib/butterchurnPresetsExtra2.min', () => ({
  default: { getPresets: () => ({ 'Extra2 Preset': { baseVals: {} } }) },
}));

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(mockPreset) })
  ));
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ButterchurnRenderer', () => {
  const mockAudioEngine = {
    audioContext: {} as AudioContext,
    sourceNode: {} as MediaStreamAudioSourceNode,
  };

  async function makeRenderer() {
    const { ButterchurnRenderer } = await import('../butterchurn-renderer.js');
    return new ButterchurnRenderer('milkdrop-cosmic', {
      name: 'MilkDrop Cosmic',
      type: 'butterchurn',
      preset: 'Flexi - mindblob',
      blendTime: 2,
    }, mockAudioEngine as any);
  }

  const canvas = { width: 800, height: 600 } as HTMLCanvasElement;
  const audioData = { frequencyData: new Uint8Array(0), timeDomainData: new Uint8Array(0), bass: 0, mids: 0, treble: 0, volume: 0 };

  it('creates visualizer and loads preset on init', async () => {
    const renderer = await makeRenderer();
    await renderer.init(canvas, audioData);

    const butterchurn = (await import('butterchurn')).default.default;
    expect(butterchurn.createVisualizer).toHaveBeenCalled();
    expect(mockVisualizer.connectAudio).toHaveBeenCalled();
    expect(mockVisualizer.loadPreset).toHaveBeenCalledWith(mockPreset, 2);
  });

  it('calls visualizer.render() on render', async () => {
    const renderer = await makeRenderer();
    await renderer.init(canvas, audioData);
    renderer.render(0, audioData);
    expect(mockVisualizer.render).toHaveBeenCalled();
  });

  it('calls setRendererSize on resize', async () => {
    const renderer = await makeRenderer();
    await renderer.init(canvas, audioData);
    renderer.resize(1920, 1080);
    expect(mockVisualizer.setRendererSize).toHaveBeenCalledWith(1920, 1080);
  });

  it('does not call visualizer.render after destroy', async () => {
    const renderer = await makeRenderer();
    await renderer.init(canvas, audioData);
    renderer.destroy();
    mockVisualizer.render.mockClear();
    renderer.render(0, audioData);
    expect(mockVisualizer.render).not.toHaveBeenCalled();
  });

  it('loads preset from bundles for virtual plugin (butterchurn: prefix)', async () => {
    const { ButterchurnRenderer } = await import('../butterchurn-renderer.js');
    const renderer = new ButterchurnRenderer('butterchurn:Flexi - mindblob', {
      name: 'Flexi - mindblob',
      type: 'butterchurn',
      preset: 'Flexi - mindblob',
      blendTime: 2,
    }, mockAudioEngine as any);
    await renderer.init(canvas, audioData);

    expect(fetch).not.toHaveBeenCalled();
    expect(mockVisualizer.loadPreset).toHaveBeenCalledWith(mockBundlePreset, 2);
  });

  it('still fetches preset.json for physical plugin (no prefix)', async () => {
    const renderer = await makeRenderer();
    await renderer.init(canvas, audioData);

    expect(fetch).toHaveBeenCalledWith('/plugins/milkdrop-cosmic/preset.json');
    expect(mockVisualizer.loadPreset).toHaveBeenCalledWith(mockPreset, 2);
  });

  it('throws when virtual preset not found in bundles', async () => {
    const { ButterchurnRenderer } = await import('../butterchurn-renderer.js');
    const renderer = new ButterchurnRenderer('butterchurn:Nonexistent Preset', {
      name: 'Nonexistent',
      type: 'butterchurn',
      preset: 'Nonexistent Preset',
      blendTime: 2,
    }, mockAudioEngine as any);

    await expect(renderer.init(canvas, audioData)).rejects.toThrow('Preset not found');
  });
});
