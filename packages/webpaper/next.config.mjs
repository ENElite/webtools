/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

export default nextConfig;
