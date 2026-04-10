import { describe, expect, it } from 'vitest';

import type { HistoryRecord, Provider, ProviderRecord } from '../../types';
import { appendUniqueHistoryRecord } from '../../webpaper';

function makeProviderRecord(id: number, provider: Provider = 'Konachan'): ProviderRecord {
    return {
        type: 'image',
        provider: provider,
        sourceUrl: `https://konachan.net/post/show/${id}`,
        fileUrl: `https://img/${id}.jpg`,
        jpegUrl: `https://img/${id}.jpeg`,
        sampleUrl: `https://img/${id}.sample`,
        previewUrl: `https://img/${id}.preview`,
        displayUrl: `https://img/${id}.display`,
        id,
        parentId: null,
        tags: ['tag'],
        rating: 's',
        width: 1920,
        height: 1080,
        fileSize: 100,
        creatorId: 1,
        author: 'author',
        source: 'source',
        createdAt: 1,
        query: 'tag',
        page: 1,
        raw: {},
    };
}

function makeHistoryRecord(id: number, sequence: number): HistoryRecord {
    return {
        ...makeProviderRecord(id),
        sequence,
    };
}

describe('appendUniqueHistoryRecord', () => {
    it('appends new records with incremental sequence', () => {
        const prev = [makeHistoryRecord(1, 1)];

        const next = appendUniqueHistoryRecord(prev, makeProviderRecord(2));

        expect(next).toHaveLength(2);
        expect(next[1]?.id).toBe(2);
        expect(next[1]?.sequence).toBe(2);
    });

    it('keeps history unchanged for duplicate provider+id', () => {
        const prev = [makeHistoryRecord(1, 1)];

        const next = appendUniqueHistoryRecord(prev, makeProviderRecord(1));

        expect(next).toHaveLength(1);
        expect(next).toEqual(prev);
    });
});
