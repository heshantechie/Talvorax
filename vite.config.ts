import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 3000,
    host: 'localhost', // Bind to localhost only
    hmr: {
      clientPort: 3000
    },
    // Proxy proxy removed to hit Railway directly in development and prod
  },
  plugins: [tailwindcss(), react()],
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
