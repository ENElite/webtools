# WebTools - 前端工具集

快速、轻量的前端工具集合，包含图片处理、代码编辑等多种实用工具。

## 技术栈

- **框架**: Next.js (App Router, SSG 静态导出)
- **样式**: Tailwind CSS
- **UI 组件库**: `@webtools/ui`（Ark UI 交互基础 + Mochi 视觉系统）
- **语言**: TypeScript

## 特性

- 🚀 **快速加载**: SSG 静态生成，加载速度极快
- 📦 **轻量依赖**: 最小化第三方依赖
- 🔧 **独立工具**: 每个工具独立运行，互不影响
- 🎨 **统一视觉**: 可访问的 Ark UI 交互与 Mochi 可爱风动效
- 📱 **响应式设计**: 支持各种设备和屏幕尺寸
- ✨ **零配置注册**: 新增工具只需创建文件，无需手动注册

## 项目结构

```
webtools/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 根布局
│   │   ├── page.tsx                # 首页 (Server Component)
│   │   ├── providers.tsx           # 应用级上下文入口
│   │   ├── globals.css             # 全局样式
│   │   └── tools/                  # 工具目录 (约定式路由)
│   │       ├── image-show/
│   │       │   ├── page.tsx        # 工具页面
│   │       │   └── tool.ts         # 工具定义 (元数据)
│   │       ├── image-diff/
│   │       ├── image-obfuscate/
│   │       └── color-picker/
│   ├── components/
│   │   ├── Header.tsx              # 顶部导航
│   │   ├── ToolCard.tsx            # 工具卡片
│   │   ├── ToolLayout.tsx          # 工具页面布局
│   │   ├── ToolPatterns.tsx        # 工具页通用反馈与折叠区
│   │   └── HomeContent.tsx         # 首页内容 (Client Component)
│   └── lib/
│       ├── types.ts                # 类型定义
│       ├── tools.ts                # 分类定义 + 类型导出
│       ├── tools.server.ts         # 开发环境: 实时扫描工具
│       └── tools.generated.ts      # 生产环境: 预生成的工具数据 (gitignored)
├── scripts/
│   └── generate-tools.mjs          # 生产构建时生成工具列表
├── next.config.js
├── tsconfig.json
└── package.json
```

## 开发

```bash
# 安装依赖 (在根目录)
pnpm install

# 启动开发服务器
pnpm dev:webtools
```

访问 [http://localhost:3000](http://localhost:3000)

### 构建生产版本

```bash
pnpm build:webtools
```

构建时自动执行 `prebuild` 脚本生成 `tools.generated.ts`，静态文件输出到 `out` 目录。

## 添加新工具

**零配置注册** - 只需创建两个文件，工具自动出现在首页：

### 1. 创建工具定义

```ts
// src/app/tools/my-tool/tool.ts
import type { ToolDefinition } from '@/lib/types';

const tool: ToolDefinition = {
    id: 'my-tool',           // 必须与目录名一致
    name: '我的工具',
    description: '工具描述',
    icon: '🔧',
    category: 'utility',     // 'image' | 'text' | 'code' | 'utility'
    tags: ['标签1', '标签2'],
};

export default tool;
```

### 2. 创建工具页面

```tsx
// src/app/tools/my-tool/page.tsx
'use client';

import { ToolLayout } from '@/components/ToolLayout';

export default function MyToolPage() {
    return (
        <ToolLayout title="我的工具" description="工具描述">
            {/* 工具内容 */}
        </ToolLayout>
    );
}
```

完成！工具会自动注册到首页。

## 工具定义规范

所有工具定义必须遵循 `ToolDefinition` 接口 (`src/lib/types.ts`)：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | ✅ | 工具唯一标识，必须与目录名一致 |
| `name` | `string` | ✅ | 工具显示名称 |
| `description` | `string` | ✅ | 工具描述 |
| `icon` | `string` | ✅ | 工具图标 (emoji) |
| `category` | `ToolCategory` | ✅ | 工具分类 |
| `tags` | `string[]` | ✅ | 搜索标签 |

### 工具分类

| 分类 ID | 名称 | 图标 |
|---------|------|------|
| `image` | 图片工具 | 🖼️ |
| `text` | 文本工具 | 📝 |
| `code` | 代码工具 | 💻 |
| `utility` | 实用工具 | 🛠️ |

## 自动注册机制

工具注册采用**环境感知**策略，开发和生产环境使用不同方案：

### 开发环境

`tools.server.ts` 通过 tsx 加载 `src/app/tools/*/tool.ts` 模块，直接获取导出的 `ToolDefinition` 对象。与正则解析源码不同，这种方式支持完整的 TypeScript 语法，且 `tool.ts` 的写法不受格式限制。新增工具后无需重启，刷新页面即可看到。

### 生产环境

`scripts/generate-tools.mjs` 在 `pnpm build` 前自动执行（通过 `prebuild` 钩子），扫描所有 `tool.ts` 并生成 `tools.generated.ts`。该文件包含完整的工具数据，被 `.gitignore` 忽略。

```
开发环境:  page.tsx → tools.server.ts (实时扫描) → HomeContent
生产环境:  page.tsx → tools.generated.ts (预生成数据) → HomeContent
```

## 工具列表

### 图片查看器 (image-show)
- 支持多种图片格式 (PNG, JPG, GIF, WebP, BMP, SVG)
- 拖拽或点击上传
- 显示图片详细信息 (文件名、大小、类型、尺寸)
- 下载图片功能

## 性能优化

- **SSG 静态生成**: 所有页面在构建时生成，无需服务器
- **包导入优化**: `optimizePackageImports` 优化 `@webtools/ui` 导入
- **代码分割**: 每个工具独立打包，按需加载
- **环境分离**: 开发实时扫描，生产预生成数据

## License

MIT

## 印花集二维码

入口：`/tools/stamp-qr`。默认短线亮色定位符、标准宽度、全部五种结构，暗色值 `100 / #646464`，可调范围 `40–255`。

- 内容和所有样式参数均响应式更新，停止修改 450 毫秒后自动生成，首屏自动生成默认内容。
- 新参数会终止旧 Worker，生成期间仍可修改参数；旧预览保留至新图生成，但仅最新结果提供下载。
- `src/lib/stamp-qr.ts` 和 `stamp-solver.ts`：候选结构、分量拆分、HiGHS 精确整数规划、Canvas 绘制。
- `src/workers/stamp-qr.worker.ts`：UTF-8/H 级编码、自适应版本，使用编码器选择的掩码直接生成 PNG，不进行解码验证或额外掩码尝试。
- `scripts/prepare-stamp-qr.mjs`：开发与构建前复制本站使用的 HiGHS 引擎，运行时无需 CDN。
- 每个格子唯一归属，先最小化结构总数，再按大 X、竖线、横线、小 x、点的顺序尽量覆盖。90 秒优化时限、120 秒总时限，超时可重试。

测试（仓库根目录）：

```bash
pnpm exec vitest run --project webtools
pnpm --filter @webtools/webtools typecheck
pnpm --filter @webtools/webtools build
```

浏览器验收（托管静态 `out` 或启动开发服务，默认使用本机 Edge）：

```bash
python -m pip install playwright pillow
python apps/webtools/scripts/test-stamp-qr.py --url http://localhost:3000 --output temp/stamp-qr-acceptance
```

脚本验收默认自动生成、配置组合、实时更新和防抖、任务替换、40 下限、移动端布局、错误输入及 PNG 下载。生成与验收均不依赖解码器。

依赖来源与许可证：[node-qrcode / MIT](https://github.com/soldair/node-qrcode)、[highs-js / MIT](https://github.com/lovasoa/highs-js)。
