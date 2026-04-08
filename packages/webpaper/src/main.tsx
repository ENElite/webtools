import 'antd/dist/reset.css';
import './tailwind.css';

import { App as AntApp, ConfigProvider } from 'antd';
import React from 'react';
import ReactDOM from 'react-dom/client';

const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error('Missing root element');
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#2563eb',
                    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                },
            }}
        >
            <AntApp>
            </AntApp>
        </ConfigProvider>
    </React.StrictMode>
);
