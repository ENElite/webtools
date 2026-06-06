# 项目概览

WebTools 是一个基于 pnpm monorepo 的 Web 工具集项目，核心包含三个子包：

| 包名 | 路径 | 说明 |
|------|------|------|
| `@webtools/webwidget` | `packages/webwidget` | 可复用的桌面小组件引擎库 |
| `@webtools/webpaper` | `packages/webpaper` | 基于 Next.js 的图片浏览器应用 |
| `@webtools/webtest` | `packages/webtest` | 集中式测试套件 |

## 项目定位

WebTools 旨在提供一套灵活的桌面小组件系统，用户可以在浏览器中创建、拖拽、缩放和动画化各种小组件（时钟、文本、图片、Live2D 等），同时支持图片浏览功能。

### 核心能力

- **小组件管理**：创建、删除、复制、锁定、排序
- **交互操作**：拖拽移动、缩放大小、旋转角度
- **动画系统**：11 种动画预设，支持信号触发动画
- **撤销/重做**：基于命令模式的完整历史管理
- **Schema 驱动 UI**：声明式定义属性编辑器，动态渲染设置面板
- **AI 辅助编辑**：集成 DeepSeek，自然语言修改小组件属性
- **多数据源**：适配器模式支持 Konachan、BirdPaper、JSON 等图片来源

## 仓库结构

```
webtools/
├── packages/
│   ├── webwidget/          # 小组件引擎库
│   │   ├── src/
│   │   │   ├── engine/     # 核心引擎（模型、命令、信号、编辑器、动画）
│   │   │   ├── runtime/    # 运行时系统
│   │   │   ├── store/      # 状态管理
│   │   │   ├── components/ # 小组件实现
│   │   │   └── hooks/      # 自定义 Hooks
│   │   └── styles.css
│   ├── webpaper/           # 图片浏览器应用
│   │   ├── app/            # Next.js App Router
│   │   ├── features/       # 功能模块
│   │   ├── providers/      # 数据提供者（适配器模式）
│   │   ├── store/          # Zustand 状态管理
│   │   ├── components/     # UI 组件
│   │   └── hooks/          # 自定义 Hooks
│   ├── webtest/            # 集中测试
│   │   └── __test__/       # 测试文件
│   └── webdocs/            # 文档站点（VitePress）
├── scripts/                # 构建脚本
├── package.json            # monorepo 根配置
├── pnpm-workspace.yaml     # pnpm 工作区
└── tsconfig.base.json      # 共享 TypeScript 配置
```

## 模块依赖关系

```
webpaper ──依赖──▶ webwidget
   │                  │
   │                  ├── engine/model      (类型定义)
   │                  ├── engine/editor     (属性编辑器)
   │                  ├── engine/commands   (命令模式)
   │                  ├── runtime           (Overlay 运行时)
   │                  ├── store             (状态管理)
   │                  └── styles.css        (共享样式)
   │
webtest ──路径别名──▶ webpaper + webwidget
```

`webpaper` 通过 `workspace:*` 依赖 `webwidget`，`webtest` 通过 Vitest 路径别名同时测试两个包的源码。
