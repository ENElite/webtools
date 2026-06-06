/**
 * Signal-Slot 连接系统类型定义
 *
 * 设计思想参考 Qt 信号与槽：
 * - Connection 是一个四元组 (source, signal, target, slot)，仅描述链接
 * - 具体的执行逻辑由 WidgetRuntime 负责
 * - signal 和 slot 均为 '.' 分隔的字符串标识符
 * - 前缀匹配：slot 的 accepts 声明它能处理的 signal type 前缀模式
 */

// ─── 连接四元组 ──────────────────────────────────────────────────────────────

export type Connection = {
    /** signal 标识符，如 'model.style.opacity', 'user.mouse.click' */
    signal: string;
    /** 目标 widgetId */
    target: string;
    /** slot 标识符，如 'animation' */
    slot: string;
    /** slot 参数，如 { duration: 0.3, easing: 'ease-out' } */
    params?: Record<string, SlotParamValue>;
};

// ─── 向后兼容：旧类型别名 ────────────────────────────────────────────────────

export type SignalSource = 'widget' | 'system' | 'user' | 'lifecycle' | 'custom';

export type SlotParamValue = string | number | boolean;

export type SlotInvocation = {
    type: string;
    params?: Record<string, SlotParamValue>;
    targetWidgetId?: string;
};

export type SignalDescriptor<S extends SignalSource = SignalSource> = {
    source: S;
    type: string;
    widgetId?: string;
};

export type SignalBinding = {
    id: string;
    signal: SignalDescriptor;
    slots: SlotInvocation[];
    enabled?: boolean;
};
