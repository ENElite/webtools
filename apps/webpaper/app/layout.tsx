import '@webtools/ui/styles.css';
import '@webtools/widget-react/styles.css';
import '@webtools/widget-studio/styles.css';
import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'WebPaper',
    description: '可扩展的图片与视频桌面播放器',
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
    return (
        <html lang='zh-CN' data-theme='light'>
            <body>{children}</body>
        </html>
    );
}
