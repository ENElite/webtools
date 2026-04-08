import { Button, Typography } from 'antd';
import { useIdle, useTimestamp } from '@webtools/reactuse';

import { useEffect, useMemo, useRef } from 'react';

export interface DockBarProps {
    isRunning: boolean;
    onTogglePlay: () => void;
    onNextImage: () => void;
    onFullscreen: () => void;
    onOpenSettings: () => void;
    onOpenHistory: () => void;
    isHistoryMode: boolean;
    onReturnFromHistory: () => void;
    countdownMs: number;
    interval: number;
    lockDock: boolean;
    onLockDockChange: (locked: boolean) => void;
    hasMore: boolean;
}

export function DockBar({
    isRunning,
    onTogglePlay,
    onNextImage,
    onFullscreen,
    onOpenSettings,
    onOpenHistory,
    isHistoryMode,
    onReturnFromHistory,
    countdownMs,
    interval,
    lockDock,
    onLockDockChange,
    hasMore,
}: DockBarProps) {
    const { idle } = useIdle(5000, {
        events: ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'],
        listenForVisibilityChange: true,
    });

    const { timestamp } = useTimestamp({ interval: 100 });
    const cycleStartRef = useRef<number>(Date.now());

    useEffect(() => {
        cycleStartRef.current = Date.now();
    }, [isRunning, countdownMs]);

    const countdown = useMemo(() => {
        if (!isRunning || countdownMs <= 0) {
            return { remainingMs: 0, progress: 0 };
        }

        const elapsed = Math.max(timestamp - cycleStartRef.current, 0);
        const mod = elapsed % countdownMs;
        const remainingMs = countdownMs - mod;
        const progress = 1 - mod / countdownMs;
        return { remainingMs, progress };
    }, [countdownMs, isRunning, timestamp]);

    const borderStyle = useMemo(() => {
        if (!isRunning) {
            return { background: 'rgba(148, 163, 184, 0.25)' };
        }

        const degree = Math.max(Math.min(countdown.progress * 360, 360), 0);
        return {
            background: `conic-gradient(#14b8a6 ${degree}deg, rgba(255,255,255,0.22) ${degree}deg 360deg)`,
        };
    }, [countdown.progress, isRunning]);

    const remainingText = useMemo(() => {
        if (!isRunning) {
            return '已暂停 | 点击开始';
        }

        return `自动切换中 | ${Math.max(Math.ceil(countdown.remainingMs / 1000), 1)} 秒`;
    }, [countdown.remainingMs, isRunning]);

    return (
        <div
            className={`absolute bottom-0 left-0 right-0 z-[5] flex flex-col items-stretch justify-start gap-4 bg-[linear-gradient(180deg,rgba(9,17,31,0),rgba(9,17,31,0.82)_70%)] p-[0.8rem] transition-all duration-200 md:flex-row md:flex-wrap md:items-center md:justify-between md:p-4 ${
                !idle || lockDock ? 'translate-y-0 opacity-100' : 'translate-y-[96%] opacity-0'
            }`}
        >
            <div className='flex flex-wrap items-center gap-3'>
                <Button
                    type={lockDock ? 'primary' : 'default'}
                    onClick={() => onLockDockChange(!lockDock)}
                >
                    {lockDock ? 'Dock 已锁定' : 'Dock 自动隐藏'}
                </Button>

                <div className='rounded-[10px] p-[2px]' style={borderStyle}>
                    <Button type={isRunning ? 'primary' : 'default'} onClick={onTogglePlay}>
                        {remainingText}
                    </Button>
                </div>

                <Button danger onClick={onNextImage}>
                    下一张
                </Button>

                <Button onClick={onFullscreen}>全屏</Button>
                <Button onClick={onOpenSettings}>设置</Button>
                <Button onClick={onOpenHistory}>历史记录</Button>
                {isHistoryMode ? <Button onClick={onReturnFromHistory}>返回原数据源</Button> : null}
            </div>

            <div className='flex min-w-0 flex-1 flex-col items-stretch gap-3 md:min-w-[280px]'>
                <Typography.Text className='text-white/90'>
                    {hasMore ? `provider 可继续分页 | 间隔 ${interval} 秒` : 'provider 已耗尽'}
                </Typography.Text>
            </div>
        </div>
    );
}
