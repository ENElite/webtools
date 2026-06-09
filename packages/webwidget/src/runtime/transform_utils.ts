import type { WidgetLayout } from '../engine/model';

const TRANSLATE_REGEX = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/;
const ROTATE_REGEX = /rotate\(([-\d.]+)deg\)/;

type TransformParts = {
    x: number;
    y: number;
    rotation: number;
};

export function buildTransformString(x: number, y: number, rotation: number): string {
    return `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
}

export function parseTransformString(transform: string): TransformParts {
    const translateMatch = TRANSLATE_REGEX.exec(transform);
    const rotateMatch = ROTATE_REGEX.exec(transform);

    const x = translateMatch?.[1] ?? '0';
    const y = translateMatch?.[2] ?? '0';
    const rotation = rotateMatch?.[1] ?? '0';

    return {
        x: parseFloat(x),
        y: parseFloat(y),
        rotation: parseFloat(rotation),
    };
}

export function normalizeSizeToPx(size: string, fallback = 0): string {
    const value = parseFloat(size);
    const safeValue = Number.isFinite(value) ? value : fallback;
    return `${safeValue}px`;
}

type LayoutHorizontalAnchor = WidgetLayout["anchorX"];
type LayoutVerticalAnchor = WidgetLayout["anchorY"];

type PxRect = { x: number; y: number; w: number; h: number; rotation: number };

function getAnchorBaseX(anchorX: LayoutHorizontalAnchor, containerWidth: number): number {
    if (anchorX === "left") return 0;
    if (anchorX === "center") return containerWidth / 2;
    return containerWidth;
}

function getAnchorBaseY(anchorY: LayoutVerticalAnchor, containerHeight: number): number {
    if (anchorY === "top") return 0;
    if (anchorY === "center") return containerHeight / 2;
    return containerHeight;
}

function getAnchorOffsetX(anchorX: LayoutHorizontalAnchor, width: number): number {
    if (anchorX === 'center') {
        return width / 2;
    }

    if (anchorX === 'right') {
        return width;
    }

    return 0;
}

function getAnchorOffsetY(anchorY: LayoutVerticalAnchor, height: number): number {
    if (anchorY === 'center') {
        return height / 2;
    }

    if (anchorY === 'bottom') {
        return height;
    }

    return 0;
}

export function pxFromLayout(layout: WidgetLayout, containerWidth: number, containerHeight: number): PxRect {
    const w = Math.max(0, (layout.w / 100) * containerWidth);
    const h = Math.max(0, (layout.h / 100) * containerHeight);
    const availableWidth = Math.max(containerWidth - w, 0);
    const availableHeight = Math.max(containerHeight - h, 0);

    const left = getAnchorBaseX(layout.anchorX, containerWidth)
        - getAnchorOffsetX(layout.anchorX, w)
        + ((layout.x / 100) * availableWidth);
    const top = getAnchorBaseY(layout.anchorY, containerHeight)
        - getAnchorOffsetY(layout.anchorY, h)
        + ((layout.y / 100) * availableHeight);

    return { x: left, y: top, w, h, rotation: layout.rotation };
}

export function layoutFromPx(
    px: PxRect,
    containerWidth: number,
    containerHeight: number,
    anchorX: LayoutHorizontalAnchor = "left",
    anchorY: LayoutVerticalAnchor = "top",
    adapt: "stretch" | "fixed" | "stretch-ratio" | "stick" = "fixed"
): Omit<WidgetLayout, 'order'> {
    const w = Math.max(0, px.w);
    const h = Math.max(0, px.h);
    const baseX = getAnchorBaseX(anchorX, containerWidth);
    const baseY = getAnchorBaseY(anchorY, containerHeight);
    const availableWidth = Math.max(containerWidth - w, 0);
    const availableHeight = Math.max(containerHeight - h, 0);

    const xPercent = availableWidth > 0
        ? ((px.x - baseX + getAnchorOffsetX(anchorX, w)) / availableWidth) * 100
        : 0;

    const yPercent = availableHeight > 0
        ? ((px.y - baseY + getAnchorOffsetY(anchorY, h)) / availableHeight) * 100
        : 0;

    return {
        anchorX,
        anchorY,
        x: Number.isFinite(xPercent) ? xPercent : 0,
        y: Number.isFinite(yPercent) ? yPercent : 0,
        w: Number.isFinite((w / containerWidth) * 100) ? (w / containerWidth) * 100 : 0,
        h: Number.isFinite((h / containerHeight) * 100) ? (h / containerHeight) * 100 : 0,
        rotation: px.rotation,
        adapt,
    };
}

export function snapshotLayoutFromStyle(
    target: HTMLElement,
    container: HTMLElement | null,
    anchorX: LayoutHorizontalAnchor = "left",
    anchorY: LayoutVerticalAnchor = "top",
    adapt: "stretch" | "fixed" | "stretch-ratio" | "stick" = "fixed"
): Omit<WidgetLayout, 'order'> {
    const containerRect = container?.getBoundingClientRect();
    const containerWidth = containerRect?.width ?? window.innerWidth;
    const containerHeight = containerRect?.height ?? window.innerHeight;

    const rect = target.getBoundingClientRect();
    const containerLeft = containerRect?.left ?? 0;
    const containerTop = containerRect?.top ?? 0;
    const { x: translateX, y: translateY, rotation } = parseTransformString(target.style.transform);

    let x: number;
    let y: number;
    let w: number;
    let h: number;

    if (rotation !== 0) {
        // getBoundingClientRect() returns the axis-aligned bounding box of the
        // rotated element — both position and dimensions differ from the CSS
        // values. Read the true values directly from CSS instead:
        //   - translate from the transform string encodes the CSS position
        //     (anchorBase + translate = CSS top-left corner)
        //   - offsetWidth/offsetHeight give the CSS dimensions, unaffected
        //     by CSS transforms
        w = target.offsetWidth;
        h = target.offsetHeight;
        x = getAnchorBaseX(anchorX, containerWidth) + translateX;
        y = getAnchorBaseY(anchorY, containerHeight) + translateY;
    } else {
        x = rect.left - containerLeft;
        y = rect.top - containerTop;
        w = rect.width;
        h = rect.height;
    }

    return layoutFromPx(
        { x, y, w, h, rotation },
        containerWidth,
        containerHeight,
        anchorX,
        anchorY,
        adapt
    );
}