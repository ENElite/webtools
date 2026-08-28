import type { InspectorSchema, BindPath, PageRegistry } from '@webtools/webwidget';

import { PROVIDER_BIRD_SCHEMA } from '@/providers/bird/schema';
import { PROVIDER_JSON_SCHEMA } from '@/providers/json/schema';
import { PROVIDER_KONACHAN_SCHEMA } from '@/providers/konachan/schema';
import { Provider } from '@/providers';

export type SharedSettings = {
    objectFit: 'contain' | 'cover';
    provider: Provider;
    trackScale: number;
    trackIntensity: number;
    lockDock: boolean;
    interval: number;
    enableWakeLock: boolean;
    videoAutoSwitchOnEnded: boolean;
};

export const DEFAULT_SHARED_SETTINGS: SharedSettings = {
    objectFit: 'contain',
    provider: 'Konachan',
    trackScale: 100,
    trackIntensity: 0,
    lockDock: false,
    interval: 30,
    enableWakeLock: false,
    videoAutoSwitchOnEnded: true,
};

const PAPER_SHARED_SETTINGS_SCHEMA: InspectorSchema = [
    {
        key: 'objectFit',
        label: '覆盖窗口',
        type: 'enum',
        bind: 'props.objectFit' as BindPath,
        page: 'shared',
        order: 0,
        meta: {
            options: [
                { label: 'Contain', value: 'contain' },
                { label: 'Cover', value: 'cover' },
            ],
        },
    },
    {
        key: 'provider',
        label: '来源',
        type: 'enum',
        bind: 'props.provider' as BindPath,
        page: 'shared',
        order: 1,
        meta: {
            options: [
                { label: 'Konachan', value: 'Konachan' },
                { label: '小鸟壁纸', value: 'BirdPaper' },
                { label: '配置文件', value: 'Json' },
            ],
        },
    },
    {
        key: 'enableWakeLock',
        label: '不息屏',
        type: 'switch',
        bind: 'props.enableWakeLock' as BindPath,
        page: 'shared',
        order: 2,
    },
    {
        key: 'interval',
        label: '切换间隔',
        type: 'number',
        bind: 'props.interval' as BindPath,
        page: 'shared',
        order: 3,
        meta: { min: 5, step: 1, suffix: '秒' },
    },
    {
        key: 'trackScale',
        label: '图像缩放',
        type: 'number',
        bind: 'props.trackScale' as BindPath,
        page: 'shared',
        order: 4,
        meta: { min: 50, max: 150, step: 5, suffix: '%' },
    },
    {
        key: 'trackIntensity',
        label: '跟踪强度',
        type: 'number',
        bind: 'props.trackIntensity' as BindPath,
        page: 'shared',
        order: 5,
        meta: { min: -100, max: 100, step: 5, suffix: '%' },
    },
    {
        key: 'videoAutoSwitchOnEnded',
        label: '视频播完切换',
        type: 'switch',
        bind: 'props.videoAutoSwitchOnEnded' as BindPath,
        page: 'shared',
        order: 6,
    },
];

export const PAPER_SETTINGS_SCHEMA: InspectorSchema = [
    ...PAPER_SHARED_SETTINGS_SCHEMA,
    ...PROVIDER_KONACHAN_SCHEMA,
    ...PROVIDER_BIRD_SCHEMA,
    ...PROVIDER_JSON_SCHEMA,
];

export const PAPER_PAGE_REGISTRY: PageRegistry = [
    { key: 'shared', label: '共享设置', order: 0 },
    { key: 'konachan', label: 'Konachan 设置', order: 1 },
    { key: 'bird', label: 'BirdPaper 设置', order: 2 },
    { key: 'json', label: 'Json 设置', order: 3 },
];
