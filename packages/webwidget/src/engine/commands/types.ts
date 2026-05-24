import type { WidgetId, WidgetModel } from '../model';

/**
 * 命令执行前的状态快照，用于 undo 操作
 */
export type CommandSnapshot = {
    widgets: WidgetModel[];
    activeWidgetId: WidgetId | null;
};

/**
 * 通用命令接口
 * 每个命令封装单个可逆操作，支持 execute 和 undo
 */
export interface Command {
    readonly id: string; // 唯一标识符（UUID）
    readonly type: string; // 命令类型（如 'add-widget', 'move-widget'）
    readonly timestamp: number; // 命令执行时间戳

    /**
     * 执行命令，返回新的 widgets 状态
     * @param snapshot 当前状态快照
     * @returns 执行后的新 widgets 状态
     */
    execute(snapshot: CommandSnapshot): WidgetModel[];

    /**
     * 撤销命令，恢复到执行前的状态
     * @param snapshot 命令执行前的状态快照
     * @returns 恢复后的 widgets 状态
     */
    undo(snapshot: CommandSnapshot): WidgetModel[];

    /**
     * 检查命令是否可执行
     * @param snapshot 当前状态快照
     * @returns 是否可执行
     */
    canExecute(snapshot: CommandSnapshot): boolean;

    /**
     * 获取命令的人类可读描述，用于 UI 展示
     */
    getDescription(): string;
}

/**
 * 命令历史栈的状态
 */
export type CommandHistoryState = {
    pastCommands: Command[];
    futureCommands: Command[];
    canUndo: boolean;
    canRedo: boolean;
};

/**
 * 命令执行结果
 */
export type CommandExecutionResult = {
    success: boolean;
    command: Command;
    error?: string;
};

/**
 * 生成唯一的命令 ID
 */
export function generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
