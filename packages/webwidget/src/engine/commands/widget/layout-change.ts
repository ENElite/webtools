import type { Command, CommandSnapshot } from '../types';
import type { WidgetId, WidgetModel, WidgetLayout } from '../../model';
import { generateCommandId } from '../types';

/**
 * 修改 widget 布局命令
 * 由 Moveable 的拖拽、缩放、旋转事件生成
 */
export class ChangeWidgetLayoutCommand implements Command {
    readonly id: string;
    readonly type = 'change-widget-layout';
    readonly timestamp: number;

    readonly widgetId: WidgetId;
    readonly layoutPatch: Partial<WidgetLayout>;
    private previousLayout: WidgetLayout | null = null;

    constructor(widgetId: WidgetId, layoutPatch: Partial<WidgetLayout>) {
        this.id = generateCommandId();
        this.timestamp = Date.now();
        this.widgetId = widgetId;
        this.layoutPatch = layoutPatch;
    }

    execute(snapshot: CommandSnapshot): WidgetModel[] {
        const index = snapshot.widgets.findIndex((w) => w.id === this.widgetId);
        if (index < 0) {
            return snapshot.widgets;
        }

        const widget = snapshot.widgets[index];
        if (!widget) {
            return snapshot.widgets;
        }

        // 保存之前的 layout
        this.previousLayout = { ...widget.layout };

        // 应用 layout 更新
        const nextWidgets = snapshot.widgets.slice();
        nextWidgets[index] = {
            ...widget,
            layout: {
                ...widget.layout,
                ...this.layoutPatch,
            },
        };
        return nextWidgets;
    }

    undo(snapshot: CommandSnapshot): WidgetModel[] {
        const index = snapshot.widgets.findIndex((w) => w.id === this.widgetId);
        if (index < 0 || !this.previousLayout) {
            return snapshot.widgets;
        }

        const widget = snapshot.widgets[index];
        if (!widget) {
            return snapshot.widgets;
        }

        // 恢复之前的 layout
        const nextWidgets = snapshot.widgets.slice();
        nextWidgets[index] = {
            ...widget,
            layout: this.previousLayout,
        };
        return nextWidgets;
    }

    canExecute(snapshot: CommandSnapshot): boolean {
        return snapshot.widgets.some((w) => w.id === this.widgetId);
    }

    getDescription(): string {
        const keys = Object.keys(this.layoutPatch);
        if (keys.includes('x') || keys.includes('y')) {
            return '移动组件';
        }
        if (keys.includes('w') || keys.includes('h')) {
            return '调整组件大小';
        }
        if (keys.includes('rotation')) {
            return '旋转组件';
        }
        return '修改布局';
    }
}
