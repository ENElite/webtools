export type AnimationEffect =
    | 'fade'
    | 'slide'
    | 'scale'
    | 'rotate'
    | 'blur'
    | 'glitch'
    | 'typewriter'
    | 'pulse'
    | 'shake'
    | 'bounce'
    | 'flip';

export type MotionType = 'spring' | 'tween' | 'transition';

export type AnimationDirection = 'up' | 'down' | 'left' | 'right';

export type AnimationEasing = 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';

export type AnimationTriggerSource = 'widget' | 'system' | 'user' | 'lifecycle';

export type AnimationTrigger = {
    source: AnimationTriggerSource;
    type: string;
};

export type AnimationConfig = {
    motionType: MotionType;
    effect: AnimationEffect;
    loop: boolean;
    delay: number;
    duration: number;
    intensity: number;
    direction?: AnimationDirection;
    easing?: AnimationEasing;
};

export type WidgetAnimationSlot = {
    signal: AnimationTrigger;
    motion: AnimationConfig;
};

export type WidgetAnimation = WidgetAnimationSlot[];

export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
    effect: 'fade',
    motionType: 'tween',
    loop: false,
    delay: 0,
    duration: 0.3,
    intensity: 1,
};

export const MOTION_TYPE_OPTIONS = [
    { label: '弹簧', value: 'spring' },
    { label: '过渡', value: 'tween' },
    { label: '窗口动画', value: 'transition' },
] as const;

export const ANIMATION_EFFECT_OPTIONS = [
    { label: '淡入淡出', value: 'fade' },
    { label: '滑动', value: 'slide' },
    { label: '缩放', value: 'scale' },
    { label: '旋转', value: 'rotate' },
    { label: '模糊', value: 'blur' },
    { label: '故障', value: 'glitch' },
    { label: '打字机', value: 'typewriter' },
    { label: '脉冲', value: 'pulse' },
    { label: '抖动', value: 'shake' },
    { label: '弹跳', value: 'bounce' },
    { label: '翻转', value: 'flip' },
] as const;

export const ANIMATION_DIRECTION_OPTIONS = [
    { label: '上', value: 'up' },
    { label: '下', value: 'down' },
    { label: '左', value: 'left' },
    { label: '右', value: 'right' },
] as const;

export const ANIMATION_EASING_OPTIONS = [
    { label: '缓入', value: 'ease-in' },
    { label: '缓出', value: 'ease-out' },
    { label: '缓入缓出', value: 'ease-in-out' },
    { label: '线性', value: 'linear' },
] as const;

export const ANIMATION_SIGNAL_SOURCE_OPTIONS = [
    { source: 'lifecycle' as const, type: 'mount', label: '挂载时', group: '系统' },
    { source: 'system' as const, type: 'idle', label: '空闲', group: '系统' },
    { source: 'user' as const, type: 'mouse.enter', label: '鼠标进入', group: '交互' },
    { source: 'user' as const, type: 'mouse.leave', label: '鼠标离开', group: '交互' },
    { source: 'user' as const, type: 'mouse.click', label: '鼠标点击', group: '交互' },
] as const;

export function getStyleSignalSourceOptions(): Array<{ label: string; source: AnimationTriggerSource; type: string }> {
    return [
        { label: '透明度变化', source: 'widget', type: 'style.opacity' },
        { label: '背景色变化', source: 'widget', type: 'style.backgroundColor' },
        { label: '背景效果变化', source: 'widget', type: 'style.backgroundEffect' },
        { label: '背景图片变化', source: 'widget', type: 'style.backgroundImageUrl' },
        { label: '边框变化', source: 'widget', type: 'style.outline' },
        { label: '圆角变化', source: 'widget', type: 'style.borderRadius' },
        { label: '阴影变化', source: 'widget', type: 'style.shadowRadius' },
        { label: '阴影颜色变化', source: 'widget', type: 'style.shadowColor' },
    ];
}
