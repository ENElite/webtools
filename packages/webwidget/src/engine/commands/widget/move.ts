import type { Command, CommandSnapshot } from '../types';
import type { WidgetId, WidgetModel } from '../../model';
import { generateCommandId } from '../types';

/**
 * 移动 widget 层级命令（通过修改 order 属性，不改变数组顺序）
 */
export class MoveWidgetCommand implements Command {
    readonly id: string;
    readonly type = 'move-widget';
    readonly timestamp: number;

    readonly widgetId: WidgetId;
    readonly direction: 'up' | 'down' | 'top' | 'bottom';
    /** undo 时恢复的 order 快照：widgetId → order */
    private prevOrders: Map<string, number> = new Map();

    constructor(widgetId: WidgetId, direction: 'up' | 'down' | 'top' | 'bottom') {
        this.id = generateCommandId();
        this.timestamp = Date.now();
        this.widgetId = widgetId;
        this.direction = direction;
    }

    execute(snapshot: CommandSnapshot): WidgetModel[] {
        const widget = snapshot.widgets.find((w) => w.id === this.widgetId);
        if (!widget) {
            return snapshot.widgets;
        }

        this.prevOrders = new Map(snapshot.widgets.map((w) => [w.id, w.layout.order]));

        switch (this.direction) {
            case 'up':
                return this.swapWith(snapshot.widgets, widget.layout.order + 1);
            case 'down':
                return this.swapWith(snapshot.widgets, widget.layout.order - 1);
            case 'top':
                return this.insertAtTop(snapshot.widgets, widget.layout.order);
            case 'bottom':
                return this.insertAtBottom(snapshot.widgets, widget.layout.order);
        }
    }

    undo(snapshot: CommandSnapshot): WidgetModel[] {
        if (this.prevOrders.size === 0) {
            return snapshot.widgets;
        }

        return snapshot.widgets.map((w) => {
            const savedOrder = this.prevOrders.get(w.id);
            if (savedOrder === undefined || savedOrder === w.layout.order) {
                return w;
            }
            return { ...w, layout: { ...w.layout, order: savedOrder } };
        });
    }

    /** 交换 target 与 order 为 targetOrder 的 widget */
    private swapWith(widgets: WidgetModel[], targetOrder: number): WidgetModel[] {
        const target = widgets.find((w) => w.layout.order === targetOrder);
        if (!target) {
            return widgets;
        }

        const moved = widgets.find((w) => w.id === this.widgetId);
        if (!moved) {
            return widgets;
        }

        return widgets.map((w) => {
            if (w.id === moved.id) {
                return { ...w, layout: { ...w.layout, order: targetOrder } };
            }
            if (w.id === target.id) {
                return { ...w, layout: { ...w.layout, order: moved.layout.order } };
            }
            return w;
        });
    }

    /** 置顶：target 变为 maxOrder，所有 order > target.order 的 widget 各 -1 */
    private insertAtTop(widgets: WidgetModel[], targetOrder: number): WidgetModel[] {
        const maxOrder = Math.max(...widgets.map((w) => w.layout.order));
        if (targetOrder === maxOrder) {
            return widgets;
        }

        return widgets.map((w) => {
            if (w.id === this.widgetId) {
                return { ...w, layout: { ...w.layout, order: maxOrder } };
            }
            if (w.layout.order > targetOrder) {
                return { ...w, layout: { ...w.layout, order: w.layout.order - 1 } };
            }
            return w;
        });
    }

    /** 置底：target 变为 1，所有 order < target.order 的 widget 各 +1 */
    private insertAtBottom(widgets: WidgetModel[], targetOrder: number): WidgetModel[] {
        const minOrder = Math.min(...widgets.map((w) => w.layout.order));
        if (targetOrder === minOrder) {
            return widgets;
        }

        return widgets.map((w) => {
            if (w.id === this.widgetId) {
                return { ...w, layout: { ...w.layout, order: 1 } };
            }
            if (w.layout.order < targetOrder) {
                return { ...w, layout: { ...w.layout, order: w.layout.order + 1 } };
            }
            return w;
        });
    }

    canExecute(snapshot: CommandSnapshot): boolean {
        return snapshot.widgets.some((w) => w.id === this.widgetId);
    }

    getDescription(): string {
        const directionText = {
            up: '上移',
            down: '下移',
            top: '置顶',
            bottom: '置底',
        };
        return `${directionText[this.direction]}组件`;
    }
}
