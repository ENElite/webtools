import type { Command, CommandSnapshot } from './types';
import type { WidgetModel } from '../model';
import { generateCommandId } from './types';

/**
 * 批量命令 - 将多个命令组合成一个原子操作
 * 所有命令依次执行，undo 时依次反向撤销
 */
export class BatchCommand implements Command {
    readonly id: string;
    readonly type = 'batch';
    readonly timestamp: number;

    readonly commands: Command[];
    private description: string;

    constructor(commands: Command[], description: string = '批量操作') {
        this.id = generateCommandId();
        this.timestamp = Date.now();
        this.commands = commands;
        this.description = description;
    }

    execute(snapshot: CommandSnapshot): WidgetModel[] {
        let currentState = snapshot;
        for (const command of this.commands) {
            if (!command.canExecute(currentState)) {
                // 如果某个命令无法执行，停止批量执行
                return currentState.widgets;
            }
            const widgets = command.execute(currentState);
            currentState = {
                ...currentState,
                widgets,
            };
        }
        return currentState.widgets;
    }

    undo(snapshot: CommandSnapshot): WidgetModel[] {
        // 反向撤销所有命令
        let currentState = snapshot;
        for (let i = this.commands.length - 1; i >= 0; i--) {
            const command = this.commands[i];
            if (!command) {
                continue;
            }
            const widgets = command.undo(currentState);
            currentState = {
                ...currentState,
                widgets,
            };
        }
        return currentState.widgets;
    }

    canExecute(snapshot: CommandSnapshot): boolean {
        return this.commands.every((cmd) => cmd.canExecute(snapshot));
    }

    getDescription(): string {
        return this.description;
    }
}
