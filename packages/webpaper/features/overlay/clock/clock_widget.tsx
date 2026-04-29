import { useMemo, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';

import type { WidgetRendererProps } from '../types';
import type { ClockWidgetProps } from './schema';

function subscribe(callback: () => void) {
    const intervalId = window.setInterval(callback, 1000);
    return () => {
        window.clearInterval(intervalId);
    };
}

function getNow() {
    return Date.now();
}

function getServerNow() {
    return 0;
}

export function ClockWidget({ widget }: WidgetRendererProps<ClockWidgetProps>) {
    const now = useSyncExternalStore(subscribe, getNow, getServerNow);
    const date = useMemo(() => new Date(now), [now]);

    const locale = widget.props.locale || 'zh-CN';
    const timeText = useMemo(() => {
        return new Intl.DateTimeFormat(locale, {
            hour: '2-digit',
            minute: '2-digit',
            second: widget.props.showSeconds ? '2-digit' : undefined,
            hour12: !widget.props.use24Hour,
        }).format(date);
    }, [date, locale, widget.props.showSeconds, widget.props.use24Hour]);

    const dateText = useMemo(() => {
        if (!widget.props.showDate) {
            return '';
        }

        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            weekday: 'short',
        }).format(date);
    }, [date, locale, widget.props.showDate]);

    const textStyle: CSSProperties = {
        fontSize: `${widget.props.fontSize}px`,
        color: widget.props.color,
        fontWeight: widget.props.fontWeight,
        lineHeight: 1.1,
        letterSpacing: '0.04em',
    };

    return (
        <div
            className='flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-900/40'
            style={{
                userSelect: 'none',
            }}
        >
            <div style={textStyle}>{timeText}</div>
            {dateText
                ? <div style={{ color: widget.props.color, opacity: 0.85, fontSize: `${Math.max(12, widget.props.fontSize * 0.42)}px` }}>{dateText}</div>
                : null}
        </div>
    );
}
