'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { MediaItem } from '../../domain';
import type { MediaPlayerLoadStatus } from './media-player-controller';
import type { MediaPlayerSettings } from './player-settings';

type IntroPhase = 'waiting' | 'celebrating' | 'complete';

const CELEBRATION_DURATION_MS = 1_400;

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
    const [introPhase, setIntroPhase] = useState<IntroPhase>('waiting');
    const celebratedRef = useRef(false);
    const mediaKey = item ? `${item.sourceId}:${item.kind}:${item.id}:${item.url}` : null;
    const mediaReady = mediaKey !== null && readyMediaKey === mediaKey;

    const handleMediaReady = useCallback(() => {
        if (!mediaKey) return;
        setReadyMediaKey(mediaKey);
        if (celebratedRef.current) return;
        celebratedRef.current = true;
        setIntroPhase('celebrating');
    }, [mediaKey]);

    useEffect(() => {
        if (introPhase !== 'celebrating') return;
        const timer = window.setTimeout(() => setIntroPhase('complete'), CELEBRATION_DURATION_MS);
        return () => window.clearTimeout(timer);
    }, [introPhase]);

    const showStatus = !mediaReady || introPhase === 'celebrating';
    const waitingPhase: Exclude<IntroPhase, 'complete'> = introPhase === 'celebrating'
        ? 'celebrating'
        : 'waiting';
    const statusText = status === 'error'
        ? (error?.message ?? '媒体加载失败')
        : introPhase === 'celebrating'
            ? '信号接通，开播啦！'
            : '正在布置直播间…';

    if (!item) return <MediaStageWaitingRoom phase='waiting' status={status} message={statusText} />;

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
            {showStatus ? <MediaStageWaitingRoom phase={waitingPhase} status={status} message={statusText} /> : null}
        </section>
    );
}

export function MediaStageWaitingRoom({
    phase,
    status,
    message,
}: {
    readonly phase: Exclude<IntroPhase, 'complete'>;
    readonly status: MediaPlayerLoadStatus;
    readonly message: string;
}) {
    const error = status === 'error';
    return (
        <section className='wp-stage-status' aria-live='polite' data-phase={phase} data-status={status}>
            <div className='wp-waiting-room' aria-hidden='true'>
                <span className='wp-waiting-room__beam wp-waiting-room__beam--left' />
                <span className='wp-waiting-room__beam wp-waiting-room__beam--right' />
                <div className='wp-waiting-room__screen'>
                    <span className='wp-waiting-room__on-air'>{error ? 'SIGNAL LOST' : phase === 'celebrating' ? 'ON AIR' : 'STANDBY'}</span>
                    <div className='wp-waiting-room__avatar'>
                        <span className='wp-waiting-room__ear wp-waiting-room__ear--left' />
                        <span className='wp-waiting-room__ear wp-waiting-room__ear--right' />
                        <span className='wp-waiting-room__face'>
                            <i className='wp-waiting-room__eye wp-waiting-room__eye--left' />
                            <i className='wp-waiting-room__eye wp-waiting-room__eye--right' />
                            <i className='wp-waiting-room__mouth' />
                        </span>
                        <span className='wp-waiting-room__body' />
                    </div>
                    <div className='wp-waiting-room__equalizer'>
                        <i /><i /><i /><i /><i />
                    </div>
                </div>
                <div className='wp-waiting-room__chat'>
                    <i /><i /><i />
                </div>
                <div className='wp-waiting-room__desk' />
            </div>
            <div className='wp-confetti' aria-hidden='true'>
                {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
            </div>
            <p className='wp-stage-status__message'>{message}</p>
            {!error && phase === 'waiting' ? <span className='wp-stage-status__dots' aria-hidden='true'><i /><i /><i /></span> : null}
        </section>
    );
}
