# WebTools

基于 React + Next.js 的可扩展桌面小组件系统，支持拖拽、缩放、动画、撤销/重做与 AI 编辑。

## 特性

- **小组件引擎**：可复用的 Overlay 系统，支持 8 种小组件类型、拖拽/缩放/旋转、百分比布局与吸附辅助线
- **命令模式**：完整的撤销/重做支持，所有小组件操作均通过 Command 接口封装，支持批量操作
- **信号系统**：类型安全的发布/订阅总线，解耦小组件状态变化与动画/运行时响应
- **声明式动画**：11 种动画预设（淡入淡出、滑动、缩放、故障等），基于 Framer Motion 的运行时编译
- **Schema 驱动的设置 UI**：通过 InspectorSchema 声明式定义属性编辑器，动态渲染 14 种编辑器组件
- **AI 集成**：集成 DeepSeek AI，支持通过自然语言编辑小组件属性，内置 Agent 对话系统

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| TypeScript | 5.9 | 类型安全 |
| React | 19 | UI 框架 |
| Next.js | 16 | 应用框架 |
| Zustand | 5 | 状态管理 |
| Framer Motion | 12 | 动画 |
| Tailwind CSS | 4.2 | 样式 |
| pnpm | 10.8 | 包管理 |

## 项目结构

```
webtools/
├── packages/
│   ├── webwidget/          # 可复用的桌面小组件引擎库
│   ├── webpaper/           # 基于 Next.js 的图片浏览器应用
│   ├── webtest/            # 集中式测试套件
│   └── webdocs/            # 文档站点（VitePress）
├── scripts/                # 构建脚本
├── package.json            # monorepo 根配置
└── pnpm-workspace.yaml     # pnpm 工作区
```

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 10.8

### 安装依赖

```bash
# 在项目根目录执行
pnpm install
```

### 开发

```bash
# 启动 webpaper 开发服务器（端口 5173）
pnpm dev:webpaper

# 启动文档站点
pnpm dev:docs
```

### 构建

```bash
# 构建 webpaper
pnpm build:webpaper

# 构建文档站点
pnpm build:docs
```

### 测试

```bash
# 运行所有测试
pnpm test

# 类型检查
pnpm typecheck

# 代码规范检查
pnpm lint
```

## 文档

完整的项目文档请访问 [WebTools 文档站点](https://anthropics.github.io/webtools/)，包含：

- [项目概览](https://anthropics.github.io/webtools/guide/)
- [快速开始](https://anthropics.github.io/webtools/guide/getting-started)
- [架构设计](https://anthropics.github.io/webtools/guide/architecture)
- [技术栈详解](https://anthropics.github.io/webtools/guide/tech-stack)

## 核心设计模式

### 适配器模式（Provider Pattern）

统一不同图片来源的 API 差异，支持 Konachan、BirdPaper、JSON 等数据源。

### 命令模式（Command Pattern）

所有小组件操作通过 Command 接口封装，支持完整的撤销/重做历史管理。

### 信号/事件总线（Signal Bus）

类型安全的发布/订阅系统，解耦小组件状态变化与运行时响应。

### Schema 驱动的设置 UI

通过 InspectorSchema 声明式定义属性编辑器，动态渲染设置面板。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License