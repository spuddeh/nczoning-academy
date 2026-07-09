import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static SPA for Cloudflare Pages: source in src/, static passthrough in public/,
// build output to dist/ (which Cloudflare serves).
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist' },
});
