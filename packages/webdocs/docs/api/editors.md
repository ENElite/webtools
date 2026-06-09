# 编辑器系统

## 概述

编辑器系统通过 `InspectorSchema` 声明式定义属性编辑器，`PropertyInspector` 组件动态渲染对应的编辑器 UI。

## InspectorSchema

Schema 数组，每个元素描述一个属性编辑器：

```typescript
type InspectorSchemaItem = {
    key: string;           // 唯一标识
    label?: string;        // 显示名称
    type: string;          // 编辑器类型
    meta?: Record<string, any>;  // 类型特定元数据
    bind: BindPath;        // 绑定到小组件的属性路径
    page: string;          // 所属分页
    group?: string;        // 分组
    order: number;         // 排序（越小越靠前）
    visibleWhen?: {        // 条件显示
        field: WidgetPath;
        equals: any;
    };
};

type InspectorSchema = ReadonlyArray<InspectorSchemaItem>;
```

## 属性路径系统

### WidgetPath

类型安全的小组件属性路径，使用 TypeScript 递归泛型生成：

```typescript
type WidgetPath = Path<WidgetModel>;
// 示例：'style.opacity' | 'layout.x' | 'props.fontSize' | ...
```

### BindPath

绑定路径，可以是单个路径或路径数组：

```typescript
type BindPath = WidgetPath | WidgetPath[];
```

### Patch

属性修改补丁：

```typescript
type Patch = {
    set?: { [K in WidgetPath]?: PathValue<WidgetModel, K> };
    unset?: WidgetPath[];
};
```

## 分页系统

### PageDefinition

```typescript
type PageDefinition = {
    key: string;        // 分页唯一标识
    label: string;      // 显示名称
    icon?: string;      // 图标
    order: number;      // 排序
    visible?: boolean;  // 是否可见
    disabled?: boolean; // 是否禁用
};
```

### PageRegistry

```typescript
type PageRegistry = ReadonlyArray<PageDefinition>;
```

## 编辑器组件（19 种）

### AnimationSettingsEditor

动画设置编辑器，替代旧的 `AnimationSlotsEditor`。配置 CSS 属性过渡动画的缓动曲线、时长、延迟，以及选择参与过渡的 CSS 属性。

### BorderEditor

边框编辑器，配置边框样式、宽度、颜色。

### CascaderEditor

级联选择器，支持多级选项。

### CodeEditor

代码编辑器（基于 Monaco Editor），用于编辑 HTML/JavaScript/CSS。

### CodePicker

代码选择器，提供代码片段的快速选择和插入。

### ColorEditor

颜色选择器，支持颜色值输入和颜色面板。

### CombinerEditor

组合器编辑器，组合多个属性为一个编辑控件。

### ConnectionEditor

连接编辑器，用于配置小组件的信号-槽连接（Signal-Slot Connection）。支持选择目标 widget、信号类型、Slot 和参数。

### EnumEditor

枚举选择器，从预定义选项中选择。

### FontEditor

字体选择器，支持系统字体、本地字体（通过 `window.queryLocalFonts()`）和 URL 字体加载。

### ImageEditor

图片选择器，配置图片 URL。

### MonacoCodeEditor

Monaco 代码编辑器，提供完整的代码编辑体验（语法高亮、自动补全等）。

### NumberEditor

数字输入框，支持范围约束。

### PropertyTagsEditor

属性标签编辑器，管理带属性的标签列表。

### SliderEditor

滑块编辑器，拖动选择数值范围。

### StringEditor

文本输入框，支持单行/多行文本。

### SwitchEditor

开关切换器，布尔值切换。

### TagsEditor

标签编辑器，管理标签列表。

### TreeSelectEditor

树形选择器，支持树形结构选项。

## 组件注册

编辑器组件通过注册表管理：

```typescript
// engine/editor/registry.ts
const editorRegistry = new Map<string, ComponentType<any>>();

function registerEditor(type: string, component: ComponentType<any>): void;
function getEditor(type: string): ComponentType<any> | undefined;
```

## PropertyInspector

主编辑器组件，接收 schema 和当前小组件模型，动态渲染编辑器：

```typescript
type InspectorProps = {
    value: WidgetModel;          // 当前小组件模型
    schema: InspectorSchema;     // 编辑器 Schema
    pages?: PageRegistry;        // 分页定义
    onChange: (patch: Patch) => void;  // 变更回调
};
```

### 工作流程

1. 解析 `schema`，按 `page` 和 `group` 分组
2. 根据 `type` 从注册表获取对应的编辑器组件
3. 通过 `bind` 路径读取当前值
4. 编辑器组件渲染 UI
5. 用户修改时，通过 `onChange` 回调传递 `Patch`
6. `applyChange` 函数将 Patch 应用到小组件模型

### applyChange

```typescript
function applyChange(model: WidgetModel, patch: Patch): WidgetModel;
```

将 Patch 应用到小组件模型，返回新的模型实例。

## 条件显示

通过 `visibleWhen` 实现条件显示：

```typescript
{
    key: 'shadowColor',
    type: 'color',
    bind: 'style.shadowColor',
    page: 'style',
    order: 2,
    visibleWhen: { field: 'style.shadowRadius', equals: 10 },
}
```

当 `style.shadowRadius` 等于 10 时才显示此编辑器。
