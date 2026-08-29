'use client';

import { createWidgetEngine } from '@webtools/widget-core';
import type { WidgetEngine, WidgetKind } from '@webtools/widget-core';
import { WidgetCanvas, WidgetRuntimeProvider } from '@webtools/widget-react';
import {
    Alert,
    Button,
    Drawer,
    Field,
    NumberInput,
    Select,
    Switch,
    Textarea,
    TextInput,
} from '@webtools/ui';
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
                    <Button
                        type='button'
                        variant={settingsOpen ? 'secondary' : 'ghost'}
                        size='sm'
                        aria-expanded={settingsOpen}
                        onClick={() => setSettingsOpen((open) => !open)}
                    >
                        <span aria-hidden='true'>⚙</span><span className='wp-control-label'>设置</span>
                    </Button>
                </header>

                <SettingsPanel
                    open={settingsOpen}
                    settings={settings}
                    kinds={widgetCatalogs.definitions.kinds}
                    persistenceWarning={persistenceWarning}
                    onChange={patchSettings}
                    onApplySource={() => setActiveSelection(toSelection(settings))}
                    onAddWidget={addWidget}
                    onClose={() => setSettingsOpen(false)}
                />

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
    open,
    settings,
    kinds,
    persistenceWarning,
    onChange,
    onApplySource,
    onAddWidget,
    onClose,
}: {
    readonly open: boolean;
    readonly settings: AppSettings;
    readonly kinds: readonly WidgetKind[];
    readonly persistenceWarning: string | null;
    readonly onChange: (patch: Partial<AppSettings>) => void;
    readonly onApplySource: () => void;
    readonly onAddWidget: (kind: WidgetKind) => void;
    readonly onClose: () => void;
}) {
    return (
        <Drawer
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) onClose();
            }}
            title='壁纸设置'
            description='媒体来源、播放方式和桌面组件都在这里。'
            size='sm'
            className='wp-settings-drawer'
        >
            <div className='wp-settings-content'>
            {persistenceWarning ? <Alert tone='warning'>{persistenceWarning}</Alert> : null}

            <section className='wp-settings-section'>
                <h3>媒体源</h3>
                <Field label='来源'>
                    <Select
                        options={[
                            { value: 'bird-paper', label: '小鸟壁纸' },
                            { value: 'konachan', label: 'Konachan' },
                            { value: 'json', label: 'JSON' },
                        ]}
                        value={settings.source}
                        onValueChange={(source) => {
                            if (source) onChange({ source: source as AppSettings['source'] });
                        }}
                    />
                </Field>
                <Field label='每页数量' description='保持适中的数量可以让切换更流畅'>
                    <NumberInput
                        min={1}
                        max={50}
                        value={settings.pageSize}
                        onValueChange={(value) => onChange({
                            pageSize: clampPageSize(value ?? DEFAULT_APP_SETTINGS.pageSize),
                        })}
                    />
                </Field>
                <SourceFields settings={settings} onChange={onChange} />
                <Button type='button' fullWidth onClick={onApplySource}>应用媒体源</Button>
            </section>

            <section className='wp-settings-section'>
                <h3>播放</h3>
                <MediaPlayerSettingsForm
                    value={settings.player}
                    onChange={(player) => onChange({ player })}
                />
            </section>

            <section className='wp-settings-section'>
                <h3>小组件</h3>
                <div className='wp-inline'>
                    <span>编辑模式</span>
                    <Switch
                        aria-label='小组件编辑模式'
                        checked={settings.widgetsEditable}
                        onCheckedChange={(checked) => onChange({ widgetsEditable: checked })}
                    />
                </div>
                <div className='wp-widget-buttons'>
                    {kinds.map((kind) => (
                        <Button key={kind} type='button' variant='soft' size='sm' onClick={() => onAddWidget(kind)}>
                            <span aria-hidden='true'>＋</span>{kind}
                        </Button>
                    ))}
                </div>
            </section>
            </div>
        </Drawer>
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
                <Field label='模式'>
                    <Select
                        options={[
                            { value: 'latest', label: '最新' },
                            { value: 'search', label: '搜索' },
                            { value: 'category', label: '分类' },
                        ]}
                        value={settings.bird.mode}
                        onValueChange={(mode) => {
                            if (!mode) return;
                            onChange({ bird: { ...settings.bird, mode: mode as AppSettings['bird']['mode'] } });
                        }}
                    />
                </Field>
                {settings.bird.mode === 'search' ? (
                    <Field label='关键词'>
                        <TextInput value={settings.bird.query} onChange={(event) => onChange({
                            bird: { ...settings.bird, query: event.currentTarget.value },
                        })} />
                    </Field>
                ) : null}
                {settings.bird.mode === 'category' ? (
                    <Field label='分类 ID'>
                        <TextInput value={settings.bird.categoryId} onChange={(event) => onChange({
                            bird: { ...settings.bird, categoryId: event.currentTarget.value },
                        })} />
                    </Field>
                ) : null}
            </>
        );
    }
    if (settings.source === 'konachan') {
        return (
            <Field label='标签' description='多个标签使用空格分隔'>
                <TextInput value={settings.konachan.tags} onChange={(event) => onChange({
                    konachan: { ...settings.konachan, tags: event.currentTarget.value },
                })} />
            </Field>
        );
    }
    return (
        <Field label='JSON 媒体列表'>
            <Textarea rows={10} value={settings.jsonContent} onChange={(event) => onChange({
                jsonContent: event.currentTarget.value,
            })} />
        </Field>
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
