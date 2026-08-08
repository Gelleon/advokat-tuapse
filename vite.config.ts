import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function optimizeLoadingPlugin(): Plugin {
  return {
    name: 'optimize-loading',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const scriptTag =
          html.match(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/)?.[0] ?? '';

        let result = html
          .replace(/<link rel="preload" as="style"[^>]*>\s*/g, '')
          .replace(/<script type="module"[^>]*><\/script>\s*/g, '')
          .replace(/<link rel="modulepreload"[^>]*>\s*/g, '');

        if (scriptTag) {
          result = result.replace(
            '<!-- Yandex.Metrika:',
            `${scriptTag}\n    <!-- Yandex.Metrika:`
          );
        }

        return result;
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), optimizeLoadingPlugin()],
  build: {
    target: 'es2020',
    modulePreload: { polyfill: false },
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
