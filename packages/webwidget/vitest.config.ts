import path from 'node:path';

import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            { find: '@', replacement: path.resolve(__dirname) },
            { find: '@webtools/shared/hooks', replacement: path.resolve(__dirname, '../shared/src/hooks/index.ts') },
            { find: '@webtools/shared/components', replacement: path.resolve(__dirname, '../shared/src/components/index.ts') },
            { find: '@webtools/shared', replacement: path.resolve(__dirname, '../shared') },
            { find: 'l2d', replacement: path.resolve(__dirname, '__test__/mocks/l2d.ts') },
        ],
    },
    test: {
        globals: true,
        environment: 'jsdom',
        mockReset: true,
        restoreMocks: true,
    },
});
