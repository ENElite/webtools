/**
 * useLive2DSlots — 动态注册 Live2D motion 和 expression 为 slot
 *
 * 模型加载后，自动将所有 motion 和 expression 注册为 WidgetRuntime 的 slot。
 * 仅注册到目标 widget 的 WidgetRuntime，不全局注册，只在目标为该 widget 时才展示。
 *
 * 命名规范：
 * - motion: `live2d.motion.{group}.{index}`
 * - expression: `live2d.expression.{id}`
 */

import { useEffect, useRef } from 'react';
import type { L2D } from 'l2d';
import { widgetRuntimeRegistry } from '../runtime/WidgetRuntimeRegistry';

type ModelLoadingState = 'unloaded' | 'loading' | 'loaded' | 'error';

/**
 * 从 motion 文件路径中提取可读名称。
 * 例: "Idle/01.motion3.json" → "01"
 */
function extractMotionName(filePath: string): string {
    const fileName = filePath.split('/').pop() ?? filePath;
    return fileName.replace(/\..*$/, '');
}

/**
 * 注册所有 motion 和 expression 为 slot（仅注册到 WidgetRuntime）。
 */
function registerAllSlots(l2d: L2D, widgetId: string): string[] {
    const registeredTypes: string[] = [];
    const runtime = widgetRuntimeRegistry.get(widgetId);
    if (!runtime) return registeredTypes;

    // 注册 motions — 使用 group 名作为标识，与右键菜单一致
    const motions = l2d.getMotions();
    const groupNames = Object.keys(motions);
    const hasSingleGroup = groupNames.length === 1;
    for (const group of groupNames) {
        const files = motions[group] ?? [];
        const groupLabel = group.trim();
        for (let i = 0; i < files.length; i++) {
            const file = files[i]!;
            const name = extractMotionName(file);
            // 单 group 且 group 名为空: live2d.motion.login (用 motion 文件名)
            // 单 group 且 group 名非空: live2d.motion.Idle
            // 多 group: live2d.motion.broken_1.login
            let slotType: string;
            if (hasSingleGroup && !groupLabel) {
                slotType = `live2d.motion.${name}`;
            } else if (hasSingleGroup) {
                slotType = `live2d.motion.${groupLabel}`;
            } else {
                slotType = `live2d.motion.${groupLabel}.${name}`;
            }

            runtime.registerSlot(slotType, () => {
                l2d.playMotion(group, i);
            });
            registeredTypes.push(slotType);
        }
    }

    // 注册 expressions
    const expressions = l2d.getExpressions();
    for (const id of expressions) {
        const slotType = `live2d.expression.${id}`;

        // 注册到 WidgetRuntime（仅该 widget 可见）
        runtime.registerSlot(slotType, () => {
            l2d.setExpression(id);
        });
        registeredTypes.push(slotType);
    }

    return registeredTypes;
}

/**
 * 清理已注册的 slot。
 */
function cleanupSlots(registeredTypes: string[], widgetId: string): void {
    const runtime = widgetRuntimeRegistry.get(widgetId);
    if (!runtime) return;

    for (const slotType of registeredTypes) {
        runtime.unregisterSlot(slotType);
    }
}

/**
 * 动态注册 Live2D motion 和 expression 为 slot。
 *
 * @param l2d - L2D 实例
 * @param widgetId - widget ID
 * @param loading - 模型加载状态
 */
export function useLive2DSlots(
    l2d: L2D | null,
    widgetId: string,
    loading: ModelLoadingState,
): void {
    const registeredRef = useRef<string[]>([]);

    useEffect(() => {
        // 清理之前的 slot
        if (registeredRef.current.length > 0) {
            cleanupSlots(registeredRef.current, widgetId);
            registeredRef.current = [];
        }

        // 模型加载完成后注册
        if (!l2d || loading !== 'loaded') return;

        registeredRef.current = registerAllSlots(l2d, widgetId);

        return () => {
            cleanupSlots(registeredRef.current, widgetId);
            registeredRef.current = [];
        };
    }, [l2d, widgetId, loading]);
}
