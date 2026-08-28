import type { ProviderRecord } from '@/providers/types';
import { ApiAdapter } from "../types";
import { KonachanResponse } from "./types";
import { pickKonachanUrl } from './schema';

function asyncDelay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(() => resolve(), milliseconds));
}

async function fetchKonachan(url: string, retry = 3): Promise<KonachanResponse> {
    let attempt = 0;
    let lastError: unknown = null;

    while (attempt < retry) {
        try {
            const response = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }

            const data: unknown = await response.json();
            if (!Array.isArray(data)) {
                throw new Error('Invalid response payload');
            }

            return data as KonachanResponse;
        } catch (error) {
            lastError = error;
            attempt += 1;
            if (attempt >= retry) {
                throw lastError instanceof Error ? lastError : new Error('Request failed');
            }

            await asyncDelay(1000 * 2 ** attempt);
        }
    }

    throw lastError instanceof Error ? lastError : new Error('Request failed');
}

const PAGE_SIZE = 10;

export const KonachanAdapter: ApiAdapter = {
    provider: 'Konachan',
    fetch: async (api = '/api/konachan', params, page) => {
        // Konachan API 不能使用 urlencode 编码，所以这里手动构建查询字符串
        const safeParams = { ...(params ?? {}) };
        safeParams['page'] = page;
        safeParams['limit'] = PAGE_SIZE;
        const queryParts: string[] = [];
        for (const [key, value] of Object.entries(safeParams)) {
            if (!value) continue;
            queryParts.push(`${key}=${String(value)}`);
        }
        const query = queryParts.join('&');
        const url = `${api}${query ? `?${query}` : ''}`;
        console.log('[KonachanAdapter] fetching:', { url, page, params: safeParams });
        const raw = await fetchKonachan(url);
        console.log('[KonachanAdapter] raw response:', { length: Array.isArray(raw) ? raw.length : 'not-array', isArray: Array.isArray(raw), sampleIds: Array.isArray(raw) ? raw.slice(0, 3).map(r => r.id) : [] });
        const normalized = KonachanAdapter.normalize(raw, params);
        console.log('[KonachanAdapter] normalized:', { length: normalized.length, sampleIds: normalized.slice(0, 3).map(r => r.id) });
        const hasMore = KonachanAdapter.hasMore(raw, page);
        console.log('[KonachanAdapter] hasMore:', hasMore);
        return {
            data: normalized,
            hasMore,
        };
    },
    normalize: (raw: KonachanResponse, params): ProviderRecord[] => {
        if (!Array.isArray(raw)) return [];
        return raw.map(item => ({
            id: `Konachan-${item.id}`,
            provider: 'Konachan',
            type: 'image',
            url: pickKonachanUrl(item, String(params?.['quality'])),
            preview: item.preview_url,
            raw: item,
        }));
    },
    hasMore: (raw: KonachanResponse, _: number) => {
        if (!Array.isArray(raw)) return false;
        return raw.length === PAGE_SIZE;
    },
};