import { useCallback, useRef, useState } from 'react';
import { useFullscreen } from '@reactuses/core';
import { usePaperStore, useRecordStore } from '@/store';
import {
    useOverlayStore,
    createWidget,
    AddWidgetCommand,
} from '@webtools/webwidget'
import type { WidgetKind } from '@webtools/webwidget';
import type { ImageHeroMode } from '@/features/paper';

type UseWebpaperActionsParams = {
    notifyRef: React.MutableRefObject<ReturnType<typeof import('antd')['notification']['useNotification']>[0]>;
};

export function useWebpaperActions({ notifyRef }: UseWebpaperActionsParams) {
    const resetSettings = usePaperStore((state) => state.resetSettings);

    const next = useRecordStore((state) => state.next);
    const enterHistoryMode = useRecordStore((state) => state.enterHistoryMode);
    const leaveHistoryMode = useRecordStore(state => state.leaveHistoryMode);
    const isHistoryMode = useRecordStore((state) => state.isHistoryMode);
    const navigate = useRecordStore((state) => state.navigate);
    const autoPlay = useRecordStore((state) => state.autoPlay);
    const enableAutoPlay = useRecordStore((state) => state.enableAutoPlay);
    const disableAutoPlay = useRecordStore((state) => state.disableAutoPlay);

    const [mode, setMode] = useState<ImageHeroMode>('allSync');
    const isFirstLoadRef = useRef(true);

    const [, fullscreenActions] = useFullscreen(() => document.documentElement);

    const overlayState = useOverlayStore((state) => state);
    const executeOverlayCommand = useOverlayStore((state) => state.executeCommand);
    const requestOverlayWidgetSettings = useOverlayStore((state) => state.requestWidgetSettings);

    const notify = useCallback(
        (type: 'success' | 'info' | 'warning' | 'error', message: string, description?: string) => {
            notifyRef.current[type]({
                title: message,
                description,
                duration: 2.5,
            });
        },
        [notifyRef]
    );

    const fullScreen = useCallback(async () => {
        fullscreenActions.toggleFullscreen();
    }, [fullscreenActions]);

    const loadNextImage = useCallback(() => {
        setMode('previewAsync');

        if (isFirstLoadRef.current) {
            isFirstLoadRef.current = false;
        }

        void next();
    }, [next]);

    const isAutoPlaying = autoPlay !== 'stop';

    const togglePlay = useCallback(() => {
        if (isAutoPlaying) {
            disableAutoPlay();
            notify('info', '自动切换已暂停', `当前间隔 ${typeof autoPlay === 'number' ? autoPlay : usePaperStore.getState().sharedSettings.interval} 秒`);
            return;
        }

        enableAutoPlay(usePaperStore.getState().sharedSettings.interval);
        notify('success', '自动切换已启动', `间隔 ${usePaperStore.getState().sharedSettings.interval} 秒`);
    }, [autoPlay, disableAutoPlay, enableAutoPlay, isAutoPlaying, notify]);

    const resetAllSettings = useCallback(() => {
        resetSettings();
        notify('success', '设置已重置', '已恢复共享设置与 Provider 默认设置');
    }, [notify, resetSettings]);

    const tryCreateWidget = useCallback((kind: WidgetKind) => {
        const offset = overlayState.widgets.length * 3;
        const nextWidget = createWidget(kind, {
            layout: {
                anchorX: 'left',
                anchorY: 'top',
                x: 5 + offset,
                y: 5 + offset,
                w: 40,
                h: 16,
                rotation: 0,
                adapt: 'fixed',
            },
        });
        // Override default props for new widgets
        if (kind === 'text') {
            nextWidget.props = { ...nextWidget.props, text: '请输入文本' };
        }
        executeOverlayCommand(new AddWidgetCommand(nextWidget));
        requestOverlayWidgetSettings(nextWidget.id);
        notify('success', '组件已创建', `${nextWidget.label} (${nextWidget.id})`);
    }, [overlayState.widgets.length, executeOverlayCommand, requestOverlayWidgetSettings, notify]);

    const goToPreviousHistory = useCallback(async () => {
        const inHistoryMode = isHistoryMode();
        if (!inHistoryMode) {
            enterHistoryMode();
        }
        await navigate(-1);
    }, [isHistoryMode, enterHistoryMode, navigate]);

    const returnToLatest = useCallback(() => {
        if (isHistoryMode()) {
            leaveHistoryMode();
        }
    }, [isHistoryMode, leaveHistoryMode]);

    return {
        mode,
        setMode,
        isAutoPlaying,
        togglePlay,
        fullScreen,
        loadNextImage,
        resetAllSettings,
        tryCreateWidget,
        goToPreviousHistory,
        returnToLatest,
        notify,
    };
}
