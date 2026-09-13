import { describe, expect, it, vi } from 'vitest';

import {
    APP_SETTINGS_STORAGE_KEY,
    DEFAULT_APP_SETTINGS,
    loadAppSettings,
    saveAppSettings,
} from './app-settings';

describe('app settings', () => {
    it('keeps rating separate from the default user tags', () => {
        expect(DEFAULT_APP_SETTINGS.konachan).toMatchObject({ tags: '', rating: 'safe' });
    });

    it('persists deduplicated user tags without embedded rating tags', () => {
        const setItem = vi.fn();
        saveAppSettings({ setItem }, {
            ...DEFAULT_APP_SETTINGS,
            konachan: {
                ...DEFAULT_APP_SETTINGS.konachan,
                tags: 'cat rating:explicit cat sky rating:unknown',
                rating: 'questionable',
            },
        });

        const serialized = setItem.mock.calls[0]?.[1];
        expect(setItem.mock.calls[0]?.[0]).toBe(APP_SETTINGS_STORAGE_KEY);
        expect(JSON.parse(String(serialized)).konachan).toMatchObject({
            tags: 'cat sky',
            rating: 'questionable',
        });
    });

    it('migrates a legacy rating tag into the dedicated persisted field', () => {
        const legacy = {
            ...DEFAULT_APP_SETTINGS,
            konachan: {
                tags: 'cat rating:explicit cat',
                quality: 'jpeg_url',
            },
        };
        const loaded = loadAppSettings({
            getItem: () => JSON.stringify(legacy),
        });

        expect(loaded.konachan).toEqual({
            tags: 'cat',
            rating: 'explicit',
            quality: 'jpeg_url',
        });
    });

    it.each(['questionableless', 'questionableplus'] as const)(
        'accepts and persists the combined %s rating',
        (rating) => {
            const setItem = vi.fn();
            saveAppSettings({ setItem }, {
                ...DEFAULT_APP_SETTINGS,
                konachan: { ...DEFAULT_APP_SETTINGS.konachan, rating },
            });

            expect(JSON.parse(String(setItem.mock.calls[0]?.[1])).konachan.rating).toBe(rating);
        },
    );
});
