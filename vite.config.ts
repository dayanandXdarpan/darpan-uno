import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: 'renderer',
  build: {
    outDir: '../dist/renderer',
    emptyOutDir: true
  },
  server: {
    port: 3000,  // Change this to your preferred port
    host: '0.0.0.0'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './renderer/src')
    }
  },
  define: {
    'process.env': {}
  }
});
