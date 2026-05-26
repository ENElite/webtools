import type { useAnimationControls } from 'framer-motion';
import type { WidgetAnimationSlot, AnimationConfig, AnimationTrigger } from '../../engine/model/animation';

type AnimationControls = ReturnType<typeof useAnimationControls>;
import { buildPreset, getMotionTransition } from '../../engine/animation/presets';
import { signalBus } from '../../engine/signal';
import type { Signal } from '../../engine/signal';
import type { AnimationRuntime, VisualStateRuntime, GetControls } from './types';

function matchesSlot(signal: Signal, trigger: AnimationTrigger): boolean {
    return signal.source === trigger.source && signal.type === trigger.type;
}

/**
 * Map signal type (e.g., 'style.backgroundColor') to CSS property name
 * that framer-motion can animate (e.g., 'backgroundColor').
 */
const SIGNAL_TYPE_TO_CSS_PROPERTY: Record<string, string> = {
    'style.opacity': 'opacity',
    'style.backgroundColor': 'backgroundColor',
    'style.borderRadius': 'borderRadius',
    'style.shadowRadius': 'boxShadow',
    'style.shadowColor': 'boxShadow',
    'style.outline': 'outline',
    'style.outlineOffset': 'outlineOffset',
    'style.backgroundEffect': 'backdropFilter',
    'style.backgroundImageUrl': 'backgroundImage',
};

function computeWidgetAnimateTarget(
    signalType: string,
    value: unknown,
): Record<string, unknown> {
    const cssProp = SIGNAL_TYPE_TO_CSS_PROPERTY[signalType];
    if (cssProp) {
        return { [cssProp]: value };
    }
    // Fallback: use opacity for unknown properties
    return { opacity: value ?? 1 };
}

function computeTransition(motion: AnimationConfig): Record<string, unknown> {
    return getMotionTransition(motion.motionType, motion);
}

function triggerSlot(controls: AnimationControls, config: AnimationConfig) {
    if (config.effect === 'glitch') {
        return;
    }

    const preset = buildPreset(config);
    const motionTransition = getMotionTransition(config.motionType, config);

    controls.set(preset.initial as any);
    controls.start({
        ...preset.animate,
        transition: motionTransition,
    } as any);
}

export function createAnimationRuntimeImpl(
    getControls: GetControls,
    visualStateRuntime: VisualStateRuntime,
): AnimationRuntime {
    const subscriptions = new Map<string, Map<string, () => void>>();

    return {
        compile(widgetId, animation) {
            // Cancel existing subscriptions
            const existing = subscriptions.get(widgetId);
            if (existing) {
                for (const unsub of existing.values()) {
                    unsub();
                }
            }

            if (!animation || animation.length === 0) {
                subscriptions.delete(widgetId);
                return () => {};
            }

            const slotMap = new Map<string, () => void>();

            for (const slot of animation) {
                // Skip lifecycle signals - handled by useLifecycleSignal directly
                if (slot.signal.source === 'lifecycle') {
                    continue;
                }

                const key = `${slot.signal.source}.${slot.signal.type}`;

                const unsubscribe = signalBus.onAny((signal) => {
                    if (!matchesSlot(signal, slot.signal)) {
                        return;
                    }

                    const controls = getControls(widgetId);
                    if (!controls) {
                        return;
                    }

                    // WidgetSignal: update visual state for framer-motion declarative rendering
                    if (signal.source === 'widget' && 'payload' in signal && signal.payload) {
                        const { next } = signal.payload as { prev: unknown; next: unknown };
                        const animate = computeWidgetAnimateTarget(slot.signal.type, next);
                        const transition = computeTransition(slot.motion);
                        visualStateRuntime.set(widgetId, { animate, transition });
                        return;
                    }

                    // User / System signals: trigger immediate animation
                    triggerSlot(controls, slot.motion);
                });

                slotMap.set(key, unsubscribe);
            }

            subscriptions.set(widgetId, slotMap);

            return () => {
                for (const unsub of slotMap.values()) {
                    unsub();
                }
                subscriptions.delete(widgetId);
            };
        },
    };
}
