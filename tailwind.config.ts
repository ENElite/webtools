import type { Config } from 'tailwindcss';
import iconifyPlugin from '@iconify/tailwind4';

const config: Config = {
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