# 架构设计

## 整体架构

WebTools 采用分层架构，将核心引擎（webwidget）与应用层（webpaper）分离：

```
┌─────────────────────────────────────────────────┐
│                   应用层                         │
│  ┌─────────────────────────────────────────────┐ │
│  │              webpaper                       │ │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────┐  │ │
│  │  │  Paper   │ │ History  │ │  Settings  │  │ │
│  │  │ (图片)   │ │ (历史)   │ │  (设置)    │  │ │
│  │  └────┬─────┘ └──────────┘ └────────────┘  │ │
│  │       │                                     │ │
│  │  ┌────▼─────────────────────────────────┐   │ │
│  │  │        Provider 适配器层             │   │ │
│  │  │  Konachan │ BirdPaper │ JSON         │   │ │
│  │  └──────────────────────────────────────┘   │ │
│  │  ┌──────────────────────────────────────┐   │ │
│  │  │        Store (Zustand)               │   │ │
│  │  │  paperStore  │  recordStore          │   │ │
│  │  └──────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│                 引擎层                          │
│  ┌─────────────────────────────────────────────┐ │
│  │            webwidget                        │ │
│  │  ┌────────┐ ┌────────┐ ┌────────────────┐  │ │
│  │  │ Model  │ │Signal  │ │   Commands     │  │ │
│  │  │(类型)  │ │(事件)  │ │  (撤销/重做)   │  │ │
│  │  └────────┘ └────────┘ └────────────────┘  │ │
│  │  ┌────────┐ ┌────────┐ ┌────────────────┐  │ │
│  │  │ Editor │ │Animatn │ │   Runtime      │  │ │
│  │  │(编辑)  │ │(动画)  │ │  (运行时)      │  │ │
│  │  └────────┘ └────────┘ └────────────────┘  │ │
│  │  ┌──────────────────────────────────────┐   │ │
│  │  │        Store (Zustand)               │   │ │
│  │  │  overlayStore  │  widgetStore        │   │ │
│  │  └──────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│                 基础设施                         │
│  React 19 │ Zustand 5 │ Framer Motion 12        │
│  react-moveable │ Tailwind CSS 4                │
└─────────────────────────────────────────────────┘
```

## 核心设计模式

### 1. 适配器模式（Provider Pattern）

`webpaper` 使用适配器模式统一不同图片来源的 API 差异：

```typescript
// providers/types.ts
interface ApiAdapter<P = Record<string, unknown>> {
    provider: Provider;
    fetch: (api: string, params: P, page: number) => Promise<PageResult>;
    normalize: (raw: any, params?: P) => ProviderRecord[];
    hasMore: (raw: any, page: number) => boolean;
}
```

每个适配器（Konachan、BirdPaper、JSON）实现 `ApiAdapter` 接口，通过注册表统一管理。

### 2. 命令模式（Command Pattern）

所有小组件操作通过 `Command` 接口封装，支持完整的撤销/重做：

```typescript
// engine/commands/types.ts
interface Command {
    execute(snapshot: CommandSnapshot): WidgetModel[];
    undo(snapshot: CommandSnapshot): WidgetModel[];
    canExecute(snapshot: CommandSnapshot): boolean;
    getDescription(): string;
}
```

具体命令类包括：`AddWidgetCommand`、`RemoveWidgetCommand`、`UpdateWidgetCommand`、`MoveWidgetCommand`、`ChangeWidgetLayoutCommand`、`CopyWidgetCommand`。

### 3. 信号/事件总线（Signal Bus）

类型安全的发布/订阅系统，解耦小组件状态变化与动画/运行时响应：

```typescript
// engine/signal/types.ts
type Signal = WidgetSignal | SystemSignal | UserSignal | LifecycleSignal;
```

四种信号源：
- **Widget**：小组件属性变化
- **System**：系统空闲/活跃状态
- **User**：鼠标交互事件
- **Lifecycle**：挂载/卸载/可见/隐藏

### 4. Schema 驱动的设置 UI

通过 `InspectorSchema` 声明式定义属性编辑器，动态渲染设置面板：

```typescript
// engine/editor/types.ts
type InspectorSchemaItem = {
    key: string;
    type: string;        // 编辑器类型：enum, color, font, string, number...
    bind: BindPath;      // 绑定到小组件的属性路径
    page: string;        // 所属分页
    group?: string;      // 分组
    order: number;       // 排序
    visibleWhen?: { field: WidgetPath; equals: any };  // 条件显示
};
```

### 5. 百分比布局系统

小组件位置和尺寸使用百分比存储，支持锚点和自适应模式：

```typescript
type WidgetLayout = {
    anchorX: 'left' | 'center' | 'right';   // 水平锚点
    anchorY: 'top' | 'center' | 'bottom';   // 垂直锚点
    x: number;    // X 偏移（百分比）
    y: number;    // Y 偏移（百分比）
    w: number;    // 宽度（百分比）
    h: number;    // 高度（百分比）
    rotation: number;
    adapt: 'stretch' | 'fixed';  // 自适应模式
};
```

### 6. 运行时分层

运行时系统按职责拆分为五个子运行时：

| 运行时 | 职责 |
|--------|------|
| `userRuntime` | 鼠标进入/离开/点击事件 |
| `systemRuntime` | 系统空闲/活跃状态 |
| `lifecycleRuntime` | 挂载/卸载/可见/隐藏 |
| `animationRuntime` | 动画编译与播放 |
| `visualStateRuntime` | 视觉状态管理 |

## 数据流

```
用户操作 → Store → Command.execute() → 新状态 + Signal 发射
                                              ↓
                                     SignalBus.emit()
                                              ↓
                              ┌───────────────┼───────────────┐
                              ↓               ↓               ↓
                         动画系统          运行时响应       UI 更新
                    (animationRuntime)  (lifecycleRuntime) (React 重渲染)
```
