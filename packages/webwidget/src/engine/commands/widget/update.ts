import type { Command, CommandSnapshot } from '../types';
import type { WidgetId, WidgetModel } from '../../model';
import type { Patch } from '../../editor/types';
import { generateCommandId } from '../types';
import { applyChange } from '../../editor/applyChange';

/**
 * 更新 widget 属性命令
 * 接受 Patch (dot-path set/unset) 格式，在 execute 内部转换为 widget 更新
 */
export class UpdateWidgetCommand implements Command {
    readonly id: string;
    readonly type = 'update-widget';
    readonly timestamp: number;

    readonly widgetId: WidgetId;
    readonly patch: Patch;
    private previousSnapshot: WidgetModel | null = null;

    constructor(widgetId: WidgetId, patch: Patch) {
        this.id = generateCommandId();
        this.timestamp = Date.now();
        this.widgetId = widgetId;
        this.patch = patch;
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

        // Save full widget snapshot for undo
        this.previousSnapshot = { ...widget };

        // Apply patch (dot-path format) to the widget
        const nextWidget = applyChange(widget, this.patch) as WidgetModel;

        const nextWidgets = snapshot.widgets.slice();
        nextWidgets[index] = nextWidget;
        return nextWidgets;
    }

    undo(snapshot: CommandSnapshot): WidgetModel[] {
        if (!this.previousSnapshot) {
            return snapshot.widgets;
        }

        const index = snapshot.widgets.findIndex((w) => w.id === this.widgetId);
        if (index < 0) {
            return snapshot.widgets;
        }

        const nextWidgets = snapshot.widgets.slice();
        nextWidgets[index] = this.previousSnapshot;
        return nextWidgets;
    }

    canExecute(snapshot: CommandSnapshot): boolean {
        return snapshot.widgets.some((w) => w.id === this.widgetId);
    }

    getDescription(): string {
        const keys = Object.keys(this.patch.set ?? {});
        if (keys.length === 1) {
            return `修改 ${keys[0]}`;
        }
        if (keys.length > 1) {
            return `修改${keys.length}个属性`;
        }
        const unsets = this.patch.unset?.length ?? 0;
        if (unsets > 0) {
            return `删除${unsets}个属性`;
        }
        return '修改组件';
    }
}
