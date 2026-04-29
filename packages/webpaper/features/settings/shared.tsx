import { Button, InputNumber, Space, Switch, Typography } from 'antd';

import { useEffect, useState } from 'react';

import type { SharedSettings } from '@/shared/types';

type Notify = (type: 'success' | 'info' | 'warning' | 'error', message: string, description?: string) => void;

type SharedSettingsPanelProps = {
    value: SharedSettings;
    wakeLockSupported: boolean;
    onChange: (next: SharedSettings) => void;
    notify: Notify;
};

export function SharedSettingsPanel({ value, wakeLockSupported, onChange, notify }: SharedSettingsPanelProps) {
    const [intervalDraft, setIntervalDraft] = useState<string>(String(value.interval));

    useEffect(() => {
        setIntervalDraft(String(value.interval));
    }, [value.interval]);

    const commitInterval = () => {
        const parsed = Number(intervalDraft);
        if (!Number.isFinite(parsed)) {
            setIntervalDraft(String(value.interval));
            return;
        }

        const nextValue = Math.max(5, Math.min(180, Math.round(parsed)));
        setIntervalDraft(String(nextValue));

        if (nextValue === value.interval) {
            return;
        }

        onChange({ ...value, interval: nextValue });
        notify('info', '切换间隔已更新', `${nextValue} 秒（下一张后生效）`);
    };

    return (
        <Space orientation='vertical' size={8} style={{ width: '100%' }}>
            <Typography.Text strong>共享设置</Typography.Text>
            <Space orientation='vertical' size='middle' style={{ width: '100%' }}>
                <div className='grid grid-cols-1 items-center gap-3 md:grid-cols-[110px_1fr_auto]'>
                    <Typography.Text>覆盖窗口</Typography.Text>
                    <Button
                        type={value.objectFit === 'cover' ? 'primary' : 'default'}
                        onClick={() => {
                            const nextObjectFit = value.objectFit === 'cover' ? 'contain' : 'cover';
                            onChange({ ...value, objectFit: nextObjectFit });
                        }}
                    >
                        {value.objectFit === 'cover' ? 'cover' : 'contain'}
                    </Button>
                </div>

                <div className='grid grid-cols-1 items-center gap-3 md:grid-cols-[110px_1fr_auto]'>
                    <Typography.Text>不息屏</Typography.Text>
                    {wakeLockSupported
                        ? (
                            <Switch
                                className='justify-self-start'
                                checked={value.enableWakeLock}
                                onChange={(checked) => {
                                    onChange({ ...value, enableWakeLock: checked });
                                }}
                            />
                        )
                        : (
                            <Typography.Text type='secondary'>不支持</Typography.Text>
                        )}
                </div>

                <div className='grid grid-cols-1 items-center gap-3 md:grid-cols-[110px_1fr_auto]'>
                    <Typography.Text>切换间隔</Typography.Text>
                    <InputNumber
                        min={5}
                        max={180}
                        step={1}
                        value={intervalDraft === '' ? null : Number(intervalDraft)}
                        controls={false}
                        style={{ width: '100%' }}
                        onChange={(nextValue) => {
                            setIntervalDraft(nextValue === null ? '' : String(nextValue));
                        }}
                        onBlur={() => {
                            commitInterval();
                        }}
                        onPressEnter={() => {
                            commitInterval();
                        }}
                    />
                    <Typography.Text>{value.interval} 秒</Typography.Text>
                </div>

                <div className='grid grid-cols-1 items-center gap-3 md:grid-cols-[110px_1fr_auto]'>
                    <Typography.Text>图像缩放</Typography.Text>
                    <input
                        className='w-full'
                        type='range'
                        min='50'
                        max='150'
                        step='5'
                        value={value.trackScale}
                        onChange={(event) => {
                            onChange({ ...value, trackScale: Number(event.target.value) });
                        }}
                    />
                    <Typography.Text>{value.trackScale}%</Typography.Text>
                </div>

                <div className='grid grid-cols-1 items-center gap-3 md:grid-cols-[110px_1fr_auto]'>
                    <Typography.Text>跟踪强度</Typography.Text>
                    <input
                        className='w-full'
                        type='range'
                        min='-100'
                        max='100'
                        step='5'
                        value={value.trackIntensity}
                        onChange={(event) => {
                            onChange({ ...value, trackIntensity: Number(event.target.value) });
                        }}
                    />
                    <Typography.Text>{value.trackIntensity}%</Typography.Text>
                </div>

                <div className='grid grid-cols-1 items-center gap-3 md:grid-cols-[110px_1fr_auto]'>
                    <Typography.Text>视频播完切换</Typography.Text>
                    <Switch
                        className='justify-self-start'
                        checked={value.videoAutoSwitchOnEnded}
                        onChange={(checked) => {
                            onChange({ ...value, videoAutoSwitchOnEnded: checked });
                        }}
                    />
                </div>
            </Space>
        </Space>
    );
}