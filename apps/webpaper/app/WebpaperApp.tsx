'use client';

import { createWidgetEngine } from '@webtools/widget-core';
import type { WidgetEngine, WidgetKind } from '@webtools/widget-core';
import { WidgetCanvas, WidgetRuntimeProvider } from '@webtools/widget-react';
import {
    createDefaultInspectorControls,
    WidgetDevtools,
    WidgetStudioPanel,
} from '@webtools/widget-studio';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
    DEFAULT_APP_SETTINGS,
    loadAppSettings,
    loadWidgetDocument,
    saveAppSettings,
    saveWidgetDocument,
    type AppSettings,
} from '../src/application';
import { HistoryDrawer } from '../src/features/history';
import { createWebPaperMediaCatalog, type MediaSourceSelection } from '../src/features/media';
import {
    MediaPlayerSettingsForm,
    MediaStage,
    PlaybackControls,
    useMediaPlayer,
} from '../src/features/player';
import { createBuiltInWidgetCatalogs } from '../src/features/widgets';

export function WebpaperApp() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return <main className='wp-boot'>正在启动 WebPaper…</main>;
    return <WebpaperSession />;
}

function WebpaperSession() {
    const mediaCatalog = useMemo(() => createWebPaperMediaCatalog(), []);
    const widgetCatalogs = useMemo(() => createBuiltInWidgetCatalogs(), []);
    const inspectorControls = useMemo(() => createDefaultInspectorControls(), []);
    const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings(localStorage));
    const [activeSelection, setActiveSelection] = useState<MediaSourceSelection>(() => toSelection(settings));
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historySearch, setHistorySearch] = useState('');
    const [{ engine, persistenceWarning }] = useState(() => createEngine(widgetCatalogs.definitions));
    const player = useMediaPlayer({ catalog: mediaCatalog, prefetchThreshold: 2 });

    useEffect(() => {
        void player.controller.switchSource(activeSelection);
    }, [activeSelection, player.controller]);

    useEffect(() => saveAppSettings(localStorage, settings), [settings]);

    useEffect(() => {
        const persist = () => saveWidgetDocument(localStorage, engine.getSnapshot().document);
        persist();
        return engine.subscribe(persist);
    }, [engine]);

    useEffect(() => {
        const interval = settings.player.autoplayIntervalMs;
        if (interval === null) player.controller.stopAutoplay();
        else player.controller.startAutoplay(interval);
    }, [player.controller, player.selection, settings.player.autoplayIntervalMs]);

    const patchSettings = useCallback((patch: Partial<AppSettings>) => {
        setSettings((current) => ({ ...current, ...patch }));
    }, []);

    const addWidget = useCallback((kind: WidgetKind) => {
        engine.dispatch({
            type: 'widget.add',
            widget: { kind, layout: { x: 5, y: 5, w: 32, h: 20 } },
        });
    }, [engine]);

    const historyMode = player.session.mode.kind === 'history';
    const current = historyMode
        ? player.session.mode.cursor
        : (player.session.cursor ?? 0);
    const total = historyMode ? player.session.history.length : player.session.items.length;

    return (
        <WidgetRuntimeProvider
            engine={engine}
            views={widgetCatalogs.views}
            editable={settings.widgetsEditable}
        >
            <main className='wp-shell'>
                <MediaStage
                    item={player.currentMedia}
                    status={player.status}
                    error={player.error}
                    settings={settings.player}
                    onMediaError={() => void player.controller.handleMediaError()}
                    onVideoEnded={() => void player.controller.next()}
                />

                <WidgetCanvas className='wp-widget-layer' />

                <header className='wp-toolbar'>
                    <strong className='wp-brand'>WebPaper</strong>
                    <span className='wp-source-badge'>{sourceLabel(activeSelection.sourceId)}</span>
                    <PlaybackControls
                        current={current}
                        total={total}
                        loading={player.status === 'loading' || player.status === 'loading-more'}
                        historyMode={historyMode}
                        autoplayRunning={player.session.autoplay.kind === 'running'}
                        onPrevious={() => void player.controller.previous()}
                        onNext={() => void player.controller.next()}
                        onStartAutoplay={() => player.controller.startAutoplay(
                            settings.player.autoplayIntervalMs ?? 30_000,
                        )}
                        onStopAutoplay={() => player.controller.stopAutoplay()}
                        onOpenHistory={() => setHistoryOpen(true)}
                        onLeaveHistory={() => player.controller.leaveHistory()}
                    />
                    <button type='button' onClick={() => setSettingsOpen((open) => !open)}>设置</button>
                </header>

                {settingsOpen ? (
                    <SettingsPanel
                        settings={settings}
                        kinds={widgetCatalogs.definitions.kinds}
                        persistenceWarning={persistenceWarning}
                        onChange={patchSettings}
                        onApplySource={() => setActiveSelection(toSelection(settings))}
                        onAddWidget={addWidget}
                        onClose={() => setSettingsOpen(false)}
                    />
                ) : null}

                <HistoryDrawer
                    open={historyOpen}
                    items={player.session.history}
                    search={historySearch}
                    onSearchChange={setHistorySearch}
                    onSelect={(_item, historyIndex) => {
                        player.controller.selectHistory(historyIndex);
                        setHistoryOpen(false);
                    }}
                    onClose={() => setHistoryOpen(false)}
                />

                <WidgetStudioPanel schemas={widgetCatalogs.inspectors} controls={inspectorControls} />
                {process.env.NODE_ENV === 'development' ? <WidgetDevtools /> : null}
            </main>
        </WidgetRuntimeProvider>
    );
}

function SettingsPanel({
    settings,
    kinds,
    persistenceWarning,
    onChange,
    onApplySource,
    onAddWidget,
    onClose,
}: {
    readonly settings: AppSettings;
    readonly kinds: readonly WidgetKind[];
    readonly persistenceWarning: string | null;
    readonly onChange: (patch: Partial<AppSettings>) => void;
    readonly onApplySource: () => void;
    readonly onAddWidget: (kind: WidgetKind) => void;
    readonly onClose: () => void;
}) {
    return (
        <aside className='wp-settings' aria-label='WebPaper 设置'>
            <header><h2>设置</h2><button type='button' onClick={onClose}>关闭</button></header>
            {persistenceWarning ? <p role='alert' className='wp-warning'>{persistenceWarning}</p> : null}

            <section>
                <h3>媒体源</h3>
                <label>来源
                    <select
                        value={settings.source}
                        onChange={(event) => onChange({
                            source: event.currentTarget.value as AppSettings['source'],
                        })}
                    >
                        <option value='bird-paper'>小鸟壁纸</option>
                        <option value='konachan'>Konachan</option>
                        <option value='json'>JSON</option>
                    </select>
                </label>
                <label>每页数量
                    <input
                        type='number'
                        min={1}
                        max={50}
                        value={settings.pageSize}
                        onChange={(event) => onChange({
                            pageSize: clampPageSize(event.currentTarget.valueAsNumber),
                        })}
                    />
                </label>
                <SourceFields settings={settings} onChange={onChange} />
                <button type='button' className='wp-primary' onClick={onApplySource}>应用媒体源</button>
            </section>

            <section>
                <h3>播放</h3>
                <MediaPlayerSettingsForm
                    value={settings.player}
                    onChange={(player) => onChange({ player })}
                />
            </section>

            <section>
                <h3>小组件</h3>
                <label className='wp-inline'>编辑模式
                    <input
                        type='checkbox'
                        checked={settings.widgetsEditable}
                        onChange={(event) => onChange({ widgetsEditable: event.currentTarget.checked })}
                    />
                </label>
                <div className='wp-widget-buttons'>
                    {kinds.map((kind) => (
                        <button key={kind} type='button' onClick={() => onAddWidget(kind)}>+ {kind}</button>
                    ))}
                </div>
            </section>
        </aside>
    );
}

function SourceFields({
    settings,
    onChange,
}: {
    readonly settings: AppSettings;
    readonly onChange: (patch: Partial<AppSettings>) => void;
}) {
    if (settings.source === 'bird-paper') {
        return (
            <>
                <label>模式
                    <select
                        value={settings.bird.mode}
                        onChange={(event) => onChange({
                            bird: { ...settings.bird, mode: event.currentTarget.value as AppSettings['bird']['mode'] },
                        })}
                    >
                        <option value='latest'>最新</option>
                        <option value='search'>搜索</option>
                        <option value='category'>分类</option>
                    </select>
                </label>
                {settings.bird.mode === 'search' ? (
                    <label>关键词<input value={settings.bird.query} onChange={(event) => onChange({
                        bird: { ...settings.bird, query: event.currentTarget.value },
                    })} /></label>
                ) : null}
                {settings.bird.mode === 'category' ? (
                    <label>分类 ID<input value={settings.bird.categoryId} onChange={(event) => onChange({
                        bird: { ...settings.bird, categoryId: event.currentTarget.value },
                    })} /></label>
                ) : null}
            </>
        );
    }
    if (settings.source === 'konachan') {
        return (
            <label>标签
                <input value={settings.konachan.tags} onChange={(event) => onChange({
                    konachan: { ...settings.konachan, tags: event.currentTarget.value },
                })} />
            </label>
        );
    }
    return (
        <label>JSON 媒体列表
            <textarea rows={10} value={settings.jsonContent} onChange={(event) => onChange({
                jsonContent: event.currentTarget.value,
            })} />
        </label>
    );
}

function createEngine(catalog: ReturnType<typeof createBuiltInWidgetCatalogs>['definitions']): {
    readonly engine: WidgetEngine;
    readonly persistenceWarning: string | null;
} {
    const persisted = loadWidgetDocument(localStorage, catalog);
    const engine = createWidgetEngine({
        catalog,
        ...(persisted.kind === 'loaded' ? { document: persisted.document } : {}),
    });

    if (persisted.kind !== 'loaded') {
        engine.dispatch({
            type: 'widget.add',
            widget: {
                kind: 'clock',
                label: '桌面时钟',
                layout: {
                    anchorX: 'center',
                    anchorY: 'top',
                    x: 0,
                    y: 5,
                    w: 48,
                    h: 18,
                },
                style: { shadowRadius: 12, shadowColor: 'rgba(0,0,0,.35)' },
            },
        });
    }

    return {
        engine,
        persistenceWarning: persisted.kind === 'invalid'
            ? '旧版小组件数据与 v2 架构不兼容，已使用默认布局。'
            : null,
    };
}

function toSelection(settings: AppSettings): MediaSourceSelection {
    if (settings.source === 'bird-paper') {
        const params = settings.bird.mode === 'search' && settings.bird.query.trim()
            ? { mode: 'search' as const, query: settings.bird.query.trim() }
            : settings.bird.mode === 'category' && settings.bird.categoryId.trim()
                ? { mode: 'category' as const, categoryId: settings.bird.categoryId.trim() }
                : { mode: 'latest' as const };
        return { sourceId: 'bird-paper', pageSize: settings.pageSize, params };
    }
    if (settings.source === 'konachan') {
        return {
            sourceId: 'konachan',
            pageSize: settings.pageSize,
            params: { tags: settings.konachan.tags, quality: settings.konachan.quality },
        };
    }
    return {
        sourceId: 'json',
        pageSize: settings.pageSize,
        params: { content: settings.jsonContent },
    };
}

function sourceLabel(sourceId: MediaSourceSelection['sourceId']): string {
    if (sourceId === 'bird-paper') return '小鸟壁纸';
    if (sourceId === 'konachan') return 'Konachan';
    return 'JSON';
}

function clampPageSize(value: number): number {
    if (!Number.isFinite(value)) return DEFAULT_APP_SETTINGS.pageSize;
    return Math.max(1, Math.min(50, Math.round(value)));
}
