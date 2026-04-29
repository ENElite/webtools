import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Webpaper Next',
    description: 'Next.js + BFF + Konachan SSR preload',
};

type RootLayoutProps = {
    children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang='zh-CN'>
            <body>{children}</body>
        </html>
    );
}
