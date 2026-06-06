/**
 * WidgetRuntimeRegistry — 全局 widget runtime 注册表
 *
 * 管理所有 WidgetRuntime 实例，提供跨 widget 信号路由。
 */

import { WidgetRuntime } from './WidgetRuntime';

export class WidgetRuntimeRegistry {
    private _runtimes = new Map<string, WidgetRuntime>();

    /**
     * 获取或创建指定 widget 的 runtime。
     */
    getOrCreate(widgetId: string): WidgetRuntime {
        let runtime = this._runtimes.get(widgetId);
        if (!runtime) {
            runtime = new WidgetRuntime(widgetId);
            this._runtimes.set(widgetId, runtime);
        }
        return runtime;
    }

    /**
     * 获取指定 widget 的 runtime（不存在则返回 undefined）。
     */
    get(widgetId: string): WidgetRuntime | undefined {
        return this._runtimes.get(widgetId);
    }

    /**
     * 销毁指定 widget 的 runtime。
     */
    dispose(widgetId: string): void {
        const runtime = this._runtimes.get(widgetId);
        if (runtime) {
            runtime.dispose();
            this._runtimes.delete(widgetId);
        }
    }

    /**
     * 销毁所有 runtime。
     */
    disposeAll(): void {
        for (const runtime of this._runtimes.values()) {
            runtime.dispose();
        }
        this._runtimes.clear();
    }

    /**
     * 获取所有已注册的 widget ID。
     */
    getWidgetIds(): string[] {
        return [...this._runtimes.keys()];
    }

    /**
     * 检查指定 widget 是否有 runtime。
     */
    has(widgetId: string): boolean {
        return this._runtimes.has(widgetId);
    }
}

/**
 * 全局 singleton。
 */
export const widgetRuntimeRegistry = new WidgetRuntimeRegistry();
