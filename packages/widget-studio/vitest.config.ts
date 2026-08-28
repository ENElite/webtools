import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    test: {
        name: 'widget-studio',
        environment: 'jsdom',
        globals: true,
        restoreMocks: true,
    },
});
