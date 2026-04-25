import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AudioData } from '../../../shared/types.js';

const EMPTY_AUDIO: AudioData = {
  frequencyData: new Uint8Array(1024),
  timeDomainData: new Uint8Array(1024),
  bass: 0, mids: 0, treble: 0, volume: 0,
};

function createMockGL() {
  const gl: Record<string, unknown> = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    LINK_STATUS: 35714,
    COMPILE_STATUS: 35713,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    TRIANGLE_STRIP: 5,
    TEXTURE_2D: 3553,
    TEXTURE0: 33984,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    LINEAR: 9729,
    CLAMP_TO_EDGE: 33071,
    LUMINANCE: 6409,
    UNSIGNED_BYTE: 5121,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),
    createVertexArray: vi.fn(() => ({})),
    bindVertexArray: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    useProgram: vi.fn(),
    getUniformLocation: vi.fn((_, name: string) => name),
    createTexture: vi.fn(() => ({})),
    activeTexture: vi.fn(),
    bindTexture: vi.fn(),
    texParameteri: vi.fn(),
    texImage2D: vi.fn(),
    uniform1i: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    viewport: vi.fn(),
    drawArrays: vi.fn(),
    deleteProgram: vi.fn(),
    deleteTexture: vi.fn(),
    deleteVertexArray: vi.fn(),
  };
  return gl as unknown as WebGL2RenderingContext;
}

let mockGL: WebGL2RenderingContext;

beforeEach(() => {
  mockGL = createMockGL();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ text: () => Promise.resolve('precision mediump float;\nvoid main() { gl_FragColor = vec4(1.0); }') }));
  vi.stubGlobal('performance', { now: () => 0 });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ShaderRenderer', () => {
  function mockCanvas() {
    return { width: 800, height: 600, getContext: vi.fn(() => mockGL) } as unknown as HTMLCanvasElement;
  }

  async function createRenderer() {
    const { ShaderRenderer } = await import('../shader-renderer.js');
    const r = new ShaderRenderer('test-gradient', { name: 'Test', type: 'shader', shader: 'shader.frag' });
    await r.init(mockCanvas(), EMPTY_AUDIO);
    return r;
  }

  describe('init()', () => {
    it('fetches the fragment shader source', async () => {
      await createRenderer();
      expect(fetch).toHaveBeenCalledWith('/plugins/test-gradient/shader.frag');
    });

    it('compiles and links the shader program', async () => {
      await createRenderer();
      expect(mockGL.createShader).toHaveBeenCalledTimes(2);
      expect(mockGL.linkProgram).toHaveBeenCalled();
    });

    it('sets up the fullscreen quad VAO', async () => {
      await createRenderer();
      expect(mockGL.createVertexArray).toHaveBeenCalled();
      expect(mockGL.bufferData).toHaveBeenCalled();
    });

    it('creates frequency data texture', async () => {
      await createRenderer();
      expect(mockGL.createTexture).toHaveBeenCalled();
    });

    it('throws on shader compile error', async () => {
      (mockGL.getShaderParameter as ReturnType<typeof vi.fn>).mockReturnValue(false);
      (mockGL.getShaderInfoLog as ReturnType<typeof vi.fn>).mockReturnValue('bad shader');
      const { ShaderRenderer } = await import('../shader-renderer.js');
      const r = new ShaderRenderer('test', { name: 'T', type: 'shader', shader: 's.frag' });
      await expect(r.init(mockCanvas(), EMPTY_AUDIO)).rejects.toThrow('Shader compile error');
    });
  });

  describe('render()', () => {
    it('sets audio uniforms and draws', async () => {
      const r = await createRenderer();
      const audio = { ...EMPTY_AUDIO, bass: 0.5, mids: 0.3, treble: 0.7, volume: 0.6 };
      r.render(1000, audio);
      expect(mockGL.uniform1f).toHaveBeenCalled();
      expect(mockGL.drawArrays).toHaveBeenCalledWith(mockGL.TRIANGLE_STRIP, 0, 4);
    });

    it('uploads frequency data as texture', async () => {
      const r = await createRenderer();
      r.render(1000, EMPTY_AUDIO);
      expect(mockGL.texImage2D).toHaveBeenCalled();
    });
  });

  describe('resize()', () => {
    it('updates viewport and resolution uniform', async () => {
      const r = await createRenderer();
      r.resize(1920, 1080);
      expect(mockGL.viewport).toHaveBeenCalledWith(0, 0, 1920, 1080);
      expect(mockGL.uniform2f).toHaveBeenCalledWith('u_resolution', 1920, 1080);
    });
  });

  describe('destroy()', () => {
    it('deletes all WebGL resources', async () => {
      const r = await createRenderer();
      r.destroy();
      expect(mockGL.deleteProgram).toHaveBeenCalled();
      expect(mockGL.deleteTexture).toHaveBeenCalled();
      expect(mockGL.deleteVertexArray).toHaveBeenCalled();
    });
  });
});
