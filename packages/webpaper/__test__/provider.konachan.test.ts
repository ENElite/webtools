import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../konachan/api', async () => {
    const actual = await vi.importActual<typeof import('@/providers/konachan/api')>('../konachan/api');
    return {
        ...actual,
        fetchKonachan: vi.fn(),
    };
});

import { DEFAULT_KONACHAN_SETTINGS, type KonachanProviderSettings } from '@/providers/konachan/settings';
import { KonachanProvider } from '@/providers/konachan/provider';
import { fetchKonachan, type KonachanImageInfo } from '@/providers/konachan/api';

const mockedFetchKonachan = vi.mocked(fetchKonachan);

function makeImage(id: number, parentId = 0): KonachanImageInfo {
    return {
        id,
        parent_id: parentId,
        tags: 'tag_a tag_b',
        rating: 's',
        width: 1920,
        height: 1080,
        file_size: 100,
        file_url: `https://img/${id}.jpg`,
        jpeg_url: `https://img/${id}.jpeg`,
        sample_url: `https://img/${id}.sample`,
        preview_url: `https://img/${id}.preview`,
        author: 'author',
        source: 'source',
        md5: `md5-${id}`,
        creator_id: 1,
        created_at: 1,
    };
}

function createRuntime(patch: Partial<KonachanProviderSettings> = {}): KonachanProvider {
    const settings: KonachanProviderSettings = {
        ...DEFAULT_KONACHAN_SETTINGS,
        page: 1,
        tags: ['unit_test'],
        ...patch,
    };
    return new KonachanProvider(settings);
}

describe('KonachanProvider', () => {
    beforeEach(() => {
        mockedFetchKonachan.mockReset();
    });

    it('deduplicates ids while paging', async () => {
        mockedFetchKonachan
            .mockResolvedValueOnce([makeImage(1), makeImage(2)])
            .mockResolvedValueOnce([makeImage(2), makeImage(3)]);

        const runtime = createRuntime({ skipPid: false });

        const a = await runtime.getOne();
        const b = await runtime.getOne();
        const c = await runtime.getOne();

        expect(a?.id).toBe(1);
        expect(b?.id).toBe(2);
        expect(c?.id).toBe(3);
        expect(mockedFetchKonachan).toHaveBeenCalledTimes(2);
    });

    it('skips child image when parent already appeared with skipPid enabled', async () => {
        mockedFetchKonachan
            .mockResolvedValueOnce([makeImage(10), makeImage(11, 10)])
            .mockResolvedValueOnce([makeImage(12)]);

        const runtime = createRuntime({ skipPid: true });

        const first = await runtime.getOne();
        const second = await runtime.getOne();

        expect(first?.id).toBe(10);
        expect(second?.id).toBe(12);
    });

    it('peekOne does not consume runtime state', async () => {
        mockedFetchKonachan.mockResolvedValue([makeImage(21), makeImage(22)]);

        const runtime = createRuntime({ skipPid: false });

        const peeked = await runtime.peekOne();
        const first = await runtime.getOne();
        const second = await runtime.getOne();

        expect(peeked?.id).toBe(21);
        expect(first?.id).toBe(21);
        expect(second?.id).toBe(22);
    });

    it('stops after three consecutive network failures', async () => {
        mockedFetchKonachan.mockRejectedValue(new Error('network down'));

        const runtime = createRuntime();

        await expect(runtime.getOne()).resolves.toBeNull();
        await expect(runtime.getOne()).resolves.toBeNull();
        await expect(runtime.getOne()).resolves.toBeNull();

        expect(runtime.isStoppedByNetworkErrors).toBe(true);
        expect(runtime.hasMore).toBe(false);
    });

    it('caps page loads per operation to avoid runaway requests', async () => {
        mockedFetchKonachan.mockResolvedValue([makeImage(99)]);

        const runtime = createRuntime({ skipPid: false });

        const first = await runtime.getOne();
        const second = await runtime.getOne();

        expect(first?.id).toBe(99);
        expect(second).toBeNull();
        expect(runtime.hasMore).toBe(false);
        expect(mockedFetchKonachan).toHaveBeenCalledTimes(9);
    });

    it('resets state when query key changes', async () => {
        mockedFetchKonachan
            .mockResolvedValueOnce([makeImage(100)])
            .mockResolvedValueOnce([makeImage(100)]);

        const runtime = createRuntime({ skipPid: false, tags: ['first'] });

        const beforeUpdate = await runtime.getOne();
        runtime.updateSettings({
            ...DEFAULT_KONACHAN_SETTINGS,
            page: 1,
            tags: ['second'],
            skipPid: false,
        });
        const afterUpdate = await runtime.getOne();

        expect(beforeUpdate?.id).toBe(100);
        expect(afterUpdate?.id).toBe(100);
        expect(mockedFetchKonachan).toHaveBeenCalledTimes(2);
    });
});
