import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        name: 'widget-studio',
        environment: 'jsdom',
        globals: true,
        restoreMocks: true,
    },
});
