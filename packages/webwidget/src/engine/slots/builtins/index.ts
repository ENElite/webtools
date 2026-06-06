import { registerSlot } from '../registry';
import { ANIMATION_SLOT } from './animationSlot';

export { ANIMATION_SLOT } from './animationSlot';

/**
 * 注册所有内置 Slot 类型。
 * 应在应用启动时调用一次。
 *
 * 内置 slot：
 * - animation: 容器级动画（接受 lifecycle/user/system 信号）
 */
export function registerBuiltinSlots(): void {
    registerSlot(ANIMATION_SLOT);
}
