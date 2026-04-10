import { Button } from 'antd';
import { useIdle } from '@webtools/reactuse';

import { useMemo } from 'react';

export interface DockBarProps {
    isRunning: boolean;
    onTogglePlay: () => void;
    onNextImage: () => void;
    onFullscreen: () => void;
    onOpenSettings: () => void;
    onOpenHistory: () => void;
    isHistoryMode: boolean;
    onReturnFromHistory: () => void;
    remainingMs: number;
    progress: number;
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
    remainingMs,
    progress,
    lockDock,
    onLockDockChange,
}: DockBarProps) {
    const { idle } = useIdle(3000);

    const ringStyle = useMemo(() => {
        const normalizedProgress = Math.max(Math.min(progress, 1), 0);

        return {
            strokeDashoffset: 100 - normalizedProgress * 100,
            stroke: isRunning ? '#14b8a6' : 'rgba(148, 163, 184, 0.65)',
            opacity: isRunning ? 1 : 0.9,
        };
    }, [isRunning, progress]);

    const remainingText = useMemo(() => {
        if (!isRunning) {
            return '已暂停 | 点击开始';
        }

        return `自动切换中 | ${Math.max(Math.ceil(remainingMs / 1000), 1)} 秒`;
    }, [isRunning, remainingMs]);

    return (
        <div
            className={`absolute bottom-0 left-0 right-0 z-[5] bg-[linear-gradient(180deg,rgba(9,17,31,0),rgba(9,17,31,0.82)_70%)] p-[0.8rem] transition-all duration-200 md:flex-row md:flex-wrap md:items-center md:justify-between md:p-4 ${
                !idle || lockDock ? 'translate-y-0 opacity-100' : 'translate-y-[96%] opacity-0'
            }`}
        >
            <div className='flex flex-wrap items-center justify-center gap-3'>
                <Button
                    type={lockDock ? 'primary' : 'default'}
                    onClick={() => onLockDockChange(!lockDock)}
                >
                    <span className='inline-flex items-center gap-1.5'>
                        <span
                            aria-hidden='true'
                            className={`inline-block h-4 w-4 ${lockDock ? 'icon-[octicon--lock-16]' : 'icon-[octicon--unlock-16]'}`}
                        />
                        <span>{lockDock ? 'Dock 已锁定' : 'Dock 自动隐藏'}</span>
                    </span>
                </Button>

                <div className='relative rounded-[10px] p-[2px] bg-[rgba(148,163,184,0.25)]'>
                    <svg
                        aria-hidden='true'
                        className='pointer-events-none absolute inset-0 h-full w-full'
                        viewBox='0 0 100 40'
                        preserveAspectRatio='none'
                    >
                        <path
                            d='M 11 2 H 89 A 9 9 0 0 1 98 11 V 29 A 9 9 0 0 1 89 38 H 11 A 9 9 0 0 1 2 29 V 11 A 9 9 0 0 1 11 2 Z'
                            pathLength={100}
                            fill='none'
                            strokeWidth='4'
                            strokeDasharray='100'
                            strokeLinecap='round'
                            style={{
                                ...ringStyle,
                                transition: 'stroke-dashoffset 180ms linear, stroke 180ms ease, opacity 180ms ease',
                            }}
                        />
                    </svg>

                    <Button className='relative z-[1]' type={isRunning ? 'primary' : 'default'} onClick={onTogglePlay}>
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
        </div>
    );
}
