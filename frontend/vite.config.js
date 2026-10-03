import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import os from 'os';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  cacheDir: path.join(os.tmpdir(), 'chargeone-vite-cache'),
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
});
