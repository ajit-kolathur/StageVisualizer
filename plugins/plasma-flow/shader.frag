#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_bass;
uniform float u_mids;
uniform float u_treble;
uniform float u_volume;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.3;

  // Layered sine plasma
  float v = sin(uv.x * 10.0 + t + u_bass * 3.0);
  v += sin(uv.y * 8.0 - t * 0.7 + u_mids * 2.0);
  v += sin((uv.x + uv.y) * 6.0 + t * 0.5);
  v += sin(length(uv - 0.5) * 12.0 - t + u_treble * 4.0);
  v *= 0.25;

  // Audio-driven color palette
  vec3 col = vec3(
    0.5 + 0.5 * sin(v * 3.14159 + u_time * 0.4),
    0.5 + 0.5 * sin(v * 3.14159 + 2.1 + u_bass * 2.0),
    0.5 + 0.5 * sin(v * 3.14159 + 4.2 + u_treble * 2.0)
  );
  col *= 0.6 + 0.4 * u_volume;

  fragColor = vec4(col, 1.0);
}
