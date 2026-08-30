'use client';

import {
    createComponentLoadPort,
    type ComponentLoadAttempt,
    type ComponentLoadBarrier,
    type ComponentRuntimeSignalMap,
    type SignalHub,
} from '@webtools/widget-core';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import type { MediaItem } from '../../domain';
import { BACKGROUND_COMPONENT_ID, STANDBY_COMPONENT_ID } from '../../application';
import type { MediaPlayerLoadStatus } from './media-player-controller';
import type { MediaPlayerSettings } from './player-settings';

type StandbyPhase = 'waiting' | 'celebrating' | 'complete';

const CELEBRATION_DURATION_MS = 1_400;
const STICKER_KINDS = [
    'heart',
    'ice-cream',
    'star',
    'flower',
    'candy',
    'cherry',
    'moon',
    'paw',
    'sparkle',
] as const;
const STICKER_TILE_COUNT = 36;

export interface MediaStageProps {
    readonly item: MediaItem | null;
    readonly signals: SignalHub<ComponentRuntimeSignalMap>;
    readonly settings: Pick<
        MediaPlayerSettings,
        'objectFit' | 'videoMuted' | 'videoControls' | 'videoAdvanceOnEnded'
    >;
    readonly onMediaError: () => void;
    readonly onVideoEnded: () => void;
}

export function MediaStage({
    item,
    signals,
    settings,
    onMediaError,
    onVideoEnded,
}: MediaStageProps) {
    const [readyMediaKey, setReadyMediaKey] = useState<string | null>(null);
    const mediaKey = item ? `${item.sourceId}:${item.kind}:${item.id}:${item.url}` : null;
    const mediaReady = mediaKey !== null && readyMediaKey === mediaKey;
    const resourceKey = mediaKey ?? 'awaiting-media';
    const loadPort = useMemo(() => createComponentLoadPort({
        hub: signals,
        componentId: BACKGROUND_COMPONENT_ID,
    }), [signals]);
    const activeAttemptRef = useRef<{
        readonly resourceKey: string;
        readonly attempt: ComponentLoadAttempt;
    } | null>(null);
    const pendingTerminalRef = useRef<{
        readonly resourceKey: string;
        readonly error?: unknown;
    } | null>(null);

    useEffect(() => {
        const attempt = loadPort.start(resourceKey);
        activeAttemptRef.current = { resourceKey, attempt };
        const pending = pendingTerminalRef.current;
        if (pending?.resourceKey === resourceKey) {
            pendingTerminalRef.current = null;
            if ('error' in pending) attempt.error(pending.error);
            else attempt.complete();
        }

        return () => {
            if (activeAttemptRef.current?.attempt === attempt) activeAttemptRef.current = null;
            attempt.dispose();
        };
    }, [loadPort, resourceKey]);

    const handleMediaReady = useCallback(() => {
        if (!mediaKey) return;
        setReadyMediaKey(mediaKey);
        const active = activeAttemptRef.current;
        if (active?.resourceKey === mediaKey) active.attempt.complete();
        else pendingTerminalRef.current = { resourceKey: mediaKey };
    }, [mediaKey]);

    const handleMediaError = useCallback(() => {
        if (mediaKey) {
            const error = new Error(`背景媒体加载失败：${mediaKey}`);
            const active = activeAttemptRef.current;
            if (active?.resourceKey === mediaKey) active.attempt.error(error);
            else pendingTerminalRef.current = { resourceKey: mediaKey, error };
        }
        onMediaError();
    }, [mediaKey, onMediaError]);

    if (!item) {
        return (
            <section className='wp-media-stage' data-media-kind='empty' />
        );
    }

    const backgroundUrl = item.kind === 'image'
        ? (item.previewUrl ?? item.url)
        : (item.posterUrl ?? '');

    return (
        <section className='wp-media-stage' data-media-kind={item.kind} data-media-ready={mediaReady || undefined}>
            {backgroundUrl ? (
                <img
                    aria-hidden='true'
                    alt=''
                    src={backgroundUrl}
                    className='wp-media-backdrop'
                    referrerPolicy='no-referrer'
                />
            ) : null}
            <div className='wp-media-scrim' />

            {item.kind === 'image' ? (
                <img
                    key={mediaKey}
                    src={item.url}
                    alt={`media-${item.id}`}
                    className='wp-media-content'
                    style={{ objectFit: settings.objectFit }}
                    referrerPolicy='no-referrer'
                    onLoad={handleMediaReady}
                    onError={handleMediaError}
                />
            ) : (
                <video
                    key={mediaKey}
                    src={item.url}
                    poster={item.posterUrl}
                    aria-label={`media-${item.id}`}
                    className='wp-media-content'
                    style={{ objectFit: settings.objectFit }}
                    autoPlay
                    muted={settings.videoMuted}
                    controls={settings.videoControls}
                    playsInline
                    preload='auto'
                    onLoadedData={handleMediaReady}
                    onError={handleMediaError}
                    onEnded={settings.videoAdvanceOnEnded ? onVideoEnded : undefined}
                />
            )}
        </section>
    );
}

export function StartupStandby({
    signals,
    barrier,
    status = 'idle',
    error = null,
}: {
    readonly signals: SignalHub<ComponentRuntimeSignalMap>;
    readonly barrier: ComponentLoadBarrier;
    readonly status?: MediaPlayerLoadStatus;
    readonly error?: Error | null;
}) {
    const snapshot = useSyncExternalStore(
        barrier.subscribe,
        barrier.getSnapshot,
        barrier.getSnapshot,
    );
    const [phase, setPhase] = useState<StandbyPhase>('waiting');
    const loadPort = useMemo(() => createComponentLoadPort({
        hub: signals,
        componentId: STANDBY_COMPONENT_ID,
    }), [signals]);
    const attemptRef = useRef<ComponentLoadAttempt | null>(null);

    useEffect(() => {
        const attempt = loadPort.start(barrier.resourceKey);
        attemptRef.current = attempt;
        return () => {
            if (attemptRef.current === attempt) attemptRef.current = null;
            attempt.dispose();
        };
    }, [barrier.resourceKey, loadPort]);

    useEffect(() => {
        attemptRef.current?.progress(snapshot.settled, snapshot.total);
        if (snapshot.status === 'complete' && phase === 'waiting') setPhase('celebrating');
    }, [phase, snapshot]);

    useEffect(() => {
        if (phase !== 'celebrating') return;
        const timer = window.setTimeout(() => {
            attemptRef.current?.complete(snapshot.failedIds);
            setPhase('complete');
        }, CELEBRATION_DURATION_MS);
        return () => window.clearTimeout(timer);
    }, [phase, snapshot.failedIds]);

    if (phase === 'complete') return null;

    const message = status === 'error'
        ? (error?.message ?? '媒体加载失败')
        : phase === 'celebrating'
            ? snapshot.failedIds.length > 0
                ? '部分组件未完成，先开播啦！'
                : '信号接通，开播啦！'
            : snapshot.status === 'idle'
                ? '正在接通信号…'
                : `正在加载壁纸和组件… ${snapshot.settled}/${snapshot.total}`;

    const progress = snapshot.total > 0
        ? Math.round((snapshot.settled / snapshot.total) * 100)
        : undefined;
    return (
        <MediaStageStandbyOverlay
            phase={phase}
            status={status}
            message={message}
            {...(progress === undefined ? {} : { progress })}
        />
    );
}

export function MediaStageStandbyOverlay({
    phase,
    status,
    message,
    progress,
}: {
    readonly phase: Exclude<StandbyPhase, 'complete'>;
    readonly status: MediaPlayerLoadStatus;
    readonly message: string;
    readonly progress?: number;
}) {
    const error = status === 'error';
    const displayedProgress = phase === 'celebrating' ? 100 : progress;
    return (
        <section className='wp-stage-status' aria-live='polite' data-phase={phase} data-status={status}>
            <div className='wp-sticker-wall' aria-hidden='true'>
                <div className='wp-sticker-track'>
                    {Array.from({ length: STICKER_TILE_COUNT }, (_, tileIndex) => (
                        <div className='wp-sticker-tile' data-sticker-tile key={tileIndex}>
                            {STICKER_KINDS.map((kind, stickerIndex) => (
                                <i
                                    data-grid-cell={stickerIndex}
                                    data-sticker={kind}
                                    key={`${kind}-${stickerIndex}`}
                                >
                                    <span />
                                </i>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <div className='wp-confetti' aria-hidden='true'>
                {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
            </div>
            <div className='wp-stage-loader'>
                <p className='wp-stage-status__message'>
                    <span aria-hidden='true'>{error ? '×' : phase === 'celebrating' ? '♥' : '♡'}</span>
                    {message}
                </p>
                <div
                    className='wp-stage-progress'
                    role='progressbar'
                    aria-label='壁纸加载进度'
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuetext={error ? '壁纸加载失败' : phase === 'celebrating' ? '加载完成' : '正在加载'}
                    {...(displayedProgress === undefined ? {} : { 'aria-valuenow': displayedProgress })}
                >
                    <span
                        className='wp-stage-progress__bar'
                        {...(displayedProgress === undefined
                            ? {}
                            : { style: { animation: 'none', transform: 'none', width: `${displayedProgress}%` } })}
                    />
                </div>
            </div>
        </section>
    );
}
