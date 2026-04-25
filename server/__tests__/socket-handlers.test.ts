import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { setupSocketHandlers } from '../socket-handlers.js';
import { AppStateManager } from '../state.js';
import type { PluginRegistryEntry, StateSyncPayload, PluginChangedPayload, GainChangedPayload } from '../../client/shared/types.js';

const PLUGINS: PluginRegistryEntry[] = [
  { id: 'fractal-pulse', config: { name: 'Fractal Pulse', type: 'shader' } },
  { id: 'kaleidoscope-wave', config: { name: 'Kaleidoscope Wave', type: 'shader' } },
];

let io: SocketIOServer;
let httpServer: ReturnType<typeof createServer>;
let port: number;
let state: AppStateManager;

function connect(): ClientSocket {
  return ioClient(`http://localhost:${port}`, { transports: ['websocket'] });
}

function waitFor<T>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise(resolve => socket.once(event, resolve));
}

beforeAll(async () => {
  httpServer = createServer();
  io = new SocketIOServer(httpServer);
  state = new AppStateManager(PLUGINS, '1234');
  setupSocketHandlers(io, state);
  await new Promise<void>(resolve => httpServer.listen(0, resolve));
  const addr = httpServer.address();
  port = typeof addr === 'object' && addr ? addr.port : 0;
});

afterAll(async () => {
  io.close();
  await new Promise<void>(resolve => httpServer.close(() => resolve()));
});

describe('Socket.IO handlers', () => {
  it('sends state-sync on connection', async () => {
    const client = connect();
    const sync = await waitFor<StateSyncPayload>(client, 'state-sync');
    expect(sync).toMatchObject({
      activePlugin: state.activePlugin,
      gain: state.gain,
      plugins: PLUGINS,
    });
    client.disconnect();
  });

  it('auth with correct PIN emits success', async () => {
    const client = connect();
    await waitFor(client, 'state-sync');
    client.emit('auth', { pin: '1234' });
    const result = await waitFor<{ success: boolean }>(client, 'auth-result');
    expect(result.success).toBe(true);
    client.disconnect();
  });

  it('auth with wrong PIN emits failure', async () => {
    const client = connect();
    await waitFor(client, 'state-sync');
    client.emit('auth', { pin: '0000' });
    const result = await waitFor<{ success: boolean }>(client, 'auth-result');
    expect(result.success).toBe(false);
    client.disconnect();
  });

  it('switch-plugin updates state and emits plugin-changed', async () => {
    // Admin client
    const admin = connect();
    await waitFor(admin, 'state-sync');
    admin.emit('auth', { pin: '1234' });
    await waitFor(admin, 'auth-result');

    // Display client to receive the event
    const display = connect();
    await waitFor(display, 'state-sync');

    admin.emit('switch-plugin', { pluginId: 'fractal-pulse' });
    const changed = await waitFor<PluginChangedPayload>(display, 'plugin-changed');
    expect(changed.pluginId).toBe('fractal-pulse');
    expect(changed.config).toEqual(PLUGINS[0].config);
    expect(state.activePlugin).toBe('fractal-pulse');

    admin.disconnect();
    display.disconnect();
  });

  it('switch-plugin with invalid ID does nothing', async () => {
    const admin = connect();
    await waitFor(admin, 'state-sync');
    admin.emit('auth', { pin: '1234' });
    await waitFor(admin, 'auth-result');

    const prev = state.activePlugin;
    admin.emit('switch-plugin', { pluginId: 'nonexistent' });
    // Give it a moment to process
    await new Promise(r => setTimeout(r, 50));
    expect(state.activePlugin).toBe(prev);

    admin.disconnect();
  });

  it('set-gain updates state and emits gain-changed', async () => {
    const admin = connect();
    await waitFor(admin, 'state-sync');
    admin.emit('auth', { pin: '1234' });
    await waitFor(admin, 'auth-result');

    const display = connect();
    await waitFor(display, 'state-sync');

    admin.emit('set-gain', { gain: 1.5 });
    const changed = await waitFor<GainChangedPayload>(display, 'gain-changed');
    expect(changed.gain).toBe(1.5);
    expect(state.gain).toBe(1.5);

    admin.disconnect();
    display.disconnect();
  });

  it('set-gain clamps out-of-range values', async () => {
    const admin = connect();
    await waitFor(admin, 'state-sync');
    admin.emit('auth', { pin: '1234' });
    await waitFor(admin, 'auth-result');

    const display = connect();
    await waitFor(display, 'state-sync');

    admin.emit('set-gain', { gain: 5 });
    const changed = await waitFor<GainChangedPayload>(display, 'gain-changed');
    expect(changed.gain).toBe(2);

    admin.disconnect();
    display.disconnect();
  });

  it('emits state-sync to admins after switch-plugin', async () => {
    const admin = connect();
    const initialSync = await waitFor<StateSyncPayload>(admin, 'state-sync');
    admin.emit('auth', { pin: '1234' });
    await waitFor(admin, 'auth-result');

    admin.emit('switch-plugin', { pluginId: 'kaleidoscope-wave' });
    const sync = await waitFor<StateSyncPayload>(admin, 'state-sync');
    expect(sync.activePlugin).toBe('kaleidoscope-wave');

    admin.disconnect();
  });

  it('emits state-sync to admins after set-gain', async () => {
    const admin = connect();
    await waitFor(admin, 'state-sync');
    admin.emit('auth', { pin: '1234' });
    await waitFor(admin, 'auth-result');

    admin.emit('set-gain', { gain: 0.5 });
    const sync = await waitFor<StateSyncPayload>(admin, 'state-sync');
    expect(sync.gain).toBe(0.5);

    admin.disconnect();
  });

  it('relays plugin-error to admin room', async () => {
    const admin = connect();
    await waitFor(admin, 'state-sync');
    admin.emit('auth', { pin: '1234' });
    await waitFor(admin, 'auth-result');

    const display = connect();
    await waitFor(display, 'state-sync');

    display.emit('plugin-error', { pluginId: 'fractal-pulse' });
    const error = await waitFor<{ pluginId: string }>(admin, 'plugin-error');
    expect(error.pluginId).toBe('fractal-pulse');

    admin.disconnect();
    display.disconnect();
  });
});
