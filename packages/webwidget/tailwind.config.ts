import type { Config } from 'tailwindcss';
import sharedTailwindConfig from '../../tailwind.config.ts';

const config: Config = {
    presets: [sharedTailwindConfig],
    content: [
        './src/**/*.{ts,tsx,js,jsx}',
        './index.ts',
        './store.ts',
    ],
};

export default config;