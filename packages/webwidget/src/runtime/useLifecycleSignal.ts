import { useEffect } from 'react';
import type { WidgetModel } from '../engine/model';
import { useRuntime } from './useRuntime';

export function useLifecycleSignal(widget: WidgetModel): void {
    const { lifecycleRuntime } = useRuntime();

    useEffect(() => {
        lifecycleRuntime.mount(widget.id);
        return () => {
            lifecycleRuntime.unmount(widget.id);
        };
    }, [widget.id, lifecycleRuntime]);
}
