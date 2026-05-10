import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { ImageHero, ImageHeroMode } from './hero/image';
import { PaperSettingsPanel } from '@/features/paper/settings';
import { usePaperStore } from '@/store/paperStore';
import { useRecordStore } from '@/store/recordStore';
import { buildKonachanQuery } from '@/providers/konachan/schema';

export interface PaperProps {
    mode?: ImageHeroMode;
}

export function Paper({ mode = 'previewAsync' }: PaperProps) {
    const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);

    const provider = usePaperStore((state) => state.sharedSettings.provider);
    const settingsVisible = usePaperStore((state) => state.settingsVisible);
    const sharedSettings = usePaperStore((state) => state.sharedSettings);
    const konachanSettings = usePaperStore((state) => state.konachanSettings);
    const birdSettings = usePaperStore((state) => state.birdSettings);
    const jsonSettings = usePaperStore((state) => state.jsonSettings);
    const toggleSettings = usePaperStore((state) => state.toggleSettings);

    const record = useRecordStore(useShallow((state) => state.currentRecord()));
    const history = useRecordStore(useShallow((state) => state.getHistory()));
    const switchQuery = useRecordStore((state) => state.switchQuery);
    const navigate = useRecordStore((state) => state.navigate);
    const loadMore = useRecordStore((state) => state.loadMore);

    useEffect(() => {
        console.log('[Paper] record/history changed:', { record: record?.id, historyCount: history.length });
    }, [record, history]);

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
        switchQuery(queryConfig.provider, queryConfig.api, queryConfig.params);
    }, [queryConfig, switchQuery]);

    const handleAdvance = useCallback(() => {
        if (record) {
            void navigate(1)
            return
        }
        void loadMore()
    }, [record, loadMore, navigate])

    return (
        <div ref={setContainerElement} className='relative h-full w-full overflow-hidden'>

            {!record ? (
                <div className='absolute left-4 top-4 rounded-xl border border-slate-200/60 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-lg backdrop-blur'>
                    正在加载内容…
                </div>
            ) : null}

            {record && record.type === 'image' ? (
                <ImageHero
                    imageUrl={record.url}
                    previewUrl={record.url || record.preview}
                    mode={mode}
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
