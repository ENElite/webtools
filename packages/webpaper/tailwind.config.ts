import type { Config } from 'tailwindcss';
import iconifyPlugin from '@iconify/tailwind4';

const config: Config = {
    content: [
        './app/**/*.{ts,tsx,js,jsx}',
        './components/**/*.{ts,tsx,js,jsx}',
        './hooks/**/*.{ts,tsx,js,jsx}',
        './providers/**/*.{ts,tsx,js,jsx}',
        './store/**/*.{ts,tsx,js,jsx}',
    ],
    theme: {
        extend: {},
    },
    plugins: [
        iconifyPlugin({
            prefix: 'icon',
        }),
    ],
};

export default config;
