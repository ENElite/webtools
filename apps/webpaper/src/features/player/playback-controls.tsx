export interface PlaybackControlsProps {
    readonly current: number;
    readonly total: number;
    readonly loading: boolean;
    readonly historyMode: boolean;
    readonly autoplayRunning: boolean;
    readonly onPrevious: () => void;
    readonly onNext: () => void;
    readonly onStartAutoplay: () => void;
    readonly onStopAutoplay: () => void;
    readonly onOpenHistory: () => void;
    readonly onLeaveHistory: () => void;
}

export function PlaybackControls({
    current,
    total,
    loading,
    historyMode,
    autoplayRunning,
    onPrevious,
    onNext,
    onStartAutoplay,
    onStopAutoplay,
    onOpenHistory,
    onLeaveHistory,
}: PlaybackControlsProps) {
    return (
        <nav
            aria-label='播放控制'
            className='flex items-center gap-2 rounded-full bg-slate-950/65 px-3 py-2 text-white backdrop-blur'
        >
            <button type='button' aria-label='上一项' onClick={onPrevious} disabled={loading || total === 0}>
                上一项
            </button>
            <span aria-live='polite'>{total === 0 ? '0 / 0' : `${current + 1} / ${total}`}</span>
            <button type='button' aria-label='下一项' onClick={onNext} disabled={loading || total === 0}>
                下一项
            </button>
            <button
                type='button'
                aria-label={autoplayRunning ? '暂停自动播放' : '开始自动播放'}
                onClick={autoplayRunning ? onStopAutoplay : onStartAutoplay}
                disabled={total === 0}
            >
                {autoplayRunning ? '暂停' : '播放'}
            </button>
            {historyMode ? (
                <button type='button' onClick={onLeaveHistory}>返回当前</button>
            ) : (
                <button type='button' onClick={onOpenHistory}>历史</button>
            )}
        </nav>
    );
}
