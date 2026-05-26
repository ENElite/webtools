import type { useAnimationControls } from 'framer-motion';

type AnimationControls = ReturnType<typeof useAnimationControls>;

const controlsMap = new Map<string, AnimationControls>();

export function registerControls(widgetId: string, controls: AnimationControls): () => void {
    controlsMap.set(widgetId, controls);
    return () => {
        controlsMap.delete(widgetId);
    };
}

export function getControls(widgetId: string): AnimationControls | null {
    return controlsMap.get(widgetId) ?? null;
}
