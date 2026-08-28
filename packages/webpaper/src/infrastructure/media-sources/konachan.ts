import { z } from 'zod';

import {
    assertMediaQuery,
    MediaSourceError,
    type ImageMediaItem,
    type MediaPage,
    type MediaQuery,
    type MediaSource,
} from '../../domain';
import { buildSameOriginUrl, fetchJson, parsePayload, type FetchClient } from './http';

const KONACHAN_SOURCE_ID = 'konachan' as const;
const DEFAULT_KONACHAN_ENDPOINT = '/api/konachan';

export const KONACHAN_QUALITY_KEYS = [
    'file_url',
    'jpeg_url',
    'sample_url',
    'preview_url',
] as const;

export type KonachanQuality = (typeof KONACHAN_QUALITY_KEYS)[number];

export interface KonachanQueryParams {
    readonly tags?: string;
    readonly quality?: KonachanQuality;
}

export interface CreateKonachanSourceOptions {
    readonly fetch: FetchClient;
    readonly endpoint?: string;
}

const KonachanParamsSchema = z.object({
    tags: z.string().trim().optional(),
    quality: z.enum(KONACHAN_QUALITY_KEYS).optional(),
});

const NonEmptyUrlSchema = z.string().trim().min(1);
const KonachanItemSchema = z.object({
    id: z.union([z.number().int(), z.string().min(1)]),
    file_url: NonEmptyUrlSchema.optional(),
    jpeg_url: NonEmptyUrlSchema.optional(),
    sample_url: NonEmptyUrlSchema.optional(),
    preview_url: NonEmptyUrlSchema.optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    jpeg_width: z.number().int().positive().optional(),
    jpeg_height: z.number().int().positive().optional(),
    sample_width: z.number().int().positive().optional(),
    sample_height: z.number().int().positive().optional(),
}).passthrough().superRefine((item, context) => {
    if (!KONACHAN_QUALITY_KEYS.some((key) => item[key] !== undefined)) {
        context.addIssue({
            code: 'custom',
            message: 'At least one image URL is required.',
        });
    }
});

const KonachanResponseSchema = z.array(KonachanItemSchema);
export type KonachanPayloadItem = z.infer<typeof KonachanItemSchema>;

export function createKonachanSource(
    options: CreateKonachanSourceOptions,
): MediaSource<KonachanQueryParams, ImageMediaItem> {
    const endpoint = options.endpoint ?? DEFAULT_KONACHAN_ENDPOINT;

    return {
        id: KONACHAN_SOURCE_ID,
        async fetchPage(query, requestOptions): Promise<MediaPage<ImageMediaItem>> {
            const pageSize = assertMediaQuery(query, KONACHAN_SOURCE_ID);
            const params = parsePayload({
                sourceId: KONACHAN_SOURCE_ID,
                schema: KonachanParamsSchema,
                payload: query.params,
                code: 'invalid-query',
            });
            const url = buildSameOriginUrl(KONACHAN_SOURCE_ID, endpoint, {
                page: query.page,
                limit: pageSize,
                tags: params.tags || undefined,
            });
            const payload = await fetchJson({
                sourceId: KONACHAN_SOURCE_ID,
                fetch: options.fetch,
                url,
                ...(requestOptions?.signal === undefined ? {} : { signal: requestOptions.signal }),
            });
            const records = parsePayload({
                sourceId: KONACHAN_SOURCE_ID,
                schema: KonachanResponseSchema,
                payload,
            });
            const quality = params.quality ?? 'file_url';
            const items = records.map((record) => normalizeKonachanItem(record, quality));

            return {
                sourceId: KONACHAN_SOURCE_ID,
                page: query.page,
                pageSize,
                items,
                hasMore: records.length === pageSize,
            };
        },
    };
}

export function normalizeKonachanItem(
    record: KonachanPayloadItem,
    quality: KonachanQuality = 'file_url',
): ImageMediaItem {
    const selectedKey = [quality, ...KONACHAN_QUALITY_KEYS]
        .find((key) => typeof record[key] === 'string' && record[key].length > 0);
    if (!selectedKey) {
        throw new MediaSourceError({
            sourceId: KONACHAN_SOURCE_ID,
            code: 'invalid-response',
            message: 'Konachan item has no usable image URL.',
        });
    }

    const item: ImageMediaItem = {
        id: `${KONACHAN_SOURCE_ID}:${String(record.id)}`,
        sourceId: KONACHAN_SOURCE_ID,
        kind: 'image',
        url: secureKonachanUrl(record[selectedKey] as string),
        raw: record,
    };
    const previewUrl = record.preview_url;
    const width = selectedKey === 'jpeg_url'
        ? record.jpeg_width ?? record.width
        : selectedKey === 'sample_url'
            ? record.sample_width ?? record.width
            : record.width;
    const height = selectedKey === 'jpeg_url'
        ? record.jpeg_height ?? record.height
        : selectedKey === 'sample_url'
            ? record.sample_height ?? record.height
            : record.height;

    return {
        ...item,
        ...(previewUrl === undefined ? {} : { previewUrl: secureKonachanUrl(previewUrl) }),
        ...(width === undefined ? {} : { width }),
        ...(height === undefined ? {} : { height }),
    };
}

function secureKonachanUrl(url: string): string {
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('http://')) return `https://${url.slice('http://'.length)}`;
    return url;
}
