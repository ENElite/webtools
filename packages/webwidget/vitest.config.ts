import path from 'node:path';

import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname),
            l2d: path.resolve(__dirname, '__test__/mocks/l2d.ts'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        mockReset: true,
        restoreMocks: true,
    },
});
