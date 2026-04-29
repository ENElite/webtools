
import type { MoveableManagerInterface, Able } from 'react-moveable';

type MaximizableProps = {
    maximizableMargin?: number;
    maximizableThreshold?: number;
    onMaximizeChange?: (maximized: boolean) => void;
};

type TargetSnapshot = {
    left: string;
    top: string;
    width: string;
    height: string;
    transform: string;
};

const maximizedTargetSnapshotMap = new WeakMap<HTMLElement | SVGElement, TargetSnapshot>();

function getContainerSize(container: HTMLElement | SVGElement | null): { width: number; height: number } {
    if (!container) {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    }

    if (container instanceof SVGElement) {
        const rect = container.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height,
        };
    }

    return {
        width: container.clientWidth,
        height: container.clientHeight,
    };
}

export function toggleMaximizeTarget(
    target: HTMLElement | SVGElement,
    container: HTMLElement | SVGElement | null,
    margin: number = 0,
): boolean {
    if (maximizedTargetSnapshotMap.has(target)) {
        const snapshot = maximizedTargetSnapshotMap.get(target);
        if (!snapshot) {
            return false;
        }
        target.style.left = snapshot.left;
        target.style.top = snapshot.top;
        target.style.width = snapshot.width;
        target.style.height = snapshot.height;
        target.style.transform = snapshot.transform;
        maximizedTargetSnapshotMap.delete(target);
        return false;
    }
    maximizedTargetSnapshotMap.set(target, {
        left: target.style.left,
        top: target.style.top,
        width: target.style.width,
        height: target.style.height,
        transform: target.style.transform,
    });

    const safeMargin = Math.max(0, margin);
    const { width, height } = getContainerSize(container);
    target.style.left = `${safeMargin}px`;
    target.style.top = `${safeMargin}px`;
    target.style.width = `${Math.max(0, width - safeMargin * 2)}px`;
    target.style.height = `${Math.max(0, height - safeMargin * 2)}px`;
    return true;
}

export const Maximizable = {
    name: 'maximizable',
    props: ['maximizable', 'maximizableMargin', 'onMaximizeChange', 'maximizableTarget'],
    events: [],
    dragStart(moveable: MoveableManagerInterface<MaximizableProps>, e: { inputEvent?: MouseEvent }) {
        const inputEvent = e.inputEvent;

        if (!(inputEvent instanceof MouseEvent) || inputEvent.detail < 2) {
            return;
        }
        const target = moveable.state.target;
        if (!(target instanceof HTMLElement || target instanceof SVGElement)) {
            return;
        }

        const margin = Math.max(0, moveable.props.maximizableMargin ?? 0);
        const container = moveable.getContainer();
        const nextMaximized = toggleMaximizeTarget(target, container, margin);

        moveable.props.onMaximizeChange?.(nextMaximized);
        moveable.updateRect();
        moveable.stopDrag();
        return false;
    },
    drag(moveable: MoveableManagerInterface<MaximizableProps>, e: { inputEvent?: MouseEvent }) {
        const target = moveable.state.target;
        if (!(target instanceof HTMLElement || target instanceof SVGElement)) {
            return;
        }
        if (!maximizedTargetSnapshotMap.has(target)) {
            return;
        }
        if (!(e.inputEvent instanceof MouseEvent)) {
            return;
        }
        const dist = Math.hypot(e.inputEvent.movementX, e.inputEvent.movementY);
        if (dist < (moveable.props.maximizableThreshold ?? 0)) {
            return;
        }
        const container = moveable.getContainer();
        const margin = Math.max(0, moveable.props.maximizableMargin ?? 0);
        const nextMaximized = toggleMaximizeTarget(target, container, margin);
        moveable.props.onMaximizeChange?.(nextMaximized);
        moveable.updateRect();
        return false;
    },
} as Able;