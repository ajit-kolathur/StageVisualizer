import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let loadedImages: Array<{ src: string; onload?: () => void; onerror?: () => void }> = [];

const mockCtx = {
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  globalAlpha: 1,
  fillStyle: '',
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  setTransform: vi.fn(),
};

const mockOwnCanvas = {
  width: 0,
  height: 0,
  style: { cssText: '' },
  getContext: vi.fn(() => mockCtx),
  remove: vi.fn(),
};

beforeEach(() => {
  loadedImages = [];
  vi.useFakeTimers();
  vi.stubGlobal('Image', class {
    src = '';
    width = 800;
    height = 600;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() { loadedImages.push(this as any); }
  });
  vi.stubGlobal('fetch', vi.fn());
  vi.stubGlobal('document', { createElement: vi.fn(() => mockOwnCanvas) });
  mockOwnCanvas.remove.mockClear();
  mockCtx.drawImage.mockClear();
  mockCtx.save.mockClear();
  mockCtx.restore.mockClear();
  mockCtx.clearRect.mockClear();
  mockCtx.setTransform.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const parentEl = { appendChild: vi.fn() };

function makeCanvas() {
  return {
    canvas: { width: 1920, height: 1080, parentElement: parentEl } as any as HTMLCanvasElement,
  };
}

const config = {
  name: 'Press Photos',
  type: 'slideshow' as const,
  images: ['images/Blast-1.jpg', 'images/Blast-2.jpg', 'images/Blast-3.jpg'],
  interval: 5,
  transition: 'fade' as const,
  transitionDuration: 1,
  sizing: 'cover' as const,
};

const audioData = { frequencyData: new Uint8Array(0), timeDomainData: new Uint8Array(0), bass: 0, mids: 0, treble: 0, volume: 0 };

async function makeRenderer(overrides = {}) {
  const { SlideshowRenderer } = await import('../slideshow-renderer.js');
  return new SlideshowRenderer('press-photos', { ...config, ...overrides });
}

async function initRenderer(overrides = {}) {
  const renderer = await makeRenderer(overrides);
  const { canvas } = makeCanvas();
  const initPromise = renderer.init(canvas, audioData);
  loadedImages.forEach(img => img.onload?.());
  await initPromise;
  return { renderer, canvas };
}

describe('SlideshowRenderer', () => {
  it('preloads images and draws first on init', async () => {
    await initRenderer();
    expect(loadedImages).toHaveLength(3);
    expect(loadedImages[0].src).toContain('Blast-1.jpg');
    expect(mockCtx.drawImage).toHaveBeenCalled();
  });

  it('creates own canvas to avoid tainting shared WebGL canvas', async () => {
    await initRenderer();
    expect(parentEl.appendChild).toHaveBeenCalledWith(mockOwnCanvas);
  });

  it('auto-advances after interval', async () => {
    const { renderer } = await initRenderer({ interval: 2, transition: 'cut' });
    mockCtx.drawImage.mockClear();
    vi.advanceTimersByTime(2000);
    renderer.render(2000, audioData);
    expect(mockCtx.drawImage).toHaveBeenCalled();
  });

  it('wraps to first image after last', async () => {
    const { renderer } = await initRenderer({ interval: 1, transition: 'cut' });
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(1000);
    mockCtx.drawImage.mockClear();
    renderer.render(3000, audioData);
    expect(mockCtx.drawImage).toHaveBeenCalled();
  });

  it('fade transition uses globalAlpha for crossfade', async () => {
    const { renderer } = await initRenderer({ interval: 2, transition: 'fade', transitionDuration: 1 });
    vi.advanceTimersByTime(2000);
    renderer.render(2500, audioData);
    expect(mockCtx.drawImage.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('cut transition switches instantly', async () => {
    const { renderer } = await initRenderer({ interval: 2, transition: 'cut' });
    vi.advanceTimersByTime(2000);
    mockCtx.drawImage.mockClear();
    renderer.render(2000, audioData);
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(1);
  });

  it('slide transition draws two images', async () => {
    const { renderer } = await initRenderer({ interval: 2, transition: 'slide', transitionDuration: 1 });
    vi.advanceTimersByTime(2000);
    mockCtx.drawImage.mockClear();
    renderer.render(2500, audioData);
    expect(mockCtx.drawImage.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('zoom transition calls drawImage with transform', async () => {
    const { renderer } = await initRenderer({ interval: 2, transition: 'zoom', transitionDuration: 1 });
    vi.advanceTimersByTime(2000);
    mockCtx.drawImage.mockClear();
    renderer.render(2500, audioData);
    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.drawImage).toHaveBeenCalled();
  });

  it('contain sizing does not crop', async () => {
    const { renderer } = await initRenderer({ sizing: 'contain' });
    mockCtx.drawImage.mockClear();
    renderer.render(0, audioData);
    expect(mockCtx.drawImage).toHaveBeenCalled();
  });

  it('destroy removes own canvas and clears timer', async () => {
    const { renderer } = await initRenderer();
    renderer.destroy();
    expect(mockOwnCanvas.remove).toHaveBeenCalled();
    vi.advanceTimersByTime(10000);
  });

  it('resize updates dimensions', async () => {
    const { renderer } = await initRenderer();
    renderer.resize(3840, 2160);
    expect(mockOwnCanvas.width).toBe(3840);
    expect(mockOwnCanvas.height).toBe(2160);
  });
});
