/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    images: { unoptimized: true },
    reactStrictMode: true,
    transpilePackages: ['@webtools/ui'],
    experimental: {
        optimizePackageImports: ['@webtools/ui'],
    },
};

export default nextConfig;
