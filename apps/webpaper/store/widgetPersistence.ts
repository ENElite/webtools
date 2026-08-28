import { useEffect, useRef } from 'react';
import { useOverlayStore, createWidget, WidgetKinds } from '@webtools/webwidget';
import type { WidgetModel } from '@webtools/webwidget';

const STORAGE_KEY = 'webpaper-widgets';

/**
 * 创建 webpaper 的默认 widgets
 */
function createDefaultWidgets(): WidgetModel[] {
    return [
        createWidget(WidgetKinds.TEXT, { layout: { order: 1 } }),
        createWidget(WidgetKinds.LIVE2D, {
            layout: {
                anchorX: 'right',
                anchorY: 'bottom',
                x: 0,
                y: 0,
                w: 16,
                h: 40,
                rotation: 0,
                adapt: 'stretch',
                order: 2,
            },
        }),
        createWidget(WidgetKinds.CLOCK, {
            layout: {
                anchorX: 'left',
                anchorY: 'bottom',
                x: 0,
                y: -10,
                w: 40,
                h: 16,
                rotation: 0,
                adapt: 'stretch',
                order: 3,
            },
        }),
    ];
}

/**
 * 从 localStorage 加载持久化的 widgets
 */
function loadPersistedWidgets(): WidgetModel[] | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;

        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed) || parsed.length === 0) return null;

        return parsed as WidgetModel[];
    } catch {
        console.warn('Failed to load persisted widgets, will create defaults');
        return null;
    }
}

/**
 * 将 widgets 保存到 localStorage
 */
function persistWidgets(widgets: WidgetModel[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } catch {
        console.warn('Failed to persist widgets');
    }
}

/**
 * Hook: 初始化 overlay store 的 widgets
 * - 优先从 localStorage 恢复
 * - 如果没有持久化数据，创建默认 widgets
 */
export function useInitOverlayWidgets(): void {
    const initWidgets = useOverlayStore((state) => state.initWidgets);
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const persisted = loadPersistedWidgets();
        if (persisted) {
            initWidgets(persisted);
        } else {
            initWidgets(createDefaultWidgets());
        }
    }, [initWidgets]);
}

/**
 * Hook: 订阅 widgets 变化并持久化到 localStorage
 */
export function usePersistOverlayWidgets(): void {
    const widgets = useOverlayStore((state) => state.widgets);
    const prevWidgetsRef = useRef<WidgetModel[]>([]);

    useEffect(() => {
        // 跳过初始化时的首次渲染（initWidgets 会触发）
        if (prevWidgetsRef.current.length === 0 && widgets.length > 0) {
            prevWidgetsRef.current = widgets;
            // 首次有数据时也持久化（确保默认 widgets 被保存）
            persistWidgets(widgets);
            return;
        }

        // 只在 widgets 真正变化时持久化
        if (widgets !== prevWidgetsRef.current) {
            prevWidgetsRef.current = widgets;
            persistWidgets(widgets);
        }
    }, [widgets]);
}
