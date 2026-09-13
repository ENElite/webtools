import { defineConfig } from 'vitest/config';

export default defineConfig({
    esbuild: { jsx: 'automatic' },
    test: {
        name: 'widget-react',
        environment: 'jsdom',
        globals: true,
        restoreMocks: true,
    },
});
