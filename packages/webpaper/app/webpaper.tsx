import { App, Descriptions, Dropdown, notification, Space } from 'antd';
import type { MenuProps } from 'antd';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    useFullscreen,
    useWakeLock,
} from '@reactuses/core';
import { useShallow } from 'zustand/react/shallow';

import { usePreloadImage } from '@/hooks/usePreloadImage';
import { Paper, HistoryDrawer, buildDescriptionItems, type ImageHeroMode } from '@/features/paper';
import { usePaperStore, useOverlayStore, useRecordStore } from '@/store';
import {
    OverlayRoot,
    createOverlayRendererMap,
    createWidget,
    defaultWidgetLabel,
} from '@/features/overlay'
import { AddWidgetCommand } from '@/features/overlay/commands';
import type { WidgetKind } from '@/features/overlay';
import type { ProviderRecord } from '@/providers';

export function Webpaper() {
    const { modal } = App.useApp();
    const [api, contextHolder] = notification.useNotification({ placement: 'topRight' });
    const sharedSettings = usePaperStore((state) => state.sharedSettings);
    const resetSettings = usePaperStore((state) => state.resetSettings);
    const toggleSettings = usePaperStore((state) => state.toggleSettings);

    const currentRecord = useRecordStore(useShallow((state) => state.currentRecord()));
    const history = useRecordStore(useShallow((state) => state.getHistory()));
    const hasMore = useRecordStore((state) => state.hasMore());
    const next = useRecordStore((state) => state.next);
    const enterHistoryMode = useRecordStore((state) => state.enterHistoryMode);
    const leaveHistoryMode = useRecordStore(state => state.leaveHistoryMode)
    const isHistoryMode = useRecordStore((state) => state.isHistoryMode);
    const navigate = useRecordStore((state) => state.navigate);
    const goToHistory = useRecordStore((state) => state.goToHistory);
    const autoPlay = useRecordStore((state) => state.autoPlay);
    const enableAutoPlay = useRecordStore((state) => state.enableAutoPlay);
    const disableAutoPlay = useRecordStore((state) => state.disableAutoPlay);
    const pendingPreloadUrl = useRecordStore((state) => state.pendingPreloadUrl);

    const [historySearch, setHistorySearch] = useState('');
    const [historyVisible, setHistoryVisible] = useState(false);
    const [contextMenuOpen, setContextMenuOpen] = useState(false);
    const [mode, setMode] = useState<ImageHeroMode>('allSync');
    const isFirstLoadRef = useRef(true);
    const isAutoPlaying = autoPlay !== 'stop';

    const [, fullscreenActions] = useFullscreen(() => document.documentElement);
    const {
        isActive: wakeLockActive,
        request: requestWakeLock,
        release: releaseWakeLock,
        isSupported: wakeLockSupported,
    } = useWakeLock();

    const notifyRef = useRef(api);
    const overlayRenderers = useMemo(() => createOverlayRendererMap(), []);
    const overlayState = useOverlayStore((state) => state);
    const executeOverlayCommand = useOverlayStore((state) => state.executeCommand);
    const requestOverlayWidgetSettings = useOverlayStore((state) => state.requestWidgetSettings);

    usePreloadImage(pendingPreloadUrl);

    useEffect(() => {
        notifyRef.current = api;
    }, [api]);

    useEffect(() => {
        if (!wakeLockSupported) {
            return;
        }

        if (sharedSettings.enableWakeLock && !wakeLockActive) {
            void requestWakeLock();
        } else if (!sharedSettings.enableWakeLock && wakeLockActive) {
            void releaseWakeLock();
        }
    }, [sharedSettings.enableWakeLock, wakeLockActive, wakeLockSupported, requestWakeLock, releaseWakeLock]);

    const notify = useCallback(
        (type: 'success' | 'info' | 'warning' | 'error', message: string, description?: string) => {
            notifyRef.current[type]({
                title: message,
                description,
                duration: 2.5,
            });
        },
        []
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

    useEffect(() => {
        if (!isAutoPlaying) {
            return;
        }

        enableAutoPlay(sharedSettings.interval);
    }, [enableAutoPlay, isAutoPlaying, sharedSettings.interval]);

    useEffect(() => {
        return () => {
            disableAutoPlay();
        };
    }, [disableAutoPlay]);

    useEffect(() => {
        if (!isAutoPlaying) {
            return;
        }

        setMode('imageAsync');
    }, [currentRecord?.id, isAutoPlaying]);

    const togglePlay = useCallback(() => {
        if (isAutoPlaying) {
            disableAutoPlay();
            notify('info', '自动切换已暂停', `当前间隔 ${typeof autoPlay === 'number' ? autoPlay : sharedSettings.interval} 秒`);
            return;
        }

        enableAutoPlay(sharedSettings.interval);
        notify('success', '自动切换已启动', `间隔 ${sharedSettings.interval} 秒`);
    }, [autoPlay, disableAutoPlay, enableAutoPlay, isAutoPlaying, notify, sharedSettings.interval]);

    const resetAllSettings = useCallback(() => {
        resetSettings();
        notify('success', '设置已重置', '已恢复共享设置与 Provider 默认设置');
    }, [notify, resetSettings]);

    const tryCreateWidget = (kind: WidgetKind) => {
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
        executeOverlayCommand(new AddWidgetCommand(nextWidget));
        requestOverlayWidgetSettings(nextWidget.id);
        notify('success', '组件已创建', `${nextWidget.label} (${nextWidget.id})`);
    };


    const currentRecordIndex = useMemo(() => {
        if (!currentRecord) return -1
        return history.findIndex((item) => item.id === currentRecord.id)
    }, [currentRecord, history]);

    // const hasHistory = history.length > 0
    const inHistoryMode = isHistoryMode()
    const canGoPrevious = inHistoryMode || currentRecordIndex > 0
    const canGoNext = inHistoryMode || hasMore

    const goToPreviousHistory = useCallback(async () => {
        if (!canGoPrevious) return
        if (!inHistoryMode) {
            enterHistoryMode()
        }
        await navigate(-1)
    }, [inHistoryMode, canGoPrevious, enterHistoryMode, navigate])

    const returnToLatest = useCallback(async () => {
        if (inHistoryMode) leaveHistoryMode();
    }, [inHistoryMode, leaveHistoryMode])

    const rightClickMenuItems = useMemo<MenuProps['items']>(() => {
        const makeItemIcon = (iconClass: string) => (
            <span aria-hidden='true' className={`inline-block h-4 w-4 ${iconClass}`} />
        );

        return [
            {
                key: 'toggle-play',
                label: isAutoPlaying ? '暂停自动切换' : '开始自动切换',
                icon: makeItemIcon(isAutoPlaying ? 'icon-[octicon--pause-16]' : 'icon-[octicon--play-16]'),
                onClick: togglePlay,
            },
            {
                key: 'info',
                label: '当前信息',
                icon: makeItemIcon('icon-[octicon--info-16]'),
                disabled: !currentRecord,
                onClick: () => {
                    if (!currentRecord) {
                        notify('info', '没有当前记录', '请先加载一张图片');
                        return;
                    }

                    modal.info({
                        title: currentRecord ? `#${currentRecord.id} - ${currentRecord.provider}` : '图片详情',
                        content: (
                            <Space orientation='vertical' size='middle' style={{ width: '100%' }}>
                                <Descriptions bordered size='small' items={buildDescriptionItems(currentRecord)} />
                            </Space>
                        ),
                        footer: null,
                        width: 960,
                        destroyOnHidden: true,
                        closable: true,
                    });
                },
            },
            {
                key: 'next-image',
                label: '下一张',
                disabled: !canGoNext,
                icon: makeItemIcon('icon-[octicon--arrow-right-16]'),
                onClick: loadNextImage,
            },
            {
                key: 'previous-image',
                label: '上一张',
                disabled: !canGoPrevious,
                icon: makeItemIcon('icon-[octicon--arrow-left-16]'),
                onClick: goToPreviousHistory,
            },
            {
                key: 'return-latest',
                label: '回到最新',
                disabled: !inHistoryMode,
                icon: makeItemIcon('icon-[octicon--history-16]'),
                onClick: returnToLatest,
            },
            {
                key: 'fullscreen',
                label: '全屏',
                icon: makeItemIcon('icon-[octicon--screen-full-16]'),
                onClick: fullScreen,
            },
            {
                key: 'open-settings',
                label: '设置',
                icon: makeItemIcon('icon-[octicon--gear-16]'),
                onClick: toggleSettings,
            },
            {
                key: 'reset-settings',
                label: '重置设置',
                icon: makeItemIcon('icon-[octicon--history-16]'),
                onClick: resetAllSettings,
            },
            {
                key: 'open-history',
                label: '历史记录',
                icon: makeItemIcon('icon-[octicon--history-16]'),
                onClick: () => setHistoryVisible(true),
            },
            {
                key: 'divider-1',
                type: 'divider',
            },
            {
                key: 'create-widget',
                label: '新建',
                icon: makeItemIcon('icon-[octicon--plus-16]'),
                children: [
                    {
                        key: 'create-text-widget',
                        label: defaultWidgetLabel('text'),
                        icon: makeItemIcon('icon-[octicon--typography-16]'),
                        onClick: () => tryCreateWidget('text'),
                    },
                    {
                        key: 'create-html-widget',
                        label: defaultWidgetLabel('html'),
                        icon: makeItemIcon('icon-[octicon--code-16]'),
                        onClick: () => tryCreateWidget('html'),
                    },
                    {
                        key: 'create-image-widget',
                        label: defaultWidgetLabel('image'),
                        icon: makeItemIcon('icon-[octicon--image-16]'),
                        onClick: () => tryCreateWidget('image'),
                    },
                    {
                        key: 'create-video-widget',
                        label: defaultWidgetLabel('video'),
                        icon: makeItemIcon('icon-[octicon--video-16]'),
                        onClick: () => tryCreateWidget('video'),
                    },
                    {
                        key: 'create-clock-widget',
                        label: defaultWidgetLabel('clock'),
                        icon: makeItemIcon('icon-[octicon--clock-16]'),
                        onClick: () => tryCreateWidget('clock'),
                    },
                    {
                        key: 'create-iframe-widget',
                        label: defaultWidgetLabel('iframe'),
                        icon: makeItemIcon('icon-[octicon--code-16]'),
                        onClick: () => tryCreateWidget('iframe'),
                    },
                    {
                        key: 'create-live2d-widget',
                        label: defaultWidgetLabel('live2d'),
                        icon: makeItemIcon('icon-[octicon--person-16]'),
                        onClick: () => tryCreateWidget('live2d'),
                    }
                ],
            },
        ];
    }, [
        currentRecord,
        currentRecordIndex,
        isAutoPlaying,
        canGoPrevious, canGoNext,
        goToPreviousHistory,
        loadNextImage,
        resetAllSettings,
        returnToLatest,
        toggleSettings,
        togglePlay,
        fullScreen,
    ]);

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
