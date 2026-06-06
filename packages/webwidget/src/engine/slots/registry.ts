/**
 * Slot 定义与类型安全约束
 *
 * 参考 Qt 信号槽：每个 Slot 声明它接受的 signal type 前缀模式，
 * 编辑器只允许用户将兼容的 Signal 连接到 Slot。
 *
 * 前缀匹配规则：signalType.startsWith(acceptPattern)。
 * 示例: accepts: ['model.style'] 表示只接受 model.style.* 信号。
 *
 * 运行时参数类型安全通过 SlotParamSchema 约束。
 */
import type { useAnimationControls } from 'framer-motion';
import type { SlotParamValue } from '../model/bindings';

export type AnimationControls = ReturnType<typeof useAnimationControls>;

// ─── Slot 参数 Schema（编辑器自动表单） ────────────────────────────────────────

export type SlotParamSchemaItem = {
    key: string;
    label: string;
    type: 'number' | 'string' | 'boolean' | 'enum' | 'color' | 'slider' | 'widgetRef';
    default?: SlotParamValue;
    meta?: Record<string, unknown>;
};

// ─── Slot 执行上下文 ──────────────────────────────────────────────────────────

export type SlotContext = {
    /** 信号触发的 widget */
    widgetId: string;
    /** 实际作用的 widget（跨组件时可能不同） */
    targetWidgetId: string;
    /** 信号类型（如 'model.style.backgroundColor'） */
    signalType: string;
    /** 信号原始 payload */
    prev: unknown;
    next: unknown;
    /** 获取 framer-motion 动画控制 */
    getControls(widgetId: string): AnimationControls | null;
    /** 更新 widget 属性 */
    updateWidget(widgetId: string, set: Record<string, unknown>): void;
    /** 发射信号（用于 slot 内触发其他信号） */
    emit(source: string, type: string, prev: unknown, next: unknown): void;
};

// ─── Slot 定义 ────────────────────────────────────────────────────────────────

export type SlotDefinition = {
    /** 唯一标识，如 'animation' */
    type: string;
    /** 编辑器展示名 */
    label: string;
    /** 分组，编辑器按组折叠展示 */
    group: string;
    /**
     * 接受的 signal type 前缀模式（Qt 风格的前缀匹配）。
     * 示例:
     *   ['model.style'] — 只接受 model.style.* 信号
     *   ['lifecycle', 'user', 'system'] — 接受这三类前缀的信号
     *   [] — 空数组表示接受所有信号
     */
    accepts: string[];
    /** 参数定义，编辑器自动生成表单 */
    paramSchema: SlotParamSchemaItem[];
    /** 运行时执行器 */
    execute(params: Record<string, SlotParamValue>, ctx: SlotContext): void;
};

// ─── 全局注册表 ────────────────────────────────────────────────────────────────

const slotRegistry = new Map<string, SlotDefinition>();

export function registerSlot(definition: SlotDefinition): void {
    slotRegistry.set(definition.type, definition);
}

export function unregisterSlot(type: string): void {
    slotRegistry.delete(type);
}

export function getSlot(type: string): SlotDefinition | undefined {
    return slotRegistry.get(type);
}

export function getAllSlots(): SlotDefinition[] {
    return [...slotRegistry.values()];
}

/**
 * Qt 风格前缀匹配：检查 signalType 是否匹配 slot 的 accepts 前缀列表。
 */
export function isSlotCompatibleWithSignal(
    slotType: string,
    signalType: string,
): boolean {
    const slot = slotRegistry.get(slotType);
    if (!slot) return false;
    if (slot.accepts.length === 0) return true;
    return slot.accepts.some(prefix => signalType.startsWith(prefix));
}

/**
 * 获取与给定 signal type 兼容的所有 slot。
 */
export function getSlotsForSignalType(signalType: string): SlotDefinition[] {
    return [...slotRegistry.values()].filter(
        (s) => s.accepts.length === 0 || s.accepts.some(prefix => signalType.startsWith(prefix)),
    );
}

export function getSlotsByGroup(): Map<string, SlotDefinition[]> {
    const groups = new Map<string, SlotDefinition[]>();
    for (const slot of slotRegistry.values()) {
        if (!groups.has(slot.group)) {
            groups.set(slot.group, []);
        }
        groups.get(slot.group)!.push(slot);
    }
    return groups;
}
