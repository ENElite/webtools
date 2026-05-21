import type { Command, CommandSnapshot } from '../types';
import type { WidgetId, WidgetModel } from '../../types';
import { generateCommandId } from '../types';

/**
 * 更新 widget 属性命令
 * 支持更新 layout, style, props, label, locked, autoHide 等
 */
export class UpdateWidgetCommand implements Command {
    readonly id: string;
    readonly type = 'update-widget';
    readonly timestamp: number;

    readonly widgetId: WidgetId;
    readonly patch: Partial<Omit<WidgetModel, 'id' | 'kind'>>;
    private previousValues: Partial<Omit<WidgetModel, 'id' | 'kind'>> = {}; // 保存更新前的值

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

        // 保存更新前的值（仅保存被修改的字段）
        this.previousValues = {};
        for (const key of Object.keys(this.patch) as Array<keyof typeof this.patch>) {
            this.previousValues[key as any] = (widget as any)[key];
        }

        // 应用更新
        const nextWidgets = snapshot.widgets.slice();
        nextWidgets[index] = {
            ...widget,
            ...this.patch,
        };
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

        // 恢复之前的值
        const nextWidgets = snapshot.widgets.slice();
        nextWidgets[index] = {
            ...widget,
            ...this.previousValues,
        };
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
