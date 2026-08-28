# 数据提供者设计

## 概述

数据提供者（Provider）使用适配器模式，统一不同图片来源的 API 差异，为上层提供一致的数据接口。

## 架构

```
┌─────────────────────────────────────┐
│          recordStore                │
│   (统一的数据/分页/历史状态)        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│          Provider Registry          │
│   (适配器注册表)                    │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌───────┐ ┌───────┐ ┌───────┐
│Konachan│ │Bird   │ │ JSON  │
│Adapter │ │Paper  │ │Adapter│
└───────┘ └───────┘ └───────┘
```

## 核心接口

### ApiAdapter

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

标准化的记录格式：

```typescript
interface ProviderRecordBase {
    id: string;          // 历史记录唯一 ID
    type: ItemType;      // 'image' | 'video'
    provider: Provider;  // 数据来源
    url: string;         // 资源 URL
    preview?: string;    // 预览 URL
    raw?: any;           // 原始数据（供详情页使用）
}
```

### PageResult

标准化的分页响应：

```typescript
interface PageResult {
    data: ProviderRecord[];
    hasMore: boolean;
}
```

## 适配器注册表

```typescript
const registry = new Map<Provider, ApiAdapter>();

function registerAdapter(adapter: ApiAdapter): void;
function getAdapter(provider: Provider): ApiAdapter;
```

应用初始化时注册所有适配器：

```typescript
registerAdapter(KonachanAdapter);
registerAdapter(BirdPaperAdapter);
registerAdapter(JsonAdapter);
```

## 具体适配器

### KonachanAdapter

Konachan 图片板适配器：

- **API 端点**：`/api/konachan`（BFF 代理）
- **参数**：tags（标签筛选）、limit（每页数量）
- **标准化**：将 Konachan 响应转换为 `ProviderRecord`
- **分页判断**：根据返回数组长度与 limit 比较

### BirdPaperAdapter

BirdPaper 图片源适配器：

- **API 端点**：外部 API
- **参数**：分类、分页
- **标准化**：将 BirdPaper 响应转换为 `ProviderRecord`

### JsonAdapter

通用 JSON API 适配器：

- **API 端点**：用户配置的 URL
- **参数**：自定义参数
- **标准化**：通用 JSON 解析
- **分页判断**：根据返回数据判断

## 数据流

```
1. 用户切换 Provider / 翻页
         │
         ▼
2. recordStore 调用 adapter.fetch()
         │
         ▼
3. adapter 处理 API 差异，返回 PageResult
         │
         ▼
4. recordStore 更新 entities 和分页状态
         │
         ▼
5. Paper 组件根据当前 Provider 渲染图片
```

## 缓存策略

`serializeParams` 方法用于生成缓存 key：

```typescript
serializeParams?: (params: P) => string;
```

默认使用 `JSON.stringify`，有特殊需求时可覆盖。

## 设计决策

1. **适配器模式**：隔离不同 API 的差异，上层无需关心具体实现
2. **注册表**：动态注册适配器，支持运行时扩展
3. **标准化输出**：所有适配器输出统一的 `ProviderRecord` 格式
4. **BFF 代理**：通过 Next.js API 路由代理外部 API，避免 CORS 问题
5. **原始数据保留**：`raw` 字段保留原始响应，供详情页使用
