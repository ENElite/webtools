import type { Command, CommandSnapshot } from '../types';
import type { WidgetId, WidgetModel, WidgetLayout } from '../../model';
import { generateCommandId } from '../types';

/**
 * 复制 widget 命令
 */
export class CopyWidgetCommand implements Command {
    readonly id: string;
    readonly type = 'copy-widget';
    readonly timestamp: number;

    readonly sourceWidgetId: WidgetId;
    readonly newLayout?: Partial<WidgetLayout>;
    private newWidgetId: WidgetId | null = null;

    constructor(sourceWidgetId: WidgetId, newLayout?: Partial<WidgetLayout>) {
        this.id = generateCommandId();
        this.timestamp = Date.now();
        this.sourceWidgetId = sourceWidgetId;
        this.newLayout = newLayout;
    }

    execute(snapshot: CommandSnapshot): WidgetModel[] {
        const sourceIndex = snapshot.widgets.findIndex((w) => w.id === this.sourceWidgetId);
        if (sourceIndex < 0) {
            return snapshot.widgets;
        }

        const sourceWidget = snapshot.widgets[sourceIndex];
        if (!sourceWidget) {
            return snapshot.widgets;
        }

        // 生成新 widget ID
        const newId = `widget_${Date.now()}_${Math.random().toString(36).slice(2, 9)}` as WidgetId;
        this.newWidgetId = newId;

        // 计算新 layout
        const maxOrder = snapshot.widgets.reduce((max, w) => Math.max(max, w.layout.order), 0);
        const newLayout = {
            ...sourceWidget.layout,
            ...(this.newLayout || {}),
            order: maxOrder + 1,
        };

        // 如果没有指定新 layout，则默认稍微偏移
        if (!this.newLayout) {
            newLayout.x += 2;
            newLayout.y += 2;
        }

        // 创建复制的 widget（深拷贝 props 和 style 避免引用共享）
        const newWidget: WidgetModel = {
            ...sourceWidget,
            id: newId,
            layout: newLayout,
            props: { ...sourceWidget.props },
            style: { ...sourceWidget.style },
        };

        // 添加到末尾
        return [...snapshot.widgets, newWidget];
    }

    undo(snapshot: CommandSnapshot): WidgetModel[] {
        if (!this.newWidgetId) {
            return snapshot.widgets;
        }

        // 移除新创建的 widget
        return snapshot.widgets.filter((w) => w.id !== this.newWidgetId);
    }

    canExecute(snapshot: CommandSnapshot): boolean {
        return snapshot.widgets.some((w) => w.id === this.sourceWidgetId);
    }

    getDescription(): string {
        return '复制组件';
    }
}
