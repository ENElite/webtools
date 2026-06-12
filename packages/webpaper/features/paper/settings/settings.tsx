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

    const handleSave = useCallback((patch: { set?: Record<string, any> }) => {
        // Settings are stored in sourceWidget.props, so the patch has structure:
        // { set: { props: { objectFit: 'cover', ... } } }
        // The patch only contains changed fields, so merge with existing settings
        const props = patch?.set?.['props'] ?? {};
        const shared: SharedSettings = {
            ...sharedSettings,
            ...props,
        };
        setSharedSettings(shared);
        setKonachanSettings({ ...konachanSettings, ...props } as any);
        setBirdSettings({ ...birdSettings, ...props } as any);
        setJsonSettings({ ...jsonSettings, ...props } as any);
    }, [birdSettings, jsonSettings, konachanSettings, setBirdSettings, setJsonSettings, setKonachanSettings, setSharedSettings, sharedSettings]);

    const sourceWidget = useMemo(() => ({
        id: 'paper-settings' as any,
        kind: 'paper' as any,
        label: 'Webpaper',
        style: {} as any,
        layout: {} as any,
        props: value as any,
    }), [value]);

    return (
        <SettingsFormPanel
            panelKey='paper-settings'
            title='Webpaper 设置'
            sourceWidget={sourceWidget}
            schema={PAPER_SETTINGS_SCHEMA}
            pages={PAPER_PAGE_REGISTRY}
            container={container}
            onChange={() => { }}
            onClose={onClose}
            onSave={handleSave as any}
        />
    );
}
