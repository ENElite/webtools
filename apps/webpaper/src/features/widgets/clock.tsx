'use client';

import { defineWidgetPlugin } from '@webtools/widget-core';
import { defineWidgetView } from '@webtools/widget-react';
import type { WidgetViewProps } from '@webtools/widget-react';
import type { WidgetInspectorDefinition } from '@webtools/widget-studio';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { AnimatedClockText } from './clock-animation';

export const clockWidgetPropsSchema = z.object({
    locale: z.string().min(1),
    timeZone: z.string(),
    hour12: z.boolean(),
    showSeconds: z.boolean(),
    showDate: z.boolean(),
    color: z.string().min(1),
    fontFamily: z.string().min(1),
    timeSize: z.number().finite().positive().max(512),
    dateSize: z.number().finite().positive().max(512),
    align: z.enum(['left', 'center', 'right']),
}).strict();

export type ClockWidgetProps = z.infer<typeof clockWidgetPropsSchema>;

export interface FormattedClock {
    readonly time: string;
    readonly date: string | null;
}

export function formatClock(now: Date, props: ClockWidgetProps): FormattedClock {
    const locale = props.locale || 'zh-CN';
    const timeZone = props.timeZone || undefined;

    try {
        return {
            time: new Intl.DateTimeFormat(locale, {
                hour: '2-digit',
                minute: '2-digit',
                second: props.showSeconds ? '2-digit' : undefined,
                hour12: props.hour12,
                timeZone,
            }).format(now),
            date: props.showDate
                ? new Intl.DateTimeFormat(locale, {
                    dateStyle: 'medium',
                    timeZone,
                }).format(now)
                : null,
        };
    } catch {
        return {
            time: new Intl.DateTimeFormat('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: props.showSeconds ? '2-digit' : undefined,
                hour12: props.hour12,
            }).format(now),
            date: props.showDate
                ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(now)
                : null,
        };
    }
}

export const clockWidgetDefinition = defineWidgetPlugin({
    kind: 'clock',
    label: '时钟',
    propsSchema: clockWidgetPropsSchema,
    defaultProps: {
        locale: 'zh-CN',
        timeZone: '',
        hour12: false,
        showSeconds: true,
        showDate: true,
        color: '#ffffff',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        timeSize: 48,
        dateSize: 18,
        align: 'center',
    },
});

export const clockWidgetView = defineWidgetView<ClockWidgetProps>({
    kind: 'clock',
    View: ClockWidgetView,
});

export function ClockWidgetView({ widget, signals }: WidgetViewProps<ClockWidgetProps>) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => signals.connect(
        'component.time.tick',
        ({ now: timestamp }) => setNow(new Date(timestamp)),
    ), [signals]);
    const formatted = formatClock(now, widget.props);

    return (
        <time
            suppressHydrationWarning
            style={{
                alignItems: widget.props.align === 'left'
                    ? 'flex-start'
                    : widget.props.align === 'right' ? 'flex-end' : 'center',
                color: widget.props.color,
                display: 'flex',
                flexDirection: 'column',
                fontFamily: widget.props.fontFamily,
                height: '100%',
                justifyContent: 'center',
                lineHeight: 1.15,
                textAlign: widget.props.align,
                width: '100%',
            }}
        >
            <span style={{ fontSize: widget.props.timeSize }}>
                <AnimatedClockText text={formatted.time} />
            </span>
            {formatted.date ? <span style={{ fontSize: widget.props.dateSize }}>{formatted.date}</span> : null}
        </time>
    );
}

export const clockWidgetInspector: WidgetInspectorDefinition = {
    kind: 'clock',
    schema: {
        pages: [{ key: 'clock', label: '时间' }, { key: 'appearance', label: '外观' }],
        fields: [
            { key: 'locale', label: '语言', path: 'props.locale', control: 'string', page: 'clock', order: 100, description: '例如 zh-CN 或 en-US' },
            { key: 'timeZone', label: '时区', path: 'props.timeZone', control: 'string', page: 'clock', order: 200, description: '留空使用设备时区，或填写 Asia/Shanghai' },
            { key: 'hour12', label: '12 小时制', path: 'props.hour12', control: 'boolean', page: 'clock', order: 300 },
            { key: 'showSeconds', label: '显示秒', path: 'props.showSeconds', control: 'boolean', page: 'clock', order: 400 },
            { key: 'showDate', label: '显示日期', path: 'props.showDate', control: 'boolean', page: 'clock', order: 500 },
            { key: 'color', label: '颜色', path: 'props.color', control: 'color', page: 'appearance', order: 100 },
            { key: 'fontFamily', label: '字体', path: 'props.fontFamily', control: 'string', page: 'appearance', order: 200 },
            { key: 'timeSize', label: '时间字号', path: 'props.timeSize', control: 'number', page: 'appearance', min: 1, max: 512, order: 300 },
            { key: 'dateSize', label: '日期字号', path: 'props.dateSize', control: 'number', page: 'appearance', min: 1, max: 512, order: 400 },
            {
                key: 'align', label: '对齐', path: 'props.align', control: 'enum', page: 'appearance', order: 500,
                options: [{ label: '左', value: 'left' }, { label: '中', value: 'center' }, { label: '右', value: 'right' }],
            },
        ],
    },
};
