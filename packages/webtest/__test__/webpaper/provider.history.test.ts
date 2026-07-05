import { describe, expect, it } from 'vitest';

import type { Provider, ProviderRecord } from '@webpaper/types';
import type { IProviderAdapter } from '@webpaper/features/provider/types';
import { ProviderManager } from '@webpaper/features/provider/ProviderManager';

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

class MockAdapter implements IProviderAdapter {
    readonly name = 'Mock';
    private index = 0;

    public constructor(private readonly records: ProviderRecord[]) {
    }

    public async getOne(): Promise<ProviderRecord | null> {
        const record = this.records[this.index] ?? null;
        this.index += 1;
        return record;
    }

    public async peekOne(): Promise<ProviderRecord | null> {
        return this.records[this.index] ?? null;
    }

    public updateSettings(): void {
    }

    public reset(): void {
        this.index = 0;
    }
}

describe('ProviderManager history records', () => {
    it('keeps stable sequence order in manager history', async () => {
        const manager = new ProviderManager(
            'Konachan',
            {},
            () => new MockAdapter([makeProviderRecord(101), makeProviderRecord(102), makeProviderRecord(103)]),
        );

        await manager.next();
        await manager.next();
        await manager.next();

        const history = manager.getHistoryRecords();
        expect(history).toHaveLength(3);
        expect(history.map((item) => item.id)).toEqual([101, 102, 103]);
        expect(history.map((item) => item.sequence)).toEqual([1, 2, 3]);
    });

    it('can locate current record by stable sequence', async () => {
        const manager = new ProviderManager(
            'Konachan',
            {},
            () => new MockAdapter([makeProviderRecord(201), makeProviderRecord(202), makeProviderRecord(203)]),
        );

        await manager.next();
        await manager.next();
        await manager.next();

        manager.setCurrentBySequence(2);
        const current = manager.current();

        expect(current?.id).toBe(202);
    });
});
