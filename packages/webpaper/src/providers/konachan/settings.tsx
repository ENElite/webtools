import {
    Button,
    Form,
    Input,
    InputNumber,
    Select,
    Space,
    Tag,
    Switch,
    Typography,
} from 'antd';

import { useEffect, useMemo, useState } from 'react';

import {
    qualityOptions,
    type QualityKey,
} from './api';

export type KonachanProviderSettings = {
    baseUrl: string;
    page: number;
    quality: QualityKey;
    widthTag: string | null;
    heightTag: string | null;
    rating: string | null;
    tags: string[];
    skipPid: boolean;
};

export const DEFAULT_KONACHAN_SETTINGS: KonachanProviderSettings = {
    baseUrl: '/post.json',
    page: Math.floor(Math.random() * 60) + 1,
    quality: 'jpeg_url',
    widthTag: null,
    heightTag: null,
    rating: 'rating:safe',
    tags: ['loli'],
    skipPid: true,
};

type Notify = (type: 'success' | 'info' | 'warning' | 'error', message: string, description?: string) => void;

const SAFE_TAG_PATTERN = /^[A-Za-z0-9_.:()-]+$/;

const WIDTH_VALUES = ['2560', '1920', '1680', '1600', '1440', '1400', '1280', '1152', '1024'];
const HEIGHT_VALUES = ['1600', '1200', '1080', '1050', '1024', '960', '900', '864', '800', '768'];
const DEFAULT_WIDTH_VALUE = WIDTH_VALUES.at(0) ?? '1920';
const DEFAULT_HEIGHT_VALUE = HEIGHT_VALUES.at(0) ?? '1080';

type SizeOperator = 'gte' | 'eq' | 'lte';

const SIZE_OPERATOR_OPTIONS: Array<{ value: SizeOperator; label: string }> = [
    { value: 'gte', label: '大于等于' },
    { value: 'eq', label: '等于' },
    { value: 'lte', label: '小于等于' },
];

const RATING_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'safe', label: 'Safe' },
    { value: 'questionable', label: 'Questionable' },
    { value: 'explicit', label: 'Explicit' },
];

type BaseRating = 'safe' | 'questionable' | 'explicit';

function toBaseRatings(ratingTag: string | null): BaseRating[] {
    if (!ratingTag) {
        return [];
    }

    if (ratingTag === 'rating:safe') {
        return ['safe'];
    }

    if (ratingTag === 'rating:questionable') {
        return ['questionable'];
    }

    if (ratingTag === 'rating:explicit') {
        return ['explicit'];
    }

    if (ratingTag === 'rating:questionableless') {
        return ['safe', 'questionable'];
    }

    if (ratingTag === 'rating:questionableplus') {
        return ['questionable', 'explicit'];
    }

    return [];
}

function toRatingTag(selected: BaseRating[]): string | null {
    const normalized = Array.from(new Set(selected)).sort();
    const key = normalized.join('|');

    if (key === '' || key === 'explicit|questionable|safe') {
        return null;
    }

    if (key === 'safe') {
        return 'rating:safe';
    }

    if (key === 'questionable') {
        return 'rating:questionable';
    }

    if (key === 'explicit') {
        return 'rating:explicit';
    }

    if (key === 'questionable|safe') {
        return 'rating:questionableless';
    }

    if (key === 'explicit|questionable') {
        return 'rating:questionableplus';
    }

    return null;
}

function isSafeTag(tag: string): boolean {
    return SAFE_TAG_PATTERN.test(tag);
}

function normalizeTagInput(value: string): string {
    return value
        .replace(/\s+/g, '_')
        .replace(/[^A-Za-z0-9_.:()-]/g, '');
}

function buildSizeTag(prefix: 'width' | 'height', operator: SizeOperator, value: string): string {
    if (operator === 'gte') {
        return `${prefix}:${value}..`;
    }

    if (operator === 'lte') {
        return `${prefix}:..${value}`;
    }

    return `${prefix}:${value}`;
}

function parseSizeTag(prefix: 'width' | 'height', tag: string | null): { operator: SizeOperator; value: string } | null {
    if (!tag || !tag.startsWith(`${prefix}:`)) {
        return null;
    }

    const value = tag.slice(prefix.length + 1);
    if (value.startsWith('..')) {
        return { operator: 'lte', value: value.slice(2) };
    }

    if (value.endsWith('..')) {
        return { operator: 'gte', value: value.slice(0, -2) };
    }

    return { operator: 'eq', value };
}

function uniqueQueryParts(settings: KonachanProviderSettings): string[] {
    const safeCustomTags = settings.tags
        .map((tag) => tag.trim())
        .filter((tag) => isSafeTag(tag));

    return [
        settings.widthTag,
        settings.heightTag,
        settings.rating,
        ...safeCustomTags,
    ].filter((item): item is string => Boolean(item));
}

export function buildKonachanQueryKey(settings: KonachanProviderSettings): string {
    return JSON.stringify({
        baseUrl: settings.baseUrl,
        page: settings.page,
        widthTag: settings.widthTag,
        heightTag: settings.heightTag,
        rating: settings.rating,
        tags: settings.tags,
        skipPid: settings.skipPid,
    });
}

export function buildKonachanQuery(settings: KonachanProviderSettings): string {
    return Array.from(new Set(uniqueQueryParts(settings))).slice(0, 8).join('+');
}

export function buildKonachanPreviewUrl(settings: KonachanProviderSettings): string {
    const query = buildKonachanQuery(settings);
    return `https://konachan.net/post?page=${settings.page}&tags=${query}`;
}

export function pickKonachanUrl(image: Record<string, unknown>, quality: QualityKey): string {
    const candidate = image[quality];
    const fallback = image['file_url'];
    return typeof candidate === 'string' && candidate.length > 0
        ? candidate
        : (typeof fallback === 'string' ? fallback : '');
}

type KonachanSettingsPanelProps = {
    value: KonachanProviderSettings;
    onChange: (next: KonachanProviderSettings) => void;
    notify: Notify;
};

export function KonachanSettingsPanel({ value, onChange, notify }: KonachanSettingsPanelProps) {
    const [draftTag, setDraftTag] = useState('');
    const [widthOperator, setWidthOperator] = useState<SizeOperator>('eq');
    const [widthValue, setWidthValue] = useState<string>(DEFAULT_WIDTH_VALUE);
    const [heightOperator, setHeightOperator] = useState<SizeOperator>('eq');
    const [heightValue, setHeightValue] = useState<string>(DEFAULT_HEIGHT_VALUE);
    const [selectedRatings, setSelectedRatings] = useState<BaseRating[]>(() => toBaseRatings(value.rating));
    const previewUrl = useMemo(() => buildKonachanPreviewUrl(value), [value]);

    useEffect(() => {
        setDraftTag('');
    }, [value.tags]);

    useEffect(() => {
        const parsed = parseSizeTag('width', value.widthTag);
        if (parsed) {
            setWidthOperator(parsed.operator);
            setWidthValue(parsed.value);
            return;
        }

        setWidthOperator('eq');
        setWidthValue(DEFAULT_WIDTH_VALUE);
    }, [value.widthTag]);

    useEffect(() => {
        const parsed = parseSizeTag('height', value.heightTag);
        if (parsed) {
            setHeightOperator(parsed.operator);
            setHeightValue(parsed.value);
            return;
        }

        setHeightOperator('eq');
        setHeightValue(DEFAULT_HEIGHT_VALUE);
    }, [value.heightTag]);

    useEffect(() => {
        setSelectedRatings(toBaseRatings(value.rating));
    }, [value.rating]);

    const update = (patch: Partial<KonachanProviderSettings>) => {
        onChange({ ...value, ...patch });
    };

    const updateTag = (index: number, nextTag: string | null) => {
        const nextTags = [...value.tags];
        if (nextTag === null) {
            nextTags.splice(index, 1);
            notify('info', '标签已删除', value.tags[index] ?? '');
        } else {
            nextTags[index] = nextTag;
            notify('info', '标签已更新', nextTag);
        }
        update({ tags: nextTags.filter(Boolean) });
    };

    const appendTag = (tag: string) => {
        const nextTag = normalizeTagInput(tag.trim());
        if (!nextTag || value.tags.includes(nextTag)) {
            return;
        }

        if (!isSafeTag(nextTag)) {
            notify('warning', '标签格式不合法', '仅允许英文字母、数字、下划线、点、冒号、短横线和英文括号。');
            return;
        }

        update({ tags: [...value.tags, nextTag] });
        notify('info', '标签已添加', nextTag);
        setDraftTag('');
    };

    return (
        <Space direction='vertical' size='middle' style={{ width: '100%' }}>
            <Form layout='vertical'>
                <Form.Item label='API 地址'>
                    <Input
                        value={value.baseUrl}
                        onChange={(event) => update({ baseUrl: event.target.value.trim() })}
                        placeholder='/post.json'
                    />
                </Form.Item>

                <Form.Item label='起始页码'>
                    <InputNumber
                        min={1}
                        value={value.page}
                        onChange={(nextValue) => {
                            if (typeof nextValue === 'number') {
                                update({ page: nextValue });
                                notify('info', '页码已切换', `第 ${nextValue} 页`);
                            }
                        }}
                        style={{ width: '100%' }}
                    />
                </Form.Item>

                <Form.Item label='图片质量'>
                    <Select
                        value={value.quality}
                        options={qualityOptions}
                        onChange={(nextValue) => update({ quality: nextValue })}
                    />
                </Form.Item>

                <Form.Item label='跳过相同 PID 图片'>
                    <Switch
                        checked={value.skipPid}
                        onChange={(checked) => update({ skipPid: checked })}
                    />
                </Form.Item>
            </Form>

            <div className='grid gap-3'>
                <div className='text-[0.94rem] font-semibold text-slate-900'>宽度</div>
                <Space.Compact style={{ width: '100%' }}>
                    <Select
                        style={{ width: 130 }}
                        value={widthOperator}
                        options={SIZE_OPERATOR_OPTIONS}
                        disabled={value.widthTag === null}
                        onChange={(nextOperator) => {
                            setWidthOperator(nextOperator);
                            const nextTag = buildSizeTag('width', nextOperator, widthValue);
                            update({ widthTag: nextTag });
                            notify('info', '宽度筛选已切换', nextTag);
                        }}
                    />
                    <Select
                        style={{ flex: 1 }}
                        value={widthValue}
                        options={WIDTH_VALUES.map((item) => ({ value: item, label: item }))}
                        disabled={value.widthTag === null}
                        onChange={(nextValue) => {
                            setWidthValue(nextValue);
                            const nextTag = buildSizeTag('width', widthOperator, nextValue);
                            update({ widthTag: nextTag });
                            notify('info', '宽度筛选已切换', nextTag);
                        }}
                    />
                </Space.Compact>
                <Space wrap>
                    <Button
                        size='small'
                        onClick={() => {
                            const nextTag = buildSizeTag('width', widthOperator, widthValue);
                            update({ widthTag: nextTag });
                            notify('info', '宽度筛选已启用', nextTag);
                        }}
                    >
                        启用限制
                    </Button>
                    <Button
                        size='small'
                        onClick={() => {
                            update({ widthTag: null });
                            notify('info', '宽度筛选已清空', '不限制宽度');
                        }}
                    >
                        清空
                    </Button>
                </Space>
            </div>

            <div className='grid gap-3'>
                <div className='text-[0.94rem] font-semibold text-slate-900'>高度</div>
                <Space.Compact style={{ width: '100%' }}>
                    <Select
                        style={{ width: 130 }}
                        value={heightOperator}
                        options={SIZE_OPERATOR_OPTIONS}
                        disabled={value.heightTag === null}
                        onChange={(nextOperator) => {
                            setHeightOperator(nextOperator);
                            const nextTag = buildSizeTag('height', nextOperator, heightValue);
                            update({ heightTag: nextTag });
                            notify('info', '高度筛选已切换', nextTag);
                        }}
                    />
                    <Select
                        style={{ flex: 1 }}
                        value={heightValue}
                        options={HEIGHT_VALUES.map((item) => ({ value: item, label: item }))}
                        disabled={value.heightTag === null}
                        onChange={(nextValue) => {
                            setHeightValue(nextValue);
                            const nextTag = buildSizeTag('height', heightOperator, nextValue);
                            update({ heightTag: nextTag });
                            notify('info', '高度筛选已切换', nextTag);
                        }}
                    />
                </Space.Compact>
                <Space wrap>
                    <Button
                        size='small'
                        onClick={() => {
                            const nextTag = buildSizeTag('height', heightOperator, heightValue);
                            update({ heightTag: nextTag });
                            notify('info', '高度筛选已启用', nextTag);
                        }}
                    >
                        启用限制
                    </Button>
                    <Button
                        size='small'
                        onClick={() => {
                            update({ heightTag: null });
                            notify('info', '高度筛选已清空', '不限制高度');
                        }}
                    >
                        清空
                    </Button>
                </Space>
            </div>

            <div className='grid gap-3'>
                <div className='text-[0.94rem] font-semibold text-slate-900'>分级</div>
                <Tag.CheckableTagGroup
                    multiple
                    options={RATING_OPTIONS}
                    value={selectedRatings}
                    onChange={(next) => {
                        const nextSelected = next as BaseRating[];
                        setSelectedRatings(nextSelected);

                        const nextRatingTag = toRatingTag(nextSelected);
                        update({ rating: nextRatingTag });

                        if (!nextRatingTag) {
                            notify('info', '分级已清空', '全选或全不选都会移除分级 tag');
                            return;
                        }

                        notify('info', '分级已切换', nextRatingTag);
                    }}
                />
            </div>

            <div className='grid gap-3'>
                <div className='text-[0.94rem] font-semibold text-slate-900'>标签</div>
                <Space wrap size={[8, 8]}>
                    {value.tags.map((tag, index) => (
                        <Tag
                            key={tag}
                            closable
                            onClose={(event) => {
                                event.preventDefault();
                                updateTag(index, null);
                            }}
                        >
                            {tag}
                        </Tag>
                    ))}
                    <Input
                        value={draftTag}
                        onChange={(event) => {
                            const next = event.target.value;
                            setDraftTag(normalizeTagInput(next));
                        }}
                        onPressEnter={() => appendTag(draftTag)}
                        placeholder='新增 tag'
                        style={{ width: 150 }}
                    />
                    <Button onClick={() => appendTag(draftTag)}>添加</Button>
                </Space>
            </div>

            <Form layout='vertical'>
                <Form.Item label='查询预览'>
                    <Typography.Link href={previewUrl} target='_blank' rel='noreferrer'>
                        {previewUrl}
                    </Typography.Link>
                </Form.Item>
            </Form>
        </Space>
    );
}
