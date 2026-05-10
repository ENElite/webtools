import { useCallback, useMemo } from 'react';

import { SettingsFormPanel } from '@/components/settings';

import { usePaperStore } from '@/store';
import {
    PAPER_SETTINGS_SCHEMA,
    buildPaperSettingsDraft,
    splitPaperSettingsValues,
    type PaperSettingsValues,
} from './schema';

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
        () => buildPaperSettingsDraft({
            sharedSettings,
            konachanSettings,
            jsonSettings,
            birdSettings,
        }),
        [sharedSettings, konachanSettings, jsonSettings, birdSettings]
    );

    const handleSave = useCallback((nextValues: PaperSettingsValues) => {
        const nextSettings = splitPaperSettingsValues(nextValues);
        setSharedSettings(nextSettings.sharedSettings);
        setKonachanSettings(nextSettings.konachanSettings);
        setJsonSettings(nextSettings.jsonSettings);
        setBirdSettings(nextSettings.birdSettings);
    }, [setBirdSettings, setJsonSettings, setKonachanSettings, setSharedSettings]);

    return (
        <SettingsFormPanel<PaperSettingsValues>
            panelKey='paper-settings'
            title='Webpaper 设置'
            value={value}
            schema={PAPER_SETTINGS_SCHEMA}
            container={container}
            onChange={() => { }}
            onClose={onClose}
            onSave={handleSave}
        />
    );
}