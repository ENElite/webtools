# @webtools/webwidget — 小组件引擎

`webwidget` 是项目的核心引擎库，提供可复用的 Overlay 小组件系统，支持拖拽、缩放、旋转、动画、撤销/重做和 Schema 驱动的设置 UI。

## 包结构

```
packages/webwidget/
├── src/
│   ├── engine/              # 核心引擎
│   │   ├── model/           # 类型定义与工厂函数
│   │   ├── commands/        # 命令模式（撤销/重做）
│   │   ├── signal/          # 信号/事件总线
│   │   ├── editor/          # 属性编辑器系统
│   │   └── animation/       # 动画预设与编译
│   ├── runtime/             # 运行时系统
│   │   ├── OverlayRoot.tsx  # 根 Overlay 组件
│   │   ├── Widget.tsx       # 小组件包装器
│   │   ├── Moveable.tsx     # 拖拽/缩放手柄
│   │   ├── SettingsPanel.tsx# 浮动设置面板
│   │   ├── RuntimeProvider.tsx # 运行时上下文
│   │   ├── runtimes/        # 子运行时
│   │   └── ables/           # Moveable 扩展
│   ├── store/               # Zustand 状态管理
│   ├── components/          # 小组件实现
│   └── hooks/               # 自定义 Hooks
├── styles.css               # 共享样式
└── index.ts                 # 入口文件
```

## 导出路径

| 路径 | 说明 |
|------|------|
| `@webtools/webwidget` | 完整导出 |
| `@webtools/webwidget/engine/model` | 模型类型与工厂函数 |
| `@webtools/webwidget/engine/editor` | 编辑器系统 |
| `@webtools/webwidget/engine/commands` | 命令模式 |
| `@webtools/webwidget/editors` | 编辑器组件 |
| `@webtools/webwidget/runtime` | 运行时系统 |
| `@webtools/webwidget/store` | 状态管理 |
| `@webtools/webwidget/components/editor` | AI 编辑器 |
| `@webtools/webwidget/components/settings` | 设置面板 |
| `@webtools/webwidget/styles.css` | 共享样式 |

## 核心模块

### Engine / Model — 模型定义

定义小组件的核心类型系统：

- **WidgetId**：小组件唯一标识（base62 编码）
- **WidgetKind**：小组件类型 — `text` | `image` | `video` | `clock` | `canvas` | `html` | `iframe` | `live2d`
- **WidgetModel**：小组件完整模型（id, kind, label, style, layout, props, animation）
- **WidgetStyle**：视觉样式（边框、圆角、透明度、背景、阴影）
- **WidgetLayout**：百分比布局（锚点、位置、尺寸、旋转、自适应模式）
- **WidgetRenderer**：小组件渲染器组件类型

工厂函数：
- `createWidget(kind, overrides?)` — 创建小组件实例
- `generateWidgetId()` — 生成唯一 ID

### Engine / Commands — 命令模式

基于 Command 接口的撤销/重做系统：

| 命令类 | 说明 |
|--------|------|
| `AddWidgetCommand` | 添加小组件 |
| `RemoveWidgetCommand` | 移除小组件 |
| `UpdateWidgetCommand` | 更新小组件属性 |
| `MoveWidgetCommand` | 移动小组件（上/下/置顶/置底） |
| `ChangeWidgetLayoutCommand` | 修改布局 |
| `CopyWidgetCommand` | 复制小组件 |
| `BatchCommand` | 批量操作 |

`CommandHistoryManager` 维护 past/future 栈，最大容量 100。

### Engine / Signal — 信号系统

类型安全的发布/订阅事件总线，支持四种信号源：

- **WidgetSignal**：小组件属性变化（携带 prev/next 值）
- **SystemSignal**：系统空闲/活跃状态
- **UserSignal**：鼠标进入/离开/点击
- **LifecycleSignal**：挂载/卸载/可见/隐藏

### Engine / Editor — 编辑器系统

Schema 驱动的属性编辑器，支持 14 种编辑器组件：

`AnimationSlotsEditor` | `BorderEditor` | `CascaderEditor` | `CodeEditor` | `ColorEditor` | `CombinerEditor` | `EnumEditor` | `FontEditor` | `ImageEditor` | `NumberEditor` | `SliderEditor` | `StringEditor` | `SwitchEditor` | `TagsEditor` | `TreeSelectEditor`

### Engine / Animation — 动画系统

11 种动画预设：fade、slide、scale、rotate、blur、glitch、typewriter、pulse、shake、bounce、flip

支持三种运动类型：spring（弹簧）、tween（补间）、transition（过渡）

### Runtime — 运行时

- **OverlayRoot**：根组件，渲染所有小组件，处理激活、悬停、设置面板、键盘快捷键（Ctrl+Z/Y）
- **Widget**：小组件包装器，处理布局定位、视觉样式、framer-motion 动画、生命周期信号
- **Moveable**：拖拽/缩放/旋转手柄（基于 react-moveable）
- **SettingsPanel**：浮动设置面板
- **RuntimeProvider**：运行时上下文，提供五个子运行时

### Store — 状态管理

- **overlayStore**：核心 Zustand store，管理小组件列表、激活状态、撤销/重做
- **widgetStore**：派生 store，提供 move-up/down/top/bottom、remove、copy、reset-rotation、toggle-lock 操作

## 小组件实现

| 小组件 | 目录 | 说明 |
|--------|------|------|
| Clock | `components/clock/` | 数字翻页时钟，支持中英文/数字格式 |
| Text | `components/text/` | 文本组件，支持跑马灯、描边、阴影 |
| Image | `components/image/` | 图片展示 |
| Video | `components/video/` | 视频播放 |
| HTML | `components/html/` | 原始 HTML 渲染 |
| iframe | `components/iframe/` | URL 嵌入 |
| Live2D | `components/live2d/` | Live2D 模型渲染 |
