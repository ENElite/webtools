'use client';

import type { ChangeEvent } from 'react';

export interface MediaPlayerSettings {
    readonly objectFit: 'contain' | 'cover';
    /** Null disables playlist autoplay. */
    readonly autoplayIntervalMs: number | null;
    readonly videoMuted: boolean;
    readonly videoControls: boolean;
    readonly videoAdvanceOnEnded: boolean;
}

export const DEFAULT_MEDIA_PLAYER_SETTINGS: MediaPlayerSettings = {
    objectFit: 'contain',
    autoplayIntervalMs: null,
    videoMuted: true,
    videoControls: true,
    videoAdvanceOnEnded: true,
};

export interface MediaPlayerSettingsFormProps {
    readonly value: MediaPlayerSettings;
    readonly onChange: (value: MediaPlayerSettings) => void;
    readonly disabled?: boolean;
}

/** A normal controlled form; it has no widget, registry or persistence dependency. */
export function MediaPlayerSettingsForm({
    value,
    onChange,
    disabled = false,
}: MediaPlayerSettingsFormProps) {
    const update = <TKey extends keyof MediaPlayerSettings>(
        key: TKey,
        nextValue: MediaPlayerSettings[TKey],
    ): void => onChange({ ...value, [key]: nextValue });

    const handleIntervalChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const seconds = Number(event.currentTarget.value);
        if (!Number.isFinite(seconds)) return;
        update('autoplayIntervalMs', Math.max(1_000, Math.round(seconds * 1_000)));
    };

    return (
        <fieldset disabled={disabled} aria-label='播放设置' className='grid gap-3'>
            <label className='flex items-center justify-between gap-4'>
                <span>媒体适应</span>
                <select
                    value={value.objectFit}
                    onChange={(event) => update(
                        'objectFit',
                        event.currentTarget.value === 'cover' ? 'cover' : 'contain',
                    )}
                >
                    <option value='contain'>完整显示</option>
                    <option value='cover'>覆盖窗口</option>
                </select>
            </label>

            <label className='flex items-center justify-between gap-4'>
                <span>自动切换</span>
                <input
                    type='checkbox'
                    checked={value.autoplayIntervalMs !== null}
                    onChange={(event) => update(
                        'autoplayIntervalMs',
                        event.currentTarget.checked ? (value.autoplayIntervalMs ?? 30_000) : null,
                    )}
                />
            </label>

            {value.autoplayIntervalMs !== null ? (
                <label className='flex items-center justify-between gap-4'>
                    <span>切换间隔（秒）</span>
                    <input
                        type='number'
                        min={1}
                        step={1}
                        value={value.autoplayIntervalMs / 1_000}
                        onChange={handleIntervalChange}
                    />
                </label>
            ) : null}

            <label className='flex items-center justify-between gap-4'>
                <span>视频静音</span>
                <input
                    type='checkbox'
                    checked={value.videoMuted}
                    onChange={(event) => update('videoMuted', event.currentTarget.checked)}
                />
            </label>

            <label className='flex items-center justify-between gap-4'>
                <span>显示视频控制栏</span>
                <input
                    type='checkbox'
                    checked={value.videoControls}
                    onChange={(event) => update('videoControls', event.currentTarget.checked)}
                />
            </label>

            <label className='flex items-center justify-between gap-4'>
                <span>视频结束后切换</span>
                <input
                    type='checkbox'
                    checked={value.videoAdvanceOnEnded}
                    onChange={(event) => update('videoAdvanceOnEnded', event.currentTarget.checked)}
                />
            </label>
        </fieldset>
    );
}
