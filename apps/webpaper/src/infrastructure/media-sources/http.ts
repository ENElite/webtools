import { z } from 'zod';

import {
    MediaSourceError,
    type MediaSourceErrorCode,
    type MediaSourceId,
} from '../../domain';

export type FetchClient = (
    input: RequestInfo | URL,
    init?: RequestInit,
) => Promise<Response>;

export async function fetchJson(options: {
    sourceId: MediaSourceId;
    fetch: FetchClient;
    url: string;
    signal?: AbortSignal;
}): Promise<unknown> {
    const init: RequestInit = {
        method: 'GET',
        headers: { Accept: 'application/json' },
    };
    if (options.signal !== undefined) init.signal = options.signal;

    let response: Response;
    try {
        response = await options.fetch(options.url, init);
    } catch (cause) {
        const aborted = options.signal?.aborted === true || isAbortError(cause);
        throw new MediaSourceError({
            sourceId: options.sourceId,
            code: aborted ? 'aborted' : 'network',
            message: aborted
                ? `Request to media source "${options.sourceId}" was aborted.`
                : `Media source "${options.sourceId}" could not be reached.`,
            cause,
        });
    }

    if (!response.ok) {
        throw new MediaSourceError({
            sourceId: options.sourceId,
            code: 'http',
            status: response.status,
            message: `Media source "${options.sourceId}" returned HTTP ${response.status}.`,
        });
    }

    try {
        return await response.json();
    } catch (cause) {
        throw new MediaSourceError({
            sourceId: options.sourceId,
            code: 'invalid-response',
            message: `Media source "${options.sourceId}" returned invalid JSON.`,
            cause,
        });
    }
}

export function parsePayload<T>(options: {
    sourceId: MediaSourceId;
    schema: z.ZodType<T>;
    payload: unknown;
    code?: Extract<MediaSourceErrorCode, 'invalid-query' | 'invalid-response'>;
}): T {
    const result = options.schema.safeParse(options.payload);
    if (result.success) return result.data;

    const code = options.code ?? 'invalid-response';
    throw new MediaSourceError({
        sourceId: options.sourceId,
        code,
        message: code === 'invalid-query'
            ? `Invalid query for media source "${options.sourceId}".`
            : `Media source "${options.sourceId}" returned an invalid payload.`,
        cause: result.error,
    });
}

/** Build a URL that is guaranteed to stay on the application's origin. */
export function buildSameOriginUrl(
    sourceId: MediaSourceId,
    endpoint: string,
    query: Readonly<Record<string, string | number | boolean | undefined>>,
): string {
    if (!endpoint.startsWith('/') || endpoint.startsWith('//')) {
        throw new MediaSourceError({
            sourceId,
            code: 'invalid-query',
            message: `Media source "${sourceId}" requires a same-origin BFF endpoint path.`,
        });
    }

    const base = new URL('https://webpaper.local');
    const url = new URL(endpoint, base);
    if (url.origin !== base.origin) {
        throw new MediaSourceError({
            sourceId,
            code: 'invalid-query',
            message: `Media source "${sourceId}" requires a same-origin BFF endpoint path.`,
        });
    }
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return `${url.pathname}${url.search}${url.hash}`;
}

function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
}
