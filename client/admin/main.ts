import { io } from 'socket.io-client';
import { showAuth } from './auth.js';
import { renderUI } from './ui.js';
import type { StateSyncPayload } from '../shared/types.js';

const app = document.getElementById('app')!;
const socket = io();

let authenticated = false;
let lastState: StateSyncPayload | null = null;

function refresh() {
  if (authenticated && lastState) {
    renderUI(app, socket as any, lastState);
  }
}

socket.on('state-sync', (data: StateSyncPayload) => {
  lastState = data;
  refresh();
});

socket.on('plugin-changed', (data: { pluginId: string }) => {
  if (lastState) {
    lastState.activePlugin = data.pluginId;
    refresh();
  }
});

socket.on('gain-changed', (data: { gain: number }) => {
  if (lastState) {
    lastState.gain = data.gain;
    refresh();
  }
});

showAuth(app, socket as any, () => {
  authenticated = true;
  refresh();
});

socket.on('disconnect', () => {
  const status = app.querySelector('.status');
  if (status) {
    status.className = 'status disconnected';
    status.textContent = 'Disconnected';
  }
});

socket.on('connect', () => {
  const status = app.querySelector('.status');
  if (status) {
    status.className = 'status connected';
    status.textContent = 'Connected';
  }
});
