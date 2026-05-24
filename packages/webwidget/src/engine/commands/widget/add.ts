import type { Command, CommandSnapshot } from '../types';
import type { WidgetModel } from '../../model';
import { generateCommandId } from '../types';

/**
 * 添加 widget 命令
 */
export class AddWidgetCommand implements Command {
    readonly id: string;
    readonly type = 'add-widget';
    readonly timestamp: number;

    readonly widget: WidgetModel;

    constructor(widget: WidgetModel) {
        this.id = generateCommandId();
        this.timestamp = Date.now();
        this.widget = widget;
    }

    execute(snapshot: CommandSnapshot): WidgetModel[] {
        // 检查是否已存在相同 ID 的 widget
        const exists = snapshot.widgets.find((w) => w.id === this.widget.id);
        if (exists) {
            // 如果已存在，替换它
            return snapshot.widgets.map((w) => (w.id === this.widget.id ? this.widget : w));
        }

        // 添加新 widget 到末尾
        return [...snapshot.widgets, this.widget];
    }

    undo(snapshot: CommandSnapshot): WidgetModel[] {
        // 移除这个 widget
        return snapshot.widgets.filter((w) => w.id !== this.widget.id);
    }

    canExecute(): boolean {
        return true;
    }

    getDescription(): string {
        return `添加组件 ${this.widget.label || this.widget.kind}`;
    }
}
