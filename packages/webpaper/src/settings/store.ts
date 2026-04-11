import type { KonachanProviderSettings } from '../providers/konachan/settings';
import type { JsonProviderSettings } from '../providers/json/settings';

export type SharedSettings = {
    objectFit: 'contain' | 'cover';
    trackScale: number;
    trackIntensity: number;
    lockDock: boolean;
    interval: number;
    enableWakeLock: boolean;
    videoAutoSwitchOnEnded: boolean;
};

type StoredSettingsV1 = {
    version: 1;
    provider: 'konachan' | 'json';
    sharedSettings: SharedSettings;
    providers: {
        konachan: KonachanProviderSettings;
        json?: JsonProviderSettings;
    };
};

type LegacySettings = {
    provider?: 'Konachan' | 'Json';
    providerId?: 'konachan' | 'json';
    sharedSettings?: unknown;
    konachanSettings?: unknown;
    jsonSettings?: unknown;
    providers?: {
        konachan?: unknown;
        json?: unknown;
    };
};

export type PersistedSettings = {
    provider: 'Konachan' | 'Json';
    sharedSettings: SharedSettings;
    konachanSettings: KonachanProviderSettings;
    jsonSettings: JsonProviderSettings;
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
        lockDock: typeof shared['lockDock'] === 'boolean'
            ? shared['lockDock']
            : (typeof shared['showDock'] === 'boolean' ? !shared['showDock'] : fallback.lockDock),
        interval: typeof shared['interval'] === 'number' ? shared['interval'] : fallback.interval,
        enableWakeLock: typeof shared['enableWakeLock'] === 'boolean' ? shared['enableWakeLock'] : fallback.enableWakeLock,
        videoAutoSwitchOnEnded: typeof shared['videoAutoSwitchOnEnded'] === 'boolean'
            ? shared['videoAutoSwitchOnEnded']
            : fallback.videoAutoSwitchOnEnded,
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

function parseJsonSettings(value: unknown, fallback: JsonProviderSettings): JsonProviderSettings {
    if (!isObject(value)) {
        return fallback;
    }

    const json = value as Record<string, unknown>;
    return {
        jsonText: typeof json['jsonText'] === 'string' ? json['jsonText'] : fallback.jsonText,
    };
}

function parseProvider(value: unknown, fallback: PersistedSettings['provider']): PersistedSettings['provider'] {
    if (value === 'Konachan' || value === 'Json') {
        return value;
    }

    if (value === 'konachan') {
        return 'Konachan';
    }

    if (value === 'json') {
        return 'Json';
    }

    return fallback;
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
        if (!isObject(parsed)) {
            return defaults;
        }

        const value = parsed as LegacySettings & Partial<StoredSettingsV1>;

        return {
            provider: parseProvider(value.provider ?? value.providerId, defaults.provider),
            sharedSettings: parseSharedSettings(value.sharedSettings, defaults.sharedSettings),
            konachanSettings: parseKonachanSettings(value.konachanSettings ?? value.providers?.konachan, defaults.konachanSettings),
            jsonSettings: parseJsonSettings(value.jsonSettings ?? value.providers?.json, defaults.jsonSettings),
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
        provider: value.provider === 'Json' ? 'json' : 'konachan',
        sharedSettings: value.sharedSettings,
        providers: {
            konachan: value.konachanSettings,
            json: value.jsonSettings,
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