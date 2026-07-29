import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    exclude: ['src/app/services/escala-generator.service.spec.ts'],
  },
});
