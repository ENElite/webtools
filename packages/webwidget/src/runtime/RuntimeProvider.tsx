import React, { createContext, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';

import type { RuntimeContextValue, GetControls } from './runtimes/types';
import { createUserRuntimeImpl } from './runtimes/userRuntime';
import { createSystemRuntimeImpl } from './runtimes/systemRuntime';
import { createLifecycleRuntimeImpl } from './runtimes/lifecycleRuntime';
import { createVisualStateRuntimeImpl } from './runtimes/visualStateRuntime';
import { createAnimationRuntimeImpl } from './runtimes/animationRuntime';
import { getControls as defaultGetControls } from './runtimes/controlsRegistry';

export const RuntimeContext = createContext<RuntimeContextValue | null>(null);

type RuntimeProviderProps = {
    children: ReactNode;
    getControls?: GetControls;
};

export function RuntimeProvider({ children, getControls }: RuntimeProviderProps) {
    const userRuntimeRef = useRef(createUserRuntimeImpl());
    const systemRuntimeRef = useRef(createSystemRuntimeImpl());
    const lifecycleRuntimeRef = useRef(createLifecycleRuntimeImpl());
    const visualStateRuntimeRef = useRef(createVisualStateRuntimeImpl());
    const animationRuntimeRef = useRef(
        createAnimationRuntimeImpl(getControls ?? defaultGetControls, visualStateRuntimeRef.current),
    );

    const value: RuntimeContextValue = useMemo(() => ({
        userRuntime: userRuntimeRef.current,
        systemRuntime: systemRuntimeRef.current,
        lifecycleRuntime: lifecycleRuntimeRef.current,
        animationRuntime: animationRuntimeRef.current,
        visualStateRuntime: visualStateRuntimeRef.current,
    }), []);

    return (
        <RuntimeContext.Provider value={value}>
            {children}
        </RuntimeContext.Provider>
    );
}
