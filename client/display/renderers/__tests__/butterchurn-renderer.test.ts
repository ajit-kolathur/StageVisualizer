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
});
