import { defineConfig } from 'vitest/config';

export default defineConfig({
    esbuild: { jsx: 'automatic' },
    test: {
        name: 'ui',
        environment: 'jsdom',
        globals: true,
        restoreMocks: true,
    },
});
