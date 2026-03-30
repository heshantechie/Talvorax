import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: 'localhost', // Fix 18: Bind to localhost only, not 0.0.0.0
    hmr: {
      clientPort: 3000
    }
  },
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  // SECURITY: Only VITE_ prefixed env vars are exposed to the frontend.
  // GROQ_API_KEY, STT_API_KEY are kept server-side only (Edge Functions).
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
