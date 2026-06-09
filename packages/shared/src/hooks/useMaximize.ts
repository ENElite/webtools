import { useCallback, useState } from 'react';
import type { RefObject } from 'react';

import Moveable from 'react-moveable';

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

function toggleMaximizeByRequest(
    moveable: Moveable,
    target: HTMLElement,
    container: HTMLElement | SVGElement | null
): boolean {
    if (maximizedTargetSnapshotMap.has(target)) {
        const snapshot = maximizedTargetSnapshotMap.get(target);
        if (!snapshot) {
            return false;
        }

        moveable.request('resizable', { offsetWidth: snapshot.w, offsetHeight: snapshot.h }, true);
        moveable.request('draggable', { x: snapshot.x, y: snapshot.y }, true);
        maximizedTargetSnapshotMap.delete(target);
        return false;
    }

    const { left: x, top: y, width: w, height: h } = moveable.getRect();
    maximizedTargetSnapshotMap.set(target, { x, y, w, h });
    const margin = 16;
    const { width, height } = getContainerSize(container);
    moveable.request('draggable', { x: margin, y: margin }, true);
    moveable.request('resizable', { offsetWidth: width - margin * 2, offsetHeight: height - margin * 2 }, true);
    moveable.request('draggable', { x: margin, y: margin }, true);
    return true;
}

type MaximizableProps = {
    target: HTMLElement | null;
    container: HTMLElement | SVGElement;
    moveableRef: RefObject<Moveable | null>;
};

export const useMaximize = ({
    target,
    container,
    moveableRef,
}: MaximizableProps) => {
    const [maximized, setMaximized] = useState(false);
    const toggle = useCallback(() => {
        if (!target || !moveableRef.current) {
            return;
        }

        const next = toggleMaximizeByRequest(moveableRef.current, target, container);
        setMaximized(next);
    }, [container, moveableRef, target]);

    return { maximized, toggle };
};
