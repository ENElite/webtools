import { NextResponse } from 'next/server';

const DEEPSEEK_ORIGIN = 'https://www.deepseek.com';

function buildTargetUrl(request: Request, pathSegments: string[]): URL {
    const source = new URL(request.url);
    const pathname = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '';
    const target = new URL(`${DEEPSEEK_ORIGIN}${pathname}`);
    target.search = source.search;
    return target;
}

function buildForwardHeaders(request: Request): Headers {
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('content-length');
    return headers;
}

async function proxyRequest(
    request: Request,
    context: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
    try {
        const resolvedParams = await context.params;
        const pathSegments = Array.isArray(resolvedParams.path) ? resolvedParams.path : [];
        const target = buildTargetUrl(request, pathSegments);

        const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
        const response = await fetch(target, {
            method: request.method,
            headers: buildForwardHeaders(request),
            body: hasBody ? request.body : undefined,
            duplex: hasBody ? 'half' : undefined,
        } as RequestInit);

        const proxyHeaders = new Headers(response.headers);
        proxyHeaders.delete('content-encoding');
        proxyHeaders.delete('content-length');

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: proxyHeaders,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'DeepSeek proxy failed';
        return NextResponse.json({ ok: false, error: message }, { status: 502 });
    }
}

export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
    return proxyRequest(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ path?: string[] }> }) {
    return proxyRequest(request, context);
}

export async function PUT(request: Request, context: { params: Promise<{ path?: string[] }> }) {
    return proxyRequest(request, context);
}

export async function PATCH(request: Request, context: { params: Promise<{ path?: string[] }> }) {
    return proxyRequest(request, context);
}

export async function DELETE(request: Request, context: { params: Promise<{ path?: string[] }> }) {
    return proxyRequest(request, context);
}

export async function OPTIONS(request: Request, context: { params: Promise<{ path?: string[] }> }) {
    return proxyRequest(request, context);
}

export async function HEAD(request: Request, context: { params: Promise<{ path?: string[] }> }) {
    return proxyRequest(request, context);
}
