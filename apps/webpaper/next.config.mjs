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
        '@webtools/widget-core',
        '@webtools/widget-react',
        '@webtools/widget-studio',
    ],
};

export default nextConfig;
