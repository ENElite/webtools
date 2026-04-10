import type { Config } from 'tailwindcss';
import iconifyPlugin from '@iconify/tailwind4';

const config: Config = {
    content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
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
