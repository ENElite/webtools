import { useCallback, useMemo } from 'react';

import { SettingsFormPanel } from '@webtools/webwidget';

import { usePaperStore } from '@/store';
import {
    PAPER_SETTINGS_SCHEMA,
    PAPER_PAGE_REGISTRY,
} from './schema';
import type { SharedSettings } from './schema';

type PaperSettingsPanelProps = {
    container: HTMLElement;
    onClose: () => void;
};

export function PaperSettingsPanel({ container, onClose }: PaperSettingsPanelProps) {
    const sharedSettings = usePaperStore((state) => state.sharedSettings);
    const konachanSettings = usePaperStore((state) => state.konachanSettings);
    const jsonSettings = usePaperStore((state) => state.jsonSettings);
    const birdSettings = usePaperStore((state) => state.birdSettings);
    const setSharedSettings = usePaperStore((state) => state.setSharedSettings);
    const setKonachanSettings = usePaperStore((state) => state.setKonachanSettings);
    const setJsonSettings = usePaperStore((state) => state.setJsonSettings);
    const setBirdSettings = usePaperStore((state) => state.setBirdSettings);

    const value = useMemo(
        () => ({
            ...sharedSettings,
            ...konachanSettings,
            ...jsonSettings,
            ...birdSettings,
        }),
        [sharedSettings, konachanSettings, jsonSettings, birdSettings]
    );

    const handleSave = useCallback((nextValues: Record<string, any>) => {
        const shared: SharedSettings = {
            objectFit: nextValues['objectFit'],
            provider: nextValues['provider'],
            trackScale: nextValues['trackScale'],
            trackIntensity: nextValues['trackIntensity'],
            lockDock: nextValues['lockDock'],
            interval: nextValues['interval'],
            enableWakeLock: nextValues['enableWakeLock'],
            videoAutoSwitchOnEnded: nextValues['videoAutoSwitchOnEnded'],
        };
        setSharedSettings(shared);
        setKonachanSettings(nextValues as any);
        setBirdSettings(nextValues as any);
        setJsonSettings(nextValues as any);
    }, [setBirdSettings, setJsonSettings, setKonachanSettings, setSharedSettings]);

    return (
        <SettingsFormPanel
            panelKey='paper-settings'
            title='Webpaper 设置'
            value={value as any}
            schema={PAPER_SETTINGS_SCHEMA}
            pages={PAPER_PAGE_REGISTRY}
            container={container}
            onChange={() => { }}
            onClose={onClose}
            onSave={handleSave as any}
        />
    );
}
