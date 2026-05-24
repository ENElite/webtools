import type { Command, CommandSnapshot } from '../types';
import type { WidgetId, WidgetModel } from '../../model';
import { generateCommandId } from '../types';
import { deepMerge } from '../../editor/applyChange';

/**
 * 更新 widget 属性命令
 * 支持更新 layout, style, props, label, locked, autoHide 等
 * 使用深合并确保嵌套属性（如 style.opacity）不会覆盖整个 style 对象
 */
export class UpdateWidgetCommand implements Command {
    readonly id: string;
    readonly type = 'update-widget';
    readonly timestamp: number;

    readonly widgetId: WidgetId;
    readonly patch: Partial<Omit<WidgetModel, 'id' | 'kind'>>;
    private previousValues: Partial<Omit<WidgetModel, 'id' | 'kind'>> = {};

    constructor(widgetId: WidgetId, patch: Partial<Omit<WidgetModel, 'id' | 'kind'>>) {
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

        this.previousValues = {};
        for (const key of Object.keys(this.patch) as Array<keyof typeof this.patch>) {
            this.previousValues[key as any] = (widget as any)[key];
        }

        const nextWidgets = snapshot.widgets.slice();
        nextWidgets[index] = deepMerge(
            widget as Record<string, any>,
            this.patch as Record<string, any>,
        ) as WidgetModel;
        return nextWidgets;
    }

    undo(snapshot: CommandSnapshot): WidgetModel[] {
        const index = snapshot.widgets.findIndex((w) => w.id === this.widgetId);
        if (index < 0 || Object.keys(this.previousValues).length === 0) {
            return snapshot.widgets;
        }

        const widget = snapshot.widgets[index];
        if (!widget) {
            return snapshot.widgets;
        }

        const nextWidgets = snapshot.widgets.slice();
        nextWidgets[index] = deepMerge(
            widget as Record<string, any>,
            this.previousValues as Record<string, any>,
        ) as WidgetModel;
        return nextWidgets;
    }

    canExecute(snapshot: CommandSnapshot): boolean {
        return snapshot.widgets.some((w) => w.id === this.widgetId);
    }

    getDescription(): string {
        const keys = Object.keys(this.patch);
        if (keys.length === 1) {
            return `修改 ${keys[0]}`;
        }
        return `修改${keys.length}个属性`;
    }
}
