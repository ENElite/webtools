import { Dropdown, notification } from 'antd';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Paper, HistoryDrawer } from '@/features/paper';
import { usePaperStore, useRecordStore } from '@/store';
import {
    OverlayRoot,
    createOverlayRendererMap,
} from '@webtools/webwidget';
import type { ProviderRecord } from '@/providers';

import { useWebpaperEffects } from './hooks/useWebpaperEffects';
import { useWebpaperActions } from './hooks/useWebpaperActions';
import { useContextMenuItems } from './components/ContextMenu';
import { useInitOverlayWidgets, usePersistOverlayWidgets } from '@/store/widgetPersistence';

export function Webpaper() {
    const [api, contextHolder] = notification.useNotification({ placement: 'topRight' });
    const notifyRef = useRef(api);

    useEffect(() => {
        notifyRef.current = api;
    }, [api]);

    const overlayRenderers = useMemo(() => createOverlayRendererMap(), []);

    // Initialize overlay widgets from persistence or defaults
    useInitOverlayWidgets();
    usePersistOverlayWidgets();

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
        if (!currentRecord) return -1;
        return history.findIndex((item) => item.id === currentRecord.id);
    }, [currentRecord, history]);

    const inHistoryMode = isHistoryMode();
    const canGoPrevious = inHistoryMode || currentRecordIndex > 0;
    const canGoNext = inHistoryMode || hasMore;

    // 触摸坐标状态（用于菜单位置定位）
    const [touchPosition, setTouchPosition] = useState<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

    // 长按触发右键菜单（移动端支持）
    const handleTouchStart = useCallback((e: TouchEvent) => {
        const touch = e.touches[0];
        if (touch) {
        // 记录触摸坐标
            setTouchPosition({ x: touch.clientX, y: touch.clientY });

            // 开始长按计时
            longPressTimerRef.current = setTimeout(() => {
                setContextMenuOpen(true);
            }, 500);
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        // 清除长按计时器
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const handleTouchMove = useCallback(() => {
        // 移动时取消长按检测
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    // 绑定触摸事件到容器元素
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: true });
        container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchend', handleTouchEnd);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchEnd, handleTouchMove]);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
            }
        };
    }, []);

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

    // 菜单样式（用于定位到触摸位置）
    const dropdownStyle: CSSProperties = touchPosition
        ? {
            position: 'fixed',
            left: touchPosition.x,
            top: touchPosition.y,
        }
        : {};

    // 处理菜单打开/关闭
    const handleOpenChange = (open: boolean) => {
        setContextMenuOpen(open);
        if (!open) {
            setTouchPosition(null);
        }
    };

    return (
        <Dropdown
            trigger={['contextMenu']}
            open={contextMenuOpen}
            onOpenChange={handleOpenChange}
            menu={{ items: rightClickMenuItems }}
            overlayStyle={dropdownStyle}
        >
            <div ref={containerRef} className='relative h-screen min-h-screen w-full overflow-hidden'>
                {contextHolder}

                <Paper mode={mode} />

                <HistoryDrawer
                    open={historyVisible}
                    items={history}
                    size={800}
                    search={historySearch}
                    onSearchChange={setHistorySearch}
                    onSetCurrent={(record: ProviderRecord) => {
                        const nextIndex = history.findIndex((item) => String(item.id) === String(record.id));
                        if (nextIndex >= 0) {
                            goToHistory(nextIndex);
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
