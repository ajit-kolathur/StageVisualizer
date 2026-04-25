import type { Server as SocketIOServer } from 'socket.io';
import type { AppStateManager } from './state.js';
import type { AuthPayload, SwitchPluginPayload, SetGainPayload } from '../client/shared/types.js';

export function setupSocketHandlers(io: SocketIOServer, state: AppStateManager): void {
  io.on('connection', (socket) => {
    socket.emit('state-sync', state.getSync());

    socket.on('auth', (payload: AuthPayload, callback?: (result: { success: boolean }) => void) => {
      const success = payload.pin === state.pin;
      if (success) socket.join('admin');
      const result = { success };
      if (callback) callback(result);
      else socket.emit('auth-result', result);
    });

    socket.on('switch-plugin', (payload: SwitchPluginPayload) => {
      const entry = state.setActivePlugin(payload.pluginId);
      if (!entry) return;
      io.emit('plugin-changed', { pluginId: entry.id, config: entry.config });
      io.in('admin').emit('state-sync', state.getSync());
    });

    socket.on('set-gain', (payload: SetGainPayload) => {
      state.setGain(payload.gain);
      io.emit('gain-changed', { gain: state.gain });
      io.in('admin').emit('state-sync', state.getSync());
    });
  });
}
