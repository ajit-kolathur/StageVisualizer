import { describe, it, expect, vi, afterEach } from 'vitest';

const mockRenderer = {
  setSize: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
  setPixelRatio: vi.fn(),
};

const mockScene: any = {};
const mockCamera: any = { aspect: 1, updateProjectionMatrix: vi.fn() };

const mockState = { particles: [] };
const mockSetup = vi.fn(() => mockState);
const mockUpdate = vi.fn();

vi.mock('three', () => ({
  Scene: vi.fn(() => mockScene),
  PerspectiveCamera: vi.fn(() => mockCamera),
  WebGLRenderer: vi.fn(() => mockRenderer),
}));

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('ThreejsRenderer', () => {
  const config = { name: 'Particle Storm', type: 'threejs' as const, scene: 'scene.js' };
  const canvas = { width: 800, height: 600 } as HTMLCanvasElement;
  const audioData = { frequencyData: new Uint8Array(0), timeDomainData: new Uint8Array(0), bass: 0, mids: 0, treble: 0, volume: 0 };

  async function makeRenderer() {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve('export function setup() {} export function update() {}') })
    ));

    const { ThreejsRenderer } = await import('../threejs-renderer.js');
    const r = new ThreejsRenderer('particle-storm', config);
    // Inject mock scene module to avoid blob URL import
    (r as any)._loadSceneModule = vi.fn(() => Promise.resolve({ setup: mockSetup, update: mockUpdate }));
    return r;
  }

  it('creates Scene, Camera, WebGLRenderer on init', async () => {
    const renderer = await makeRenderer();
    await renderer.init(canvas, audioData);

    const THREE = await import('three');
    expect(THREE.Scene).toHaveBeenCalled();
    expect(THREE.PerspectiveCamera).toHaveBeenCalled();
    expect(THREE.WebGLRenderer).toHaveBeenCalledWith(expect.objectContaining({ canvas }));
    expect(mockRenderer.setSize).toHaveBeenCalledWith(800, 600, false);
  });

  it('loads scene module and calls setup with THREE', async () => {
    const renderer = await makeRenderer();
    await renderer.init(canvas, audioData);
    expect(mockSetup).toHaveBeenCalledWith(expect.anything(), mockScene, mockCamera);
  });

  it('calls update then renderer.render on render', async () => {
    const renderer = await makeRenderer();
    await renderer.init(canvas, audioData);
    renderer.render(1000, audioData);
    expect(mockUpdate).toHaveBeenCalledWith(mockState, audioData, 1000);
    expect(mockRenderer.render).toHaveBeenCalledWith(mockScene, mockCamera);
  });

  it('updates camera aspect and renderer size on resize', async () => {
    const renderer = await makeRenderer();
    await renderer.init(canvas, audioData);
    renderer.resize(1920, 1080);
    expect(mockCamera.aspect).toBe(1920 / 1080);
    expect(mockCamera.updateProjectionMatrix).toHaveBeenCalled();
    expect(mockRenderer.setSize).toHaveBeenCalledWith(1920, 1080, false);
  });

  it('disposes renderer on destroy', async () => {
    const renderer = await makeRenderer();
    await renderer.init(canvas, audioData);
    renderer.destroy();
    expect(mockRenderer.dispose).toHaveBeenCalled();
  });

  it('render is no-op after destroy', async () => {
    const renderer = await makeRenderer();
    await renderer.init(canvas, audioData);
    renderer.destroy();
    mockRenderer.render.mockClear();
    mockUpdate.mockClear();
    renderer.render(2000, audioData);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockRenderer.render).not.toHaveBeenCalled();
  });
});
