# StageVisualizer

Web-based live music visualization system for stage projection. A fullscreen browser page displays audio-reactive visuals on a projector behind a band, while a phone-based remote control lets you switch visualizers from the audience over local WiFi.

## Features

- **Audio-reactive visuals** driven by real-time mic input (FFT analysis)
- **Phone remote control** — switch visualizers from the audience
- **Plugin system** — GLSL shaders, MilkDrop presets (Butterchurn), Three.js 3D scenes, image slideshows
- **Smooth transitions** — fade-to-black when switching plugins
- **Error recovery** — auto-fallback to static image if a plugin crashes
- **Offline** — works entirely on local network, no internet required

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The server prints URLs on startup:

```
  StageVisualizer running:

  ➜  Local:   http://localhost:3000/
  ➜  Admin:   http://localhost:3000/admin
  ➜  Network: http://192.168.x.x:3000/
  ➜  Phone:   http://192.168.x.x:3000/admin
```

## Venue Setup

1. **Start the server** on your MacBook: `npm start`
2. **Open the display** at `http://localhost:3000/` in a browser, fullscreen it on the projector (F11 or Cmd+Shift+F)
3. **Grant mic access** when prompted — this drives the audio-reactive visuals
4. **Open the admin** on your phone at `http://<LAN-IP>:3000/admin` (phone must be on the same WiFi)
5. **Enter the PIN** (default: `1234`)
6. **Tap plugins** to switch visuals. Use the gain slider to adjust mic sensitivity for the venue volume.

Keyboard shortcuts on the display page: press `1`–`9` to switch plugins by index.

## Configuration

Edit `server.config.json` in the project root:

```json
{
  "port": 3000,
  "pin": "1234"
}
```

- **port** — Server port (default: 3000)
- **pin** — 4-digit PIN for admin access

## Included Plugins

| Plugin | Type | Description |
|--------|------|-------------|
| Test Gradient | shader | Simple audio-reactive gradient |
| Fractal Pulse | shader | Mandelbrot fractal with zoom and color shifting |
| Kaleidoscope Wave | shader | Kaleidoscope with wave distortion |
| Plasma Flow | shader | Lava lamp plasma effect |
| Geometric Pulse | shader | Concentric polygon rings pulsing with bass |
| MilkDrop Cosmic | butterchurn | Psychedelic MilkDrop preset |
| MilkDrop Neon | butterchurn | Neon-styled MilkDrop preset |
| Particle Storm | threejs | 3D particle system reacting to bass/treble |
| Press Photos | slideshow | Band photo slideshow with fade transitions |

## Creating Plugins

See [plugins/README.md](plugins/README.md) for the plugin creation guide.

## Tech Stack

- **Server**: Node.js, Express, Socket.IO
- **Client**: TypeScript, Vite, WebGL 2, Web Audio API
- **Visualizers**: GLSL shaders, Three.js, Butterchurn (MilkDrop), Canvas 2D
- **Communication**: Socket.IO (WebSocket)

## License

MIT
