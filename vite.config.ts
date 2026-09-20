import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  // Absolute, not relative. A relative base breaks the clean /product/:slug
  // URLs below, because index.html served at that path would resolve
  // ./assets/... to /product/assets/... Capacitor 6 serves webDir from the
  // root of a local server scheme rather than file://, so '/' works there too.
  base: '/',
});
