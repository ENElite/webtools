import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_KONACHAN_SETTINGS, type KonachanProviderSettings } from '@/providers/konachan/schema';
import { DEFAULT_JSON_SETTINGS, type JsonProviderSettings } from '@/providers/json/schema';
import { DEFAULT_BIRD_PROVIDER_SETTINGS, type BirdProviderSettings } from '@/providers/bird/schema';
import { DEFAULT_SHARED_SETTINGS, type SharedSettings } from '@/features/paper/settings/schema';

type PaperState = {
    settingsVisible: boolean;
    sharedSettings: SharedSettings;
    konachanSettings: KonachanProviderSettings;
    jsonSettings: JsonProviderSettings;
    birdSettings: BirdProviderSettings;
    toggleSettings: () => void;
    setSharedSettings: (settings: SharedSettings) => void;
    setKonachanSettings: (settings: KonachanProviderSettings) => void;
    setJsonSettings: (settings: JsonProviderSettings) => void;
    setBirdSettings: (settings: BirdProviderSettings) => void;
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

function cloneBirdSettings(settings: BirdProviderSettings) {
    return { ...settings };
}

type PersistedState = {
    sharedSettings?: Partial<SharedSettings>;
    konachanSettings?: Partial<KonachanProviderSettings>;
    jsonSettings?: Partial<JsonProviderSettings>;
    birdSettings?: Partial<BirdProviderSettings>;
};

function mergeWithDefaults(persisted: PersistedState) {
    return {
        sharedSettings: {
            ...DEFAULT_SHARED_SETTINGS,
            ...persisted.sharedSettings,
        },
        konachanSettings: {
            ...DEFAULT_KONACHAN_SETTINGS,
            ...persisted.konachanSettings,
            // Ensure tags is always a string (handle corrupt data)
            tags: (persisted.konachanSettings?.tags ?? DEFAULT_KONACHAN_SETTINGS.tags).slice(),
        },
        jsonSettings: {
            ...DEFAULT_JSON_SETTINGS,
            ...persisted.jsonSettings,
        },
        birdSettings: {
            ...DEFAULT_BIRD_PROVIDER_SETTINGS,
            ...persisted.birdSettings,
        },
    };
}

export const usePaperStore = create<PaperState>()(
    persist(
        (set, get) => ({
            settingsVisible: false,
            sharedSettings: cloneSharedSettings(DEFAULT_SHARED_SETTINGS),
            konachanSettings: cloneKonachanSettings(DEFAULT_KONACHAN_SETTINGS),
            jsonSettings: cloneJsonSettings(DEFAULT_JSON_SETTINGS),
            birdSettings: cloneBirdSettings(DEFAULT_BIRD_PROVIDER_SETTINGS),

            toggleSettings: () => {
                set({ settingsVisible: !get().settingsVisible });
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

            setBirdSettings: (settings) => {
                set({ birdSettings: { ...settings } });
            },

            resetSettings: () => {
                const shared = cloneSharedSettings(DEFAULT_SHARED_SETTINGS);
                const konachan = cloneKonachanSettings(DEFAULT_KONACHAN_SETTINGS);
                const json = cloneJsonSettings(DEFAULT_JSON_SETTINGS);
                const bird = cloneBirdSettings(DEFAULT_BIRD_PROVIDER_SETTINGS);

                set({
                    sharedSettings: shared,
                    konachanSettings: konachan,
                    jsonSettings: json,
                    birdSettings: bird,
                });
            },
        }),
        {
            name: 'webpaper-settings',
            partialize: (state) => ({
                sharedSettings: state.sharedSettings,
                konachanSettings: state.konachanSettings,
                jsonSettings: state.jsonSettings,
                birdSettings: state.birdSettings,
            }),
            merge: (persistedState, currentState) => {
                const persisted = persistedState as PersistedState;
                return {
                    ...currentState,
                    ...mergeWithDefaults(persisted),
                };
            },
        }
    )
);
