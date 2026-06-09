# @webtools/webpaper — 图片浏览器

`webpaper` 是基于 Next.js 16 的图片浏览器应用，集成 `webwidget` 小组件引擎，提供图片浏览、历史记录、设置管理和 AI 辅助编辑功能。

## 包结构

```
packages/webpaper/
├── app/                    # Next.js App Router
│   ├── page.tsx            # 入口页面
│   ├── layout.tsx          # 根布局
│   ├── home.tsx            # 主页包装器
│   ├── webpaper.tsx        # 主应用壳
│   └── api/                # BFF API 路由
│       ├── deepseek/       # DeepSeek AI 代理
│       └── konachan/       # Konachan 图片代理
├── features/
│   └── paper/              # 图片浏览功能
│       ├── paper.tsx       # Paper 组件
│       ├── hero/           # 图片/视频展示
│       ├── history/        # 历史记录
│       └── settings/       # 设置面板
├── providers/              # 数据提供者（适配器模式）
│   ├── types.ts            # 接口定义
│   ├── registry.ts         # 适配器注册表
│   ├── konachan/           # Konachan 适配器
│   ├── bird/               # BirdPaper 适配器
│   └── json/               # JSON API 适配器
├── store/                  # Zustand 状态管理
│   ├── paperStore.ts       # 应用设置
│   └── recordStore.ts      # 数据/导航状态
├── components/             # UI 组件
│   ├── editor/             # AI 编辑器
│   ├── settings/           # 设置组件
│   └── imageGrid/          # 虚拟图片网格
└── hooks/                  # 自定义 Hooks
```

## 核心功能

### 图片浏览

`Paper` 组件管理图片源切换和展示：

- 支持 Konachan、BirdPaper、JSON 三种数据源
- 自动轮播（auto-play）与全屏模式
- Wake Lock 保持屏幕常亮
- 历史记录导航（前进/后退）

### 数据提供者（Provider）

适配器模式统一不同图片来源：

| Provider | 说明 |
|----------|------|
| Konachan | Konachan 图片板 |
| BirdPaper | BirdPaper 图片源 |
| Json | 通用 JSON API |

每个适配器实现 `ApiAdapter` 接口：
- `fetch(api, params, page)` — 发起分页请求
- `normalize(raw, params)` — 标准化响应数据
- `hasMore(raw, page)` — 判断是否有下一页

### 状态管理

两个 Zustand store：

**paperStore** — 应用设置状态：
- 共享设置（通用配置）
- Konachan 设置
- JSON 设置
- BirdPaper 设置

**recordStore** — 数据/导航状态（Slice 架构）：
- **数据层**：实体管理（entities）、查询缓存（queries: `Record<string, QueryState>`）
- **导航层**：游标管理、历史浏览模式（historyCursor）、查询切换过渡态
- **自动播放**：autoPlay 定时器、预加载队列（pendingPreloadUrl）
- **查询管理**：switchQuery、invalidateQuery、invalidateAll
- **派生数据**：currentQuery、currentRecord、getHistory
- **常量**：CACHE_TTL（5分钟）、PAGE_SIZE（10）、PREFETCH_THRESHOLD（2）

### AI 编辑器

集成 DeepSeek AI，通过 LangChain 编排：

- **Agent 对话系统**：自然语言修改小组件属性
- **Auto Editor**：自动编辑模式
- **Editor Tools**：可调用的编辑工具集
- BFF API 路由代理 DeepSeek 请求

### 设置面板

- 动态表单（Dynamic Form）
- 字体选择器（Font Picker）
- 标签编辑器（Tags Editor）
- 组合器（Combiner）

### 历史记录

- 历史抽屉（History Drawer）
- 历史卡片（History Card）
- 详情页（History Detail）

## BFF API 路由

| 路由 | 说明 |
|------|------|
| `/api/deepseek/*` | 代理 DeepSeek AI API |
| `/api/konachan/*` | 代理 Konachan 图片 API |

## 自定义 Hooks

### webpaper 本地 Hooks

| Hook | 说明 |
|------|------|
| `useFetch` | 功能完整的数据请求 Hook，支持链式 API、生命周期回调、自动重试（665 行） |

### 共享 Hooks（来自 @webtools/shared）

以下 Hooks 由 `@webtools/shared` 包提供，webpaper 通过共享包引用：

| Hook | 说明 |
|------|------|
| `useIntervalFn` | 定时器 |
| `useLocalFonts` | 本地字体加载 |
| `usePlaybackScheduler` | 播放调度 |
| `usePosition` | 位置计算 |
| `usePreloadImage` | 图片预加载 |
| `useTimestamp` | 时间戳 |
