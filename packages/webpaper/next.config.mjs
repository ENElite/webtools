import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'konachan.net',
            },
            {
                protocol: 'https',
                hostname: 'konachan.com',
            },
        ],
    },
    turbopack: {},
    webpack: (config, { dev }) => {
        config.resolve.alias = {
            ...(config.resolve.alias || {}),
            '@webtools/webwidget': path.resolve('./../webwidget'),
            '@webtools/webwidget/store': path.resolve('./../webwidget/store'),
        };

        if (dev) {
            config.watchOptions = {
                // use polling to improve watcher reliability in containers/WSL/pnpm workspaces
                poll: 2000,
                aggregateTimeout: 300,
                ignored: /node_modules/,
            };
        }
        return config;
    },
};

export default nextConfig;
