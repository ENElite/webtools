import { useMemo, useEffect, useState, useRef } from 'react';
import type { CSSProperties } from 'react';
import { motion, LayoutGroup } from 'framer-motion';

import { useTimestamp } from '../../hooks';

import type { WidgetRendererProps } from '../../engine/model';
import type { AmPmFormat, ClockWidgetProps, DigitFormat, TimeFormat, WeekdayFormat } from './schema';
import { AnimatedText } from './AnimatedText';

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

/**
 * Split a CSS font shorthand into individual properties.
 * Avoids the React warning about mixing shorthand (font) with longhand (lineHeight).
 *
 * Input:  "normal 600 36px/1.1 Arial, sans-serif"
 * Output: { fontStyle: "normal", fontWeight: 600, fontSize: "36px", fontFamily: "Arial, sans-serif" }
 */
function splitFont(font: string): Pick<CSSProperties, 'fontStyle' | 'fontWeight' | 'fontSize' | 'fontFamily' | 'lineHeight'> {
    const tokens = font.split(/\s+/).filter(Boolean);
    const result: Pick<CSSProperties, 'fontStyle' | 'fontWeight' | 'fontSize' | 'fontFamily' | 'lineHeight'> = {};

    let i = 0;

    // font-style (optional): normal | italic | oblique
    if (tokens[i] === 'normal' || tokens[i] === 'italic' || tokens[i]?.startsWith('oblique')) {
        result.fontStyle = tokens[i] as CSSProperties['fontStyle'];
        i++;
    }

    // font-weight (optional): normal | bold | 100-900
    if (tokens[i] === 'normal' || tokens[i] === 'bold'
        || /^\d{3}$/.test(tokens[i] ?? '')) {
        const w = tokens[i];
        result.fontWeight = (w === 'normal' || w === 'bold' ? w : Number(w)) as CSSProperties['fontWeight'];
        i++;
    }

    // font-size (required): may include /line-height
    const sizeToken = tokens[i];
    if (sizeToken) {
        const slashIdx = sizeToken.indexOf('/');
        if (slashIdx >= 0) {
            result.fontSize = sizeToken.slice(0, slashIdx);
            const lh = sizeToken.slice(slashIdx + 1);
            if (lh) result.lineHeight = lh.includes('.') ? parseFloat(lh) : `${lh}`;
        } else {
            result.fontSize = sizeToken;
        }
        i++;
    }

    // font-family (remaining tokens)
    const family = tokens.slice(i).join(' ');
    if (family) {
        result.fontFamily = family;
    }

    return result;
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

    const textShadow = widget.props.textShadowRadius > 0
        ? `0 0 ${widget.props.textShadowRadius}px ${widget.props.textShadowColor}`
        : 'none';

    const textStroke = widget.props.strokeWidth > 0
        ? `${widget.props.strokeWidth}px ${widget.props.strokeColor}` as CSSProperties['WebkitTextStroke']
        : undefined;

    const timeFontProps = splitFont(widget.props.timeFont);
    const dateFontProps = splitFont(widget.props.dateFont);

    const textStyle: CSSProperties = {
        ...timeFontProps,
        letterSpacing: '0.04em',
        color: widget.props.color,
        textShadow,
        WebkitTextStroke: textStroke,
        paintOrder: textStroke ? 'stroke fill' : undefined,
    };

    const dateStyle: CSSProperties = {
        ...dateFontProps,
        letterSpacing: '0.04em',
        color: widget.props.color,
        textShadow,
        WebkitTextStroke: textStroke,
        paintOrder: textStroke ? 'stroke fill' : undefined,
    };

    const gapValue = Math.min(widget.props.dateGap, 1.1);
    const hasTimeAnimation = widget.props.timeAnimation;
    const timeAnimationDuration = widget.props.timeAnimationDuration;

    // ── Format fingerprint — changes when layout-related props change ──
    // Used as key on motion containers so framer-motion can animate
    // block reordering when the user changes format settings.
    const formatFingerprint = [
        widget.props.dateFormat,
        widget.props.weekdayFormat,
        widget.props.weekdayPlacement,
        widget.props.showYear,
        widget.props.digitFormat,
        widget.props.amPmFormat,
    ].join('|');

    const prevFingerprintRef = useRef(formatFingerprint);
    const isFormatChange = prevFingerprintRef.current !== formatFingerprint;
    if (isFormatChange) {
        prevFingerprintRef.current = formatFingerprint;
    }

    // ── Compute time / date text ──────────────────────────────────
    const timeText = useMemo(() => {
        return getTimeText(date, timeFormat, widget.props.showSeconds);
    }, [date, timeFormat, widget.props.showSeconds]);

    const amPmText = useMemo(() => {
        return timeFormat === '24-hour' ? '' : getAmPmText(date, widget.props.amPmFormat);
    }, [date, timeFormat, widget.props.amPmFormat]);

    const weekdayText = useMemo(() => {
        return getWeekdayText(date, widget.props.weekdayFormat);
    }, [date, widget.props.weekdayFormat]);

    // ── Date blocks — split into semantic parts for layout animation ──
    // When weekdayPlacement / showYear change, blocks reorder via layout.
    // When only time ticks, blocks stay in place and AnimatedChar animates.
    const dateBlocks = useMemo(() => {
        const year = String(date.getFullYear());
        const month = padDatePart(date.getMonth() + 1, widget.props.digitFormat);
        const day = padDatePart(date.getDate(), widget.props.digitFormat);

        // Build core date without year, based on format
        let coreDate = '';
        switch (widget.props.dateFormat) {
            case 'chinese':
                coreDate = `${month}月${day}日`;
                break;
            case 'numeric1':
                coreDate = `${month}-${day}`;
                break;
            case 'english':
                coreDate = `${ENGLISH_MONTHS[date.getMonth()]} ${day}`;
                break;
            case 'english-short':
                coreDate = `${ENGLISH_MONTHS_SHORT[date.getMonth()]} ${day}`;
                break;
        }

        // Build year string with its separator
        let yearText = '';
        switch (widget.props.dateFormat) {
            case 'chinese':
                yearText = `${year}年`;
                break;
            case 'numeric1':
                yearText = `${year}-`;
                break;
            case 'english':
            case 'english-short':
                yearText = `${year} `;
                break;
        }

        const blocks: Array<{ key: string; text: string }> = [];

        if (widget.props.showYear === 'left') {
            blocks.push({ key: 'year', text: yearText });
        }

        blocks.push({ key: 'date', text: coreDate });

        if (widget.props.showYear === 'right') {
            // Right year: separator goes before year
            const rightYearText = widget.props.dateFormat === 'chinese'
                ? `${year}年`
                : widget.props.dateFormat === 'numeric1'
                    ? `-${year}`
                    : `, ${year}`;
            blocks.push({ key: 'year', text: rightYearText });
        }

        if (widget.props.weekdayPlacement === 'left') {
            blocks.unshift({ key: 'weekday', text: weekdayText });
        } else if (widget.props.weekdayPlacement === 'right') {
            blocks.push({ key: 'weekday', text: weekdayText });
        }

        return blocks;
    }, [date, widget.props.dateFormat, widget.props.digitFormat, widget.props.weekdayPlacement, widget.props.showYear, weekdayText]);

    // ── AM/PM blocks ──────────────────────────────────────────────
    const amPmBlocks = useMemo(() => {
        if (!amPmText || timeFormat !== '12-hour-am-pm') {
            return [{ key: 'time', text: timeText }];
        }

        if (widget.props.amPmFormat.startsWith('left')) {
            return [
                { key: 'ampm', text: amPmText },
                { key: 'time', text: timeText },
            ];
        }
        return [
            { key: 'time', text: timeText },
            { key: 'ampm', text: amPmText },
        ];
    }, [amPmText, timeText, timeFormat, widget.props.amPmFormat]);

    const layoutTransition = { duration: timeAnimationDuration, ease: 'easeOut' as const };

    const dateElement = !dateBlocks.some(b => b.text)
        ? null
        : mounted
            ? (
                <LayoutGroup>
                    <motion.div
                        layout
                        transition={layoutTransition}
                        style={{ ...dateStyle, display: 'flex', alignItems: 'center' }}
                    >
                        {dateBlocks.map((block) => (
                            <motion.div key={block.key} layout transition={layoutTransition}>
                                <AnimatedText
                                    text={block.text}
                                    animated={hasTimeAnimation}
                                    duration={isFormatChange ? 0 : timeAnimationDuration}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                </LayoutGroup>
            )
            : <div style={dateStyle}>&nbsp;</div>;

    const timeElement = mounted
        ? (
            <LayoutGroup>
                <motion.div
                    layout
                    transition={layoutTransition}
                    style={{ ...textStyle, display: 'flex', alignItems: 'center' }}
                >
                    {amPmBlocks.map((block) => (
                        <motion.div key={block.key} layout transition={layoutTransition}>
                            <AnimatedText
                                text={block.text}
                                animated={hasTimeAnimation}
                                duration={isFormatChange ? 0 : timeAnimationDuration}
                            />
                        </motion.div>
                    ))}
                </motion.div>
            </LayoutGroup>
        )
        : <div style={textStyle}>&nbsp;</div>;

    // Use CSS order to control visual position instead of array reordering.
    // This keeps both elements mounted with stable keys, preventing
    // AnimatedText from losing prevTextRef and triggering unwanted animation.
    const dateOrder = displayOrder === 'date-first' ? 0 : 1;
    const timeOrder = displayOrder === 'date-first' ? 1 : 0;

    return (
        <div
            className='flex h-full w-full items-center justify-center gap-2'
            style={{
                userSelect: 'none',
                flexDirection: widget.props.layout === 'single-line' ? 'row' : 'column',
                gap: `${gapValue}em`,
            }}
        >
            <div key="date" style={{ order: dateOrder }}>
                {dateElement}
            </div>
            <div key="time" style={{ order: timeOrder }}>
                {timeElement}
            </div>
        </div>
    );
}