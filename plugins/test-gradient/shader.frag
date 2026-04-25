#version 300 es
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_bass;
uniform float u_mids;
uniform float u_treble;
uniform float u_volume;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 color = vec3(
    uv.x + u_bass * 0.5,
    uv.y + u_mids * 0.5,
    0.5 + u_treble * 0.5
  );
  color *= 0.6 + u_volume * 0.4;
  fragColor = vec4(color, 1.0);
}
