import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDirectory = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    outputFileTracingRoot: path.resolve(appDirectory, '../..'),
    reactStrictMode: true,
    poweredByHeader: false,
    transpilePackages: [
        '@webtools/ui',
        '@webtools/widget-core',
        '@webtools/widget-react',
        '@webtools/widget-studio',
    ],
    webpack(config) {
        config.module.rules.push({
            test: /node_modules[\\/]l2d[\\/]dist[\\/]index\.js$/,
            use: [path.resolve(appDirectory, 'loaders/strip-pure-annotations.cjs')],
        });
        return config;
    },
};

export default nextConfig;
