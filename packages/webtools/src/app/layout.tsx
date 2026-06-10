import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WebTools - 前端工具集',
  description: '快速、轻量的前端工具集合，包含图片处理、代码编辑等多种实用工具',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="light">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
