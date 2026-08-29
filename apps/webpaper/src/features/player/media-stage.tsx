import type { MediaItem } from '../../domain';
import type { MediaPlayerLoadStatus } from './media-player-controller';
import type { MediaPlayerSettings } from './player-settings';

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
    if (!item) {
        return (
            <section
                className='wp-stage-status'
                aria-live='polite'
                data-status={status}
            >
                <span className='wp-stage-status-icon' aria-hidden='true'>
                    {status === 'error' ? '×' : '✦'}
                </span>
                <span>{status === 'error' ? (error?.message ?? '媒体加载失败') : '正在加载媒体…'}</span>
            </section>
        );
    }

    const backgroundUrl = item.kind === 'image'
        ? (item.previewUrl ?? item.url)
        : (item.posterUrl ?? '');

    return (
        <section className='wp-media-stage' data-media-kind={item.kind}>
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
                    onError={onMediaError}
                    onEnded={settings.videoAdvanceOnEnded ? onVideoEnded : undefined}
                />
            )}
        </section>
    );
}
