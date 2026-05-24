import type { Command, CommandSnapshot } from '../types';
import type { WidgetId, WidgetModel } from '../../model';
import { generateCommandId } from '../types';

/**
 * 移动 widget 在列表中的位置命令
 */
export class MoveWidgetCommand implements Command {
    readonly id: string;
    readonly type = 'move-widget';
    readonly timestamp: number;

    readonly widgetId: WidgetId;
    readonly direction: 'up' | 'down' | 'top' | 'bottom';
    private fromIndex: number = -1;
    private toIndex: number = -1;

    constructor(widgetId: WidgetId, direction: 'up' | 'down' | 'top' | 'bottom') {
        this.id = generateCommandId();
        this.timestamp = Date.now();
        this.widgetId = widgetId;
        this.direction = direction;
    }

    execute(snapshot: CommandSnapshot): WidgetModel[] {
        const fromIndex = snapshot.widgets.findIndex((w) => w.id === this.widgetId);
        if (fromIndex < 0) {
            return snapshot.widgets;
        }

        this.fromIndex = fromIndex;
        let toIndex: number;

        switch (this.direction) {
            case 'up':
                toIndex = fromIndex + 1;
                break;
            case 'down':
                toIndex = fromIndex - 1;
                break;
            case 'top':
                toIndex = snapshot.widgets.length - 1;
                break;
            case 'bottom':
                toIndex = 0;
                break;
        }

        this.toIndex = toIndex;
        return this.moveWidgetByIndex(snapshot.widgets, fromIndex, toIndex);
    }

    undo(snapshot: CommandSnapshot): WidgetModel[] {
        if (this.fromIndex < 0 || this.toIndex < 0) {
            return snapshot.widgets;
        }

        const currentIndex = snapshot.widgets.findIndex((w) => w.id === this.widgetId);
        if (currentIndex < 0) {
            return snapshot.widgets;
        }

        return this.moveWidgetByIndex(snapshot.widgets, currentIndex, this.fromIndex);
    }

    private moveWidgetByIndex(widgets: WidgetModel[], fromIndex: number, toIndex: number): WidgetModel[] {
        if (fromIndex < 0 || fromIndex >= widgets.length) {
            return widgets;
        }

        const boundedTarget = Math.min(Math.max(toIndex, 0), widgets.length - 1);
        if (boundedTarget === fromIndex) {
            return widgets;
        }

        const next = widgets.slice();
        const [moved] = next.splice(fromIndex, 1);
        if (!moved) {
            return widgets;
        }

        next.splice(boundedTarget, 0, moved);
        return next;
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
