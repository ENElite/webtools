import { defineConfig } from 'vitest/config';
import { join, resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, '../webtools/src'),
      '@webpaper': resolve(__dirname, '../webpaper'),
      '@webwidget': resolve(__dirname, '../webwidget'),
      '@webtools/shared': resolve(__dirname, '../shared'),
      '@webtools/webtools': resolve(__dirname, '../webtools'),
      'l2d': resolve(__dirname, './__test__/mocks/l2d.ts')
    }
  },
  test: {
    pool: 'threads',
    fileParallelism: true,
    maxWorkers: 2,
    include: [join(__dirname, '__test__/**/*.test.{ts,tsx,js,jsx}')],
    exclude: [join(__dirname, '../webpaper/**/__test__/**'), join(__dirname, '../webwidget/**/__test__/**')],
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: join(__dirname, 'coverage'),
      // Include all source files so the HTML/json reports contain coverage
      // for the linked packages (webpaper/webwidget) even if some files
      // are not directly imported by tests.
      all: true,
      include: [
        join(__dirname, '../webpaper/**/*.{ts,tsx,js,jsx}'),
        join(__dirname, '../webwidget/**/*.{ts,tsx,js,jsx}'),
        join(__dirname, './src/**/*.{ts,tsx,js,jsx}')
      ]
    }
  }
});
