import { z } from 'zod';

import {
    assertMediaQuery,
    MediaSourceError,
    type ImageMediaItem,
    type MediaPage,
    type MediaSource,
} from '../../domain';
import { buildSameOriginUrl, fetchJson, parsePayload, type FetchClient } from './http';

const BIRD_PAPER_SOURCE_ID = 'bird-paper' as const;
const DEFAULT_BIRD_PAPER_ENDPOINT = '/api/media/birdpaper';
const SECURE_BIRD_IMAGE_HOSTS = new Set(['cdn-hsyq-static.shanhutech.cn']);

export type BirdPaperQueryParams =
    | { readonly mode: 'latest' }
    | { readonly mode: 'search'; readonly query: string }
    | { readonly mode: 'category'; readonly categoryId: string };

export interface CreateBirdPaperSourceOptions {
    readonly fetch: FetchClient;
    /** Must be a same-origin BFF path. The BFF owns the HTTP upstream call. */
    readonly endpoint?: string;
}

const BirdPaperParamsSchema = z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('latest') }),
    z.object({ mode: z.literal('search'), query: z.string().trim().min(1) }),
    z.object({ mode: z.literal('category'), categoryId: z.string().trim().min(1) }),
]);

const BirdPaperItemSchema = z.object({
    id: z.union([z.string().min(1), z.number()]),
    url: z.string().trim().min(1),
    author: z.string().optional(),
    category: z.string().optional(),
    tag: z.string().optional(),
    class_id: z.string().optional(),
}).passthrough();

const BirdPaperResponseSchema = z.object({
    errno: z.number().int(),
    msg: z.string().optional(),
    data: z.object({
        total_count: z.number().int().nonnegative(),
        total_page: z.number().int().nonnegative(),
        pageno: z.number().int().positive(),
        count: z.number().int().nonnegative(),
        list: z.array(BirdPaperItemSchema),
    }).passthrough(),
}).passthrough();

export type BirdPaperPayloadItem = z.infer<typeof BirdPaperItemSchema>;

export function createBirdPaperSource(
    options: CreateBirdPaperSourceOptions,
): MediaSource<BirdPaperQueryParams, ImageMediaItem> {
    const endpoint = options.endpoint ?? DEFAULT_BIRD_PAPER_ENDPOINT;

    return {
        id: BIRD_PAPER_SOURCE_ID,
        async fetchPage(query, requestOptions): Promise<MediaPage<ImageMediaItem>> {
            const pageSize = assertMediaQuery(query, BIRD_PAPER_SOURCE_ID);
            const params = parsePayload({
                sourceId: BIRD_PAPER_SOURCE_ID,
                schema: BirdPaperParamsSchema,
                payload: query.params,
                code: 'invalid-query',
            });
            const url = buildSameOriginUrl(BIRD_PAPER_SOURCE_ID, endpoint, {
                mode: params.mode,
                page: query.page,
                count: pageSize,
                query: params.mode === 'search' ? params.query : undefined,
                categoryId: params.mode === 'category' ? params.categoryId : undefined,
            });
            const payload = await fetchJson({
                sourceId: BIRD_PAPER_SOURCE_ID,
                fetch: options.fetch,
                url,
                ...(requestOptions?.signal === undefined ? {} : { signal: requestOptions.signal }),
            });
            const response = parsePayload({
                sourceId: BIRD_PAPER_SOURCE_ID,
                schema: BirdPaperResponseSchema,
                payload,
            });
            if (response.errno !== 0) {
                throw new MediaSourceError({
                    sourceId: BIRD_PAPER_SOURCE_ID,
                    code: 'upstream',
                    message: response.msg || `BirdPaper upstream returned errno ${response.errno}.`,
                });
            }

            return {
                sourceId: BIRD_PAPER_SOURCE_ID,
                page: query.page,
                pageSize,
                items: response.data.list.map(normalizeBirdPaperItem),
                hasMore: query.page < response.data.total_page,
                totalItems: response.data.total_count,
                totalPages: response.data.total_page,
            };
        },
    };
}

export function normalizeBirdPaperItem(record: BirdPaperPayloadItem): ImageMediaItem {
    return {
        id: `${BIRD_PAPER_SOURCE_ID}:${String(record.id)}`,
        sourceId: BIRD_PAPER_SOURCE_ID,
        kind: 'image',
        url: secureBirdPaperImageUrl(record.url),
        raw: record,
    };
}

function secureBirdPaperImageUrl(value: string): string {
    let url: URL;
    try {
        url = new URL(value);
    } catch (cause) {
        throw new MediaSourceError({
            sourceId: BIRD_PAPER_SOURCE_ID,
            code: 'invalid-response',
            message: 'BirdPaper returned an invalid image URL.',
            cause,
        });
    }

    if (url.protocol === 'https:') return url.toString();
    if (url.protocol === 'http:' && SECURE_BIRD_IMAGE_HOSTS.has(url.hostname)) {
        url.protocol = 'https:';
        return url.toString();
    }
    throw new MediaSourceError({
        sourceId: BIRD_PAPER_SOURCE_ID,
        code: 'invalid-response',
        message: `BirdPaper returned an insecure image URL from "${url.hostname}".`,
    });
}
