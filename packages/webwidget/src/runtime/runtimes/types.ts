import type { useAnimationControls } from 'framer-motion';
import type { WidgetRuntimeRegistry } from '../WidgetRuntimeRegistry';

export interface UserRuntime {
    emitMouseEnter(widgetId: string): void;
    emitMouseLeave(widgetId: string): void;
    emitMouseClick(widgetId: string): void;
}

export interface SystemRuntime {
    emitIdle(): void;
    emitActive(): void;
}

export interface LifecycleRuntime {
    mount(widgetId: string): void;
    unmount(widgetId: string): void;
}

export type GetControls = (widgetId: string) => ReturnType<typeof useAnimationControls> | null;

export interface RuntimeContextValue {
    userRuntime: UserRuntime;
    systemRuntime: SystemRuntime;
    lifecycleRuntime: LifecycleRuntime;
    widgetRuntimeRegistry: WidgetRuntimeRegistry;
}
