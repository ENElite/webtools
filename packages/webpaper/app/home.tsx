'use client';

import 'antd/dist/reset.css';
import './globals.css';

import { App as AntApp, ConfigProvider } from 'antd';

import { Webpaper } from './webpaper';

export function Home() {
    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#2563eb',
                    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                },
            }}
        >
            <AntApp>
                <Webpaper />
            </AntApp>
        </ConfigProvider>
    );
}
