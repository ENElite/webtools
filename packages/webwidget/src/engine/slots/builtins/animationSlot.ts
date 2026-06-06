/**
 * animation — 容器级动画 slot（窗口动画）
 *
 * 接受 lifecycle/user/system 信号，驱动容器级动画。
 * 支持 fade, slide, scale, rotate, blur, pulse, shake, bounce, flip, glitch 效果。
 *
 * 可配置项：效果、缓动、时长、延迟、循环、停留结束位置、方向（部分效果）、强度（部分效果）
 */

import type { AnimationConfig, AnimationEffect, AnimationDirection, AnimationEasing } from '../../model/animation';
import type { SlotDefinition } from '../registry';
import { buildPreset, getMotionTransition } from '../../animation/presets';

/**
 * 需要方向配置的效果
 */
const DIRECTION_EFFECTS: AnimationEffect[] = ['slide'];

/**
 * 需要强度配置的效果
 */
const INTENSITY_EFFECTS: AnimationEffect[] = ['fade', 'slide', 'scale', 'rotate', 'blur', 'pulse', 'shake', 'bounce', 'flip'];

export const ANIMATION_SLOT: SlotDefinition = {
    type: 'animation',
    label: '窗口动画',
    group: '动画',
    accepts: ['lifecycle', 'user', 'system'],
    paramSchema: [
        {
            key: 'effect',
            label: '效果',
            type: 'enum',
            default: 'fade',
            meta: {
                options: [
                    { label: '淡入淡出', value: 'fade' },
                    { label: '滑动', value: 'slide' },
                    { label: '缩放', value: 'scale' },
                    { label: '旋转', value: 'rotate' },
                    { label: '模糊', value: 'blur' },
                    { label: '脉冲', value: 'pulse' },
                    { label: '抖动', value: 'shake' },
                    { label: '弹跳', value: 'bounce' },
                    { label: '翻转', value: 'flip' },
                ],
            },
        },
        {
            key: 'easing',
            label: '缓动',
            type: 'enum',
            default: 'ease-out',
            meta: {
                options: [
                    { label: '缓入', value: 'ease-in' },
                    { label: '缓出', value: 'ease-out' },
                    { label: '缓入缓出', value: 'ease-in-out' },
                    { label: '线性', value: 'linear' },
                ],
            },
        },
        {
            key: 'duration',
            label: '时长',
            type: 'slider',
            default: 0.3,
            meta: { min: 0.1, max: 5, step: 0.1, unit: 's' },
        },
        {
            key: 'delay',
            label: '延迟',
            type: 'slider',
            default: 0,
            meta: { min: 0, max: 5, step: 0.1, unit: 's' },
        },
        {
            key: 'loop',
            label: '循环',
            type: 'boolean',
            default: false,
        },
        {
            key: 'hold',
            label: '停留结束位置',
            type: 'boolean',
            default: false,
            meta: { visibleWhen: { field: 'loop', equals: false } },
        },
        {
            key: 'direction',
            label: '方向',
            type: 'enum',
            default: 'up',
            meta: {
                options: [
                    { label: '上', value: 'up' },
                    { label: '下', value: 'down' },
                    { label: '左', value: 'left' },
                    { label: '右', value: 'right' },
                ],
                visibleWhen: { field: 'effect', values: DIRECTION_EFFECTS },
            },
        },
        {
            key: 'intensity',
            label: '强度',
            type: 'slider',
            default: 1,
            meta: {
                min: 0,
                max: 1,
                step: 0.05,
                visibleWhen: { field: 'effect', values: INTENSITY_EFFECTS },
            },
        },
    ],
    execute(params, ctx) {
        const effect = (params['effect'] as AnimationEffect) || 'fade';
        const config: AnimationConfig = {
            motionType: 'tween',
            effect,
            loop: params['loop'] === true,
            delay: Number(params['delay']) || 0,
            duration: Number(params['duration']) || 0.3,
            intensity: Number(params['intensity']) ?? 1,
            direction: params['direction'] as AnimationDirection | undefined,
            easing: params['easing'] as AnimationEasing | undefined,
        };

        const controls = ctx.getControls(ctx.targetWidgetId);
        if (!controls) return;

        if (effect === 'glitch') return;

        const preset = buildPreset(config);
        const transition = getMotionTransition(config.motionType, config);

        controls.set(preset.initial as any);
        controls.start({ ...preset.animate, transition } as any);
    },
};
