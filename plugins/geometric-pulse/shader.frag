#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_bass;
uniform float u_mids;
uniform float u_treble;
uniform float u_volume;

out vec4 fragColor;

// Signed distance to a regular polygon
float sdPoly(vec2 p, float r, float sides) {
  float a = atan(p.x, p.y) + 3.14159;
  float s = 6.28318 / sides;
  return cos(floor(0.5 + a / s) * s - a) * length(p) - r;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float t = u_time * 0.5;

  // Rotation driven by bass
  float angle = t + u_bass * 1.5;
  float ca = cos(angle), sa = sin(angle);
  uv = mat2(ca, -sa, sa, ca) * uv;

  // Concentric polygon rings
  vec3 col = vec3(0.0);
  for (float i = 0.0; i < 5.0; i++) {
    float sides = 3.0 + i;
    float radius = 0.15 + i * 0.12 + u_bass * 0.08;
    float d = abs(sdPoly(uv, radius, sides)) - 0.005;
    float ring = smoothstep(0.008, 0.0, d);

    float hue = i * 0.2 + t * 0.3 + u_treble;
    vec3 ringCol = 0.5 + 0.5 * cos(6.28318 * (hue + vec3(0.0, 0.33, 0.67)));
    col += ring * ringCol * (0.7 + 0.3 * u_volume);
  }

  // Glow from center
  col += 0.03 / (length(uv) + 0.05) * u_bass * vec3(0.4, 0.2, 0.8);

  fragColor = vec4(col, 1.0);
}
