import { Button, Drawer, Select, Space, Typography, notification } from 'antd';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    useFullscreen,
    useTimestamp,
    useWakeLock,
} from '@webtools/reactuse';

import { DockBar } from './components/dock_bar';
import { ImageHero } from './components/hero/image';
import { VideoHero } from './components/hero/video';
import { HistoryDrawer } from './providers/history/drawer';
import { SharedSettingsPanel } from './components/settings/shared';
import { usePlaybackScheduler } from './hooks/use_playback_scheduler';
import {
    DEFAULT_KONACHAN_SETTINGS,
    KonachanSettingsPanel,
    buildKonachanQueryKey,
    type KonachanProviderSettings,
} from './providers/konachan/settings';
import { KonachanProvider } from './providers/konachan/provider';
import { DEFAULT_JSON_SETTINGS, JsonSettingsPanel, type JsonProviderSettings } from './providers/json/settings';
import { JsonProvider } from './providers/json/provider';
import { HistoryProvider } from './providers/history/provider';
import {
    OverlayRoot,
    createDefaultOverlayRenderers,
    createTextWidget,
} from './overlay';
import {
    clearSettings,
    loadSettings,
    saveSettings,
    type SharedSettings,
} from './settings/store';
import type { HistoryRecord, ProviderRecord } from './types';

const DEFAULT_SHARED_SETTINGS: SharedSettings = {
    objectFit: 'contain',
    trackScale: 100,
    trackIntensity: 0,
    lockDock: false,
    interval: 30,
    enableWakeLock: false,
    videoAutoSwitchOnEnded: true,
};

type NormalProvider = 'Konachan' | 'Json';
type ActiveProvider = NormalProvider | 'History';
type ProviderRuntime = KonachanProvider | JsonProvider | HistoryProvider;
type HeroLoadReason = 'query-change' | 'auto' | 'manual' | 'error';
type HeroLoadMode = 'imageOnly' | 'imageAsync' | 'previewAsync';

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
    const [initialSettings] = useState(() => {
        return loadSettings({
            provider: 'Konachan',
            sharedSettings: DEFAULT_SHARED_SETTINGS,
            konachanSettings: DEFAULT_KONACHAN_SETTINGS,
            jsonSettings: DEFAULT_JSON_SETTINGS,
        });
    });

    const [api, contextHolder] = notification.useNotification({ placement: 'topRight' });
    const [provider, setProvider] = useState<NormalProvider>(initialSettings.provider);
    const [activeProvider, setActiveProvider] = useState<ActiveProvider>(initialSettings.provider);
    const [sharedSettings, setSharedSettings] = useState<SharedSettings>(initialSettings.sharedSettings);
    const [konachanSettings, setKonachanSettings] = useState<KonachanProviderSettings>(initialSettings.konachanSettings);
    const [konachanSettingsDraft, setKonachanSettingsDraft] = useState<KonachanProviderSettings>(initialSettings.konachanSettings);
    const [jsonSettings, setJsonSettings] = useState<JsonProviderSettings>(initialSettings.jsonSettings);
    const [jsonSettingsDraft, setJsonSettingsDraft] = useState<JsonProviderSettings>(initialSettings.jsonSettings);
    const [currentImage, setCurrentImage] = useState<ProviderRecord | null>(null);
    const [heroLoadMode, setHeroLoadMode] = useState<HeroLoadMode>('imageOnly');
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [historySearch, setHistorySearch] = useState('');
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [historyVisible, setHistoryVisible] = useState(false);
    const [isRunning, setIsRunning] = useState(false);

    // Use reactuse hooks
    const { toggle: toggleFullscreen } = useFullscreen();
    const {
        effectiveIntervalSec,
        remainingMs,
        progress,
        markCycleStart,
        markCycleComplete,
    } = usePlaybackScheduler({
        desiredIntervalSec: sharedSettings.interval,
        isRunning,
    });
    const { timestamp: autoSwitchTimestamp } = useTimestamp({ interval: effectiveIntervalSec * 1000 });
    const { isActive: wakeLockActive, request: requestWakeLock, release: releaseWakeLock, isSupported: wakeLockSupported } = useWakeLock();

    const autoSwitchInFlightRef = useRef(false);
    const autoSkipFirstTickRef = useRef(true);
    const activeProviderRef = useRef<ActiveProvider>(initialSettings.provider);
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
    const overlayRenderers = useMemo(() => createDefaultOverlayRenderers(), []);
    const overlayWidgets = useMemo(() => {
        return [createTextWidget('text-widget-1')];
    }, []);
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
        saveSettings({
            provider,
            sharedSettings,
            konachanSettings,
            jsonSettings,
        });
    }, [provider, sharedSettings, konachanSettings, jsonSettings]);

    // Manage wake lock based on settings
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
                message,
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

                const preloadUrl = preloaded?.displayUrl || preloaded?.previewUrl;
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
                // Silently fail on preload errors
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
            const nextHeroLoadMode: HeroLoadMode = reason === 'manual'
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

            // Preload the next image in the background
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
        loadNextImage('query-change');
    }, [activeRequestKey, loadNextImage]);

    // Auto switch scheduler driven by useTimestamp
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
    }, [autoSwitchTimestamp, currentImage?.type, isRunning, loadNextImage, markCycleComplete]);

    const fullScreen = useCallback(async () => {
        await toggleFullscreen();
    }, [toggleFullscreen]);

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
        setKonachanSettingsDraft(konachanSettings);
        setJsonSettingsDraft(jsonSettings);
        setSettingsVisible(true);
    }, [konachanSettings, jsonSettings]);

    const closeSettings = useCallback(() => {
        setSettingsVisible(false);

        const previousPage = konachanSettings.page;
        const nextPage = konachanSettingsDraft.page;

        setKonachanSettings(konachanSettingsDraft);
        setJsonSettings(jsonSettingsDraft);

        if (nextPage !== previousPage) {
            notify('info', '页码已切换', `第 ${nextPage} 页`);
        }
    }, [konachanSettings, konachanSettingsDraft, jsonSettingsDraft, notify]);

    const resetAllSettings = useCallback(() => {
        clearSettings();

        setProvider('Konachan');
        setActiveProvider('Konachan');
        setSharedSettings(DEFAULT_SHARED_SETTINGS);
        setKonachanSettings(DEFAULT_KONACHAN_SETTINGS);
        setKonachanSettingsDraft(DEFAULT_KONACHAN_SETTINGS);
        setJsonSettings(DEFAULT_JSON_SETTINGS);
        setJsonSettingsDraft(DEFAULT_JSON_SETTINGS);
        historyReturnContextRef.current = null;

        notify('success', '设置已重置', '已恢复共享设置与 Provider 默认设置');
    }, [notify]);

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

    return (
        <div className='relative h-screen min-h-screen w-full overflow-hidden'>
            {contextHolder}

            {currentImage?.type === 'video'
                ? (
                    <VideoHero
                        videoUrl={currentImageUrl}
                        posterUrl={currentImage?.previewUrl || null}
                        objectFit={sharedSettings.objectFit}
                        onVideoError={() => {
                            loadNextImage('error');
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
                            loadNextImage('error');
                        }}
                    />
                )}

            <OverlayRoot
                initialWidgets={overlayWidgets}
                renderers={overlayRenderers}
            />

            <DockBar
                isRunning={isRunning}
                onTogglePlay={togglePlay}
                onNextImage={() => loadNextImage('manual')}
                onFullscreen={() => fullScreen()}
                onOpenSettings={openSettings}
                onOpenHistory={() => setHistoryVisible(true)}
                isHistoryMode={activeProvider === 'History'}
                onReturnFromHistory={returnFromHistory}
                remainingMs={remainingMs}
                progress={progress}
                lockDock={sharedSettings.lockDock}
                onLockDockChange={(locked) => {
                    setSharedSettings((prev) => ({ ...prev, lockDock: locked }));
                }}
                hasMore={activeProviderRuntime?.hasMore ?? false}
            />

            <Drawer
                title='Webpaper 设置'
                width={520}
                placement='right'
                onClose={closeSettings}
                open={settingsVisible}
                destroyOnClose
            >
                <Space direction='vertical' size='large' style={{ width: '100%' }}>
                    <Button danger onClick={resetAllSettings}>重置全部设置</Button>

                    <Space direction='vertical' size={8} style={{ width: '100%' }}>
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
    );
}
