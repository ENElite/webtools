import type { WidgetPath } from '../editor/types';

export type SignalSource = 'widget' | 'system' | 'user' | 'lifecycle';

export type BaseSignal<T extends string, P = void> = {
    timestamp: number;
    source: SignalSource;
    type: T;
    payload: P extends void ? undefined : P;
    widgetId?: string;
};

export type WidgetSignal = BaseSignal<WidgetPath, { prev: unknown; next: unknown }>;
export type SystemSignal = BaseSignal<'idle' | 'active'>;
export type UserSignal = BaseSignal<'mouse.enter' | 'mouse.leave' | 'mouse.click'>;
export type LifecycleSignal = BaseSignal<'mount' | 'unmount' | 'visible' | 'hidden'>;

export type Signal = WidgetSignal | SystemSignal | UserSignal | LifecycleSignal;

export function createWidgetSignal(
    widgetId: string,
    type: WidgetPath,
    prev: unknown,
    next: unknown,
): WidgetSignal {
    return {
        timestamp: Date.now(),
        source: 'widget',
        type,
        payload: { prev, next },
        widgetId,
    };
}

export function createSystemSignal(type: SystemSignal['type']): SystemSignal {
    return {
        timestamp: Date.now(),
        source: 'system',
        type,
        payload: undefined,
    };
}

export function createUserSignal(
    type: UserSignal['type'],
    widgetId?: string,
): UserSignal {
    return {
        timestamp: Date.now(),
        source: 'user',
        type,
        payload: undefined,
        widgetId,
    };
}

export function createLifecycleSignal(
    type: LifecycleSignal['type'],
    widgetId?: string,
): LifecycleSignal {
    return {
        timestamp: Date.now(),
        source: 'lifecycle',
        type,
        payload: undefined,
        widgetId,
    };
}
