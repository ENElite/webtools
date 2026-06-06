import type { CSSProperties } from 'react';
import type { AnimationDirection, AnimationConfig, MotionType } from '../model/animation';

type MotionVariant = {
    opacity?: number;
    scale?: number | number[];
    x?: number | number[];
    y?: number | number[];
    rotate?: number;
    rotateY?: number | number[];
    filter?: string;
    clipPath?: string;
};

type PresetResult = {
    initial: MotionVariant;
    animate: MotionVariant;
    exit: MotionVariant;
    keyframes?: CSSProperties;
};

function slideOffset(direction: AnimationDirection | undefined, intensity: number): { x: number; y: number } {
    const d = direction ?? 'up';
    const dist = 60 * intensity;
    switch (d) {
        case 'up': return { x: 0, y: dist };
        case 'down': return { x: 0, y: -dist };
        case 'left': return { x: dist, y: 0 };
        case 'right': return { x: -dist, y: 0 };
    }
}

function glitchKeyframes(intensity: number): CSSProperties {
    return {
        animation: `glitch-skew ${0.5 / intensity}s infinite linear alternate-reverse`,
    };
}

export function buildPreset(config: AnimationConfig): PresetResult {
    const { effect, intensity, direction } = config;
    const i = Math.max(0, Math.min(1, intensity));

    switch (effect) {
        case 'fade':
            return {
                initial: { opacity: 0 },
                animate: { opacity: i },
                exit: { opacity: 0 },
            };

        case 'slide': {
            const offset = slideOffset(direction, i);
            return {
                initial: { opacity: 0, x: offset.x, y: offset.y },
                animate: { opacity: 1, x: 0, y: 0 },
                exit: { opacity: 0, x: offset.x, y: offset.y },
            };
        }

        case 'scale':
            return {
                initial: { opacity: 0, scale: 1 - 0.3 * i },
                animate: { opacity: 1, scale: 1 },
                exit: { opacity: 0, scale: 1 - 0.3 * i },
            };

        case 'rotate':
            return {
                initial: { opacity: 0, rotate: -180 * i },
                animate: { opacity: 1, rotate: 0 },
                exit: { opacity: 0, rotate: 180 * i },
            };

        case 'blur':
            return {
                initial: { opacity: 0, filter: `blur(${20 * i}px)` },
                animate: { opacity: 1, filter: 'blur(0px)' },
                exit: { opacity: 0, filter: `blur(${20 * i}px)` },
            };

        case 'glitch':
            return {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                exit: { opacity: 0 },
                keyframes: glitchKeyframes(i),
            };

        case 'pulse':
            return {
                initial: { scale: 1 },
                animate: { scale: [1, 1 + 0.1 * i, 1] },
                exit: { scale: 1 },
            };

        case 'shake':
            return {
                initial: { x: 0 },
                animate: { x: [0, -6 * i, 6 * i, -6 * i, 6 * i, 0] },
                exit: { x: 0 },
            };

        case 'bounce':
            return {
                initial: { y: 0 },
                animate: { y: [0, -30 * i, 0, -15 * i, 0, -5 * i, 0] },
                exit: { y: 0 },
            };

        case 'flip':
            return {
                initial: { rotateY: 0 },
                animate: { rotateY: [0, 90 * i, 0] },
                exit: { rotateY: 0 },
            };

        case 'typewriter':
            return {
                initial: {},
                animate: {},
                exit: {},
            };

        default:
            return {
                initial: { opacity: 1 },
                animate: { opacity: 1 },
                exit: { opacity: 1 },
            };
    }
}

export function getTransition(config: AnimationConfig) {
    const { effect, duration, delay, loop } = config;

    if (effect === 'pulse' || effect === 'shake' || effect === 'bounce' || effect === 'flip') {
        return {
            duration: duration || 1,
            delay: delay || 0,
            repeat: loop ? Infinity : 0,
            ease: (effect === 'bounce' ? 'easeOut' : 'easeInOut') as 'easeOut' | 'easeInOut',
        };
    }

    if (effect === 'glitch') {
        return {
            duration: duration || 0.3,
            delay: delay || 0,
        };
    }

    return {
        duration: duration || 0.3,
        delay: delay || 0,
        ease: 'easeOut' as const,
    };
}

function toMotionEasing(easing: string | undefined): string {
    switch (easing) {
        case 'ease-in': return 'easeIn';
        case 'ease-out': return 'easeOut';
        case 'ease-in-out': return 'easeInOut';
        case 'linear': return 'linear';
        default: return 'easeOut';
    }
}

export function getMotionTransition(motionType: MotionType, baseConfig: AnimationConfig): Record<string, unknown> {
    switch (motionType) {
        case 'spring':
            return { type: 'spring', stiffness: 300, damping: 20 };
        case 'tween': {
            return { type: 'tween', duration: baseConfig.duration, ease: toMotionEasing(baseConfig.easing) };
        }
        case 'transition':
            return { type: 'tween', duration: baseConfig.duration, ease: 'easeInOut' };
    }
}
