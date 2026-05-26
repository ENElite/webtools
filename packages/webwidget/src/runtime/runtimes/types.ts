import type { useAnimationControls } from 'framer-motion';
import type { WidgetAnimation } from '../../engine/model/animation';

export interface UserRuntime {
    emitMouseEnter(widgetId: string): void;
    emitMouseLeave(widgetId: string): void;
    emitClick(widgetId: string): void;
}

export interface SystemRuntime {
    emitIdle(): void;
    emitActive(): void;
}

export interface LifecycleRuntime {
    mount(widgetId: string): void;
    unmount(widgetId: string): void;
    visible(widgetId: string): void;
    hidden(widgetId: string): void;
}

export type VisualMotionState = {
    animate: Record<string, unknown>;
    transition: Record<string, unknown>;
};

export interface VisualStateRuntime {
    set(widgetId: string, state: VisualMotionState): void;
    get(widgetId: string): VisualMotionState;
    clear(widgetId: string): void;
    subscribe(widgetId: string, listener: () => void): () => void;
}

export interface AnimationRuntime {
    compile(widgetId: string, animation: WidgetAnimation | undefined): () => void;
}

export type GetControls = (widgetId: string) => ReturnType<typeof useAnimationControls> | null;

export interface RuntimeContextValue {
    userRuntime: UserRuntime;
    systemRuntime: SystemRuntime;
    lifecycleRuntime: LifecycleRuntime;
    animationRuntime: AnimationRuntime;
    visualStateRuntime: VisualStateRuntime;
}
