import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      '6239-2600-1700-4eac-641f-00-100e.ngrok-free.app',
      '519f-2600-1700-4eac-641f-00-100e.ngrok-free.app',
      '7593-2600-1700-4eac-641f-00-100e.ngrok-free.app',
    ],
    proxy: {
      '/api': 'http://localhost:3001',
      '/mcp': 'http://localhost:3001',
      '/socket.io': { target: 'http://localhost:3001', ws: true },
    },
  },
});
