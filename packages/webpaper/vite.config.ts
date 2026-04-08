import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            {
                // Keep reset.css and deep imports untouched; only rewrite bare "antd".
                find: /^antd$/,
                replacement: path.resolve(dirname, 'node_modules/antd/es'),
            },
        ],
    },
    server: {
        proxy: {
            '/post.json': {
                target: 'https://konachan.net',
                changeOrigin: true,

            },
        }
    }
});