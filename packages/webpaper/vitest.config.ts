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
            { find: '@webtools/webwidget', replacement: path.resolve(__dirname, '../webwidget') },
            { find: '@webtools/webwidget/store', replacement: path.resolve(__dirname, '../webwidget/store') },
        ],
    },
    test: {
        globals: true,
        environment: 'jsdom',
        mockReset: true,
        restoreMocks: true,
    },
});
