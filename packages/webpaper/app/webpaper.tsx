import { Button, Drawer, Dropdown, Select, Space, Typography, notification } from 'antd';
import type { MenuProps } from 'antd';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    useFullscreen,
    useWakeLock,
} from '@reactuses/core';

import { usePlaybackScheduler } from '@/features/common';
import { ImageHero, VideoHero, ImageHeroMode } from '@/features/display';
import { SharedSettingsPanel, useWebpaperStore } from '@/features/settings';
import {
    OverlayRoot,
    buildTransformString,
    createOverlayRendererMap,
    createWidget,
    useOverlayStore,
} from '@/features/overlay';
import {
    HistoryDrawer,
    HistoryProvider,
    JsonProvider,
    JsonSettingsPanel,
    KonachanProvider,
    KonachanSettingsPanel,
    buildKonachanQueryKey,
} from '@/features/provider';
import type { HistoryRecord, ProviderRecord, WidgetKind } from '@/shared/types';

type NormalProvider = 'Konachan' | 'Json';
type ActiveProvider = NormalProvider | 'History';
type ProviderRuntime = KonachanProvider | JsonProvider | HistoryProvider;
type HeroLoadReason = 'query-change' | 'auto' | 'manual' | 'error';

type HistoryReturnContext = {
    provider: NormalProvider;
    image: ProviderRecord | null;
};

function createHistoryRecord(record: ProviderRecord, sequence: number): HistoryRecord {
    return {
        ...record,
        sequence,
        displayUrl: record.displayUrl,
    };
}

export function appendUniqueHistoryRecord(prev: HistoryRecord[], next: ProviderRecord): HistoryRecord[] {
    const alreadyExists = prev.some((item) => item.provider === next.provider && item.id === next.id);
    if (alreadyExists) {
        return prev;
    }

    return [...prev, createHistoryRecord(next, prev.length + 1)];
}

export function Webpaper() {
    const [api, contextHolder] = notification.useNotification({ placement: 'topRight' });

    const provider = useWebpaperStore((state) => state.provider);
    const setProvider = useWebpaperStore((state) => state.setProvider);
    const sharedSettings = useWebpaperStore((state) => state.sharedSettings);
    const setSharedSettings = useWebpaperStore((state) => state.setSharedSettings);
    const konachanSettings = useWebpaperStore((state) => state.konachanSettings);
    const jsonSettings = useWebpaperStore((state) => state.jsonSettings);
    const konachanSettingsDraft = useWebpaperStore((state) => state.konachanSettingsDraft);
    const setKonachanSettingsDraft = useWebpaperStore((state) => state.setKonachanSettingsDraft);
    const jsonSettingsDraft = useWebpaperStore((state) => state.jsonSettingsDraft);
    const setJsonSettingsDraft = useWebpaperStore((state) => state.setJsonSettingsDraft);
    const syncDraftsFromCurrent = useWebpaperStore((state) => state.syncDraftsFromCurrent);
    const applyDraftSettings = useWebpaperStore((state) => state.applyDraftSettings);
    const resetSettings = useWebpaperStore((state) => state.resetSettings);

    const [activeProvider, setActiveProvider] = useState<ActiveProvider>(provider);
    const [currentImage, setCurrentImage] = useState<ProviderRecord | null>(null);
    const [heroLoadMode, setHeroLoadMode] = useState<ImageHeroMode>('imageOnly');
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [historySearch, setHistorySearch] = useState('');
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [historyVisible, setHistoryVisible] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [contextMenuOpen, setContextMenuOpen] = useState(false);
    const [autoSwitchTick, setAutoSwitchTick] = useState(0);

    const [, fullscreenActions] = useFullscreen(() => document.documentElement);
    const {
        effectiveIntervalSec,
        markCycleStart,
        markCycleComplete,
    } = usePlaybackScheduler({
        desiredIntervalSec: sharedSettings.interval,
        isRunning,
    });
    const {
        isActive: wakeLockActive,
        request: requestWakeLock,
        release: releaseWakeLock,
        isSupported: wakeLockSupported,
    } = useWakeLock();

    const autoSwitchInFlightRef = useRef(false);
    const autoSkipFirstTickRef = useRef(true);
    const activeProviderRef = useRef<ActiveProvider>(provider);
    const konachanProviderRef = useRef<KonachanProvider | null>(null);
    const jsonProviderRef = useRef<JsonProvider | null>(null);
    const historyProviderRef = useRef<HistoryProvider | null>(null);
    const historyReturnContextRef = useRef<HistoryReturnContext | null>(null);
    const notifyRef = useRef(api);
    const preloadTaskRef = useRef<Promise<void> | null>(null);
    const preloadGenerationRef = useRef(0);
    const preloadImageRef = useRef<HTMLImageElement | null>(null);

    const konachanRequestKey = useMemo(() => buildKonachanQueryKey(konachanSettings), [konachanSettings]);
    const jsonRequestKey = useMemo(() => JSON.stringify({ jsonText: jsonSettings.jsonText }), [jsonSettings.jsonText]);
    const historyRequestKey = useMemo(() => {
        const last = history.at(-1);
        return `${history.length}:${last?.sequence ?? 0}`;
    }, [history]);

    const overlayRenderers = useMemo(() => createOverlayRendererMap(), []);
    const overlayState = useOverlayStore((state) => state.overlay);
    const addOverlayWidget = useOverlayStore((state) => state.addOverlayWidget);
    const requestOverlayWidgetSettings = useOverlayStore((state) => state.requestOverlayWidgetSettings);

    const activeRequestKey = useMemo(() => {
        if (activeProvider === 'Konachan') {
            return `konachan:${konachanRequestKey}`;
        }

        if (activeProvider === 'Json') {
            return `json:${jsonRequestKey}`;
        }

        return `history:${historyRequestKey}`;
    }, [activeProvider, historyRequestKey, jsonRequestKey, konachanRequestKey]);

    useEffect(() => {
        notifyRef.current = api;
    }, [api]);

    useEffect(() => {
        activeProviderRef.current = activeProvider;
    }, [activeProvider]);

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

    if (!konachanProviderRef.current || konachanProviderRef.current.queryKey !== konachanRequestKey) {
        konachanProviderRef.current = new KonachanProvider(konachanSettings, notify);
    } else {
        konachanProviderRef.current.updateSettings(konachanSettings);
    }

    if (!jsonProviderRef.current || jsonProviderRef.current.queryKey !== jsonRequestKey) {
        jsonProviderRef.current = new JsonProvider(jsonSettings);
    } else {
        jsonProviderRef.current.updateSettings(jsonSettings);
    }

    if (activeProvider === 'History') {
        if (!historyProviderRef.current || historyProviderRef.current.queryKey !== historyRequestKey) {
            historyProviderRef.current = new HistoryProvider(history);
        }
    }

    const getActiveProviderRuntime = useCallback((): ProviderRuntime | null => {
        const currentActiveProvider = activeProviderRef.current;
        if (currentActiveProvider === 'History') {
            return historyProviderRef.current;
        }

        if (currentActiveProvider === 'Json') {
            return jsonProviderRef.current;
        }

        return konachanProviderRef.current;
    }, []);

    const currentImageUrl = useMemo(() => {
        if (!currentImage) {
            return '';
        }

        return currentImage.displayUrl;
    }, [currentImage]);

    const preloadNextImage = useCallback(async () => {
        if (preloadTaskRef.current) {
            return preloadTaskRef.current;
        }

        const expectedGeneration = preloadGenerationRef.current;
        const runtime = getActiveProviderRuntime();
        if (!runtime) {
            return;
        }

        const task = (async () => {
            try {
                const preloaded = await runtime.peekOne();
                if (!preloaded || preloaded.type !== 'image') {
                    return;
                }

                const preloadUrl = preloaded.displayUrl || preloaded.previewUrl;
                if (!preloadUrl || preloadGenerationRef.current !== expectedGeneration) {
                    return;
                }

                const image = document.createElement('img');
                image.decoding = 'async';
                image.referrerPolicy = 'no-referrer';
                preloadImageRef.current = image;

                await new Promise<void>((resolve) => {
                    image.onload = () => resolve();
                    image.onerror = () => resolve();
                    image.src = preloadUrl;
                });
            } catch {
                // Ignore preload errors.
            }
        })();

        preloadTaskRef.current = task;
        await task;

        if (preloadTaskRef.current === task) {
            preloadTaskRef.current = null;
        }
    }, [getActiveProviderRuntime]);

    const loadNextImage = useCallback(
        async (reason: HeroLoadReason) => {
            const nextHeroLoadMode: ImageHeroMode = reason === 'manual'
                ? 'previewAsync'
                : reason === 'auto'
                    ? 'imageAsync'
                    : 'imageOnly';

            setHeroLoadMode(nextHeroLoadMode);

            const runtime = getActiveProviderRuntime();
            if (!runtime) {
                return;
            }

            const next = await runtime.getOne();

            if (!next) {
                if (runtime.isStoppedByNetworkErrors) {
                    setIsRunning(false);
                    autoSkipFirstTickRef.current = true;
                    return;
                }

                if (!runtime.hasMore) {
                    if (reason !== 'error') {
                        notify('warning', '没有找到可展示的图片', '当前筛选条件下没有更多结果');
                    }
                    setIsRunning(false);
                    autoSkipFirstTickRef.current = true;
                    return;
                }

                if (!runtime.hasTemporaryError && reason !== 'error') {
                    notify('warning', '没有找到可展示的图片', '当前筛选条件下没有更多结果');
                }
                return;
            }

            setCurrentImage(next);
            if (activeProviderRef.current !== 'History') {
                setHistory((prev) => appendUniqueHistoryRecord(prev, next));
            }

            void preloadNextImage();
        },
        [getActiveProviderRuntime, notify, preloadNextImage]
    );

    useEffect(() => {
        preloadGenerationRef.current += 1;
        preloadTaskRef.current = null;
        preloadImageRef.current = null;
        setCurrentImage(null);
        autoSkipFirstTickRef.current = true;
        void loadNextImage('query-change');
    }, [activeRequestKey, loadNextImage]);

    useEffect(() => {
        if (!isRunning) {
            return;
        }

        const intervalMs = Math.max(1, Math.round(effectiveIntervalSec * 1000));
        const intervalId = window.setInterval(() => {
            setAutoSwitchTick((value) => value + 1);
        }, intervalMs);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [effectiveIntervalSec, isRunning]);

    useEffect(() => {
        if (!isRunning) {
            autoSkipFirstTickRef.current = true;
            return;
        }

        if (currentImage?.type === 'video') {
            return;
        }

        if (autoSkipFirstTickRef.current) {
            autoSkipFirstTickRef.current = false;
            return;
        }

        if (autoSwitchInFlightRef.current) {
            return;
        }

        autoSwitchInFlightRef.current = true;

        void loadNextImage('auto').finally(() => {
            autoSwitchInFlightRef.current = false;
            markCycleComplete();
        });
    }, [autoSwitchTick, currentImage?.type, isRunning, loadNextImage, markCycleComplete]);

    const fullScreen = useCallback(async () => {
        fullscreenActions.toggleFullscreen();
    }, [fullscreenActions]);

    const togglePlay = useCallback(() => {
        if (isRunning) {
            setIsRunning(false);
            autoSwitchInFlightRef.current = false;
            autoSkipFirstTickRef.current = true;
            notify('info', '自动切换已暂停', `间隔 ${sharedSettings.interval} 秒`);
            return;
        }

        autoSkipFirstTickRef.current = true;
        markCycleStart();
        setIsRunning(true);
        void loadNextImage('auto').finally(() => {
            markCycleComplete();
        });
        notify('success', '自动切换已启动', `间隔 ${sharedSettings.interval} 秒`);
    }, [isRunning, loadNextImage, markCycleComplete, markCycleStart, notify, sharedSettings.interval]);

    useEffect(() => {
        if (isRunning) {
            autoSkipFirstTickRef.current = true;
        }
    }, [isRunning]);

    const openSettings = useCallback(() => {
        syncDraftsFromCurrent();
        setSettingsVisible(true);
    }, [syncDraftsFromCurrent]);

    const closeSettings = useCallback(() => {
        setSettingsVisible(false);

        const previousPage = konachanSettings.page;
        const nextPage = konachanSettingsDraft.page;

        applyDraftSettings();

        if (nextPage !== previousPage) {
            notify('info', '页码已切换', `第 ${nextPage} 页`);
        }
    }, [applyDraftSettings, konachanSettings.page, konachanSettingsDraft.page, notify]);

    const resetAllSettings = useCallback(() => {
        resetSettings();
        setActiveProvider('Konachan');
        historyReturnContextRef.current = null;

        notify('success', '设置已重置', '已恢复共享设置与 Provider 默认设置');
    }, [notify, resetSettings]);

    const setHistoryCurrent = useCallback(
        (record: HistoryRecord) => {
            if (history.length === 0) {
                return;
            }

            if (activeProviderRef.current !== 'History') {
                historyReturnContextRef.current = {
                    provider,
                    image: currentImage,
                };
            }

            historyProviderRef.current = new HistoryProvider(history);
            historyProviderRef.current.setCurrentBySequence(record.sequence);

            setIsRunning(false);
            autoSkipFirstTickRef.current = true;
            setActiveProvider('History');
            setCurrentImage(record);
            setHistoryVisible(false);
            notify('info', '已切换到历史模式', '可点击“返回原数据源”恢复之前的数据源和位置');
        },
        [currentImage, history, notify, provider]
    );

    const returnFromHistory = useCallback(() => {
        const context = historyReturnContextRef.current;
        if (!context) {
            setActiveProvider(provider);
            notify('info', '已退出历史模式');
            return;
        }

        setIsRunning(false);
        autoSkipFirstTickRef.current = true;
        setActiveProvider(context.provider);
        if (context.image) {
            setCurrentImage(context.image);
        }
        historyReturnContextRef.current = null;
        notify('success', '已返回原数据源');
    }, [notify, provider]);

    const activeProviderRuntime = getActiveProviderRuntime();
    const hasMore = activeProviderRuntime?.hasMore ?? false;

    const tryCreateWidget = (kind: WidgetKind) => {
        const offset = overlayState.widgets.length * 36;
        const transform = { transform: buildTransformString(120 + offset, 120 + offset, 0) };
        const nextWidget = createWidget(kind, transform);
        addOverlayWidget(nextWidget);
        requestOverlayWidgetSettings(nextWidget.id);
        notify('success', '组件已创建', `${nextWidget.label} (${nextWidget.id})`);
    };

    const rightClickMenuItems = useMemo<MenuProps['items']>(() => {
        const makeItemIcon = (iconClass: string) => (
            <span aria-hidden='true' className={`inline-block h-4 w-4 ${iconClass}`} />
        );

        return [
            {
                key: 'toggle-play',
                label: isRunning ? '暂停自动切换' : '开始自动切换',
                icon: makeItemIcon(isRunning ? 'icon-[octicon--pause-16]' : 'icon-[octicon--play-16]'),
                onClick: togglePlay,
            },
            {
                key: 'next-image',
                label: '下一张',
                disabled: !hasMore,
                icon: makeItemIcon('icon-[octicon--arrow-right-16]'),
                onClick: () => void loadNextImage('manual'),
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
                onClick: openSettings,
            },
            {
                key: 'open-history',
                label: '历史记录',
                icon: makeItemIcon('icon-[octicon--history-16]'),
                onClick: () => setHistoryVisible(true),
            },
            ...(activeProvider === 'History'
                ? [{
                    key: 'return-from-history',
                    label: '返回原数据源',
                    icon: makeItemIcon('icon-[octicon--arrow-left-16]'),
                    onClick: returnFromHistory,
                }] : []),
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
                        label: '文本组件',
                        icon: makeItemIcon('icon-[octicon--typography-16]'),
                        onClick: () => tryCreateWidget('text'),
                    },
                    {
                        key: 'create-html-widget',
                        label: 'HTML 组件',
                        icon: makeItemIcon('icon-[octicon--code-16]'),
                        onClick: () => tryCreateWidget('html'),
                    },
                    {
                        key: 'create-image-widget',
                        label: 'Image 组件',
                        icon: makeItemIcon('icon-[octicon--image-16]'),
                        onClick: () => tryCreateWidget('image'),
                    },
                    {
                        key: 'create-video-widget',
                        label: 'Video 组件',
                        icon: makeItemIcon('icon-[octicon--video-16]'),
                        onClick: () => tryCreateWidget('video'),
                    },
                    {
                        key: 'create-clock-widget',
                        label: 'Clock 组件',
                        icon: makeItemIcon('icon-[octicon--clock-16]'),
                        onClick: () => tryCreateWidget('clock'),
                    },
                    {
                        key: 'create-iframe-widget',
                        label: 'URL 组件',
                        icon: makeItemIcon('icon-[octicon--code-16]'),
                        onClick: () => tryCreateWidget('iframe'),
                    },
                ],
            },
        ];
    }, [activeProvider, hasMore, isRunning]);

    return (
        <Dropdown
            trigger={['contextMenu']}
            open={contextMenuOpen}
            onOpenChange={setContextMenuOpen}
            menu={{
                items: rightClickMenuItems,
            }}
        >
            <div className='relative h-screen min-h-screen w-full overflow-hidden'>
                {contextHolder}

                {currentImage?.type === 'video'
                    ? (
                        <VideoHero
                            videoUrl={currentImageUrl}
                            posterUrl={currentImage?.previewUrl || null}
                            objectFit={sharedSettings.objectFit}
                            onVideoError={() => {
                                void loadNextImage('error');
                            }}
                            onVideoEnded={() => {
                                if (isRunning && sharedSettings.videoAutoSwitchOnEnded) {
                                    void loadNextImage('auto');
                                }
                            }}
                        />
                    )
                    : (
                        <ImageHero
                            imageUrl={currentImageUrl}
                            previewUrl={currentImage?.previewUrl || null}
                            mode={heroLoadMode}
                            objectFit={sharedSettings.objectFit}
                            trackScale={sharedSettings.trackScale}
                            trackIntensity={sharedSettings.trackIntensity}
                            enableMouseTracking={sharedSettings.trackIntensity !== 0}
                            onImageError={() => {
                                void loadNextImage('error');
                            }}
                        />
                    )}

                <OverlayRoot
                    renderers={overlayRenderers}
                    onWidgetContextMenu={() => {
                        setContextMenuOpen(false);
                    }}
                />

                <Drawer
                    title='Webpaper 设置'
                    size={520}
                    placement='right'
                    onClose={closeSettings}
                    open={settingsVisible}
                    destroyOnHidden
                >
                    <Space orientation='vertical' size='large' style={{ width: '100%' }}>
                        <Button danger onClick={resetAllSettings}>重置全部设置</Button>

                        <Space orientation='vertical' size={8} style={{ width: '100%' }}>
                            <Typography.Text strong>数据源</Typography.Text>
                            <Select
                                value={provider}
                                options={[
                                    { value: 'Konachan', label: 'Konachan' },
                                    { value: 'Json', label: 'Json' },
                                ]}
                                onChange={(value) => {
                                    const nextProvider = value as NormalProvider;
                                    setProvider(nextProvider);
                                    if (activeProviderRef.current !== 'History') {
                                        setActiveProvider(nextProvider);
                                    }
                                    notify('info', '数据源已切换', nextProvider === 'Konachan' ? 'Konachan' : 'Json');
                                }}
                            />
                        </Space>

                        <SharedSettingsPanel
                            value={sharedSettings}
                            wakeLockSupported={wakeLockSupported}
                            onChange={setSharedSettings}
                            notify={notify}
                        />

                        {provider === 'Konachan'
                            ? (
                                <KonachanSettingsPanel
                                    value={konachanSettingsDraft}
                                    onChange={(nextSettings) => {
                                        setKonachanSettingsDraft(nextSettings);
                                    }}
                                    notify={notify}
                                />
                            )
                            : (
                                <JsonSettingsPanel
                                    value={jsonSettingsDraft}
                                    onChange={(nextSettings) => {
                                        setJsonSettingsDraft(nextSettings);
                                    }}
                                    notify={notify}
                                />
                            )}
                    </Space>
                </Drawer>

                <HistoryDrawer
                    open={historyVisible}
                    items={history}
                    search={historySearch}
                    onSearchChange={setHistorySearch}
                    onSetCurrent={setHistoryCurrent}
                    onClose={() => setHistoryVisible(false)}
                />
            </div>
        </Dropdown>
    );
}
