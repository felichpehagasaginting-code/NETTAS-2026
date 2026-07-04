import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['firebase/app', 'firebase/database', 'firebase/auth'],
          confetti: ['canvas-confetti'],
        },
      },
    },
  },
  publicDir: 'public',
});
