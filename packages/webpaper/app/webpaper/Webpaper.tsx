import { Dropdown, notification } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Paper, HistoryDrawer } from '@/features/paper';
import { usePaperStore, useRecordStore } from '@/store';
import {
    OverlayRoot,
    createOverlayRendererMap,
} from '@webtools/webwidget'
import type { ProviderRecord } from '@/providers';

import { useWebpaperEffects } from './hooks/useWebpaperEffects';
import { useWebpaperActions } from './hooks/useWebpaperActions';
import { useContextMenuItems } from './components/ContextMenu';

export function Webpaper() {
    const [api, contextHolder] = notification.useNotification({ placement: 'topRight' });
    const notifyRef = useRef(api);

    useEffect(() => {
        notifyRef.current = api;
    }, [api]);

    const overlayRenderers = useMemo(() => createOverlayRendererMap(), []);

    // Effects (wake lock, auto-play, preload)
    useWebpaperEffects();

    // Actions (callbacks)
    const {
        mode,
        isAutoPlaying,
        togglePlay,
        fullScreen,
        loadNextImage,
        resetAllSettings,
        tryCreateWidget,
        goToPreviousHistory,
        returnToLatest,
    } = useWebpaperActions({ notifyRef });

    // History state
    const [historySearch, setHistorySearch] = useState('');
    const [historyVisible, setHistoryVisible] = useState(false);
    const [contextMenuOpen, setContextMenuOpen] = useState(false);

    const toggleSettings = usePaperStore((state) => state.toggleSettings);
    const currentRecord = useRecordStore(useShallow((state) => state.currentRecord()));
    const history = useRecordStore(useShallow((state) => state.getHistory()));
    const hasMore = useRecordStore((state) => state.hasMore());
    const isHistoryMode = useRecordStore((state) => state.isHistoryMode);
    const goToHistory = useRecordStore((state) => state.goToHistory);

    const currentRecordIndex = useMemo(() => {
        if (!currentRecord) return -1
        return history.findIndex((item) => item.id === currentRecord.id)
    }, [currentRecord, history]);

    const inHistoryMode = isHistoryMode();
    const canGoPrevious = inHistoryMode || currentRecordIndex > 0;
    const canGoNext = inHistoryMode || hasMore;

    const rightClickMenuItems = useContextMenuItems({
        isAutoPlaying,
        canGoNext,
        canGoPrevious,
        inHistoryMode,
        currentRecord,
        onTogglePlay: togglePlay,
        onLoadNextImage: loadNextImage,
        onGoToPreviousHistory: goToPreviousHistory,
        onReturnToLatest: returnToLatest,
        onFullScreen: fullScreen,
        onToggleSettings: toggleSettings,
        onResetAllSettings: resetAllSettings,
        onOpenHistory: () => setHistoryVisible(true),
        onCreateWidget: tryCreateWidget,
    });

    return (
        <Dropdown
            trigger={['contextMenu']}
            open={contextMenuOpen}
            onOpenChange={setContextMenuOpen}
            menu={{ items: rightClickMenuItems }}
        >
            <div className='relative h-screen min-h-screen w-full overflow-hidden'>
                {contextHolder}

                <Paper mode={mode} />

                <HistoryDrawer
                    open={historyVisible}
                    items={history}
                    size={800}
                    search={historySearch}
                    onSearchChange={setHistorySearch}
                    onSetCurrent={(record: ProviderRecord) => {
                        const nextIndex = history.findIndex((item) => String(item.id) === String(record.id))
                        if (nextIndex >= 0) {
                            void goToHistory(nextIndex)
                        }
                    }}
                    onClose={() => setHistoryVisible(false)}
                />

                <OverlayRoot
                    renderers={overlayRenderers}
                    onWidgetContextMenu={() => {
                        setContextMenuOpen(false);
                    }}
                />
            </div>
        </Dropdown>
    );
}
