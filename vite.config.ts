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
    // Proxy /api/* → Railway PDF server in dev to avoid cross-origin preflight issues
    proxy: {
      '/api': {
        target: 'https://talvorax.up.railway.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
      }
    }
  },
  plugins: [tailwindcss(), react()],
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React vendor chunk
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          // PDF processing chunk
          if (id.includes('node_modules/pdfjs-dist') || id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
            return 'vendor-pdf';
          }
          // Recharts and UI
          if (id.includes('node_modules/recharts') || id.includes('node_modules/lucide-react')) {
            return 'vendor-ui';
          }
        }
      }
    }
  },
  // SECURITY: Only VITE_ prefixed env vars are exposed to the frontend.
  // GROQ_API_KEY, STT_API_KEY are kept server-side only (Edge Functions).
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
