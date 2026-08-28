# 技术栈

## 语言

### TypeScript 5.9

**需求**：项目涉及复杂的类型系统（递归泛型路径、Schema 驱动的编辑器、信号类型推导），需要强类型保障大型代码库的可维护性。

**备选方案**：

| 方案 | 不选原因 |
|------|----------|
| JavaScript | 无类型系统，小组件引擎的 `WidgetPath` 递归泛型、`InspectorSchema` 绑定路径等核心设计无法表达，大型 monorepo 维护成本高 |
| Flow | Meta 已停止主推，生态和工具链（IDE、Linter）远不如 TypeScript 成熟 |

**选型理由**：TypeScript 是当前 Web 前端事实标准，严格模式 + 实验装饰器满足项目对类型安全的需求，且与 React、Vite、Next.js 生态完全兼容。

---

## UI 框架

### React 19

**需求**：小组件引擎需要细粒度的组件控制（每个小组件是独立的 React 组件），动画系统需要与渲染周期深度集成，Overlay 系统需要高效的 diff 更新。

**备选方案**：

| 方案 | 不选原因 |
|------|----------|
| Vue 3 | Composition API 优秀，但 react-moveable、Framer Motion 等关键依赖的 React 生态更成熟；Vue 版本的移动/动画库质量和维护活跃度不如 React 对应物 |
| Svelte | 编译时框架性能优秀，但生态规模小，缺少成熟的拖拽/动画/编辑器组件库；monorepo 中作为库发布（webwidget）时 Svelte 组件的复用性不如 React |
| Solid | 性能优于 React，但生态极小，缺少 Framer Motion、react-moveable 等关键依赖的 Solid 版本 |

**选型理由**：React 拥有最大的组件生态，Framer Motion、react-moveable、Monaco Editor 等关键依赖均为 React 原生支持，且 React 19 的 Server Components 和新 Hooks 为 Next.js 集成提供基础。

### Next.js 16 (App Router)

**需求**：webpaper 需要 BFF（Backend For Frontend）API 路由代理外部图片 API 和 AI API，避免 CORS 问题；需要 SSR/SSG 能力；需要图片优化（远程图片 domain 配置）。

**备选方案**：

| 方案 | 不选原因 |
|------|----------|
| Vite + React SPA | 无 BFF 能力，代理外部 API 需要额外配置 nginx/代理服务器；无内置图片优化 |
| Remix | 数据加载模型优秀，但 BFF API 路由不如 Next.js 灵活；社区和插件生态小于 Next.js |
| Nuxt 3 | Vue 生态，与 React 技术栈不兼容 |
| Astro | 静态站点优先，不适合需要丰富客户端交互的应用 |

**选型理由**：Next.js App Router 提供原生 BFF API Routes（`app/api/` 目录下直接写 API），支持远程图片 `remotePatterns` 配置，Turbopack 提供快速开发体验，是 React 生态最成熟的全栈框架。

---

## 组件库

### Ant Design 6

**需求**：设置面板、历史抽屉、表单控件等需要成熟的通用 UI 组件，支持主题定制和国际化。

**备选方案**：

| 方案 | 不选原因 |
|------|----------|
| Material UI (MUI) | 设计语言偏 Google 风格，与项目整体设计语言不一致；Bundle 体积较大 |
| Chakra UI | 原子化设计优秀，但复杂表单组件（TreeSelect、Cascader）不如 Ant Design 完善 |
| shadcn/ui | 需要自行维护组件源码，缺乏 Ant Design 的 Table、Form、Drawer 等复杂组件的开箱即用体验 |
| Radix UI + Tailwind | 底层原语优秀，但需要大量自行组装，开发效率低于 Ant Design |

**选型理由**：Ant Design 提供最完整的后台/工具类组件集（Form、Table、Drawer、TreeSelect、Cascader 等），中文社区活跃，与 React 19 兼容。

### HeroUI 2

**需求**：部分 UI 组件需要更现代的设计语言，作为 Ant Design 的补充。

**选型理由**：与 Ant Design 互补，提供不同风格的组件选项。

---

## 状态管理

### Zustand 5 + Immer 11

**需求**：小组件引擎需要高性能的状态管理（widget 列表频繁更新），需要不可变更新保障状态一致性，需要支持命令模式的 undo/redo 快照。

**备选方案**：

| 方案 | 不选原因 |
|------|----------|
| Redux Toolkit | 概念多（action、reducer、middleware、slice），样板代码多；小组件引擎的状态操作频繁，Redux 的 dispatch 模式增加复杂度 |
| MobX | 响应式系统优秀，但与 React 的 Strict Mode 兼容性问题多；调试工具不如 Zustand 直观；不可变性保障弱 |
| Jotai | 原子化模型适合细粒度状态，但小组件列表是整体数据结构，原子化拆分增加复杂度 |
| React Context + useReducer | 无中间件支持，难以实现命令模式的 undo/redo；大规模更新性能差（Context 变化导致全树重渲染） |

**选型理由**：Zustand API 极简（`create` + `set`），天然支持不可变更新，与 Immer 集成后可直接 "写" 出不可变更新逻辑。`overlayStore` 和 `recordStore` 的复杂状态操作在 Zustand 中实现最为简洁。Zustand 的 `subscribe` 机制也便于信号系统集成。

---

## 动画与交互

### Framer Motion 12

**需求**：小组件需要声明式动画（入场、退场、属性变化触发），需要 `AnimatePresence` 管理组件挂载/卸载动画，需要弹簧物理动画。

**备选方案**：

| 方案 | 不选原因 |
|------|----------|
| React Spring | 弹簧动画优秀，但缺少 `AnimatePresence` 这样的声明式入场/退场管理；API 设计较底层 |
| React Transition Group | 仅提供基础的挂载/卸载过渡，无声明式动画配置能力 |
| CSS Animations/Transitions | 无法通过 JS 动态控制动画参数（intensity、direction），难以与信号系统集成 |
| Motion One (motion.dev) | 新兴库，API 类似 Framer Motion 但生态和社区规模小，缺少 React 版本的成熟度 |

**选型理由**：Framer Motion 提供最完整的声明式动画方案：`AnimatePresence` 管理入场/退场、`variants` 定义动画状态、弹簧/补间/关键帧多种运动类型、`useAnimationControls` 程序化控制。动画预设系统（`buildPreset`）直接编译为 Framer Motion 配置。

### react-moveable 0.56

**需求**：小组件需要拖拽移动、缩放大小、旋转角度的交互手柄，需要吸附辅助线。

**备选方案**：

| 方案 | 不选原因 |
|------|----------|
| react-draggable | 仅支持拖拽，不支持缩放和旋转 |
| react-resizable | 仅支持缩放，不支持拖拽和旋转 |
| react-grid-layout | 网格布局专用，不适合自由定位的 Overlay 场景 |
| @dnd-kit | 拖拽排序库，面向列表/网格排序，不适合自由拖拽 + 缩放 + 旋转的组合 |

**选型理由**：react-moveable 是唯一同时支持拖拽、缩放、旋转、snap 吸附的 React 库，且支持自定义 Able 扩展（`dimensionable`、`widgetable`），满足 Overlay 系统的完整交互需求。

---

## AI 集成

### LangChain + @langchain/openai

**需求**：AI 编辑器需要通过自然语言修改小组件属性，需要 Agent 工具调用能力，需要与 DeepSeek API（OpenAI 兼容接口）对接。

**备选方案**：

| 方案 | 不选原因 |
|------|----------|
| 直接调用 OpenAI SDK | 需要自行实现 Agent 循环、工具调用解析、对话历史管理，重复造轮子 |
| Vercel AI SDK | 流式输出优秀，但 Agent/工具调用能力不如 LangChain 完善 |
| LlamaIndex | 偏向 RAG 场景，Agent 能力不如 LangChain |

**选型理由**：LangChain 提供完整的 Agent 框架（工具定义、工具调用、对话管理），`@langchain/openai` 兼容 DeepSeek 的 OpenAI 格式 API，减少 AI 编辑器的底层实现成本。

### Monaco Editor 0.52

**需求**：AI 编辑器需要代码编辑能力（HTML/CSS/JavaScript 片段编辑），需要语法高亮和自动补全。

**备选方案**：

| 方案 | 不选原因 |
|------|----------|
| CodeMirror 6 | 轻量优秀，但语法高亮和自动补全能力不如 Monaco |
| Ace Editor | 维护活跃度下降，社区不如 Monaco |
| Prism.js (仅高亮) | 仅高亮无编辑能力 |

**选型理由**：Monaco Editor 是 VS Code 的核心编辑器，提供最完整的代码编辑体验（语法高亮、自动补全、错误提示），通过 `@monaco-editor/react` 封装后集成简单。

---

## 构建工具

### pnpm 10.8（包管理器 + 工作区）

**需求**：monorepo 需要高效的依赖管理（避免重复安装）、严格的依赖隔离（防止幽灵依赖）、工作区协议（`workspace:*`）。

**备选方案**：

| 方案 | 不选原因 |
|------|----------|
| npm | 依赖扁平化导致幽灵依赖问题，monorepo 工作区功能弱于 pnpm |
| yarn (Classic) | v1 已停止主要开发；yarn berry (v2+) 的 PnP 模式与部分工具兼容性差，node_modules linker 模式退化为类 npm |
| yarn berry (v4) | PnP 模式对 Node.js 生态兼容性仍有问题，团队学习成本高 |

**选型理由**：pnpm 通过硬链接 + 符号链接实现高效的磁盘空间利用，严格的依赖隔离杜绝幽灵依赖，`workspace:` 协议原生支持 monorepo 包间引用。

### Vite 6.4（webwidget 构建）

**需求**：webwidget 作为库需要构建为可发布的包，需要快速的 HMR 开发体验。

**备选方案**：

| 方案 | 不选原因 |
|------|----------|
| Webpack 5 | 配置复杂，HMR 速度慢于 Vite；对 ESM 原生支持不如 Vite |
| esbuild | 极快但功能有限，缺少完整的插件系统和 HMR |
| Rollup | 构建库优秀，但开发服务器体验不如 Vite（Vite 底层用 Rollup 做生产构建） |
| Turbopack | Next.js 专用，不支持独立库构建 |

**选型理由**：Vite 开发时使用 esbuild 预构建依赖（极快），生产构建使用 Rollup（输出质量高），同时满足开发体验和库构建需求。

### Vitest 4.1（单元测试）

**需求**：需要与 Vite 共享配置（路径别名、插件），需要 jsdom 环境测试 React 组件，需要覆盖率报告覆盖跨包源码。

**备选方案**：

| 方案 | 不选原因 |
|------|----------|
| Jest | 配置与 Vite 不共享，路径别名需要重复配置；ESM 支持需要额外配置（`--experimental-vm-modules`） |
| Testing Library | 是测试工具库而非测试运行器，通常与 Jest/Vitest 配合使用 |

**选型理由**：Vitest 与 Vite 共享配置（路径别名、插件直接复用），原生 ESM 支持，API 与 Jest 兼容（迁移成本低），`@vitest/coverage-v8` 提供精确的覆盖率报告。

### ESLint 9 + neostandard

**需求**：统一代码风格，支持 TypeScript 检查，4 空格缩进 + 分号 + 尾逗号。

**备选方案**：

| 方案 | 不选原因 |
|------|----------|
| Prettier (单独使用) | 仅格式化不检查代码质量（如未使用变量、潜在 bug） |
| xo | 零配置优秀但定制性差，难以满足项目的特定规则需求 |
| biome | 极快但规则覆盖度不如 ESLint，插件生态小 |

**选型理由**：ESLint 9 的扁平配置（`eslint.config.ts`）简化了配置，`neostandard` 基于 `standardjs` 规则集提供合理的默认值，同时支持 TypeScript 和自定义规则。

### Tailwind CSS 4.2

**需求**：项目需要快速迭代 UI 样式，需要与 React 组件集成，需要自定义图标系统（Iconify）。

**备选方案**：

| 方案 | 不选原因 |
|------|----------|
| CSS Modules | 需要为每个组件编写独立的 `.module.css` 文件，开发效率低 |
| styled-components / emotion | 运行时 CSS-in-JS 性能开销大，SSR 配置复杂，与 Tailwind 的原子化理念冲突 |
| vanilla-extract | 编译时 CSS-in-JS 优秀，但生态和社区不如 Tailwind |
| UnoCSS | 原子化 CSS 引擎，与 Tailwind 兼容但生态和文档不如 Tailwind 成熟 |

**选型理由**：Tailwind CSS 4 使用原生 CSS 层（`@layer`）和 Lightning CSS，性能大幅提升；`@iconify/tailwind4` 插件通过 `icon-*` 前缀直接在模板中使用数千个图标，无需单独导入。

---

## 其他关键依赖

### Zod 4

**需求**：Schema 驱动的设置系统需要运行时类型验证，API 响应需要安全解析。

**备选方案**：

| 方案 | 不选原因 |
|------|----------|
| Yup | API 设计不如 Zod 直观，TypeScript 类型推导不如 Zod 精确 |
| Joi | 运行时验证库，无 TypeScript 类型推导支持 |
| Superstruct | 社区小，维护活跃度低 |

**选型理由**：Zod 的 `z.infer<>` 可从 Schema 直接推导 TypeScript 类型，实现"一次定义，类型 + 验证同步"，与 TypeScript 集成最好。

### l2d

**需求**：Live2D 模型渲染，需要在 Canvas 上加载和展示 Live2D Cubism 模型。

**选型理由**：项目中 Live2D 渲染的核心依赖，提供模型加载、动画播放、鼠标跟踪等功能。

### @reactuses/core

**需求**：提供高质量的实用 Hooks（`useIdle`、`useElementSize`、`useMouse` 等），避免重复造轮子。

**备选方案**：

| 方案 | 不选原因 |
|------|----------|
| ahooks (阿里) | Hooks 数量多但部分 Hook 设计不够精简，bundle 体积大 |
| react-use | 维护活跃度下降，部分 Hook 不兼容 React 19 |
| 自行实现 | 常用 Hooks（idle 检测、元素尺寸、鼠标位置）逻辑通用，自行实现是重复劳动 |

**选型理由**：`@reactuses/core` 体积小、Tree-shakable、维护活跃、兼容 React 19，提供项目实际使用的 `useIdle`、`useElementSize`、`useMouse` 等 Hooks。

### @iconify/react

**需求**：项目需要丰富的图标系统，支持多种图标集。

**备选方案**：

| 方案 | 不选原因 |
|------|----------|
| react-icons | 包含多套图标但需要逐个导入，无 Tree-shaking 优化 |
| lucide-react | 图标集有限，风格单一 |
| Heroicons | 仅 Tailwind 官方图标集，数量不足 |

**选型理由**：Iconify 聚合了 100+ 图标集（100,000+ 图标），通过 `@iconify/tailwind4` 插件可在 Tailwind 模板中直接使用 `icon-[prefix--name]` 语法，无需导入组件。

---

## 模块系统

项目使用 ES Modules（`"type": "module"`），TypeScript 编译目标为 ES2021，支持 `import.meta` 和顶级 `await`。

## 版本总览

| 技术 | 版本 | 类别 |
|------|------|------|
| TypeScript | 5.9 | 语言 |
| React | 19 | UI 框架 |
| Next.js | 16 | 应用框架 |
| Ant Design | 6 | 组件库 |
| HeroUI | 2 | 组件库 |
| Zustand | 5 | 状态管理 |
| Immer | 11 | 不可变更新 |
| Framer Motion | 12 | 动画 |
| react-moveable | 0.56 | 拖拽/缩放 |
| LangChain | 1.1 | AI 编排 |
| Monaco Editor | 0.52 | 代码编辑 |
| pnpm | 10.8 | 包管理 |
| Vite | 6.4 | 构建 |
| Vitest | 4.1 | 测试 |
| ESLint | 9 | 代码规范 |
| Tailwind CSS | 4.2 | 样式 |
| Zod | 4 | 验证 |
| l2d | 2.1 | Live2D |
