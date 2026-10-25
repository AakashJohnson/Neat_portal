import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: '127.0.0.1' },
  build: { outDir: 'dist', sourcemap: false },
  test: { include: ['tests/**/*.test.mjs'], testTimeout: 15000 },
});
