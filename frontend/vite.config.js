import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// All /api calls are forwarded to the Express server, so no CORS or URL config is needed in React
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
