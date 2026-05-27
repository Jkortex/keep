import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'astro:content': path.resolve(__dirname, 'tests/mocks/astro-content.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['src/lib/**', 'src/scripts/**'],
    },
  },
});
