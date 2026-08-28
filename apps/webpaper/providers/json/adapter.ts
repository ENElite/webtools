import type { ApiAdapter } from '../types';
import type { ProviderRecord } from '@/providers/types';

function normalizeRecord(item: Record<string, unknown>, index: number): ProviderRecord {
    const id = String(item['id'] ?? `json-${index}`);
    const url = typeof item['url'] === 'string' ? item['url'] : '';
    const type = item['type'] === 'video' ? 'video' : 'image';
    const preview = typeof item['preview'] === 'string' ? item['preview'] : undefined;
    return {
        provider: 'Json',
        id,
        url,
        type,
        preview,
    };
}

function parseJsonRecords(jsonText: string): ProviderRecord[] {
    const parsed = JSON.parse(jsonText) as unknown;
    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed
        .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
        .map((item, index) => normalizeRecord(item, index))
        .filter((item) => Boolean(item.url));
}

export const JsonAdapter: ApiAdapter<{ content?: string }> = {
    provider: 'Json',
    fetch: async (_api, params) => {
        return {
            data: JsonAdapter.normalize(params.content),
            hasMore: false,
        };
    },
    normalize: (raw: unknown) => {
        if (typeof raw !== 'string') {
            return [];
        }
        return parseJsonRecords(raw);
    },
    hasMore: () => false,
    serializeParams: (params) => JSON.stringify(params),
};