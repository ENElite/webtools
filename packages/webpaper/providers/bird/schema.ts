import type { InspectorSchema, BindPath } from '@webtools/webwidget';

export type BirdPaperResponse<T> = {
    errno: number;
    msg: string;
    data: T;
    processTime: number;
}

export type BirdPaperItem = {
    id: string; // 图片唯一 ID
    author?: string;
    category: string;
    tag: string; // 关键词列表 按 `,` 分割 无空格
    url: string;
    class_id: string; // 分类 ID 对应 BirdPaperCategory["old_id"]
    live_open?: boolean;
    status?: string;
} & Record<string, string>;

export type BirdPaperTag = {
    tag: string;
    show_tag: string;
} & Record<string, string>;

// 接口地址 http://wp.birdpaper.com.cn/intf/getCategory
export type BirdPaperCategory = {
    old_id: string; // 分类 ID
    category: string; // 分类名
    show_name: string; // 分类展示名
    position: string; // 总张数
    hot_tag: BirdPaperTag[]; // 热门标签列表
};

// 最新壁纸 http://wp.birdpaper.com.cn/intf/newestList?pageno=1&count=10
// 搜索地址 http://wp.birdpaper.com.cn/intf/search?content=搜索关键字&pageno=1&count=10
// 接口地址 http://wp.birdpaper.com.cn/intf/GetListByCategory?cids={分类ID}&pageno=1&count=10
export type BirdPaperItemList = {
    total_count: number; // 总数量
    total_page: number; // 总页数
    pageno: number; // 当前页码
    count: number; // list 数量
    list: BirdPaperItem[];
}

export type BirdPaperCategoryResponse = BirdPaperResponse<BirdPaperCategory[]>;

export type BirdPaperItemListResponse = BirdPaperResponse<BirdPaperItemList>;

export const BirdPaperCategoryMap = {
    '36': '4K 专区',
    '9': '风景',
    '18': 'BABY',
    '6': '美女',
    '14': '萌宠',
    '5': '游戏',
    '26': '动漫卡通',
    '35': '文字',
};

export type BirdProviderSettings = {
    api: 'latest' | 'search' | 'category';
    query?: string;
    categoryId?: string;
}

export const DEFAULT_BIRD_PROVIDER_SETTINGS: BirdProviderSettings = {
    api: 'category',
    categoryId: '26', // 默认动漫分类
};

export const PROVIDER_BIRD_SCHEMA: InspectorSchema = [
    {
        key: 'api',
        label: 'API 类型',
        type: 'enum',
        bind: 'props.api' as BindPath,
        page: 'bird',
        order: 0,
        meta: {
            options: [
                { label: '最新', value: 'latest' },
                { label: '搜索', value: 'search' },
                { label: '分类', value: 'category' },
            ],
        },
    },
    {
        key: 'query',
        label: '搜索关键字',
        type: 'string',
        bind: 'props.query' as BindPath,
        page: 'bird',
        order: 1,
        visibleWhen: { field: 'props.api' as any, equals: 'search' },
        meta: { placeholder: '搜索内容，仅用于 search' },
    },
    {
        key: 'categoryId',
        label: '分类 ID',
        type: 'enum',
        bind: 'props.categoryId' as BindPath,
        page: 'bird',
        order: 2,
        visibleWhen: { field: 'props.api' as any, equals: 'category' },
        meta: {
            options: Object.entries(BirdPaperCategoryMap).map(([value, label]) => ({ label, value })),
        },
    },
];



export function buildBirdSettingsDraft(settings: BirdProviderSettings): BirdProviderSettings {
    return {
        api: settings.api || 'latest',
        query: settings.query ?? '',
        categoryId: settings.categoryId ?? '',
    };
}

export function splitBirdSettingsValues(draft: BirdProviderSettings): BirdProviderSettings {
    return {
        api: draft.api,
        query: draft.query || undefined,
        categoryId: draft.categoryId || undefined,
    };
}
