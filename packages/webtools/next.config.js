/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静态导出配置，加快加载速度
  output: 'export',
  // 图片优化配置
  images: {
    unoptimized: true, // 静态导出时需要禁用图片优化
  },
  // 压缩配置
  compress: true,
  // 严格模式
  reactStrictMode: true,
  // 实验性功能
  experimental: {
    optimizePackageImports: ['@heroui/react', 'react-use'],
  },
};

module.exports = nextConfig;
