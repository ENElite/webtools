import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,

    // 生产优化
    poweredByHeader: false,        // 隐藏 X-Powered-By: Next.js 头，减少信息泄露
    compress: true,                // 启用 gzip 压缩（Docker 内由 nginx 处理时可关闭）

    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },
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
    webpack: (config, { dev }) => {
        // l2d 库的 IIFE 标记了 @__PURE__，webpack 会 tree-shake 掉 WASM 初始化代码，
        // 导致 window.Live2DCubismCore 未定义。此 loader 移除 PURE 注释阻止 tree-shake。
        config.module.rules.push({
            test: /node_modules[\\/]l2d[\\/]dist[\\/]index\.js$/,
            use: [path.resolve(__dirname, 'loaders/strip-pure-annotations.cjs')],
        });

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
