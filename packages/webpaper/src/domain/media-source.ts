import type { MediaItem, MediaSourceId } from './media-item';

export const DEFAULT_MEDIA_PAGE_SIZE = 10;
export const MAX_MEDIA_PAGE_SIZE = 50;

export interface MediaQuery<TParams = Readonly<Record<string, unknown>>> {
    readonly sourceId: MediaSourceId;
    readonly page: number;
    readonly pageSize?: number;
    readonly params: TParams;
}

export interface MediaPage<TItem extends MediaItem = MediaItem> {
    readonly sourceId: MediaSourceId;
    readonly page: number;
    readonly pageSize: number;
    readonly items: readonly TItem[];
    readonly hasMore: boolean;
    readonly totalItems?: number;
    readonly totalPages?: number;
}

export interface MediaSourceRequestOptions {
    readonly signal?: AbortSignal;
}

export interface MediaSource<
    TParams = Readonly<Record<string, unknown>>,
    TItem extends MediaItem = MediaItem,
> {
    readonly id: MediaSourceId;
    fetchPage(
        query: MediaQuery<TParams>,
        options?: MediaSourceRequestOptions,
    ): Promise<MediaPage<TItem>>;
}

export type MediaSourceErrorCode =
    | 'invalid-query'
    | 'network'
    | 'aborted'
    | 'http'
    | 'invalid-response'
    | 'upstream';

export class MediaSourceError extends Error {
    readonly sourceId: MediaSourceId;
    readonly code: MediaSourceErrorCode;
    readonly status?: number;
    override readonly cause?: unknown;

    constructor(options: {
        sourceId: MediaSourceId;
        code: MediaSourceErrorCode;
        message: string;
        status?: number;
        cause?: unknown;
    }) {
        super(options.message);
        this.name = 'MediaSourceError';
        this.sourceId = options.sourceId;
        this.code = options.code;
        if (options.status !== undefined) this.status = options.status;
        if (options.cause !== undefined) this.cause = options.cause;
    }
}

export function assertMediaQuery(
    query: Pick<MediaQuery<unknown>, 'sourceId' | 'page' | 'pageSize'>,
    expectedSourceId: MediaSourceId,
): number {
    if (query.sourceId !== expectedSourceId) {
        throw new MediaSourceError({
            sourceId: expectedSourceId,
            code: 'invalid-query',
            message: `Source "${expectedSourceId}" cannot execute a query for "${query.sourceId}".`,
        });
    }

    if (!Number.isInteger(query.page) || query.page < 1) {
        throw new MediaSourceError({
            sourceId: expectedSourceId,
            code: 'invalid-query',
            message: 'Media query page must be a positive integer.',
        });
    }

    const pageSize = query.pageSize ?? DEFAULT_MEDIA_PAGE_SIZE;
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_MEDIA_PAGE_SIZE) {
        throw new MediaSourceError({
            sourceId: expectedSourceId,
            code: 'invalid-query',
            message: `Media query pageSize must be an integer between 1 and ${MAX_MEDIA_PAGE_SIZE}.`,
        });
    }

    return pageSize;
}
