import {
    MediaSourceError,
    type MediaItem,
    type MediaPage,
    type MediaQuery,
    type MediaSource,
    type MediaSourceId,
    type MediaSourceRequestOptions,
} from '../domain';

/**
 * An application-owned catalog. Each composition root creates and populates
 * its own instance, so tests, requests and multiple canvases cannot leak
 * registrations into one another.
 */
export class MediaSourceCatalog {
    readonly #sources = new Map<MediaSourceId, MediaSourceRegistration>();

    constructor(sources: readonly MediaSourceRegistration[] = []) {
        for (const source of sources) this.add(source);
    }

    register<TParams, TItem extends MediaItem>(source: MediaSource<TParams, TItem>): this {
        return this.add(source);
    }

    private add(source: MediaSourceRegistration): this {
        if (this.#sources.has(source.id)) {
            throw new Error(`Media source "${source.id}" is already registered.`);
        }
        this.#sources.set(source.id, source);
        return this;
    }

    has(sourceId: MediaSourceId): boolean {
        return this.#sources.has(sourceId);
    }

    get<TParams = Readonly<Record<string, unknown>>, TItem extends MediaItem = MediaItem>(
        sourceId: MediaSourceId,
    ): MediaSource<TParams, TItem> {
        const source = this.#sources.get(sourceId);
        if (!source) {
            throw new MediaSourceError({
                sourceId,
                code: 'invalid-query',
                message: `Unknown media source "${sourceId}".`,
            });
        }
        return source as unknown as MediaSource<TParams, TItem>;
    }

    fetchPage<TParams, TItem extends MediaItem = MediaItem>(
        query: MediaQuery<TParams>,
        options?: MediaSourceRequestOptions,
    ): Promise<MediaPage<TItem>> {
        return this.get<TParams, TItem>(query.sourceId).fetchPage(query, options);
    }

    ids(): readonly MediaSourceId[] {
        return [...this.#sources.keys()];
    }
}

interface MediaSourceRegistration {
    readonly id: MediaSourceId;
    readonly fetchPage: unknown;
}
