#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_bass;
uniform float u_mids;
uniform float u_treble;
uniform float u_volume;
uniform sampler2D u_frequencyData;

out vec4 fragColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    // Kaleidoscope: mirror in angular segments
    float segments = 6.0 + u_bass * 4.0;
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    angle = mod(angle, 6.2831853 / segments);
    angle = abs(angle - 3.1415926 / segments);
    uv = vec2(cos(angle), sin(angle)) * radius;

    // Wave distortion driven by audio
    uv += 0.1 * u_mids * sin(uv.yx * 8.0 + u_time * 2.0);

    // Color from position + time + audio
    float t = u_time * 0.5;
    vec3 col = 0.5 + 0.5 * cos(vec3(0.0, 2.1, 4.2) + radius * 4.0 - t + u_treble * 3.0);
    col *= smoothstep(1.2, 0.0, radius);
    col *= 0.7 + 0.3 * u_volume;

    fragColor = vec4(col, 1.0);
}
