import { MediaSourceCatalog } from '../../application';
import type { MediaQuery } from '../../domain';
import {
    createBirdPaperSource,
    createJsonMediaSource,
    createKonachanSource,
    type BirdPaperQueryParams,
    type FetchClient,
    type JsonMediaQueryParams,
    type KonachanQueryParams,
} from '../../infrastructure';

export type MediaSourceSelection =
    | SourceSelection<'konachan', KonachanQueryParams>
    | SourceSelection<'bird-paper', BirdPaperQueryParams>
    | SourceSelection<'json', JsonMediaQueryParams>;

export interface CreateWebPaperMediaCatalogOptions {
    /** Injected to keep the catalog deterministic in tests and composition roots. */
    readonly fetch?: FetchClient;
    readonly endpoints?: {
        readonly konachan?: string;
        readonly birdPaper?: string;
    };
}

export const MEDIA_SOURCE_OPTIONS = [
    { id: 'konachan', label: 'Konachan' },
    { id: 'bird-paper', label: '小鸟壁纸' },
    { id: 'json', label: 'JSON' },
] as const;

/**
 * Creates an application-scoped catalog. Nothing is registered through module
 * side effects, so multiple players and tests remain isolated.
 */
export function createWebPaperMediaCatalog(
    options: CreateWebPaperMediaCatalogOptions = {},
): MediaSourceCatalog {
    const fetchClient: FetchClient = options.fetch ?? ((input, init) => fetch(input, init));
    const konachanEndpoint = options.endpoints?.konachan;
    const birdPaperEndpoint = options.endpoints?.birdPaper;

    return new MediaSourceCatalog([
        createKonachanSource({
            fetch: fetchClient,
            ...(konachanEndpoint === undefined ? {} : { endpoint: konachanEndpoint }),
        }),
        createBirdPaperSource({
            fetch: fetchClient,
            ...(birdPaperEndpoint === undefined ? {} : { endpoint: birdPaperEndpoint }),
        }),
        createJsonMediaSource(),
    ]);
}

type CatalogSourceId = 'konachan' | 'bird-paper' | 'json';

interface SourceSelection<TSourceId extends CatalogSourceId, TParams>
    extends Omit<MediaQuery<TParams>, 'page'> {
    readonly sourceId: TSourceId;
    /** The first page to request when this selection becomes active. */
    readonly initialPage?: number;
}
