import { create } from 'zustand';

import { DEFAULT_KONACHAN_SETTINGS, type KonachanProviderSettings } from '@/providers/konachan/settings';
import { DEFAULT_JSON_SETTINGS, type JsonProviderSettings } from '@/providers/json/settings';

export type SharedSettings = {
    objectFit: 'contain' | 'cover';
    trackScale: number;
    trackIntensity: number;
    lockDock: boolean;
    interval: number;
    enableWakeLock: boolean;
    videoAutoSwitchOnEnded: boolean;
};

export type WebpaperProvider = 'Konachan' | 'Json';

export const DEFAULT_SHARED_SETTINGS: SharedSettings = {
    objectFit: 'contain',
    trackScale: 100,
    trackIntensity: 0,
    lockDock: false,
    interval: 30,
    enableWakeLock: false,
    videoAutoSwitchOnEnded: true,
};

type WebpaperSettingsStore = {
    provider: WebpaperProvider;
    sharedSettings: SharedSettings;
    konachanSettings: KonachanProviderSettings;
    jsonSettings: JsonProviderSettings;
    konachanSettingsDraft: KonachanProviderSettings;
    jsonSettingsDraft: JsonProviderSettings;
    setProvider: (provider: WebpaperProvider) => void;
    setSharedSettings: (settings: SharedSettings) => void;
    setKonachanSettings: (settings: KonachanProviderSettings) => void;
    setJsonSettings: (settings: JsonProviderSettings) => void;
    setKonachanSettingsDraft: (settings: KonachanProviderSettings) => void;
    setJsonSettingsDraft: (settings: JsonProviderSettings) => void;
    syncDraftsFromCurrent: () => void;
    applyDraftSettings: () => void;
    resetSettings: () => void;
};

function cloneSharedSettings(settings: SharedSettings): SharedSettings {
    return { ...settings };
}

function cloneKonachanSettings(settings: KonachanProviderSettings): KonachanProviderSettings {
    return {
        ...settings,
        tags: settings.tags.slice(),
    };
}

function cloneJsonSettings(settings: JsonProviderSettings): JsonProviderSettings {
    return { ...settings };
}

export const useWebpaperStore = create<WebpaperSettingsStore>((set, get) => ({
    provider: 'Konachan',
    sharedSettings: cloneSharedSettings(DEFAULT_SHARED_SETTINGS),
    konachanSettings: cloneKonachanSettings(DEFAULT_KONACHAN_SETTINGS),
    jsonSettings: cloneJsonSettings(DEFAULT_JSON_SETTINGS),
    konachanSettingsDraft: cloneKonachanSettings(DEFAULT_KONACHAN_SETTINGS),
    jsonSettingsDraft: cloneJsonSettings(DEFAULT_JSON_SETTINGS),

    setProvider: (provider) => {
        set({ provider });
    },

    setSharedSettings: (settings) => {
        set({ sharedSettings: cloneSharedSettings(settings) });
    },

    setKonachanSettings: (settings) => {
        set({ konachanSettings: cloneKonachanSettings(settings) });
    },

    setJsonSettings: (settings) => {
        set({ jsonSettings: cloneJsonSettings(settings) });
    },

    setKonachanSettingsDraft: (settings) => {
        set({ konachanSettingsDraft: cloneKonachanSettings(settings) });
    },

    setJsonSettingsDraft: (settings) => {
        set({ jsonSettingsDraft: cloneJsonSettings(settings) });
    },

    syncDraftsFromCurrent: () => {
        const state = get();
        set({
            konachanSettingsDraft: cloneKonachanSettings(state.konachanSettings),
            jsonSettingsDraft: cloneJsonSettings(state.jsonSettings),
        });
    },

    applyDraftSettings: () => {
        const state = get();
        set({
            konachanSettings: cloneKonachanSettings(state.konachanSettingsDraft),
            jsonSettings: cloneJsonSettings(state.jsonSettingsDraft),
        });
    },

    resetSettings: () => {
        const shared = cloneSharedSettings(DEFAULT_SHARED_SETTINGS);
        const konachan = cloneKonachanSettings(DEFAULT_KONACHAN_SETTINGS);
        const json = cloneJsonSettings(DEFAULT_JSON_SETTINGS);

        set({
            provider: 'Konachan',
            sharedSettings: shared,
            konachanSettings: konachan,
            jsonSettings: json,
            konachanSettingsDraft: cloneKonachanSettings(konachan),
            jsonSettingsDraft: cloneJsonSettings(json),
        });
    },
}));
