'use client';

import { Field, NumberInput, Select, Switch } from '@webtools/ui';

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

    return (
        <fieldset disabled={disabled} aria-label='播放设置' className='wp-settings-content'>
            <Field label='媒体适应' disabled={disabled}>
                <Select
                    options={[
                        { value: 'contain', label: '完整显示' },
                        { value: 'cover', label: '覆盖窗口' },
                    ]}
                    value={value.objectFit}
                    onValueChange={(next) => update('objectFit', next === 'cover' ? 'cover' : 'contain')}
                    disabled={disabled}
                />
            </Field>

            <div className='wp-inline'>
                <span>自动切换</span>
                <Switch
                    aria-label='自动切换'
                    checked={value.autoplayIntervalMs !== null}
                    onCheckedChange={(checked) => update(
                        'autoplayIntervalMs',
                        checked ? (value.autoplayIntervalMs ?? 30_000) : null,
                    )}
                    disabled={disabled}
                />
            </div>

            {value.autoplayIntervalMs !== null ? (
                <Field label='切换间隔（秒）' disabled={disabled}>
                    <NumberInput
                        min={1}
                        step={1}
                        value={value.autoplayIntervalMs / 1_000}
                        onValueChange={(seconds) => {
                            if (seconds === null) return;
                            update('autoplayIntervalMs', Math.max(1_000, Math.round(seconds * 1_000)));
                        }}
                        disabled={disabled}
                    />
                </Field>
            ) : null}

            <div className='wp-inline'>
                <span>视频静音</span>
                <Switch
                    aria-label='视频静音'
                    checked={value.videoMuted}
                    onCheckedChange={(checked) => update('videoMuted', checked)}
                    disabled={disabled}
                />
            </div>

            <div className='wp-inline'>
                <span>显示视频控制栏</span>
                <Switch
                    aria-label='显示视频控制栏'
                    checked={value.videoControls}
                    onCheckedChange={(checked) => update('videoControls', checked)}
                    disabled={disabled}
                />
            </div>

            <div className='wp-inline'>
                <span>视频结束后切换</span>
                <Switch
                    aria-label='视频结束后切换'
                    checked={value.videoAdvanceOnEnded}
                    onCheckedChange={(checked) => update('videoAdvanceOnEnded', checked)}
                    disabled={disabled}
                />
            </div>
        </fieldset>
    );
}
