import { useMemo, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { useTimestamp } from '@/hooks/useTimestamp';

import type { WidgetRendererProps } from '../types';
import type { AmPmFormat, ClockWidgetProps, DateFormat, DigitFormat, ShowYearPlacement, TimeFormat, WeekdayFormat } from './schema';

const CHINESE_WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const;
const ENGLISH_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const ENGLISH_WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const ENGLISH_MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
] as const;

const ENGLISH_MONTHS_SHORT = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
] as const;

function padDatePart(value: number, digitFormat: DigitFormat): string {
    return digitFormat === 'double' ? String(value).padStart(2, '0') : String(value);
}

function getWeekdayText(date: Date, weekdayFormat: WeekdayFormat): string {
    const weekdayIndex = date.getDay();

    switch (weekdayFormat) {
        case 'chinese':
            return CHINESE_WEEKDAYS[weekdayIndex] ?? '';
        case 'english':
            return ENGLISH_WEEKDAYS[weekdayIndex] ?? '';
        case 'english-short':
            return ENGLISH_WEEKDAYS_SHORT[weekdayIndex] ?? '';
        default:
            return '';
    }
}

function getAmPmText(date: Date, amPmFormat: AmPmFormat): string {
    const hour = date.getHours();
    const isMorning = hour < 12;

    switch (amPmFormat) {
        case 'left-chinese':
        case 'right-chinese':
            return isMorning ? '上午' : '下午';
        case 'left-english':
        case 'right-english':
            return isMorning ? 'AM' : 'PM';
        default:
            return '';
    }
}

function buildDateDisplay(dateText: string, weekdayText: string, weekdayPlacement: 'left' | 'right' | 'none'): string {
    if (!dateText) {
        return '';
    }

    if (!weekdayText || weekdayPlacement === 'none') {
        return dateText;
    }

    return weekdayPlacement === 'left' ? `${weekdayText} ${dateText}` : `${dateText} ${weekdayText}`;
}

function getTimeText(date: Date, timeFormat: TimeFormat, showSeconds: boolean): string {
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    if (timeFormat === '24-hour') {
        const hourText = String(hours).padStart(2, '0');
        return showSeconds ? `${hourText}:${minutes}:${seconds}` : `${hourText}:${minutes}`;
    }

    const hour12 = hours % 12 || 12;
    const hourText = String(hour12).padStart(2, '0');
    return showSeconds ? `${hourText}:${minutes}:${seconds}` : `${hourText}:${minutes}`;
}

function getDateText(
    date: Date,
    dateFormat: DateFormat,
    digitFormat: DigitFormat,
    showYear: ShowYearPlacement
): string {
    const year = String(date.getFullYear());
    const month = padDatePart(date.getMonth() + 1, digitFormat);
    const day = padDatePart(date.getDate(), digitFormat);

    let dateText = '';

    switch (dateFormat) {
        case 'chinese': {
            const core = `${month}月${day}日`;
            dateText = showYear === 'left'
                ? `${year}年${core}`
                : showYear === 'right'
                    ? `${core}${year}年`
                    : core;
            break;
        }
        case 'numeric1': {
            const core = `${month}-${day}`;
            dateText = showYear === 'left'
                ? `${year}-${core}`
                : showYear === 'right'
                    ? `${core}-${year}`
                    : core;
            break;
        }
        case 'english': {
            const core = `${ENGLISH_MONTHS[date.getMonth()]} ${day}`;
            dateText = showYear === 'left'
                ? `${year} ${core}`
                : showYear === 'right'
                    ? `${core}, ${year}`
                    : core;
            break;
        }
        case 'english-short': {
            const core = `${ENGLISH_MONTHS_SHORT[date.getMonth()]} ${day}`;
            dateText = showYear === 'left'
                ? `${year} ${core}`
                : showYear === 'right'
                    ? `${core}, ${year}`
                    : core;
            break;
        }
        default:
            return '';
    }

    return dateText;
}

export function ClockWidget({ widget }: WidgetRendererProps<ClockWidgetProps>) {
    const { timestamp: now } = useTimestamp({ controls: true });
    const [mounted, setMounted] = useState(false);

    // Mark mounted on client only to avoid SSR/CSR text mismatch.
    useEffect(() => {
        setMounted(true);
    }, []);

    const timeFormat = widget.props.timeFormat;
    const displayOrder = widget.props.displayOrder;

    const date = useMemo(() => new Date(now), [now]);

    const timeText = useMemo(() => {
        return getTimeText(date, timeFormat, widget.props.showSeconds);
    }, [date, timeFormat, widget.props.showSeconds]);

    const amPmText = useMemo(() => {
        return timeFormat === '24-hour' ? '' : getAmPmText(date, widget.props.amPmFormat);
    }, [date, timeFormat, widget.props.amPmFormat]);

    const dateText = useMemo(() => {
        return getDateText(date, widget.props.dateFormat, widget.props.digitFormat, widget.props.showYear);
    }, [date, widget.props.dateFormat, widget.props.digitFormat, widget.props.showYear]);

    const weekdayText = useMemo(() => {
        return getWeekdayText(date, widget.props.weekdayFormat);
    }, [date, widget.props.weekdayFormat]);

    const textShadow = widget.props.textShadowRadius > 0
        ? `0 0 ${widget.props.textShadowRadius}px ${widget.props.textShadowColor}`
        : 'none';

    const textStyle: CSSProperties = {
        font: widget.props.timeFont,
        lineHeight: 1.1,
        letterSpacing: '0.04em',
        color: widget.props.color,
        textShadow,
    };

    const dateStyle: CSSProperties = {
        font: widget.props.dateFont,
        lineHeight: 1.1,
        letterSpacing: '0.04em',
        color: widget.props.color,
        textShadow,
    };

    const finalDateDisplay = buildDateDisplay(dateText, weekdayText, widget.props.weekdayPlacement);

    const amPmDisplay = amPmText && timeFormat === '12-hour-am-pm'
        ? widget.props.amPmFormat.startsWith('left')
            ? `${amPmText} ${timeText}`
            : `${timeText} ${amPmText}`
        : timeText;

    const gapValue = Math.min(widget.props.dateGap, 1.1);

    const dateNode = !finalDateDisplay
        ? null
        : <div style={dateStyle}>{finalDateDisplay}</div>;

    // To avoid SSR/CSR hydration mismatch, render a stable placeholder on the server
    // and only render the real time content after client mount.
    const timeElement = mounted
        ? <div key='time' style={textStyle}>{amPmDisplay}</div>
        : <div key='time' style={textStyle}>&nbsp;</div>;

    const content = displayOrder === 'date-first'
        ? [dateNode, timeElement]
        : [timeElement, dateNode];

    return (
        <div
            className='flex h-full w-full items-center justify-center gap-2'
            style={{
                userSelect: 'none',
                flexDirection: widget.props.layout === 'single-line' ? 'row' : 'column',
                gap: `${gapValue}em`,
            }}
        >
            {content}
        </div>
    );
}