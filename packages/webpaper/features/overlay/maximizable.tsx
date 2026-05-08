
import type { MoveableManagerInterface, Able } from 'react-moveable';

type MaximizableProps = {
    maximizableThreshold?: number;
    onMaximizeChange?: (maximized: boolean) => void;
};

type TargetSnapshot = {
    x: number;
    y: number;
    w: number;
    h: number;
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

export function toggleMaximizeByRequest(
    moveable: MoveableManagerInterface<MaximizableProps>,
    target: HTMLElement,
    container: HTMLElement | SVGElement | null,
): boolean {
    if (maximizedTargetSnapshotMap.has(target)) {
        // 已经放大过，需要恢复
        const snapshot = maximizedTargetSnapshotMap.get(target);
        if (!snapshot) {
            return false;
        }

        moveable.request('resizable', { offsetWidth: snapshot.w, offsetHeight: snapshot.h }, true);
        moveable.request('draggable', { x: snapshot.x, y: snapshot.y }, true);
        maximizedTargetSnapshotMap.delete(target);
        return false;
    }
    // 没有放大过，需要放大
    const { left: x, top: y, width: w, height: h } = moveable.state.targetClientRect;
    maximizedTargetSnapshotMap.set(target, { x, y, w, h });
    const margin = 16;
    const { width, height } = getContainerSize(container);
    console.log('Maximizing target to container size', { margin, width, height });
    moveable.request('draggable', { x: margin, y: margin }, true);
    moveable.request('resizable', { offsetWidth: width - margin * 2, offsetHeight: height - margin * 2 }, true);
    moveable.request('draggable', { x: margin, y: margin }, true);
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
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const container = moveable.getContainer();
        const nextMaximized = toggleMaximizeByRequest(moveable, target, container);

        moveable.props.onMaximizeChange?.(nextMaximized);
        moveable.updateRect();
        moveable.stopDrag();
        return false;
    },
    drag(moveable: MoveableManagerInterface<MaximizableProps>, e: { inputEvent?: MouseEvent }) {
        const target = moveable.state.target;
        if (!(target instanceof HTMLElement)) {
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
        const nextMaximized = toggleMaximizeByRequest(moveable, target, container);
        moveable.props.onMaximizeChange?.(nextMaximized);
        moveable.updateRect();
        return false;
    },
} as Able;