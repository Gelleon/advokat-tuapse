import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Keep react + helmet in one chunk: splitting helmet caused
          // "Cannot access 'f' before initialization" (circular chunk init).
          if (
            id.includes('react-dom') ||
            id.includes('react-router') ||
            id.includes('react-helmet-async') ||
            /[\\/]react[\\/]/.test(id)
          ) {
            return 'vendor-react';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
  server: {
    watch: {
      ignored: ['**/backups/**', '**/*.db', '**/deploy.last.log'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/sitemap.xml': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
});
