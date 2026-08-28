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
                className='absolute inset-0 grid place-items-center bg-slate-950 text-slate-200'
                aria-live='polite'
                data-status={status}
            >
                {status === 'error' ? (error?.message ?? '媒体加载失败') : '正在加载媒体…'}
            </section>
        );
    }

    const backgroundUrl = item.kind === 'image'
        ? (item.previewUrl ?? item.url)
        : (item.posterUrl ?? '');

    return (
        <section className='absolute inset-0 overflow-hidden bg-slate-950' data-media-kind={item.kind}>
            {backgroundUrl ? (
                <img
                    aria-hidden='true'
                    alt=''
                    src={backgroundUrl}
                    className='absolute inset-0 h-full w-full scale-105 object-cover opacity-75 blur-2xl'
                    referrerPolicy='no-referrer'
                />
            ) : null}
            <div className='absolute inset-0 bg-slate-950/25' />

            {item.kind === 'image' ? (
                <img
                    key={item.id}
                    src={item.url}
                    alt={`media-${item.id}`}
                    className='absolute inset-0 h-full w-full object-center'
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
                    className='absolute inset-0 h-full w-full object-center'
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
