import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ command }) => {
  // In development (dev server), use '/' so preview in AI Studio loads directly at root.
  // In production build (vite build), default to '/Fresh-Meat-Retail-BI/' for GitHub Pages deployment.
  const isBuild = command === 'build';
  const base = process.env.VITE_BASE_PATH || (isBuild ? '/Fresh-Meat-Retail-BI/' : '/');
  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
