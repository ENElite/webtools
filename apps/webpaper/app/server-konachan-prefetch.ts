import { DEFAULT_APP_SETTINGS } from '../src/application';
import type { MediaPage } from '../src/domain';
import { createKonachanSource, type FetchClient } from '../src/infrastructure';
import type { MediaPlayerInitialPage } from '../src/features/player';
import { toSelection } from './source-selection';

const KONACHAN_UPSTREAM_ENDPOINT = 'https://konachan.com/post.json';
const DEFAULT_TIMEOUT_MS = 8_000;

export interface PrefetchDefaultKonachanOptions {
    readonly fetch?: FetchClient;
    readonly timeoutMs?: number;
}

/**
 * Fetch the default first page in the RSC runtime. The browser keeps using the
 * same-origin API source for subsequent pages; only this bootstrap request goes
 * directly to the upstream endpoint.
 */
export async function prefetchDefaultKonachanPage(
    options: PrefetchDefaultKonachanOptions = {},
): Promise<MediaPlayerInitialPage | null> {
    const selection = toSelection(DEFAULT_APP_SETTINGS);
    if (selection.sourceId !== 'konachan') return null;

    const fetchClient = options.fetch ?? ((input, init) => fetch(input, init));
    const upstreamFetch: FetchClient = async (input, init) => {
        const localUrl = new URL(String(input), 'https://webpaper.local');
        const upstreamUrl = new URL(KONACHAN_UPSTREAM_ENDPOINT);
        upstreamUrl.search = localUrl.search;
        const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
        const signal = init?.signal
            ? AbortSignal.any([init.signal, timeoutSignal])
            : timeoutSignal;
        const requestInit: RequestInit & { readonly next: { readonly revalidate: number } } = {
            ...init,
            signal,
            next: { revalidate: 60 },
        };
        return fetchClient(upstreamUrl, requestInit);
    };

    try {
        const source = createKonachanSource({ fetch: upstreamFetch });
        const page: MediaPage = await source.fetchPage({
            sourceId: selection.sourceId,
            page: selection.initialPage ?? 1,
            params: selection.params,
            ...(selection.pageSize === undefined ? {} : { pageSize: selection.pageSize }),
        });
        return { selection, page };
    } catch {
        // The client controller will perform the existing same-origin API load.
        return null;
    }
}
