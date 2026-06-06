import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Button, ColorPicker, Form, Popover, Select, Slider } from 'antd';
import type { EditorProps } from '../registry';

export type BorderPickerMode = 'border' | 'outline';

export type BorderPickerValue = {
    width: number;
    style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
    color: string;
    radius: number;
    offset: number;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_BORDER: BorderPickerValue = {
    width: 0,
    style: 'none',
    color: '#000000',
    radius: 0,
    offset: 0,
};

function makeBorderStyleLabel(style: BorderPickerValue['style']) {
    const common = { display: 'block', width: 76 };
    switch (style) {
        case 'double':
            return <span aria-hidden='true' title='double' style={{ ...common, borderTop: '3px double #334155' }} />;
        default:
            return <span aria-hidden='true' title={style} style={{ ...common, borderTop: `2px ${style} #334155` }} />;
    }
}

const BORDER_STYLE_OPTIONS = ['solid', 'dashed', 'dotted', 'double', 'none'].map((style) => ({
    label: makeBorderStyleLabel(style as BorderPickerValue['style']),
    value: style,
}));

function BorderPicker({ mode = 'outline', value, onChange }: { mode?: BorderPickerMode; value: BorderPickerValue; onChange: (next: BorderPickerValue) => void }) {
    const parsed = useMemo(() => value, [value]);
    const [draft, setDraft] = useState(() => parsed);

    useEffect(() => {
        setDraft(parsed);
    }, [parsed]);

    const update = useCallback((updater: (cur: typeof draft) => typeof draft) => {
        setDraft((cur) => {
            return updater(cur);
        });
    }, []);

    const commit = useCallback((next: BorderPickerValue) => {
        onChange(next);
    }, [mode, onChange]);

    const toSliderNumber = (value: number | [number, number]) => {
        return Array.isArray(value) ? value[0] : value;
    };

    const content = (
        <div style={{ width: 360, maxWidth: 'calc(100vw - 32px)' }}>
            <Form layout='inline' colon={false} style={{ width: '100%', gap: 6, alignItems: 'center' }}>

                <Form.Item label='粗细' style={{ marginBottom: 0, minWidth: 140 }}>
                    <Slider
                        style={{ width: 110 }}
                        min={0}
                        max={30}
                        step={1}
                        value={draft.width}
                        onChange={(next) => update((cur) => ({ ...cur, width: toSliderNumber(next) }))}
                        onChangeComplete={(next) => commit({ ...draft, width: toSliderNumber(next) })}
                    />
                </Form.Item>

                <Form.Item label='样式' style={{ marginBottom: 0, minWidth: 140 }}>
                    <Select
                        value={draft.style}
                        options={BORDER_STYLE_OPTIONS}
                        onChange={(next) => {
                            const style = next as BorderPickerValue['style'];
                            const nextValue = { ...draft, style };
                            update(() => nextValue);
                            commit(nextValue);
                        }}
                        style={{ width: 110, top: '50%' }}
                        classNames={{
                            popup: {
                                listItem: "[&>:first-child]:self-center"
                            }
                        }}
                        optionLabelProp='label'
                        popupMatchSelectWidth
                    />
                </Form.Item>

                <Form.Item label='圆角' style={{ marginBottom: 0, minWidth: 140 }}>
                    <Slider
                        style={{ width: 110 }}
                        min={0}
                        max={200}
                        step={1}
                        value={draft.radius}
                        onChange={(next) => update((cur) => ({ ...cur, radius: toSliderNumber(next) }))}
                        onChangeComplete={(next) => commit({ ...draft, radius: toSliderNumber(next) })}
                    />
                </Form.Item>

                <Form.Item label='颜色' style={{ marginBottom: 0, minWidth: 140 }}>
                    <ColorPicker
                        value={draft.color}
                        onChange={(col) => update((cur) => ({ ...cur, color: col.toCssString() }))}
                        onChangeComplete={(col) => commit({ ...draft, color: col.toCssString() })}
                        showText
                    />
                </Form.Item>


                <Form.Item label='偏移' style={{ marginBottom: 0, minWidth: 140 }}>
                    <Slider
                        style={{ width: 110 }}
                        min={-50}
                        max={50}
                        step={1}
                        value={draft.offset}
                        onChange={(next) => update((cur) => ({ ...cur, offset: toSliderNumber(next) }))}
                        onChangeComplete={(next) => commit({ ...draft, offset: toSliderNumber(next) })}
                    />
                </Form.Item>
            </Form>
        </div>
    );

    const previewStyle = useMemo(() => {
        if (draft.width <= 0 || draft.style === 'none') {
            return {
                width: 64,
                height: 0,
                display: 'block',
            };
        }

        return {
            [mode]: `${draft.width}px ${draft.style} ${draft.color}`,
            top: '50%',
            width: 64,
            height: 0,
            display: 'block',
        } as CSSProperties;
    }, [draft.width, draft.style, draft.color, mode]);

    return (
        <Popover
            trigger='click'
            placement='bottomLeft'
            content={content}
            destroyOnHidden
        >
            <Button style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                    <div style={previewStyle} />
                    <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }}>
                        {draft.width <= 0 ? '无边框' : `粗细: ${draft.width}px | 圆角: ${draft.radius}px${draft.offset !== 0 ? ` | 偏移: ${draft.offset}px` : ''}`}
                    </div>
                </div>
            </Button>
        </Popover>
    );
}

function composeBorderValue(values: Record<string, any>): BorderPickerValue {
    const outline = (values['style.outline'] as string) ?? '';
    const match = outline.trim().match(/^(\d+(?:\.\d+)?)px\s+(solid|dashed|dotted|double|none)\s+(.*)$/i);
    return {
        width: match ? Number(match[1]) : 0,
        style: (match?.[2]?.toLowerCase() as BorderPickerValue['style']) ?? 'none',
        color: match?.[3] ?? '#000000',
        radius: Number.parseFloat((values['style.borderRadius'] as string) ?? '0') || 0,
        offset: Number.parseFloat((values['style.outlineOffset'] as string) ?? '0') || 0,
    };
}

export default function BorderEditor({ item, value, onChange }: EditorProps) {
    const bind = item.bind as string[];
    const current = composeBorderValue(value);
    const mode = (item.meta?.['mode'] as 'border' | 'outline') ?? 'outline';

    return (
        <BorderPicker
            mode={mode}
            value={current}
            onChange={(next) => {
                const set: Record<string, any> = {};
                for (const path of bind) {
                    if (path === 'style.outline') {
                        set[path] = `${next.width}px ${next.style} ${next.color}`;
                    } else if (path === 'style.borderRadius') {
                        set[path] = `${next.radius}px`;
                    } else if (path === 'style.outlineOffset') {
                        set[path] = `${next.offset}px`;
                    }
                }
                onChange({ set });
            }}
        />
    );
}
