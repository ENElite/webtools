import type { KonachanProviderSettings } from '../providers/konachan/settings';

export type SharedSettings = {
    objectFit: 'contain' | 'cover';
    trackScale: number;
    trackIntensity: number;
    showDock: boolean;
    interval: number;
    enableWakeLock: boolean;
};

type StoredSettingsV1 = {
    version: 1;
    providerId: 'konachan';
    sharedSettings: SharedSettings;
    providers: {
        konachan: KonachanProviderSettings;
    };
};

export type PersistedSettings = {
    providerId: 'konachan';
    sharedSettings: SharedSettings;
    konachanSettings: KonachanProviderSettings;
};

const STORAGE_KEY = 'webpaper:settings';

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isObjectFit(value: unknown): value is SharedSettings['objectFit'] {
    return value === 'contain' || value === 'cover';
}

function parseSharedSettings(value: unknown, fallback: SharedSettings): SharedSettings {
    if (!isObject(value)) {
        return fallback;
    }

    const shared = value as Record<string, unknown>;

    return {
        objectFit: isObjectFit(shared['objectFit']) ? shared['objectFit'] : fallback.objectFit,
        trackScale: typeof shared['trackScale'] === 'number' ? shared['trackScale'] : fallback.trackScale,
        trackIntensity: typeof shared['trackIntensity'] === 'number' ? shared['trackIntensity'] : fallback.trackIntensity,
        showDock: typeof shared['showDock'] === 'boolean' ? shared['showDock'] : fallback.showDock,
        interval: typeof shared['interval'] === 'number' ? shared['interval'] : fallback.interval,
        enableWakeLock: typeof shared['enableWakeLock'] === 'boolean' ? shared['enableWakeLock'] : fallback.enableWakeLock,
    };
}

function parseKonachanSettings(value: unknown, fallback: KonachanProviderSettings): KonachanProviderSettings {
    if (!isObject(value)) {
        return fallback;
    }

    const konachan = value as Record<string, unknown>;

    const tags = Array.isArray(konachan['tags']) ? konachan['tags'].filter((tag): tag is string => typeof tag === 'string') : fallback.tags;

    return {
        baseUrl: typeof konachan['baseUrl'] === 'string' ? konachan['baseUrl'] : fallback.baseUrl,
        page: typeof konachan['page'] === 'number' ? konachan['page'] : fallback.page,
        quality: typeof konachan['quality'] === 'string' ? konachan['quality'] as KonachanProviderSettings['quality'] : fallback.quality,
        widthTag: typeof konachan['widthTag'] === 'string' || konachan['widthTag'] === null ? konachan['widthTag'] : fallback.widthTag,
        heightTag: typeof konachan['heightTag'] === 'string' || konachan['heightTag'] === null ? konachan['heightTag'] : fallback.heightTag,
        rating: typeof konachan['rating'] === 'string' || konachan['rating'] === null ? konachan['rating'] : fallback.rating,
        tags,
        skipPid: typeof konachan['skipPid'] === 'boolean' ? konachan['skipPid'] : fallback.skipPid,
    };
}

export function loadSettings(defaults: PersistedSettings): PersistedSettings {
    if (typeof window === 'undefined') {
        return defaults;
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return defaults;
        }

        const parsed = JSON.parse(raw) as unknown;
        if (!isObject(parsed) || parsed['version'] !== 1) {
            return defaults;
        }

        const value = parsed as Partial<StoredSettingsV1>;

        return {
            providerId: value.providerId === 'konachan' ? value.providerId : defaults.providerId,
            sharedSettings: parseSharedSettings(value.sharedSettings, defaults.sharedSettings),
            konachanSettings: parseKonachanSettings(value.providers?.konachan, defaults.konachanSettings),
        };
    } catch {
        return defaults;
    }
}

export function saveSettings(value: PersistedSettings): void {
    if (typeof window === 'undefined') {
        return;
    }

    const payload: StoredSettingsV1 = {
        version: 1,
        providerId: value.providerId,
        sharedSettings: value.sharedSettings,
        providers: {
            konachan: value.konachanSettings,
        },
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearSettings(): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
}