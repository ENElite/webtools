import type { InspectorSchema, BindPath } from '@webtools/webwidget';
import { KonachanQueryParams } from './types';

const QualityKeyOptions = ['file_url', 'jpeg_url', 'sample_url', 'preview_url'] as const;
export type QualityKey = typeof QualityKeyOptions[number];
type SizeOperator = 'gte' | 'eq' | 'lte';
/**
 * Konachan Provider 的扁平化设置值（用于 SettingsPanel）
 */
export type KonachanProviderSettings = {
    baseUrl: string;
    page: number;
    quality: QualityKey;
    skipPid: boolean;
    widthOperator: SizeOperator | null;
    widthValue: string | number | null;
    heightOperator: SizeOperator | null;
    heightValue: string | number | null;
    rating: string | null;
    tags: string; // 空格分割
};

export const DEFAULT_KONACHAN_SETTINGS_VALUES: KonachanProviderSettings = {
    baseUrl: '/api/konachan',
    page: 1,
    quality: 'file_url',
    skipPid: true,
    widthOperator: null,
    widthValue: null,
    heightOperator: null,
    heightValue: null,
    rating: null,
    tags: '',
};

type Option = {
    value: string;
    label: string;
};

export const RatingOptions: Option[] = [
    { value: 'rating:safe', label: 'Safe' },
    { value: 'rating:questionableless', label: 'Safe & Questionable' },
    { value: 'rating:questionable', label: 'Questionable' },
    { value: 'rating:questionableplus', label: 'Questionable & Explicit' },
    { value: 'rating:explicit', label: 'Explicit' },
];

export const QualityOptions: Array<{ value: QualityKey; label: string }> = [
    { value: 'file_url', label: '原图' },
    { value: 'jpeg_url', label: '高清' },
    { value: 'sample_url', label: '普通' },
    { value: 'preview_url', label: '缩略图' },
];

/**
 * Konachan Provider 的 schema 定义，使用 combiner 类型处理宽高筛选
 */
export const PROVIDER_KONACHAN_SCHEMA: InspectorSchema = [
    {
        key: 'baseUrl',
        label: 'API 地址',
        type: 'string',
        bind: 'baseUrl' as BindPath,
        page: 'konachan',
        order: 0,
        meta: { placeholder: '/api/konachan' },
    },
    {
        key: 'page',
        label: '起始页码',
        type: 'number',
        bind: 'page' as BindPath,
        page: 'konachan',
        order: 1,
        meta: { min: 1 },
    },
    {
        key: 'quality',
        label: '图片质量',
        type: 'enum',
        bind: 'quality' as BindPath,
        page: 'konachan',
        order: 2,
        meta: { options: QualityOptions },
    },
    {
        key: 'skipPid',
        label: '跳过相同 PID',
        type: 'switch',
        bind: 'skipPid' as BindPath,
        page: 'konachan',
        order: 3,
    },
    {
        key: 'tags',
        label: '标签',
        type: 'tags',
        bind: 'tags' as BindPath,
        page: 'konachan',
        order: 4,
        meta: { placeholder: 'loli' },
    },
    {
        key: 'rating',
        label: '分级',
        type: 'enum',
        bind: 'rating' as BindPath,
        page: 'konachan',
        order: 5,
        meta: { options: RatingOptions },
    },
    {
        key: 'widthCombiner',
        label: '图片宽度',
        type: 'combiner',
        bind: ['widthOperator', 'widthValue'] as unknown as BindPath,
        page: 'konachan',
        order: 6,
        meta: {
            operatorOptions: [
                { value: 'gte', label: '>= 大于等于' },
                { value: 'eq', label: '= 等于' },
                { value: 'lte', label: '<= 小于等于' },
            ],
            valueOptions: [
                { value: '2560', label: '2560' },
                { value: '1920', label: '1920' },
                { value: '1680', label: '1680' },
                { value: '1600', label: '1600' },
                { value: '1440', label: '1440' },
                { value: '1400', label: '1400' },
                { value: '1280', label: '1280' },
                { value: '1152', label: '1152' },
                { value: '1024', label: '1024' },
            ],
        },
    },
    {
        key: 'heightCombiner',
        label: '图片高度',
        type: 'combiner',
        bind: ['heightOperator', 'heightValue'] as unknown as BindPath,
        page: 'konachan',
        order: 7,
        meta: {
            operatorOptions: [
                { value: 'gte', label: '>= 大于等于' },
                { value: 'eq', label: '= 等于' },
                { value: 'lte', label: '<= 小于等于' },
            ],
            valueOptions: [
                { value: '1600', label: '1600' },
                { value: '1200', label: '1200' },
                { value: '1080', label: '1080' },
                { value: '1050', label: '1050' },
                { value: '1024', label: '1024' },
                { value: '960', label: '960' },
                { value: '900', label: '900' },
                { value: '864', label: '864' },
                { value: '800', label: '800' },
                { value: '768', label: '768' },
            ],
        },
    },
];

export const DEFAULT_KONACHAN_SETTINGS: KonachanProviderSettings = {
    baseUrl: '/api/konachan',
    page: Math.floor(Math.random() * 60) + 1,
    quality: 'jpeg_url',
    rating: 'rating:safe',
    tags: 'loli',
    skipPid: true,
    widthOperator: null,
    widthValue: null,
    heightOperator: null,
    heightValue: null,
};

/**
 * 将操作符和值构建为大小标签
 */
function buildSizeTag(prefix: 'width' | 'height', operator: SizeOperator | null, value: string | number | null): string | null {
    if (operator === null || value === null) {
        return null;
    }

    if (operator === 'gte') {
        return `${prefix}:${value}..`;
    }

    if (operator === 'lte') {
        return `${prefix}:..${value}`;
    }

    return `${prefix}:${value}`;
}


/**
 * 从设置中生成查询参数
 */
export function buildKonachanQuery(settings: KonachanProviderSettings): KonachanQueryParams {
    const parts: string[] = [];
    const widthTag = buildSizeTag('width', settings.widthOperator, settings.widthValue);
    const heightTag = buildSizeTag('height', settings.heightOperator, settings.heightValue);
    if (widthTag) parts.push(widthTag);
    if (heightTag) parts.push(heightTag);
    if (settings.rating) parts.push(settings.rating);
    const tags = settings.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    parts.push(...tags);
    return {
        tags: Array.from(new Set(parts)).slice(0, 8).join('+'),
        page: settings.page
    }
}

/**
 * 构建 Konachan 预览链接
 */
export function buildKonachanPreviewUrl(settings: KonachanProviderSettings): string {
    const query = buildKonachanQuery(settings);
    return `https://konachan.net/post?page=${query.page}&tags=${query.tags}`;
}

/**
 * 从图片对象中提取指定质量的 URL
 */
export function pickKonachanUrl(image: Record<string, unknown>, quality: string | undefined = 'file_url'): string {
    if (!quality || !QualityKeyOptions.includes(quality as QualityKey)) {
        quality = 'file_url';
    }
    const candidate = image[quality];
    const fallback = image['file_url'];
    return typeof candidate === 'string' && candidate.length > 0
        ? candidate
        : (typeof fallback === 'string' ? fallback : '');
}
