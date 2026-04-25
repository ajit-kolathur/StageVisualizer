import type { AudioData, ShaderPluginConfig, VisualizerPlugin } from '../../shared/types.js';

const VERTEX_SRC = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

export class ShaderRenderer implements VisualizerPlugin {
  readonly type = 'shader' as const;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private freqTex: WebGLTexture | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private startTime = 0;

  constructor(private pluginId: string, private config: ShaderPluginConfig) {}

  async init(canvas: HTMLCanvasElement, _audioData: AudioData): Promise<void> {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) throw new Error('WebGL 2 not supported');
    this.gl = gl;
    this.startTime = performance.now() / 1000;

    const fragSrc = await (await fetch(`/plugins/${this.pluginId}/${this.config.shader}`)).text();

    const vs = this.compile(gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = this.compile(gl.FRAGMENT_SHADER, fragSrc);
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error(`Shader link error: ${gl.getProgramInfoLog(this.program)}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    // Fullscreen quad VAO
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    // Cache uniform locations
    gl.useProgram(this.program);
    for (const name of ['u_time', 'u_resolution', 'u_bass', 'u_mids', 'u_treble', 'u_volume', 'u_frequencyData']) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }

    // Frequency data texture
    this.freqTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.freqTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (this.uniforms.u_frequencyData !== null) {
      gl.uniform1i(this.uniforms.u_frequencyData, 0);
    }

    this.resize(canvas.width, canvas.height);
  }

  render(timestamp: number, audioData: AudioData): void {
    const gl = this.gl;
    if (!gl || !this.program) return;

    gl.useProgram(this.program);
    gl.uniform1f(this.uniforms.u_time, timestamp / 1000 - this.startTime);
    gl.uniform1f(this.uniforms.u_bass, audioData.bass);
    gl.uniform1f(this.uniforms.u_mids, audioData.mids);
    gl.uniform1f(this.uniforms.u_treble, audioData.treble);
    gl.uniform1f(this.uniforms.u_volume, audioData.volume);

    // Upload frequency data as 1D texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.freqTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, audioData.frequencyData.length, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, audioData.frequencyData);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  resize(width: number, height: number): void {
    if (!this.gl) return;
    this.gl.viewport(0, 0, width, height);
    if (this.program) {
      this.gl.useProgram(this.program);
      gl_uniform2f(this.gl, this.uniforms.u_resolution, width, height);
    }
  }

  destroy(): void {
    const gl = this.gl;
    if (!gl) return;
    if (this.program) gl.deleteProgram(this.program);
    if (this.freqTex) gl.deleteTexture(this.freqTex);
    if (this.vao) gl.deleteVertexArray(this.vao);
    this.gl = null;
    this.program = null;
  }

  private compile(type: number, source: string): WebGLShader {
    const gl = this.gl!;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
  }
}

function gl_uniform2f(gl: WebGL2RenderingContext, loc: WebGLUniformLocation | null, x: number, y: number) {
  if (loc !== null) gl.uniform2f(loc, x, y);
}
