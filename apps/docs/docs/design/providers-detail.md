# 数据提供者详细设计

## 概述

Webpaper 使用适配器模式（Adapter Pattern）统一不同图片来源的 API 差异。每个数据源实现 `ApiAdapter` 接口，通过注册表统一管理。

## 架构总览

```
┌─────────────────────────────────────────────┐
│              Paper 组件                      │
│   根据 provider 切换查询配置                 │
└──────────────┬──────────────────────────────┘
               │ switchQuery(provider, api, params)
               ▼
┌─────────────────────────────────────────────┐
│            recordStore                      │
│   调用 adapter.fetch() 获取数据             │
│   管理 entities、分页、历史                  │
└──────────────┬──────────────────────────────┘
               │ getAdapter(provider)
               ▼
┌─────────────────────────────────────────────┐
│          Provider Registry                  │
│   Map<Provider, ApiAdapter>                 │
└──────────────┬──────────────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌───────┐ ┌───────┐ ┌───────┐
│Konachan│ │Bird   │ │ JSON  │
│Adapter │ │Paper  │ │Adapter│
└───────┘ └───────┘ └───────┘
```

## ApiAdapter 接口

```typescript
interface ApiAdapter<P = Record<string, unknown>> {
    provider: Provider;
    fetch: (api: string, params: P, page: number) => Promise<PageResult>;
    normalize: (raw: any, params?: P) => ProviderRecord[];
    hasMore: (raw: any, page: number) => boolean;
    serializeParams?: (params: P) => string;
}
```

### ProviderRecord

所有适配器输出统一的记录格式：

```typescript
interface ProviderRecordBase {
    id: string;          // 唯一 ID（格式：`${provider}-${原始ID}`）
    type: ItemType;      // 'image' | 'video'
    provider: Provider;  // 数据来源
    url: string;         // 资源 URL
    preview?: string;    // 预览 URL
    raw?: any;           // 原始数据（供详情页使用）
}
```

## KonachanAdapter

### 概述

Konachan 图片板适配器，对接 Konachan API。

### API 端点

通过 BFF 代理：`/api/konachan`（避免 CORS 问题）

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `tags` | `string` | 标签筛选（`+` 分隔，最多 8 个） |
| `page` | `number` | 页码 |
| `limit` | `number` | 每页数量（固定 10） |

### 标签构建

`buildKonachanQuery()` 将设置转换为查询参数：

```typescript
function buildKonachanQuery(settings: KonachanProviderSettings): KonachanQueryParams {
    const parts: string[] = [];
    // 宽度筛选：width:1920.. (gte) / width:..1920 (lte) / width:1920 (eq)
    if (widthTag) parts.push(widthTag);
    if (heightTag) parts.push(heightTag);
    // 分级：rating:safe / rating:questionable / ...
    if (settings.rating) parts.push(settings.rating);
    // 用户标签（逗号分隔）
    parts.push(...tags);
    return { tags: unique(parts).slice(0, 8).join('+'), page };
}
```

### 图片质量

通过 `quality` 参数选择图片 URL：

| QualityKey | 说明 |
|------------|------|
| `file_url` | 原图 |
| `jpeg_url` | 高清 |
| `sample_url` | 普通 |
| `preview_url` | 缩略图 |

`pickKonachanUrl()` 从图片对象中提取指定质量的 URL，失败时回退到 `file_url`。

### 分页判断

```typescript
hasMore: (raw, page) => raw.length === PAGE_SIZE;  // PAGE_SIZE = 10
```

返回数组长度等于 PAGE_SIZE 时认为有下一页。

### 重试机制

`fetchKonachan()` 内置 3 次重试，使用指数退避（1s, 2s, 4s）。

### 设置 Schema

```typescript
const PROVIDER_KONACHAN_SCHEMA: SettingsSchema<KonachanProviderSettings> = [
    { key: 'baseUrl', type: 'string', label: 'API 地址' },
    { key: 'page', type: 'number', label: '起始页码' },
    { key: 'quality', type: 'enum', label: '图片质量', options: QualityOptions },
    { key: 'skipPid', type: 'boolean', label: '跳过相同 PID' },
    { key: 'tags', type: 'tags', label: '标签' },
    { key: 'rating', type: 'enum', label: '分级', options: RatingOptions },
    { key: 'widthOperator' + 'widthValue', type: 'combiner', label: '图片宽度' },
    { key: 'heightOperator' + 'heightValue', type: 'combiner', label: '图片高度' },
];
```

## BirdPaperAdapter

### 概述

BirdPaper 壁纸适配器，对接 BirdPaper API。

### API 端点

直接请求：`http://wp.birdpaper.com.cn/intf`

### 三种 API 模式

| 模式 | 端点 | 参数 |
|------|------|------|
| `latest` | `/newestList` | `pageno`, `count` |
| `search` | `/search` | `content`（搜索关键词）, `pageno`, `count` |
| `category` | `/GetListByCategory` | `cids`（分类 ID）, `pageno`, `count` |

### 分页判断

```typescript
hasMore: (raw, page) => page < raw.data.total_page;
```

根据 API 返回的 `total_page` 字段判断。

### ProviderRecord 格式

```typescript
{
    id: `BirdPaper-${item.id}`,
    type: 'image',
    url: item.url,
    provider: 'BirdPaper',
    raw: item,
}
```

## JsonAdapter

### 概述

通用 JSON API 适配器，用于用户自定义的 JSON 数据源。

### 工作方式

1. 用户在设置中粘贴 JSON 数组
2. 适配器解析 JSON 并标准化为 `ProviderRecord[]`
3. 不支持分页（`hasMore` 始终返回 `false`）

### 参数

```typescript
type JsonParams = {
    content?: string;  // JSON 数组字符串
};
```

### 标准化规则

```typescript
function normalizeRecord(item: Record<string, unknown>, index: number): ProviderRecord {
    return {
        id: String(item['id'] ?? `json-${index}`),
        url: typeof item['url'] === 'string' ? item['url'] : '',
        type: item['type'] === 'video' ? 'video' : 'image',
        preview: typeof item['preview'] === 'string' ? item['preview'] : undefined,
        provider: 'Json',
    };
}
```

### 期望的 JSON 格式

```json
[
    {
        "id": "unique-id",
        "url": "https://example.com/image.jpg",
        "type": "image",
        "preview": "https://example.com/thumb.jpg"
    }
]
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 否 | 唯一标识（缺失时自动生成 `json-{index}`） |
| `url` | 是 | 资源 URL（缺失时跳过该条目） |
| `type` | 否 | `'image'` 或 `'video'`（默认 `'image'`） |
| `preview` | 否 | 预览 URL |

## Provider 切换流程

```
1. 用户在设置面板切换 provider
         │
         ▼
2. paperStore.sharedSettings.provider 更新
         │
         ▼
3. Paper 组件的 queryConfig useMemo 重新计算
   构建对应 provider 的 api + params
         │
         ▼
4. useEffect 触发 switchQuery(provider, api, params)
         │
         ▼
5. recordStore 清空当前数据，发起新的 fetch
         │
         ▼
6. adapter.fetch() → normalize() → PageResult
         │
         ▼
7. recordStore 更新 entities，Paper 渲染新图片
```

## 缓存策略

- `serializeParams` 方法用于生成缓存 key
- 默认使用 `JSON.stringify`
- `JsonAdapter` 覆盖为 `JSON.stringify(params)`（因为 params 包含大段 JSON 文本）
