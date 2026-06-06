import type { Command, CommandSnapshot } from '../types';
import type { WidgetId, WidgetModel } from '../../model';
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

        // 移除 widget 并重排 order
        const remaining = snapshot.widgets.filter((w) => w.id !== this.widgetId);
        return this.renumberOrder(remaining);
    }

    undo(snapshot: CommandSnapshot): WidgetModel[] {
        if (!this.removedWidget) {
            return snapshot.widgets;
        }

        // 重新添加被删除的 widget 并重排 order
        const restored = [...snapshot.widgets, this.removedWidget];
        return this.renumberOrder(restored);
    }

    /** 按当前 order 排序后重新编号 1~N */
    private renumberOrder(widgets: WidgetModel[]): WidgetModel[] {
        const sorted = [...widgets].sort((a, b) => a.layout.order - b.layout.order);
        return sorted.map((w, i) => {
            const newOrder = i + 1;
            if (w.layout.order === newOrder) return w;
            return { ...w, layout: { ...w.layout, order: newOrder } };
        });
    }

    canExecute(snapshot: CommandSnapshot): boolean {
        return snapshot.widgets.some((w) => w.id === this.widgetId);
    }

    getDescription(): string {
        return `删除组件`;
    }
}
