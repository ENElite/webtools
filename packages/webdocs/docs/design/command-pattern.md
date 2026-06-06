# 命令模式设计

## 概述

所有小组件操作通过 `Command` 接口封装，支持完整的撤销/重做功能。命令模式确保每个操作都是可逆的，并且可以序列化和回放。

## 核心类型

### Command 接口

```typescript
interface Command {
    readonly id: string;        // 唯一标识符（UUID）
    readonly type: string;      // 命令类型
    readonly timestamp: number; // 执行时间戳

    execute(snapshot: CommandSnapshot): WidgetModel[];
    undo(snapshot: CommandSnapshot): WidgetModel[];
    canExecute(snapshot: CommandSnapshot): boolean;
    getDescription(): string;
}
```

### CommandSnapshot

执行命令前的状态快照：

```typescript
type CommandSnapshot = {
    widgets: WidgetModel[];
    activeWidgetId: WidgetId | null;
};
```

## 命令历史管理器

```typescript
class CommandHistoryManager {
    private pastCommands: Command[];   // 已执行命令栈
    private futureCommands: Command[]; // 已撤销命令栈
    private maxSize: number;           // 最大容量（默认 100）

    execute(command: Command): void;   // 执行命令
    undo(): Command | null;            // 撤销
    redo(): Command | null;            // 重做
    getState(): CommandHistoryState;   // 获取状态
    clear(): void;                     // 清空历史
}
```

**栈管理**：
- `execute`：将命令压入 `pastCommands`，清空 `futureCommands`
- `undo`：从 `pastCommands` 弹出，压入 `futureCommands`
- `redo`：从 `futureCommands` 弹出，压入 `pastCommands`
- 达到 `maxSize` 时丢弃最早的命令

## 具体命令

### AddWidgetCommand

```typescript
class AddWidgetCommand implements Command {
    type = 'add-widget';
    constructor(private widget: WidgetModel) {}

    execute(snapshot) {
        return [...snapshot.widgets, this.widget];
    }

    undo(snapshot) {
        return snapshot.widgets.filter(w => w.id !== this.widget.id);
    }
}
```

### RemoveWidgetCommand

```typescript
class RemoveWidgetCommand implements Command {
    type = 'remove-widget';
    constructor(private widgetId: WidgetId) {}

    execute(snapshot) {
        return snapshot.widgets.filter(w => w.id !== this.widgetId);
    }

    undo(snapshot) {
        // 需要从 CommandHistoryManager 获取被删除的 widget
        return [...snapshot.widgets, this.removedWidget];
    }
}
```

### UpdateWidgetCommand

```typescript
class UpdateWidgetCommand implements Command {
    type = 'update-widget';
    constructor(
        private widgetId: WidgetId,
        private patch: Partial<Omit<WidgetModel, 'id'>>,
    ) {}

    execute(snapshot) {
        return snapshot.widgets.map(w =>
            w.id === this.widgetId ? { ...w, ...this.patch } : w
        );
    }

    undo(snapshot) {
        // 恢复到执行前的状态
        return snapshot.widgets.map(w =>
            w.id === this.widgetId ? this.prevWidget : w
        );
    }
}
```

### MoveWidgetCommand

支持四种移动方向：上、下、置顶、置底。

### ChangeWidgetLayoutCommand

修改小组件的布局属性（位置、尺寸、旋转等）。

### CopyWidgetCommand

复制小组件，可选指定新的布局位置。

### BatchCommand

批量操作，组合多个命令为一个原子操作：

```typescript
class BatchCommand implements Command {
    type = 'batch';
    constructor(private commands: Command[]) {}

    execute(snapshot) {
        let widgets = snapshot.widgets;
        for (const cmd of this.commands) {
            widgets = cmd.execute({ ...snapshot, widgets });
        }
        return widgets;
    }

    undo(snapshot) {
        let widgets = snapshot.widgets;
        for (const cmd of [...this.commands].reverse()) {
            widgets = cmd.undo({ ...snapshot, widgets });
        }
        return widgets;
    }
}
```

## Store 集成

`overlayStore` 通过 `executeCommand` 方法执行命令：

```typescript
executeCommand: (command) => {
    set((state) => {
        const snapshot = { widgets: state.widgets, activeWidgetId: state.activeWidgetId };

        if (!command.canExecute(snapshot)) return state;

        const nextWidgets = command.execute(snapshot);
        historyManager.execute(command);

        // 发射信号...
        // 更新 canUndo/canRedo...
        return { widgets: nextWidgets, canUndo, canRedo };
    });
},
```

## 键盘快捷键

- `Ctrl+Z` / `Cmd+Z`：撤销
- `Ctrl+Y` / `Cmd+Y` / `Ctrl+Shift+Z`：重做

在 `OverlayRoot` 中通过 `keydown` 事件监听实现。

## 设计决策

1. **不可变更新**：每个命令返回新的 widget 数组，不修改原状态
2. **快照机制**：执行前保存快照，undo 时恢复
3. **容量限制**：最多保留 100 条命令，防止内存溢出
4. **批量操作**：`BatchCommand` 支持原子性多步操作
5. **信号集成**：命令执行后自动发射信号，驱动动画和运行时响应
