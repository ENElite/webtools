import type { Config } from 'tailwindcss';
import sharedTailwindConfig from '../../tailwind.config.ts';

const config: Config = {
    presets: [sharedTailwindConfig],
    content: [
        './app/**/*.{ts,tsx,js,jsx}',
        './components/**/*.{ts,tsx,js,jsx}',
        './hooks/**/*.{ts,tsx,js,jsx}',
        './providers/**/*.{ts,tsx,js,jsx}',
        './store/**/*.{ts,tsx,js,jsx}',
    ],
};

export default config;
