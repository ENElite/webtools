# WebTools

WebTools 是一个以 WebPaper 为主应用的 pnpm monorepo。当前架构把可部署应用与可复用库分开，并把原来的单体 `webwidget` 拆成纯领域内核、React 运行时和编辑器三层。

## 环境

- Node.js 24
- pnpm 11.24.0（当前稳定版）

仓库允许 pnpm 12，但在 12.0.0 正式稳定发布前不会把 `packageManager` 指向预发布版本。

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev:webpaper
```

## 目录

```text
apps/
├── webpaper/       # 壁纸播放器与 Widget 组合应用（Next.js）
├── webtools/       # 独立的静态 Web 工具应用（Next.js）
└── docs/           # 架构文档（VitePress）
packages/
├── widget-core/    # 纯 TypeScript 文档模型、事务和撤销/重做
├── widget-react/   # React Canvas、布局交互和组件目录
└── widget-studio/  # Schema 表单、Inspector、Devtools、Monaco/AI 编辑
tooling/
└── eslint/         # 全仓扁平 ESLint 配置与依赖边界
```

依赖方向固定为：

```text
apps/webpaper ──▶ widget-studio ──▶ widget-react ──▶ widget-core
       └──────────────────────────────────────────▶ widget-core
```

`widget-core` 不依赖 React、浏览器 API 或应用代码。应用只能通过包的公开导出引用库，不能深层导入其他包的 `src`。

## 关键设计

- 小鸟壁纸（BirdPaper）保留为默认媒体源，通过固定上游、参数校验和响应标准化的 BFF 路由访问。
- Konachan、BirdPaper、JSON 都实现应用定义的 `MediaSource` 端口；播放器只消费标准化 `MediaItem`。
- 播放请求可中止，并使用会话令牌阻止旧响应覆盖新选择。
- Widget 操作通过不可变事务进入统一历史记录，React 运行时不持有第二份业务状态。
- HTML Widget 使用 sandboxed `srcDoc`，iframe 只接受 HTTP(S) 且使用固定 sandbox 权限。
- 应用设置和 Widget 文档使用 Zod 校验及 v2 存储键；不兼容的旧数据显式回退到默认值。

仓库没有通用 `shared` 包。代码只有在职责稳定且至少存在真实跨应用复用时才会提取为命名明确的包。仓库也没有独立 `webtest` 包；测试与被测模块同目录，根 Vitest/Turbo 仅负责编排。

## 命令

```bash
pnpm dev:webpaper       # WebPaper，端口 5173
pnpm dev:webtools       # WebTools
pnpm dev:docs           # 文档，端口 5174

pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check              # 完整质量门禁
```

## 文档

详细设计见 [架构文档](./apps/docs/docs/guide/architecture.md)。在线文档请访问 [WebTools 文档站点](https://enelite.github.io/webtools/)。

- [项目概览](https://enelite.github.io/webtools/guide/)
- [快速开始](https://enelite.github.io/webtools/guide/getting-started)
- [架构设计](https://enelite.github.io/webtools/guide/architecture)
- [技术栈详解](https://enelite.github.io/webtools/guide/tech-stack)
