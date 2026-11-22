import { defineConfig } from 'vite';

/* The cloud preview hostname is injected per workspace; only that host is allowed. */
const previewHost = process.env.PREVIEW_HOST || 'pv-91d62852692b-30305f09-5dc4-4cd5-b69a-e39d7d0aa589.style.dev';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 3006,
    strictPort: true,
    allowedHosts: [previewHost]
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: [previewHost]
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900
  }
});
