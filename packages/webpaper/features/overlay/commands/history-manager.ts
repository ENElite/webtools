import type { Command, CommandHistoryState } from './types';

const DEFAULT_MAX_HISTORY_SIZE = 100;

/**
 * 命令历史管理器
 * 维护 undo/redo 栈，管理命令执行和撤销
 */
export class CommandHistoryManager {
    private pastCommands: Command[] = [];
    private futureCommands: Command[] = [];
    private readonly maxHistorySize: number;

    constructor(maxHistorySize: number = DEFAULT_MAX_HISTORY_SIZE) {
        this.maxHistorySize = maxHistorySize;
    }

    /**
     * 执行命令并加入历史栈
     * 执行新命令时，清空 futureCommands（redo 栈）
     */
    execute(command: Command): void {
        this.pastCommands.push(command);
        console.log(`Executed command: ${command.getDescription()}`);

        // 限制历史栈大小
        if (this.pastCommands.length > this.maxHistorySize) {
            this.pastCommands.shift();
        }

        // 执行新命令时清空 redo 栈
        this.futureCommands = [];
    }

    /**
     * 获取上一条命令（用于 undo）
     */
    getPreviousCommand(): Command | null {
        if (this.pastCommands.length === 0) {
            return null;
        }

        const command = this.pastCommands[this.pastCommands.length - 1];
        return command ?? null;
    }

    /**
     * 撤销上一条命令
     */
    undo(): Command | null {
        const command = this.pastCommands.pop();
        if (command) {
            this.futureCommands.push(command);
        }
        return command ?? null;
    }

    /**
     * 重做上一条撤销的命令
     */
    redo(): Command | null {
        const command = this.futureCommands.pop();
        if (command) {
            this.pastCommands.push(command);
        }
        return command ?? null;
    }

    /**
     * 获取历史栈状态
     */
    getState(): CommandHistoryState {
        return {
            pastCommands: [...this.pastCommands],
            futureCommands: [...this.futureCommands],
            canUndo: this.pastCommands.length > 0,
            canRedo: this.futureCommands.length > 0,
        };
    }

    /**
     * 清空历史栈
     */
    clear(): void {
        this.pastCommands = [];
        this.futureCommands = [];
    }

    /**
     * 获取完整的命令历史（用于持久化或调试）
     */
    getFullHistory(): {
        past: Command[];
        future: Command[];
    } {
        return {
            past: [...this.pastCommands],
            future: [...this.futureCommands],
        };
    }

    /**
     * 恢复完整的命令历史（用于持久化恢复）
     */
    restoreHistory(history: { past: Command[]; future: Command[] }): void {
        this.pastCommands = [...history.past];
        this.futureCommands = [...history.future];
    }

    /**
     * 获取当前历史栈的大小
     */
    getHistorySize(): { past: number; future: number } {
        return {
            past: this.pastCommands.length,
            future: this.futureCommands.length,
        };
    }
}
