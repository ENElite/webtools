import React, { createContext, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';

import type { RuntimeContextValue, GetControls } from './runtimes/types';
import type { WidgetModel } from '../engine/model';
import type { Command } from '../engine/commands/types';
import { createUserRuntimeImpl } from './runtimes/userRuntime';
import { createSystemRuntimeImpl } from './runtimes/systemRuntime';
import { createLifecycleRuntimeImpl } from './runtimes/lifecycleRuntime';
import { registerBuiltinSlots } from '../engine/slots';
import { widgetRuntimeRegistry } from './WidgetRuntimeRegistry';
import { enableSignalLog } from '../engine/signal/logger';

export const RuntimeContext = createContext<RuntimeContextValue | null>(null);

type RuntimeProviderProps = {
    children: ReactNode;
    getControls?: GetControls;
    getWidget?: (widgetId: string) => WidgetModel | null;
    executeCommand?: (command: Command) => void;
};

// 注册内置 slot（幂等）
let slotsRegistered = false;
if (!slotsRegistered) {
    registerBuiltinSlots();
    slotsRegistered = true;
    // 开发环境下启用信号日志
    if (typeof process === 'undefined' || process.env?.['NODE_ENV'] !== 'production') {
        enableSignalLog(true);
    }
}

export function RuntimeProvider({ children }: RuntimeProviderProps) {
    const userRuntimeRef = useRef(createUserRuntimeImpl());
    const systemRuntimeRef = useRef(createSystemRuntimeImpl());
    const lifecycleRuntimeRef = useRef(createLifecycleRuntimeImpl());

    const value: RuntimeContextValue = useMemo(() => ({
        userRuntime: userRuntimeRef.current,
        systemRuntime: systemRuntimeRef.current,
        lifecycleRuntime: lifecycleRuntimeRef.current,
        widgetRuntimeRegistry,
    }), []);

    return (
        <RuntimeContext.Provider value={value}>
            {children}
        </RuntimeContext.Provider>
    );
}
