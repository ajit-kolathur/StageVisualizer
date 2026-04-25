import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { networkInterfaces } from 'os';
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { scanPlugins } from './plugin-scanner.js';
import { enumerateButterchurnPresets } from './butterchurn-enumerator.js';
import { AppStateManager } from './state.js';
import { setupSocketHandlers } from './socket-handlers.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '..');

// Load config
const configPath = join(root, 'server.config.json');
const config = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, 'utf-8'))
  : {};
const PORT = Number(process.env.PORT ?? config.port ?? 3000);

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer);

// Scan plugins on startup
const physicalPlugins = scanPlugins(join(root, 'plugins'));
const virtualPlugins = enumerateButterchurnPresets();
const pluginRegistry = [...physicalPlugins, ...virtualPlugins];
console.log(`[server] Found ${pluginRegistry.length} plugin(s) (${physicalPlugins.length} physical, ${virtualPlugins.length} virtual)`);

// Initialize state and socket handlers
const state = new AppStateManager(pluginRegistry, config.pin ?? '0000');
setupSocketHandlers(io, state);

// REST API
app.get('/api/plugins', (_req, res) => { res.json(pluginRegistry); });

// Serve plugin static assets
app.use('/plugins', express.static(join(root, 'plugins')));

const isDev = process.env.NODE_ENV !== 'production';

if (isDev) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  // Serve HTML pages, then fall through to Vite for assets/HMR
  app.use(async (req, res, next) => {
    const url = req.originalUrl;
    try {
      let htmlPath: string | null = null;
      let transformUrl: string | null = null;

      if (url === '/' || url === '') {
        htmlPath = join(root, 'client/display/index.html');
        transformUrl = '/client/display/index.html';
      } else if (url === '/admin' || url === '/admin/') {
        htmlPath = join(root, 'client/admin/index.html');
        transformUrl = '/client/admin/index.html';
      }

      if (htmlPath && transformUrl) {
        let html = readFileSync(htmlPath, 'utf-8');
        html = await vite.transformIndexHtml(transformUrl, html);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } else {
        next();
      }
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  app.use(vite.middlewares);
} else {
  const distPath = join(root, 'dist');
  app.use(express.static(distPath));
  app.get('/', (_req, res) => {
    res.sendFile(join(distPath, 'client/display/index.html'));
  });
  app.get('/admin', (_req, res) => {
    res.sendFile(join(distPath, 'client/admin/index.html'));
  });
}

// Detect LAN IP
function getLanIP(): string | undefined {
  const nets = networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const info of iface ?? []) {
      if (info.family === 'IPv4' && !info.internal) return info.address;
    }
  }
}

httpServer.listen(PORT, '0.0.0.0', () => {
  const lanIP = getLanIP();
  console.log(`\n  StageVisualizer running:\n`);
  console.log(`  ➜  Local:   http://localhost:${PORT}/`);
  console.log(`  ➜  Admin:   http://localhost:${PORT}/admin`);
  if (lanIP) {
    console.log(`  ➜  Network: http://${lanIP}:${PORT}/`);
    console.log(`  ➜  Phone:   http://${lanIP}:${PORT}/admin`);
  }
  console.log();
});

export { app, httpServer, io };
