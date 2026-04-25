# Creating Plugins

Each plugin is a folder inside `plugins/` with a `config.json` file. The server scans this directory on startup.

```
plugins/
  my-plugin/
    config.json       # Required — plugin metadata
    shader.frag       # Shader plugins
    scene.js          # Three.js plugins
    images/           # Slideshow plugins
```

## Plugin Types

### Shader (GLSL)

Fragment shaders that run on the GPU. Best for 2D effects: fractals, kaleidoscopes, plasma, geometric patterns.

**config.json:**
```json
{
  "name": "My Shader",
  "type": "shader",
  "description": "Description of the effect",
  "author": "Your Name",
  "tags": ["tag1", "tag2"],
  "shader": "shader.frag"
}
```

**shader.frag** — GLSL ES 3.0 fragment shader. Available uniforms:

| Uniform | Type | Description |
|---------|------|-------------|
| `u_time` | `float` | Seconds since plugin started |
| `u_resolution` | `vec2` | Canvas size in pixels |
| `u_bass` | `float` | Low frequency energy (0–1) |
| `u_mids` | `float` | Mid frequency energy (0–1) |
| `u_treble` | `float` | High frequency energy (0–1) |
| `u_volume` | `float` | Overall volume (0–1) |
| `u_frequencyData` | `sampler2D` | Full FFT frequency data as 1D texture |

**Minimal shader template:**
```glsl
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
  vec3 col = vec3(uv, 0.5 + 0.5 * sin(u_time)) * (0.5 + 0.5 * u_volume);
  fragColor = vec4(col, 1.0);
}
```

### Butterchurn (MilkDrop)

MilkDrop presets rendered via the Butterchurn library. Thousands of presets available.

**config.json:**
```json
{
  "name": "My MilkDrop Preset",
  "type": "butterchurn",
  "description": "Description",
  "preset": "Preset Name From Butterchurn",
  "blendTime": 2
}
```

- **preset** — Name of a preset from the `butterchurn-presets` package, or path to a local `preset.json` file
- **blendTime** — Seconds to blend when loading (default: 2)

### Three.js (3D)

3D scenes rendered with Three.js. Loaded on-demand (not in the initial bundle).

**config.json:**
```json
{
  "name": "My 3D Scene",
  "type": "threejs",
  "description": "Description",
  "scene": "scene.js"
}
```

**scene.js** — Must export `setup` and `update` functions:

```js
export function setup(THREE, scene, camera) {
  // THREE — the Three.js module (passed in, don't import it)
  // Create meshes, lights, etc. and add to scene
  // Position camera
  // Return a state object for use in update()
  return { mesh };
}

export function update(state, audioData, time) {
  // state — object returned from setup()
  // audioData — { bass, mids, treble, volume, frequencyData, timeDomainData }
  // time — seconds since start
  state.mesh.rotation.y = time;
  state.mesh.scale.setScalar(1 + audioData.bass);
}
```

### Slideshow (Images)

Image slideshow with configurable transitions. No audio reactivity needed.

**config.json:**
```json
{
  "name": "My Slideshow",
  "type": "slideshow",
  "description": "Description",
  "images": ["images/photo1.jpg", "images/photo2.jpg"],
  "interval": 8,
  "transition": "fade",
  "transitionDuration": 1.5,
  "sizing": "cover"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `images` | `string[]` | Paths relative to plugin folder |
| `interval` | `number` | Seconds between slides |
| `transition` | `string` | `fade`, `slide`, `zoom` (Ken Burns), or `cut` |
| `transitionDuration` | `number` | Transition duration in seconds (default: 1) |
| `sizing` | `string` | `cover` (fill + crop) or `contain` (fit + letterbox) |

## Common Config Fields

All plugin types share these fields:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Display name shown in admin UI |
| `type` | Yes | `shader`, `butterchurn`, `threejs`, or `slideshow` |
| `description` | No | Short description |
| `author` | No | Author name |
| `tags` | No | Array of tags for grouping |

## Audio Data

For shader and Three.js plugins, audio data is provided each frame:

- **bass** (0–1) — Energy in low frequencies (~0–10% of bins)
- **mids** (0–1) — Energy in mid frequencies (~10–50% of bins)
- **treble** (0–1) — Energy in high frequencies (~50–100% of bins)
- **volume** (0–1) — Overall volume level
- **frequencyData** — `Uint8Array` of FFT frequency bins (0–255 each)
- **timeDomainData** — `Uint8Array` of waveform data
