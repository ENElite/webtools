import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { ImageHero, ImageHeroMode } from './hero/image';
import { PaperSettingsPanel } from '@/features/paper/settings';
import { usePaperStore } from '@/store/paperStore';
import { useRecordStore } from '@/store/recordStore';
import { buildKonachanQuery } from '@/providers/konachan/schema';
import type { ProviderRecord } from '@/providers';

export interface PaperProps {
    mode?: ImageHeroMode;
}

export function Paper({ mode = 'previewAsync' }: PaperProps) {
    const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
    const [heroMode, setHeroMode] = useState<ImageHeroMode>(mode);

    const provider = usePaperStore((state) => state.sharedSettings.provider);
    const settingsVisible = usePaperStore((state) => state.settingsVisible);
    const sharedSettings = usePaperStore((state) => state.sharedSettings);
    const konachanSettings = usePaperStore((state) => state.konachanSettings);
    const birdSettings = usePaperStore((state) => state.birdSettings);
    const jsonSettings = usePaperStore((state) => state.jsonSettings);
    const toggleSettings = usePaperStore((state) => state.toggleSettings);

    const currentRecord = useRecordStore(useShallow((state) => state.currentRecord()));
    const switchQuery = useRecordStore((state) => state.switchQuery);
    const next = useRecordStore((state) => state.next);
    const loadMore = useRecordStore((state) => state.loadMore);
    const [visibleRecord, setVisibleRecord] = useState<ProviderRecord | null>(null);

    const queryConfig = useMemo(() => {
        switch (provider) {
            case 'BirdPaper':
                return {
                    provider,
                    api: birdSettings.api,
                    params: birdSettings,
                };
            case 'Json':
                return {
                    provider,
                    api: 'json',
                    params: jsonSettings,
                };
            case 'Konachan':
            default:
                return {
                    provider: 'Konachan' as const,
                    api: konachanSettings.baseUrl,
                    params: buildKonachanQuery(konachanSettings),
                };
        }
    }, [birdSettings, jsonSettings, konachanSettings, provider]);

    useEffect(() => {
        setHeroMode(mode);
    }, [mode]);

    useEffect(() => {
        setHeroMode('previewAsync');
        switchQuery(queryConfig.provider, queryConfig.api, queryConfig.params);
    }, [queryConfig, switchQuery]);

    useEffect(() => {
        if (currentRecord) {
            setVisibleRecord(currentRecord);
        }
    }, [currentRecord]);

    const record = currentRecord ?? visibleRecord;

    const handleAdvance = useCallback(() => {
        if (record) {
            next();
            return;
        }
        loadMore();
    }, [record, loadMore, next]);

    return (
        <div ref={setContainerElement} className='relative h-full w-full overflow-hidden'>

            {!record ? (
                <div className='absolute left-4 top-4 rounded-xl border border-slate-200/60 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-lg backdrop-blur'>
                    正在加载内容…
                </div>
            ) : null}

            {record && record.type === 'image' ? (
                <ImageHero
                    url={record.url}
                    preview={record.preview}
                    mode={heroMode}
                    objectFit={sharedSettings.objectFit}
                    trackScale={sharedSettings.trackScale}
                    trackIntensity={sharedSettings.trackIntensity}
                    enableMouseTracking={sharedSettings.trackIntensity !== 0}
                    onImageError={handleAdvance}
                />
            ) : null}

            {settingsVisible && containerElement
                ? (
                    <PaperSettingsPanel
                        container={containerElement}
                        onClose={toggleSettings}
                    />
                )
                : null}
        </div>
    );
}

export default Paper;
