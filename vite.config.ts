import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/diamond-defender/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@entities': path.resolve(__dirname, './src/entities'),
      '@managers': path.resolve(__dirname, './src/managers'),
      '@types': path.resolve(__dirname, './src/types'),
      '@config': path.resolve(__dirname, './src/config'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
});