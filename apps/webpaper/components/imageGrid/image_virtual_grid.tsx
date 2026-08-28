'use client';

import type { CSSProperties, Key, ReactNode } from 'react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

export type ImageVirtualGridItem = {
    src: string;
    alt?: string;
    title?: string;
    key?: Key;
};

export type ImageVirtualGridProps<TItem extends ImageVirtualGridItem = ImageVirtualGridItem> = {
    items: TItem[];
    aspectRatio?: number;
    gap?: number;
    overscan?: number;
    className?: string;
    style?: CSSProperties;
    itemClassName?: string;
    imageClassName?: string;
    emptyState?: ReactNode;
    getKey?: (item: TItem, index: number) => Key;
    onItemClick?: (item: TItem, index: number) => void;
    layoutMode?: 'uniform' | 'featured';
    featuredPattern?: 'alternate' | 'left' | 'middle' | 'right';
    renderItem?: (params: {
        item: TItem;
        index: number;
        featured: boolean;
    }) => ReactNode;
};

type ViewportSize = {
    width: number;
    height: number;
};

const GRID_COLUMNS = 4;
const DEFAULT_ASPECT_RATIO = 16 / 9;
const DEFAULT_GAP = 0;
const DEFAULT_OVERSCAN = 1;
const FEATURED_ITEMS_PER_BLOCK = 5;

type FeaturedPlacement = {
    top: number;
    left: number;
    width: number;
    height: number;
};

function buildFeaturedPlacements(pattern: 'left' | 'middle' | 'right', cellWidth: number, cellHeight: number, gap: number): FeaturedPlacement[] {
    const cellStrideX = cellWidth + gap;
    const cellStrideY = cellHeight + gap;

    const placementSets: Record<'left' | 'middle' | 'right', FeaturedPlacement[]> = {
        left: [
            { left: 0, top: 0, width: 2 * cellWidth + gap, height: 2 * cellHeight + gap },
            { left: 2 * cellStrideX, top: 0, width: cellWidth, height: cellHeight },
            { left: 3 * cellStrideX, top: 0, width: cellWidth, height: cellHeight },
            { left: 2 * cellStrideX, top: cellStrideY, width: cellWidth, height: cellHeight },
            { left: 3 * cellStrideX, top: cellStrideY, width: cellWidth, height: cellHeight },
        ],
        middle: [
            { left: cellStrideX, top: 0, width: 2 * cellWidth + gap, height: 2 * cellHeight + gap },
            { left: 0, top: 0, width: cellWidth, height: cellHeight },
            { left: 3 * cellStrideX, top: 0, width: cellWidth, height: cellHeight },
            { left: 0, top: cellStrideY, width: cellWidth, height: cellHeight },
            { left: 3 * cellStrideX, top: cellStrideY, width: cellWidth, height: cellHeight },
        ],
        right: [
            { left: 2 * cellStrideX, top: 0, width: 2 * cellWidth + gap, height: 2 * cellHeight + gap },
            { left: 0, top: 0, width: cellWidth, height: cellHeight },
            { left: cellStrideX, top: 0, width: cellWidth, height: cellHeight },
            { left: 0, top: cellStrideY, width: cellWidth, height: cellHeight },
            { left: cellStrideX, top: cellStrideY, width: cellWidth, height: cellHeight },
        ],
    };

    return placementSets[pattern];
}

function clampNumber(value: number, min: number): number {
    if (!Number.isFinite(value) || value < min) {
        return min;
    }

    return value;
}

function toPixel(value: number): string {
    return `${Math.max(0, value)}px`;
}

export function ImageVirtualGrid<TItem extends ImageVirtualGridItem = ImageVirtualGridItem>({
    items,
    aspectRatio = DEFAULT_ASPECT_RATIO,
    gap = DEFAULT_GAP,
    overscan = DEFAULT_OVERSCAN,
    className,
    style,
    itemClassName,
    imageClassName,
    emptyState = null,
    getKey,
    onItemClick,
    layoutMode = 'uniform',
    featuredPattern = 'alternate',
    renderItem,
}: ImageVirtualGridProps<TItem>) {
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
    const [scrollTop, setScrollTop] = useState(0);

    useLayoutEffect(() => {
        const node = viewportRef.current;

        if (!node) {
            return;
        }

        const updateSize = (width: number, height: number) => {
            setViewportSize({
                width: Math.max(0, width),
                height: Math.max(0, height),
            });
        };

        const initialRect = node.getBoundingClientRect();
        updateSize(initialRect.width || node.clientWidth, initialRect.height || node.clientHeight);

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target !== node) {
                    continue;
                }

                updateSize(entry.contentRect.width, entry.contentRect.height);
            }
        });

        observer.observe(node);

        return () => {
            observer.disconnect();
        };
    }, []);

    const layout = useMemo(() => {
        const safeAspectRatio = clampNumber(aspectRatio, 0.01);
        const safeGap = clampNumber(gap, 0);
        const safeOverscan = Math.max(0, Math.floor(overscan));
        const columns = GRID_COLUMNS;

        if (items.length === 0) {
            return {
                columns,
                gap: safeGap,
                mode: layoutMode,
                rowHeight: 0,
                cellHeight: 0,
                topSpacer: 0,
                bottomSpacer: 0,
                startIndex: 0,
                endIndex: 0,
                renderedItems: [] as TItem[],
                totalHeight: 0,
                visibleStartBlock: 0,
                visibleEndBlock: 0,
            };
        }

        const availableWidth = Math.max(0, viewportSize.width);
        const cellWidth = Math.max(0, (availableWidth - safeGap * (columns - 1)) / columns);
        const cellHeight = safeAspectRatio > 0 ? cellWidth / safeAspectRatio : 0;
        const rowHeight = cellHeight;

        if (layoutMode === 'featured') {
            const blockHeight = 2 * cellHeight + safeGap;
            const blockStride = blockHeight;
            const totalBlocks = Math.ceil(items.length / FEATURED_ITEMS_PER_BLOCK);
            const totalHeight = totalBlocks > 0 ? totalBlocks * blockStride - safeGap : 0;

            if (blockHeight <= 0 || viewportSize.height <= 0) {
                const startIndex = 0;
                const endIndex = Math.min(items.length, FEATURED_ITEMS_PER_BLOCK);

                return {
                    columns,
                    gap: safeGap,
                    mode: layoutMode,
                    rowHeight,
                    cellHeight,
                    topSpacer: 0,
                    bottomSpacer: Math.max(0, totalHeight - blockStride),
                    startIndex,
                    endIndex,
                    renderedItems: items.slice(startIndex, endIndex),
                    totalHeight,
                    visibleStartBlock: 0,
                    visibleEndBlock: Math.min(totalBlocks, 1),
                };
            }

            const visibleStartBlock = Math.max(0, Math.floor(scrollTop / blockStride) - safeOverscan);
            const visibleEndBlock = Math.min(totalBlocks, Math.ceil((scrollTop + viewportSize.height) / blockStride) + safeOverscan);
            const startIndex = Math.min(items.length, visibleStartBlock * FEATURED_ITEMS_PER_BLOCK);
            const endIndex = Math.min(items.length, visibleEndBlock * FEATURED_ITEMS_PER_BLOCK);
            const renderedBlockCount = Math.max(0, visibleEndBlock - visibleStartBlock);
            const renderedHeight = renderedBlockCount > 0 ? renderedBlockCount * blockStride : 0;
            const topSpacer = visibleStartBlock * blockStride;

            return {
                columns,
                gap: safeGap,
                mode: layoutMode,
                rowHeight,
                cellHeight,
                topSpacer,
                bottomSpacer: Math.max(0, totalHeight - topSpacer - renderedHeight),
                startIndex,
                endIndex,
                renderedItems: items.slice(startIndex, endIndex),
                totalHeight,
                visibleStartBlock,
                visibleEndBlock,
            };
        }

        const rowStride = rowHeight + safeGap;
        const totalRows = Math.ceil(items.length / columns);
        const totalHeight = totalRows > 0 ? totalRows * rowStride - safeGap : 0;

        if (rowStride <= 0 || viewportSize.height <= 0) {
            const startIndex = 0;
            const endIndex = Math.min(items.length, columns);

            return {
                columns,
                gap: safeGap,
                mode: layoutMode,
                rowHeight,
                cellHeight,
                topSpacer: 0,
                bottomSpacer: Math.max(0, totalHeight - rowStride),
                startIndex,
                endIndex,
                renderedItems: items.slice(startIndex, endIndex),
                totalHeight,
                visibleStartBlock: 0,
                visibleEndBlock: Math.min(totalRows, 1),
            };
        }

        const visibleStartRow = Math.max(0, Math.floor(scrollTop / rowStride) - safeOverscan);
        const visibleEndRow = Math.min(totalRows, Math.ceil((scrollTop + viewportSize.height) / rowStride) + safeOverscan);
        const startIndex = Math.min(items.length, visibleStartRow * columns);
        const endIndex = Math.min(items.length, visibleEndRow * columns);
        const renderedRowCount = Math.max(0, visibleEndRow - visibleStartRow);
        const renderedHeight = renderedRowCount > 0 ? renderedRowCount * rowStride : 0;
        const topSpacer = visibleStartRow * rowStride;

        return {
            columns,
            gap: safeGap,
            mode: layoutMode,
            rowHeight,
            cellHeight,
            topSpacer,
            bottomSpacer: Math.max(0, totalHeight - topSpacer - renderedHeight),
            startIndex,
            endIndex,
            renderedItems: items.slice(startIndex, endIndex),
            totalHeight,
            visibleStartBlock: visibleStartRow,
            visibleEndBlock: visibleEndRow,
        };
    }, [aspectRatio, gap, items, layoutMode, overscan, scrollTop, viewportSize.height, viewportSize.width]);

    if (items.length === 0) {
        return <>{emptyState}</>;
    }

    const renderTile = (item: TItem, absoluteIndex: number, featured: boolean) => {
        if (renderItem) {
            return renderItem({ item, index: absoluteIndex, featured });
        }

        return (
            <img
                src={item.src}
                alt={item.alt ?? item.title ?? ''}
                title={item.title}
                loading='lazy'
                decoding='async'
                draggable={false}
                className={imageClassName}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                }}
            />
        );
    };

    return (
        <div
            ref={viewportRef}
            className={className}
            style={{
                minHeight: 0,
                overflow: 'auto',
                width: '100%',
                height: '100%',
                ...style,
            }}
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
            data-testid='image-virtual-grid'
        >
            {layout.topSpacer > 0 ? <div aria-hidden style={{ height: toPixel(layout.topSpacer) }} /> : null}

            {layoutMode === 'featured'
                ? (
                    <div>
                        {Array.from({ length: Math.max(0, layout.visibleEndBlock - layout.visibleStartBlock) }, (_, blockOffset) => {
                            const blockIndex = layout.visibleStartBlock + blockOffset;
                            const blockItems = layout.renderedItems.slice(blockOffset * FEATURED_ITEMS_PER_BLOCK, (blockOffset + 1) * FEATURED_ITEMS_PER_BLOCK);
                            const featuredSlot = featuredPattern === 'alternate'
                                ? (blockIndex % 3 === 0 ? 'left' : blockIndex % 3 === 1 ? 'middle' : 'right')
                                : featuredPattern;
                            const placements = buildFeaturedPlacements(featuredSlot, Math.max(0, (viewportSize.width - layout.gap * 3) / 4), layout.cellHeight, layout.gap);

                            return (
                                <div
                                    key={`block-${blockIndex}`}
                                    style={{
                                        position: 'relative',
                                        height: toPixel(2 * layout.cellHeight + layout.gap),
                                    }}
                                >
                                    {blockItems.map((item, itemIndex) => {
                                        const absoluteIndex = layout.startIndex + blockOffset * FEATURED_ITEMS_PER_BLOCK + itemIndex;
                                        const placement = placements[itemIndex];
                                        if (!placement) {
                                            return null;
                                        }

                                        const key = item.key ?? getKey?.(item, absoluteIndex) ?? `${absoluteIndex}-${item.src}`;
                                        const featured = itemIndex === 0;

                                        return (
                                            <div
                                                key={key}
                                                style={{
                                                    position: 'absolute',
                                                    left: toPixel(placement.left),
                                                    top: toPixel(placement.top),
                                                    width: toPixel(placement.width),
                                                    height: toPixel(placement.height),
                                                    minWidth: 0,
                                                }}
                                                className={itemClassName}
                                            >
                                                {onItemClick && !renderItem
                                                    ? (
                                                        <button
                                                            type='button'
                                                            onClick={() => onItemClick(item, absoluteIndex)}
                                                            style={{
                                                                appearance: 'none',
                                                                border: 0,
                                                                padding: 0,
                                                                background: 'transparent',
                                                                width: '100%',
                                                                height: '100%',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            {renderTile(item, absoluteIndex, featured)}
                                                        </button>
                                                    )
                                                    : renderTile(item, absoluteIndex, featured)}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                )
                : (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
                            gap: toPixel(layout.gap),
                        }}
                    >
                        {layout.renderedItems.map((item, index) => {
                            const absoluteIndex = layout.startIndex + index;
                            const key = item.key ?? getKey?.(item, absoluteIndex) ?? `${absoluteIndex}-${item.src}`;
                            const featured = false;
                            const content = renderTile(item, absoluteIndex, featured);

                            const baseStyle: CSSProperties = {
                                aspectRatio: String(clampNumber(aspectRatio, 0.01)),
                                minWidth: 0,
                            };

                            if (onItemClick && !renderItem) {
                                return (
                                    <button
                                        key={key}
                                        type='button'
                                        onClick={() => onItemClick(item, absoluteIndex)}
                                        className={itemClassName}
                                        style={{
                                            ...baseStyle,
                                            appearance: 'none',
                                            border: 0,
                                            borderRadius: 0,
                                            padding: 0,
                                            background: 'transparent',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {content}
                                    </button>
                                );
                            }

                            return (
                                <div key={key} className={itemClassName} style={baseStyle}>
                                    {content}
                                </div>
                            );
                        })}
                    </div>
                )}

            {layout.bottomSpacer > 0 ? <div aria-hidden style={{ height: toPixel(layout.bottomSpacer) }} /> : null}
        </div>
    );
}
