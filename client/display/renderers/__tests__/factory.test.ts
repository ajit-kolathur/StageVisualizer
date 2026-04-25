import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('createRenderer', () => {
  it('returns ShaderRenderer for shader type', async () => {
    const { createRenderer } = await import('../factory.js');
    const r = createRenderer('test', { name: 'T', type: 'shader', shader: 's.frag' } as any);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('shader');
  });

  it('returns SlideshowRenderer for slideshow type', async () => {
    const { createRenderer } = await import('../factory.js');
    const r = createRenderer('test', { name: 'T', type: 'slideshow', images: [], interval: 5, transition: 'fade' } as any);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('slideshow');
  });

  it('returns ThreejsRenderer for threejs type', async () => {
    const { createRenderer } = await import('../factory.js');
    const r = createRenderer('test', { name: 'T', type: 'threejs', scene: 'scene.js' } as any);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('threejs');
  });

  it('returns null for unsupported type', async () => {
    const { createRenderer } = await import('../factory.js');
    const r = createRenderer('test', { name: 'T', type: 'butterchurn', preset: 'x' } as any);
    expect(r).toBeNull();
  });
});
