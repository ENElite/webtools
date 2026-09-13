import { Button } from '@webtools/ui';

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
            className='wp-playback-controls'
        >
            <Button
                type='button'
                variant='ghost'
                size='sm'
                aria-label='上一项'
                onClick={onPrevious}
                disabled={loading || total === 0}
            >
                <span aria-hidden='true'>←</span><span className='wp-control-label'>上一项</span>
            </Button>
            <span className='wp-playback-counter' aria-live='polite'>
                {loading ? '加载中…' : (total === 0 ? '0 / 0' : `${current + 1} / ${total}`)}
            </span>
            <Button
                type='button'
                variant='ghost'
                size='sm'
                aria-label='下一项'
                onClick={onNext}
                disabled={loading || total === 0}
            >
                <span className='wp-control-label'>下一项</span><span aria-hidden='true'>→</span>
            </Button>
            <Button
                type='button'
                variant={autoplayRunning ? 'secondary' : 'primary'}
                size='sm'
                aria-label={autoplayRunning ? '暂停自动播放' : '开始自动播放'}
                onClick={autoplayRunning ? onStopAutoplay : onStartAutoplay}
                disabled={total === 0}
            >
                <span aria-hidden='true'>{autoplayRunning ? 'Ⅱ' : '▶'}</span>
                <span className='wp-control-label'>{autoplayRunning ? '暂停' : '播放'}</span>
            </Button>
            {historyMode ? (
                <Button type='button' variant='secondary' size='sm' onClick={onLeaveHistory}>返回当前</Button>
            ) : (
                <Button type='button' variant='ghost' size='sm' onClick={onOpenHistory}>
                    <span aria-hidden='true'>◷</span><span className='wp-control-label'>历史</span>
                </Button>
            )}
        </nav>
    );
}
