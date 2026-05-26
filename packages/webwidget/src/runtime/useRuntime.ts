import { useContext } from 'react';
import { RuntimeContext } from './RuntimeProvider';
import type { RuntimeContextValue } from './runtimes/types';

export function useRuntime(): RuntimeContextValue {
    const ctx = useContext(RuntimeContext);
    if (!ctx) {
        throw new Error('useRuntime must be used within RuntimeProvider');
    }
    return ctx;
}
