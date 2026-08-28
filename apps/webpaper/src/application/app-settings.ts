import { z } from 'zod';

export const APP_SETTINGS_STORAGE_KEY = 'webpaper.settings.v2';

const playerSettingsSchema = z.object({
    objectFit: z.enum(['contain', 'cover']),
    autoplayIntervalMs: z.number().int().min(1_000).nullable(),
    videoMuted: z.boolean(),
    videoControls: z.boolean(),
    videoAdvanceOnEnded: z.boolean(),
});

export const appSettingsSchema = z.object({
    source: z.enum(['bird-paper', 'konachan', 'json']),
    pageSize: z.number().int().min(1).max(50),
    bird: z.object({
        mode: z.enum(['latest', 'search', 'category']),
        query: z.string(),
        categoryId: z.string(),
    }),
    konachan: z.object({
        tags: z.string(),
        quality: z.enum(['file_url', 'jpeg_url', 'sample_url', 'preview_url']),
    }),
    jsonContent: z.string(),
    player: playerSettingsSchema,
    widgetsEditable: z.boolean(),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

export const DEFAULT_APP_SETTINGS: AppSettings = {
    source: 'bird-paper',
    pageSize: 12,
    bird: {
        mode: 'latest',
        query: '',
        categoryId: '',
    },
    konachan: {
        tags: 'rating:safe',
        quality: 'jpeg_url',
    },
    jsonContent: JSON.stringify([
        {
            id: 'sample-video',
            kind: 'video',
            url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        },
    ], null, 2),
    player: {
        objectFit: 'cover',
        autoplayIntervalMs: null,
        videoMuted: true,
        videoControls: true,
        videoAdvanceOnEnded: true,
    },
    widgetsEditable: true,
};

export function loadAppSettings(storage: Pick<Storage, 'getItem'>): AppSettings {
    const serialized = storage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (serialized === null) return structuredClone(DEFAULT_APP_SETTINGS);
    try {
        const parsed = appSettingsSchema.safeParse(JSON.parse(serialized));
        return parsed.success ? parsed.data : structuredClone(DEFAULT_APP_SETTINGS);
    } catch {
        return structuredClone(DEFAULT_APP_SETTINGS);
    }
}

export function saveAppSettings(
    storage: Pick<Storage, 'setItem'>,
    settings: AppSettings,
): void {
    storage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(appSettingsSchema.parse(settings)));
}
