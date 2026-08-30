'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { MediaItem } from '../../domain';
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
    'heart',
    'cloud',
    'ice-cream',
    'flower',
    'star',
    'candy',
    'heart',
] as const;
const STICKER_TILE_COUNT = 9;

export interface MediaStageProps {
    readonly item: MediaItem | null;
    readonly status?: MediaPlayerLoadStatus;
    readonly error?: Error | null;
    readonly settings: Pick<
        MediaPlayerSettings,
        'objectFit' | 'videoMuted' | 'videoControls' | 'videoAdvanceOnEnded'
    >;
    readonly onMediaError: () => void;
    readonly onVideoEnded: () => void;
}

export function MediaStage({
    item,
    status = 'idle',
    error = null,
    settings,
    onMediaError,
    onVideoEnded,
}: MediaStageProps) {
    const [readyMediaKey, setReadyMediaKey] = useState<string | null>(null);
    const [standbyPhase, setStandbyPhase] = useState<StandbyPhase>('waiting');
    const celebratedRef = useRef(false);
    const mediaKey = item ? `${item.sourceId}:${item.kind}:${item.id}:${item.url}` : null;
    const mediaReady = mediaKey !== null && readyMediaKey === mediaKey;

    const handleMediaReady = useCallback(() => {
        if (!mediaKey) return;
        setReadyMediaKey(mediaKey);
        if (celebratedRef.current) return;
        celebratedRef.current = true;
        setStandbyPhase('celebrating');
    }, [mediaKey]);

    useEffect(() => {
        if (standbyPhase !== 'celebrating') return;
        const timer = window.setTimeout(() => setStandbyPhase('complete'), CELEBRATION_DURATION_MS);
        return () => window.clearTimeout(timer);
    }, [standbyPhase]);

    const showStandby = standbyPhase !== 'complete';
    const visibleStandbyPhase: Exclude<StandbyPhase, 'complete'> = standbyPhase === 'celebrating'
        ? 'celebrating'
        : 'waiting';
    const statusText = status === 'error'
        ? (error?.message ?? '媒体加载失败')
        : standbyPhase === 'celebrating'
            ? '信号接通，开播啦！'
            : '正在准备壁纸…';

    if (!item) return <MediaStageStandbyOverlay phase='waiting' status={status} message={statusText} />;

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
                    key={item.id}
                    src={item.url}
                    alt={`media-${item.id}`}
                    className='wp-media-content'
                    style={{ objectFit: settings.objectFit }}
                    referrerPolicy='no-referrer'
                    onLoad={handleMediaReady}
                    onError={onMediaError}
                />
            ) : (
                <video
                    key={item.id}
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
                    onError={onMediaError}
                    onEnded={settings.videoAdvanceOnEnded ? onVideoEnded : undefined}
                />
            )}
            {showStandby ? (
                <MediaStageStandbyOverlay
                    phase={visibleStandbyPhase}
                    status={status}
                    message={statusText}
                />
            ) : null}
        </section>
    );
}

export function MediaStageStandbyOverlay({
    phase,
    status,
    message,
}: {
    readonly phase: Exclude<StandbyPhase, 'complete'>;
    readonly status: MediaPlayerLoadStatus;
    readonly message: string;
}) {
    const error = status === 'error';
    return (
        <section className='wp-stage-status' aria-live='polite' data-phase={phase} data-status={status}>
            <div className='wp-sticker-wall' aria-hidden='true'>
                <div className='wp-sticker-track'>
                    {Array.from({ length: STICKER_TILE_COUNT }, (_, tileIndex) => (
                        <div className='wp-sticker-tile' data-sticker-tile key={tileIndex}>
                            {STICKER_KINDS.map((kind, stickerIndex) => (
                                <i data-sticker={kind} key={`${kind}-${stickerIndex}`}><span /></i>
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
                    {...(phase === 'celebrating' ? { 'aria-valuenow': 100 } : {})}
                >
                    <span className='wp-stage-progress__bar' />
                </div>
            </div>
        </section>
    );
}
