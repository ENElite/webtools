import type { Command, CommandSnapshot } from '../types';
import type { WidgetId, WidgetModel } from '../../types';
import { generateCommandId } from '../types';

/**
 * 删除 widget 命令
 */
export class RemoveWidgetCommand implements Command {
    readonly id: string;
    readonly type = 'remove-widget';
    readonly timestamp: number;

    readonly widgetId: WidgetId;
    private removedWidget: WidgetModel | null = null; // 保存被删除的 widget 用于 undo

    constructor(widgetId: WidgetId) {
        this.id = generateCommandId();
        this.timestamp = Date.now();
        this.widgetId = widgetId;
    }

    execute(snapshot: CommandSnapshot): WidgetModel[] {
        const index = snapshot.widgets.findIndex((w) => w.id === this.widgetId);
        if (index < 0) {
            return snapshot.widgets;
        }

        // 保存被删除的 widget
        this.removedWidget = snapshot.widgets[index] ?? null;

        // 移除 widget
        const nextWidgets = snapshot.widgets.slice();
        nextWidgets.splice(index, 1);
        return nextWidgets;
    }

    undo(snapshot: CommandSnapshot): WidgetModel[] {
        if (!this.removedWidget) {
            return snapshot.widgets;
        }

        // 重新添加被删除的 widget（在原位置）
        const originalIndex = snapshot.widgets.findIndex((w) => w.id === this.widgetId);
        if (originalIndex >= 0) {
            // 如果当前位置已有相同 ID，直接替换
            return snapshot.widgets.map((w) => (w.id === this.widgetId ? this.removedWidget! : w));
        }

        // 添加回 widgets（使用原始快照中的位置，或直接添加到末尾）
        return [...snapshot.widgets, this.removedWidget];
    }

    canExecute(snapshot: CommandSnapshot): boolean {
        return snapshot.widgets.some((w) => w.id === this.widgetId);
    }

    getDescription(): string {
        return `删除组件`;
    }
}
