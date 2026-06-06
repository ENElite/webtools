/**
 * Slot 执行引擎
 *
 * 信号触发时，查找匹配的 connections，按顺序执行每个 slot。
 * 优先使用 WidgetRuntime 实例的 slot handler，fallback 到全局 SlotDefinition.execute。
 */

import type { Signal } from '../signal';
import type { Connection, SlotParamValue } from '../model/bindings';
import type { SlotContext, AnimationControls } from './registry';
import type { WidgetModel } from '../model';
import type { Command } from '../commands/types';
import { getSlot } from './registry';
import { UpdateWidgetCommand } from '../commands/widget/update';

export type ExecutorDeps = {
    getWidget(widgetId: string): WidgetModel | null;
    getControls(widgetId: string): AnimationControls | null;
    executeCommand(command: Command): void;
    emit(signal: Signal): void;
};

function matchesConnection(signal: Signal, connection: Connection, sourceWidgetId: string): boolean {
    // 检查 signal type 是否匹配 connection.signal（前缀匹配）
    if (!signal.type.startsWith(connection.signal)) return false;
    // 连接总是从当前 widget 发出，检查信号来源
    if (signal.widgetId !== sourceWidgetId) return false;
    return true;
}

function executeSlot(
    slotType: string,
    signal: Signal,
    sourceWidgetId: string,
    targetWidgetId: string,
    deps: ExecutorDeps,
    params?: Record<string, unknown>,
): void {
    const definition = getSlot(slotType);
    if (!definition) return;

    const ctx: SlotContext = {
        widgetId: sourceWidgetId,
        targetWidgetId,
        signalType: signal.type,
        prev: signal.payload?.prev,
        next: signal.payload?.next,
        getControls: deps.getControls,
        updateWidget(widgetId, set) {
            deps.executeCommand(new UpdateWidgetCommand(widgetId, { set: set as any }));
        },
        emit(source, type, prev, next) {
            deps.emit({
                timestamp: Date.now(),
                source: source as any,
                type,
                payload: { prev, next },
                widgetId: sourceWidgetId,
            } as Signal);
        },
    };

    definition.execute((params ?? {}) as Record<string, SlotParamValue>, ctx);
}

export function createSlotExecutor(deps: ExecutorDeps) {
    return {
        executeConnections(
            signal: Signal,
            connections: Connection[],
            sourceWidgetId: string,
        ): void {
            for (const connection of connections) {
                if (!matchesConnection(signal, connection, sourceWidgetId)) continue;

                // 空目标 = 自身
                const targetWidgetId = connection.target || sourceWidgetId;

                executeSlot(connection.slot, signal, sourceWidgetId, targetWidgetId, deps, connection.params);
            }
        },

        /**
         * 向后兼容：执行旧式 SignalBinding。
         */
        executeBindings(
            signal: Signal,
            bindings: Array<{ signal: { source: string; type: string; widgetId?: string }; slots: Array<{ type: string; params?: Record<string, unknown>; targetWidgetId?: string }> }>,
            sourceWidgetId: string,
        ): void {
            for (const binding of bindings) {
                if (binding.signal.source !== signal.source) continue;
                if (binding.signal.type !== signal.type) continue;
                if (binding.signal.widgetId && signal.widgetId && binding.signal.widgetId !== signal.widgetId) continue;

                for (const slot of binding.slots) {
                    const targetWidgetId = slot.targetWidgetId ?? sourceWidgetId;
                    executeSlot(slot.type, signal, sourceWidgetId, targetWidgetId, deps);
                }
            }
        },
    };
}
