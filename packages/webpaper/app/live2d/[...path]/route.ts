import { readFile } from 'node:fs/promises';
import path from 'node:path';

const LIVE2D_ROOT = path.join(process.cwd(), 'lib/live2d');

const CONTENT_TYPES: Record<string, string> = {
    '.json': 'application/json; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.txt': 'text/plain; charset=utf-8',
    '.moc3': 'application/octet-stream',
    '.can3': 'application/octet-stream',
    '.cmo3': 'application/octet-stream',
};

function resolveLive2dFilePath(segments: string[]): string | null {
    const relativePath = path.posix.normalize(segments.join('/'));

    if (relativePath.startsWith('..')) {
        return null;
    }

    const absolutePath = path.resolve(LIVE2D_ROOT, relativePath);
    if (!absolutePath.startsWith(LIVE2D_ROOT)) {
        return null;
    }

    return absolutePath;
}

async function handleRequest(_request: Request, context: { params: Promise<{ path?: string[] }> }) {
    const { path: segments = [] } = await context.params;
    const filePath = resolveLive2dFilePath(segments);

    if (!filePath) {
        return new Response('Not found', { status: 404 });
    }

    try {
        const fileContent = await readFile(filePath);
        const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';

        return new Response(fileContent, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=0, must-revalidate',
            },
        });
    } catch {
        return new Response('Not found', { status: 404 });
    }
}

export const GET = handleRequest;
export const HEAD = handleRequest;