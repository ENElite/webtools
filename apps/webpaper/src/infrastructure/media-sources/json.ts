import { z } from 'zod';

import {
    assertMediaQuery,
    MediaSourceError,
    type MediaItem,
    type MediaPage,
    type MediaSource,
} from '../../domain';
import { parsePayload } from './http';

const JSON_SOURCE_ID = 'json' as const;

export interface JsonMediaQueryParams {
    readonly content: string;
}

const JsonParamsSchema = z.object({
    content: z.string(),
});

const JsonItemSchema = z.object({
    id: z.union([z.string().min(1), z.number()]).optional(),
    kind: z.enum(['image', 'video']).optional(),
    type: z.enum(['image', 'video']).optional(),
    url: z.string().trim().min(1),
    previewUrl: z.string().trim().min(1).optional(),
    preview: z.string().trim().min(1).optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    durationSeconds: z.number().nonnegative().optional(),
}).passthrough();

const JsonItemsSchema = z.array(JsonItemSchema);
type JsonPayloadItem = z.infer<typeof JsonItemSchema>;

export function createJsonMediaSource(): MediaSource<JsonMediaQueryParams> {
    return {
        id: JSON_SOURCE_ID,
        async fetchPage(query): Promise<MediaPage> {
            const pageSize = assertMediaQuery(query, JSON_SOURCE_ID);
            const params = parsePayload({
                sourceId: JSON_SOURCE_ID,
                schema: JsonParamsSchema,
                payload: query.params,
                code: 'invalid-query',
            });

            let decoded: unknown;
            try {
                decoded = JSON.parse(params.content);
            } catch (cause) {
                throw new MediaSourceError({
                    sourceId: JSON_SOURCE_ID,
                    code: 'invalid-response',
                    message: 'JSON media source content is not valid JSON.',
                    cause,
                });
            }
            const records = parsePayload({
                sourceId: JSON_SOURCE_ID,
                schema: JsonItemsSchema,
                payload: decoded,
            });
            const start = (query.page - 1) * pageSize;
            const recordsOnPage = records.slice(start, start + pageSize);

            return {
                sourceId: JSON_SOURCE_ID,
                page: query.page,
                pageSize,
                items: recordsOnPage.map((record, index) => normalizeJsonItem(record, start + index)),
                hasMore: start + recordsOnPage.length < records.length,
                totalItems: records.length,
                totalPages: Math.ceil(records.length / pageSize),
            };
        },
    };
}

function normalizeJsonItem(record: JsonPayloadItem, index: number): MediaItem {
    const kind = record.kind ?? record.type ?? 'image';
    const base = {
        id: `${JSON_SOURCE_ID}:${String(record.id ?? index)}`,
        sourceId: JSON_SOURCE_ID,
        url: record.url,
        raw: record,
    } as const;

    if (kind === 'video') {
        const posterUrl = record.previewUrl ?? record.preview;
        return {
            ...base,
            kind,
            ...(posterUrl === undefined ? {} : { posterUrl }),
            ...(record.durationSeconds === undefined ? {} : { durationSeconds: record.durationSeconds }),
        };
    }

    const previewUrl = record.previewUrl ?? record.preview;
    return {
        ...base,
        kind,
        ...(previewUrl === undefined ? {} : { previewUrl }),
        ...(record.width === undefined ? {} : { width: record.width }),
        ...(record.height === undefined ? {} : { height: record.height }),
    };
}
