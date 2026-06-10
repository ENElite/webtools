# WebTools - 前端工具集

快速、轻量的前端工具集合，包含图片处理、代码编辑等多种实用工具。

## 技术栈

- **框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS 3.4
- **UI 组件库**: HeroUI V3 (@heroui/react 2.8.10)
- **语言**: TypeScript

## 特性

- 🚀 **快速加载**: 采用 SSG 静态生成，加载速度极快
- 📦 **轻量依赖**: 最小化第三方依赖，减少包体积
- 🔧 **独立工具**: 每个工具独立运行，互不影响
- 🎨 **现代 UI**: 使用 HeroUI 组件库，界面美观
- 📱 **响应式设计**: 支持各种设备和屏幕尺寸

## 项目结构

```
webtools/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 首页
│   │   ├── providers.tsx       # HeroUI Provider
│   │   └── globals.css         # 全局样式
│   ├── components/             # 共享组件
│   │   ├── Header.tsx          # 顶部导航栏
│   │   ├── ToolCard.tsx        # 工具卡片组件
│   │   └── ToolLayout.tsx      # 工具页面布局
│   ├── lib/                    # 工具库
│   │   └── tools.ts            # 工具配置和类型定义
│   └── tools/                  # 各个工具实现
│       └── image-show/         # 图片查看器工具
│           └── page.tsx
├── public/                     # 静态资源
├── package.json                # 项目依赖配置
├── next.config.js              # Next.js 配置
├── tailwind.config.js          # Tailwind CSS 配置
├── tsconfig.json               # TypeScript 配置
└── postcss.config.js           # PostCSS 配置
```

## 开发

### 安装依赖

```bash
# 在根目录
pnpm install
```

### 启动开发服务器

```bash
# 在根目录
pnpm dev:webtools
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
# 在根目录
pnpm build:webtools
```

构建后的静态文件将输出到 `out` 目录。

## 添加新工具

1. 在 `src/tools/` 目录下创建新的工具目录
2. 在该目录中创建 `page.tsx` 文件
3. 使用 `ToolLayout` 组件作为页面布局
4. 在 `src/lib/tools.ts` 中添加工具配置
5. 工具将自动显示在首页

### 示例

```tsx
// src/tools/my-tool/page.tsx
'use client';

import { ToolLayout } from '@/components/ToolLayout';

export default function MyToolPage() {
  return (
    <ToolLayout
      title="我的工具"
      description="工具描述"
    >
      {/* 工具内容 */}
    </ToolLayout>
  );
}
```

## 工具列表

### 图片查看器 (image-show)
- 支持多种图片格式 (PNG, JPG, GIF, WebP, BMP, SVG)
- 拖拽或点击上传
- 显示图片详细信息 (文件名、大小、类型、尺寸)
- 下载图片功能

## 性能优化

- **SSG 静态生成**: 所有页面在构建时生成，无需服务器
- **包导入优化**: 使用 Next.js 的 `optimizePackageImports` 优化 HeroUI 的导入
- **代码分割**: 每个工具独立打包，按需加载
- **图片优化**: 静态导出时禁用图片优化，避免额外开销

## License

MIT
