precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_bass;
uniform float u_mids;
uniform float u_treble;
uniform float u_volume;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

  // Audio-driven zoom and drift
  float zoom = 2.5 - u_bass * 1.2;
  float t = u_time * 0.15 + u_mids * 0.3;
  vec2 center = vec2(-0.745 + sin(t) * 0.05, 0.186 + cos(t * 0.7) * 0.05);

  vec2 c = center + uv * zoom;
  vec2 z = vec2(0.0);
  float iter = 0.0;
  const float MAX_ITER = 80.0;

  for (float i = 0.0; i < MAX_ITER; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (dot(z, z) > 4.0) break;
    iter++;
  }

  // Smooth coloring
  float t2 = iter / MAX_ITER;
  float hue = t2 * 3.0 + u_time * 0.2 + u_treble * 2.0;
  float sat = 0.7 + u_volume * 0.3;
  float val = (iter < MAX_ITER) ? (0.6 + u_bass * 0.4) : 0.0;

  // HSV to RGB
  vec3 col = val * mix(vec3(1.0), clamp(abs(mod(hue + vec3(0.0, 2.0, 4.0), 6.0) - 3.0) - 1.0, 0.0, 1.0), sat);

  gl_FragColor = vec4(col, 1.0);
}
