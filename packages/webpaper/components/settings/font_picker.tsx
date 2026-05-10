import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button, Form, InputNumber, Popover, Radio, Select, Slider } from 'antd';


import { useLocalFonts, FontFamilyOption } from '@/hooks/useLocalFonts';

export type FontPickerValue = {
    style: 'normal' | 'italic' | 'oblique';
    weight: number;
    size: number;
    lineHeight: number;
    family: string;
};



export type FontPickerProps = {
    value?: string;
    onChange: (next: string) => void;
    fonts?: FontFamilyOption[];
};


const FONT_STYLE_OPTIONS: Array<{ label: string; value: string }> = [
    { label: '常规', value: 'normal' },
    { label: '斜体', value: 'italic' },
];


const DEFAULT_FONT_VALUE: FontPickerValue = {
    style: 'normal',
    weight: 400,
    size: 16,
    lineHeight: 1.25,
    family: 'system-ui, sans-serif',
};

const FONT_TOKEN_REGEX = /"[^"]*"|'[^']*'|[^\s]+/g;
const FONT_SIZE_REGEX = /^(\d*\.?\d+)(px|rem|em|%)?(?:\/(\d*\.?\d+|normal))?$/i;
const FONT_WEIGHT_NUMBERS = new Set(['100', '200', '300', '400', '500', '600', '700', '800', '900']);

function formatNumber(value: number): string {
    if (Number.isInteger(value)) {
        return String(value);
    }

    return Number.parseFloat(value.toFixed(3)).toString();
}

export function parseFontString(font?: string): FontPickerValue {
    if (!font?.trim()) {
        return { ...DEFAULT_FONT_VALUE };
    }

    const tokens = Array.from(font.matchAll(FONT_TOKEN_REGEX), (match) => ({ token: match[0], index: match.index ?? 0 }));
    const sizeTokenIndex = tokens.findIndex((entry) => {
        if (!FONT_SIZE_REGEX.test(entry.token)) return false;
        const tokenLower = entry.token.toLowerCase();
        return /px|rem|em|%/.test(tokenLower) || tokenLower.includes('/');
    });

    if (sizeTokenIndex < 0) {
        return { ...DEFAULT_FONT_VALUE };
    }

    const nextValue: FontPickerValue = { ...DEFAULT_FONT_VALUE };
    const consumed = {
        style: false,
        weight: false,
    };

    const assignOptionalToken = (token: string) => {
        const normalized = token.toLowerCase();

        if (!consumed.style && (normalized === 'normal' || normalized === 'italic' || normalized === 'oblique')) {
            nextValue.style = normalized as FontPickerValue['style'];
            consumed.style = true;
            return true;
        }

        if (!consumed.weight && (normalized === 'normal' || normalized === 'bold' || normalized === 'bolder' || normalized === 'lighter' || FONT_WEIGHT_NUMBERS.has(normalized))) {
            nextValue.weight = normalized === 'bold'
                ? 700
                : normalized === 'bolder'
                    ? 700
                    : normalized === 'lighter'
                        ? 400
                        : normalized === 'normal'
                            ? 400
                            : Number(normalized);
            consumed.weight = true;
            return true;
        }

        return false;
    };

    for (let index = 0; index < sizeTokenIndex; index += 1) {
        const tokenEntry = tokens[index];
        if (!tokenEntry) {
            continue;
        }
        assignOptionalToken(tokenEntry.token);
    }

    const sizeTokenEntry = tokens[sizeTokenIndex];
    if (!sizeTokenEntry) {
        return { ...DEFAULT_FONT_VALUE };
    }

    const sizeToken = sizeTokenEntry.token;
    const sizeMatch = sizeToken.match(FONT_SIZE_REGEX);
    if (!sizeMatch) {
        return { ...DEFAULT_FONT_VALUE };
    }

    const sizeValue = sizeMatch[1];
    if (!sizeValue) {
        return { ...DEFAULT_FONT_VALUE };
    }

    nextValue.size = Number.parseFloat(sizeValue);
    nextValue.lineHeight = sizeMatch[3] && sizeMatch[3] !== 'normal' ? Number.parseFloat(sizeMatch[3]) : DEFAULT_FONT_VALUE.lineHeight;

    const sizeTokenEnd = sizeTokenEntry.index + sizeToken.length;
    const family = font.slice(sizeTokenEnd).trim();
    if (family) {
        nextValue.family = family;
    }

    return nextValue;
}

export function buildFontString(value: FontPickerValue): string {
    return [
        value.style,
        String(value.weight),
        `${formatNumber(value.size)}px/${formatNumber(value.lineHeight)}`,
        value.family.trim() || DEFAULT_FONT_VALUE.family,
    ].join(' ');
}

export function FontPicker({ value, onChange }: FontPickerProps) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<FontPickerValue>(() => parseFontString(value));
    const pendingChangeRef = useRef<string | null>(null);
    const availableFonts = useLocalFonts();

    const commitDraft = useCallback((updater: (current: FontPickerValue) => FontPickerValue) => {
        setDraft((current) => {
            const next = updater(current);
            pendingChangeRef.current = buildFontString(next);
            return next;
        });
    }, []);

    useEffect(() => {
        if (pendingChangeRef.current !== null) {
            const fontString = pendingChangeRef.current;
            pendingChangeRef.current = null;
            onChange(fontString);
        }
    }, [draft, onChange]);

    useEffect(() => {
        if (!open) {
            setDraft(parseFontString(value));
        }
    }, [open, value]);

    const fontString = useMemo(() => buildFontString(draft), [draft]);

    const fontFamilyShort = useMemo(() => {
        const parts = draft.family.split(',');
        const firstFamily = parts[0] ?? '';
        return firstFamily.replace(/["']/g, '').trim().slice(0, 15);
    }, [draft.family]);

    const styleLabel = useMemo(() => {
        if (draft.style === 'normal') return '';
        if (draft.style === 'italic') return '斜体';
        if (draft.style === 'oblique') return '倾斜';
        return '';
    }, [draft.style]);

    const displayInfo = useMemo(() => {
        const parts = [`${draft.size}/${draft.lineHeight}`, fontFamilyShort];
        if (styleLabel) parts.push(styleLabel);
        return parts.join(' • ');
    }, [draft.size, draft.lineHeight, fontFamilyShort, styleLabel]);

    const content = (
        <div className='w-80 max-w-[calc(100vw-32px)]'>
            <Form layout='inline' colon={false} className='flex-col w-full gap-3'>
                <Form.Item label='字体' className='mb-0 flex-1 min-w-55'>
                    <Select
                        className='w-full'
                        options={availableFonts}
                        value={draft.family}
                        showSearch={{ optionFilterProp: 'label' }}
                        onChange={(nextFamily) => commitDraft((current) => ({ ...current, family: nextFamily }))}
                    />
                </Form.Item>
                <div className='flex justify-between'>
                    <Form.Item label='字号' className='mb-0'>
                        <InputNumber
                            className='w-24'
                            min={8}
                            max={240}
                            step={1}
                            value={draft.size}
                            onChange={(nextSize) => commitDraft((current) => ({
                                ...current,
                                size: typeof nextSize === 'number' ? nextSize : current.size,
                            }))}
                        />
                    </Form.Item>

                    <Form.Item label='字重' className='mb-0'>
                        <Slider
                            className='w-28'
                            value={draft.weight}
                            min={100}
                            max={900}
                            step={100}
                            onChange={(nextWeight) => commitDraft((current) => ({ ...current, weight: nextWeight }))}
                        />
                    </Form.Item>
                </div>

                <div className='flex justify-between'>
                    <Form.Item label='行高' className='mb-0'>
                        <InputNumber
                            className='w-24'
                            min={0.5}
                            max={4}
                            step={0.1}
                            value={draft.lineHeight}
                            onChange={(nextLineHeight) => commitDraft((current) => ({
                                ...current,
                                lineHeight: typeof nextLineHeight === 'number' ? nextLineHeight : current.lineHeight,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item label='样式' className='mb-0'>
                        <Radio.Group
                            optionType='button'
                            buttonStyle='solid'
                            value={draft.style}
                            options={FONT_STYLE_OPTIONS}
                            onChange={(event) => commitDraft((current) => ({ ...current, style: event.target.value }))}
                        />
                    </Form.Item>
                </div>
            </Form>
        </div>
    );

    return (
        <Popover
            trigger='click'
            placement='bottomLeft'
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (nextOpen) {
                    setDraft(parseFontString(value));
                }
            }}
            content={content}
            destroyOnHidden
        >
            <Button data-testid='font-picker-trigger' className='w-full justify-start text-left' title={fontString}>
                <div className='flex items-center gap-2 w-full min-w-0'>
                    <div
                        className='shrink-0 text-sm font-medium'
                        style={{
                            fontFamily: draft.family,
                            fontWeight: draft.weight,
                        }}
                    >
                        字A
                    </div>
                    <span className='block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-slate-600'>
                        {displayInfo}
                    </span>
                </div>
            </Button>
        </Popover>
    );
}