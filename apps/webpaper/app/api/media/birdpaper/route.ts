import { NextResponse } from 'next/server';
import { z } from 'zod';

const BIRDPAPER_ORIGIN = 'http://wp.birdpaper.com.cn';
const REQUEST_TIMEOUT_MS = 12_000;

const requestSchema = z.discriminatedUnion('mode', [
    z.object({
        mode: z.literal('latest'),
        page: z.coerce.number().int().min(1).default(1),
        count: z.coerce.number().int().min(1).max(50).default(10),
    }),
    z.object({
        mode: z.literal('search'),
        page: z.coerce.number().int().min(1).default(1),
        count: z.coerce.number().int().min(1).max(50).default(10),
        query: z.string().trim().min(1).max(100),
    }),
    z.object({
        mode: z.literal('category'),
        page: z.coerce.number().int().min(1).default(1),
        count: z.coerce.number().int().min(1).max(50).default(10),
        categoryId: z.string().trim().regex(/^\d+$/),
    }),
]);

function buildUpstreamUrl(input: z.infer<typeof requestSchema>): URL {
    const pathname = input.mode === 'latest'
        ? '/intf/newestList'
        : input.mode === 'search'
            ? '/intf/search'
            : '/intf/GetListByCategory';
    const target = new URL(pathname, BIRDPAPER_ORIGIN);
    target.searchParams.set('pageno', String(input.page));
    target.searchParams.set('count', String(input.count));

    if (input.mode === 'search') {
        target.searchParams.set('content', input.query);
    } else if (input.mode === 'category') {
        target.searchParams.set('cids', input.categoryId);
    }

    return target;
}

export async function GET(request: Request) {
    const sourceUrl = new URL(request.url);
    const parsed = requestSchema.safeParse({
        mode: sourceUrl.searchParams.get('mode') ?? 'latest',
        page: sourceUrl.searchParams.get('page') ?? '1',
        count: sourceUrl.searchParams.get('count') ?? '10',
        query: sourceUrl.searchParams.get('query') ?? undefined,
        categoryId: sourceUrl.searchParams.get('categoryId') ?? undefined,
    });

    if (!parsed.success) {
        return NextResponse.json(
            { ok: false, error: 'Invalid BirdPaper request', issues: parsed.error.issues },
            { status: 400 },
        );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(buildUpstreamUrl(parsed.data), {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
            cache: 'no-store',
        });
        const payload: unknown = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { ok: false, error: 'BirdPaper upstream request failed' },
                { status: 502 },
            );
        }

        return NextResponse.json(payload, {
            headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
        });
    } catch (error) {
        const message = error instanceof Error && error.name === 'AbortError'
            ? 'BirdPaper upstream timed out'
            : 'BirdPaper upstream is unavailable';
        return NextResponse.json({ ok: false, error: message }, { status: 502 });
    } finally {
        clearTimeout(timeout);
    }
}
