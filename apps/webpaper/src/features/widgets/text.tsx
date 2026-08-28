import { defineWidgetPlugin } from '@webtools/widget-core';
import { defineWidgetView } from '@webtools/widget-react';
import type { WidgetInspectorDefinition } from '@webtools/widget-studio';
import { z } from 'zod';

export const textWidgetPropsSchema = z.object({
    text: z.string(),
    color: z.string().min(1),
    fontFamily: z.string().min(1),
    fontSize: z.number().finite().positive().max(512),
    fontWeight: z.number().int().min(100).max(900),
    lineHeight: z.number().finite().positive().max(10),
    align: z.enum(['left', 'center', 'right']),
    verticalAlign: z.enum(['start', 'center', 'end']),
    shadowColor: z.string().min(1),
    shadowBlur: z.number().finite().nonnegative().max(100),
}).strict();

export type TextWidgetProps = z.infer<typeof textWidgetPropsSchema>;

export const textWidgetDefinition = defineWidgetPlugin({
    kind: 'text',
    label: '文本',
    propsSchema: textWidgetPropsSchema,
    defaultProps: {
        text: '欢迎使用 WebPaper',
        color: '#ffffff',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: 36,
        fontWeight: 500,
        lineHeight: 1.25,
        align: 'center',
        verticalAlign: 'center',
        shadowColor: 'rgba(0, 0, 0, 0.45)',
        shadowBlur: 8,
    },
});

export const textWidgetView = defineWidgetView<TextWidgetProps>({
    kind: 'text',
    View: ({ widget }) => (
        <div
            style={{
                alignItems: 'stretch',
                boxSizing: 'border-box',
                color: widget.props.color,
                display: 'flex',
                flexDirection: 'column',
                fontFamily: widget.props.fontFamily,
                fontSize: widget.props.fontSize,
                fontWeight: widget.props.fontWeight,
                height: '100%',
                justifyContent: widget.props.verticalAlign,
                lineHeight: widget.props.lineHeight,
                overflow: 'hidden',
                textAlign: widget.props.align,
                textShadow: `0 0 ${widget.props.shadowBlur}px ${widget.props.shadowColor}`,
                whiteSpace: 'pre-wrap',
                width: '100%',
                wordBreak: 'break-word',
            }}
        >
            <span style={{ width: '100%' }}>{widget.props.text}</span>
        </div>
    ),
});

export const textWidgetInspector: WidgetInspectorDefinition = {
    kind: 'text',
    schema: {
        pages: [{ key: 'content', label: '内容' }, { key: 'appearance', label: '外观' }],
        fields: [
            { key: 'text', label: '文本', path: 'props.text', control: 'string', page: 'content', order: 100 },
            { key: 'color', label: '文字颜色', path: 'props.color', control: 'color', page: 'appearance', order: 100 },
            { key: 'fontFamily', label: '字体', path: 'props.fontFamily', control: 'string', page: 'appearance', order: 200 },
            { key: 'fontSize', label: '字号', path: 'props.fontSize', control: 'number', page: 'appearance', min: 1, max: 512, order: 300 },
            { key: 'fontWeight', label: '字重', path: 'props.fontWeight', control: 'number', page: 'appearance', min: 100, max: 900, step: 100, order: 400 },
            { key: 'lineHeight', label: '行高', path: 'props.lineHeight', control: 'slider', page: 'appearance', min: 0.5, max: 3, step: 0.05, order: 500 },
            {
                key: 'align', label: '水平对齐', path: 'props.align', control: 'enum', page: 'appearance', order: 600,
                options: [{ label: '左', value: 'left' }, { label: '中', value: 'center' }, { label: '右', value: 'right' }],
            },
            {
                key: 'verticalAlign', label: '垂直对齐', path: 'props.verticalAlign', control: 'enum', page: 'appearance', order: 700,
                options: [{ label: '上', value: 'start' }, { label: '中', value: 'center' }, { label: '下', value: 'end' }],
            },
            { key: 'shadowColor', label: '阴影颜色', path: 'props.shadowColor', control: 'color', page: 'appearance', group: '阴影', order: 800 },
            { key: 'shadowBlur', label: '阴影模糊', path: 'props.shadowBlur', control: 'slider', page: 'appearance', group: '阴影', min: 0, max: 100, step: 1, order: 900 },
        ],
    },
};
