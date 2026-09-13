import { NextResponse } from 'next/server';
import { z } from 'zod';

const KONACHAN_ENDPOINT = 'https://konachan.com/post.json';
const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    tags: z.string().max(500).default(''),
});

export async function GET(request: Request): Promise<Response> {
    const sourceUrl = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(sourceUrl.searchParams));
    if (!parsed.success) {
        return NextResponse.json({ error: 'Konachan 查询参数无效。' }, { status: 400 });
    }

    const targetUrl = new URL(KONACHAN_ENDPOINT);
    targetUrl.searchParams.set('page', String(parsed.data.page));
    targetUrl.searchParams.set('limit', String(parsed.data.limit));
    if (parsed.data.tags) targetUrl.searchParams.set('tags', parsed.data.tags);

    try {
        const response = await fetch(targetUrl, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(20_000),
        });
        const data: unknown = await response.json();
        return NextResponse.json(data, {
            status: response.status,
            headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
        });
    } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Konachan 请求失败。';
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
