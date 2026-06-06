import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Alert, Button, Form, Input, InputNumber, Popover, Radio, Select, Slider, Spin, Tabs } from 'antd';

import { useLocalFonts } from '../../../hooks';
import type { EditorProps } from '../registry';

export type FontPickerValue = {
    style: 'normal' | 'italic' | 'oblique';
    weight: number;
    size: number;
    lineHeight: number;
    family: string;
};

type FontSource = 'local' | 'url' | 'web';

type WebFontEntry = {
    name: string;
    family: string;
    url: string;
    weight?: number;
    style?: string;
};

type UrlFontStatus = 'idle' | 'loading' | 'loaded' | 'error';

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
        `${formatNumber(value.size)}px`,
        value.family.trim() || DEFAULT_FONT_VALUE.family,
    ].join(' ');
}

function useUrlFont() {
    const [status, setStatus] = useState<UrlFontStatus>('idle');
    const [error, setError] = useState('');

    const loadUrlFont = useCallback(async (url: string, familyName: string) => {
        if (!url || !familyName) return;

        setStatus('loading');
        setError('');

        try {
            const fontFace = new FontFace(familyName, `url(${url})`);
            await fontFace.load();
            document.fonts.add(fontFace);

            setStatus('loaded');
        } catch (err) {
            setStatus('error');
            setError(err instanceof Error ? err.message : '字体加载失败');
        }
    }, []);

    return { status, error, loadUrlFont };
}

function useWebFonts() {
    const [fonts, setFonts] = useState<WebFontEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

        const fetchManifest = async () => {
            try {
                const res = await fetch('/fonts/manifest.json');
                if (!res.ok) throw new Error('Failed to load font manifest');
                const data = await res.json();
                if (!cancelled) {
                    setFonts(data.fonts ?? []);
                    setLoading(false);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to load fonts');
                    setLoading(false);
                }
            }
        };

        void fetchManifest();
        return () => { cancelled = true; };
    }, []);

    const loadWebFont = useCallback(async (entry: WebFontEntry) => {
        try {
            const fontFace = new FontFace(entry.family, `url(${entry.url})`, {
                weight: String(entry.weight ?? 400),
                style: entry.style ?? 'normal',
            });
            await fontFace.load();
            document.fonts.add(fontFace);
        } catch {
            // Font already loaded or failed silently
        }
    }, []);

    return { fonts, loading, error, loadWebFont };
}

function LocalFontSelect({ value, onChange }: { value: string; onChange: (family: string) => void }) {
    const availableFonts = useLocalFonts();

    return (
        <Select
            className='w-full'
            options={availableFonts}
            value={value}
            showSearch={{ optionFilterProp: 'label' }}
            onChange={onChange}
        />
    );
}

function UrlFontInput({ value, onChange }: { value: string; onChange: (family: string) => void }) {
    const [url, setUrl] = useState('');
    const { status, error, loadUrlFont } = useUrlFont();

    const handleLoad = () => {
        if (!url) return;
        const familyName = url.split('/').pop()?.split('.')[0] ?? 'UrlFont';
        loadUrlFont(url, familyName);
        onChange(familyName);
    };

    return (
        <div className='flex flex-col gap-2'>
            <Input
                placeholder='输入字体 URL（.ttf, .woff, .woff2）'
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPressEnter={handleLoad}
            />
            <Button
                type='primary'
                onClick={handleLoad}
                loading={status === 'loading'}
                disabled={!url}
            >
                加载字体
            </Button>
            {status === 'loaded' && (
                <div className='text-xs text-green-500'>字体已加载: {value}</div>
            )}
            {status === 'error' && (
                <Alert message={error} type='error' showIcon className='text-xs' />
            )}
        </div>
    );
}

function WebFontSelect({ value, onChange }: { value: string; onChange: (family: string) => void }) {
    const { fonts, loading, error, loadWebFont } = useWebFonts();

    const options = fonts.map((f) => ({
        label: f.name,
        value: f.family,
    }));

    const handleChange = async (family: string) => {
        const entry = fonts.find((f) => f.family === family);
        if (entry) {
            await loadWebFont(entry);
        }
        onChange(family);
    };

    if (loading) {
        return <Spin size='small' />;
    }

    if (error) {
        return <Alert message={error} type='warning' showIcon className='text-xs' />;
    }

    return (
        <Select
            className='w-full'
            options={options}
            value={value}
            showSearch={{ optionFilterProp: 'label' }}
            onChange={handleChange}
            placeholder='选择网站字体'
        />
    );
}

function FontPicker({ value, onChange }: { value?: string; onChange: (next: string) => void }) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<FontPickerValue>(() => parseFontString(value));
    const [fontSource, setFontSource] = useState<FontSource>('local');
    const pendingChangeRef = useRef<string | null>(null);

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

    const handleFontFamilyChange = useCallback((nextFamily: string) => {
        commitDraft((current) => ({ ...current, family: nextFamily }));
    }, [commitDraft]);

    const fontSourceTabs = [
        {
            key: 'local',
            label: '本地字体',
            children: <LocalFontSelect value={draft.family} onChange={handleFontFamilyChange} />,
        },
        {
            key: 'url',
            label: 'URL 字体',
            children: <UrlFontInput value={draft.family} onChange={handleFontFamilyChange} />,
        },
        {
            key: 'web',
            label: '网站字体',
            children: <WebFontSelect value={draft.family} onChange={handleFontFamilyChange} />,
        },
    ];

    const content = (
        <div className='w-80 max-w-[calc(100vw-32px)]'>
            <Tabs
                size='small'
                activeKey={fontSource}
                onChange={(key) => setFontSource(key as FontSource)}
                items={fontSourceTabs}
                className='mb-4'
            />
            <Form layout='inline' colon={false} className='flex-col w-full gap-3'>
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

export default function FontEditor({ item, value, onChange }: EditorProps) {
    const bind = item.bind as string;
    const current = value;

    return (
        <FontPicker
            value={typeof current === 'string' ? current : undefined}
            onChange={(next) => onChange({ set: { [bind]: next } })}
        />
    );
}
