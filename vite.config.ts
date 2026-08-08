import { createRequire } from 'node:module';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const require = createRequire(import.meta.url);
const HOME_LCP_SHELL = require('./server/home-lcp-shell.cjs');

function homeLcpShellPlugin(): Plugin {
  return {
    name: 'home-lcp-shell',
    transformIndexHtml(html) {
      return html.replace('<!-- HOME_LCP_SHELL -->', HOME_LCP_SHELL);
    },
  };
}

function asyncCssPlugin(): Plugin {
  return {
    name: 'async-css',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet"([^>]*?)href="([^"]+\.css)"([^>]*?)>/g,
        (match, before, href, after) => {
          if (href.includes('/fonts/')) {
            return match;
          }

          // No rel=preload: keeps CSS off the high-priority critical chain.
          // Inline critical-css in index.html covers first paint.
          return [
            `<link rel="stylesheet" href="${href}"${before}${after} media="print" onload="this.media='all'">`,
            `<noscript><link rel="stylesheet" href="${href}"${before}${after}></noscript>`,
          ].join('\n    ');
        }
      );
    },
  };
}

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
  plugins: [react(), homeLcpShellPlugin(), asyncCssPlugin(), optimizeLoadingPlugin()],
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
