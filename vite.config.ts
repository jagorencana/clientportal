import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, UserConfig } from 'vite';

const gasProxyPlugin = () => {
  const install = (middlewares: any) => {
    middlewares.use('/api/gas', async (req: any, res: any) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'error', message: 'Method not allowed' }));
        return;
      }

      try {
        let rawBody = '';
        for await (const chunk of req) rawBody += chunk;
        const incoming = rawBody ? JSON.parse(rawBody) : {};
        const targetUrl = incoming.targetUrl || process.env.VITE_GOOGLE_SCRIPT_URL;
        const payload = incoming.payload || incoming;
        if (!targetUrl || !String(targetUrl).startsWith('https://script.google.com/')) {
          throw new Error('URL Google Apps Script tidak valid.');
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);
        const upstream = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          redirect: 'follow',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const text = await upstream.text();
        res.statusCode = upstream.ok ? 200 : upstream.status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(text);
      } catch (error: any) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
          status: 'offline',
          message: error?.name === 'AbortError'
            ? 'Koneksi Google Apps Script timeout.'
            : `Proxy autentikasi gagal: ${error?.message || 'Unknown error'}`,
        }));
      }
    });
  };

  return {
    name: 'local-google-apps-script-proxy',
    configureServer(server: any) {
      install(server.middlewares);
    },
    configurePreviewServer(server: any) {
      install(server.middlewares);
    },
  };
};

export default defineConfig((): UserConfig => {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    plugins: [react(), tailwindcss(), gasProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
    },
    build: {
      minify: 'esbuild',
      cssMinify: true,
      sourcemap: !isProd,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
