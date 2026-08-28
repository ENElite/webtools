import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        name: 'widget-react',
        environment: 'jsdom',
        globals: true,
        restoreMocks: true,
    },
});
