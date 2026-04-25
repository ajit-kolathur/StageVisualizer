import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        display: resolve(__dirname, 'client/display/index.html'),
        admin: resolve(__dirname, 'client/admin/index.html'),
      },
    },
  },
});
