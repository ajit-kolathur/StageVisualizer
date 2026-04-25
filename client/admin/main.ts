import { io } from 'socket.io-client';
import { showAuth } from './auth.js';
import { renderUI } from './ui.js';
import type { StateSyncPayload } from '../shared/types.js';

const app = document.getElementById('app')!;
const socket = io();

let authenticated = false;
let lastState: StateSyncPayload | null = null;

// Cache state-sync data so we can render immediately after auth
socket.on('state-sync', (data: StateSyncPayload) => {
  lastState = data;
  if (authenticated) {
    renderUI(app, socket as any, data);
  }
});

showAuth(app, socket as any, () => {
  authenticated = true;
  if (lastState) {
    renderUI(app, socket as any, lastState);
  }
});

// Connection status updates
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
