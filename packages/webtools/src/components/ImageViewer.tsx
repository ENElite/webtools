'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button, Tooltip } from '@heroui/react';
import { useElementSize } from '@reactuses/core';

export interface ImageViewerProps {
    src: string;
    alt?: string;
    /** 容器 className */
    className?: string;
}

/**
 * 可缩放、可拖拽平移的图片查看组件
 * - 最大边恰好填满容器
 * - 鼠标滚轮缩放
 * - 拖拽平移
 * - 悬浮控制按钮：重置位置、放大、缩小、切换 fit/1:1
 */
export function ImageViewer({ src, alt = '图片', className = '' }: ImageViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, containerHeight] = useElementSize(containerRef);

    const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null);
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const translateStart = useRef({ x: 0, y: 0 });

    // 图片加载后记录原始尺寸
    const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    }, []);

    // 计算 fit 模式的 scale
    const getFitScale = useCallback(() => {
        if (!imgNaturalSize || !containerWidth || !containerHeight) return 1;
        const scaleX = containerWidth / imgNaturalSize.w;
        const scaleY = containerHeight / imgNaturalSize.h;
        return Math.min(scaleX, scaleY, 1); // 不放大超过 100%
    }, [imgNaturalSize, containerWidth, containerHeight]);

    // 初始加载时设置 fit 模式
    useEffect(() => {
        if (imgNaturalSize && containerWidth && containerHeight) {
            setScale(getFitScale());
            setTranslate({ x: 0, y: 0 });
        }
    }, [imgNaturalSize, containerWidth, containerHeight, getFitScale]);

    // 滚轮缩放（以鼠标位置为中心）
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale((prev) => {
            const next = Math.min(Math.max(prev + delta, 0.1), 20);
            return next;
        });
    }, []);

    // 拖拽平移
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (e.button !== 0) return; // 仅左键
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        translateStart.current = { ...translate };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, [translate]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setTranslate({
            x: translateStart.current.x + dx,
            y: translateStart.current.y + dy,
        });
    }, [isDragging]);

    const handlePointerUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // 控制按钮
    const zoomIn = () => setScale((s) => Math.min(s * 1.25, 20));
    const zoomOut = () => setScale((s) => Math.max(s / 1.25, 0.1));
    const resetPosition = () => {
        setScale(getFitScale());
        setTranslate({ x: 0, y: 0 });
    };
    const toggleFit1x = () => {
        const fitScale = getFitScale();
        if (Math.abs(scale - fitScale) < 0.01) {
            // 当前是 fit，切到 1:1
            setScale(1);
            setTranslate({ x: 0, y: 0 });
        } else {
            // 切回 fit
            setScale(fitScale);
            setTranslate({ x: 0, y: 0 });
        }
    };

    const isFitMode = imgNaturalSize && containerWidth && containerHeight
        ? Math.abs(scale - getFitScale()) < 0.01
        : true;

    return (
        <div className={`relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 ${className}`}>
            <div
                ref={containerRef}
                className='w-full h-full min-h-[400px]'
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
                {src && (
                    <img
                        src={src}
                        alt={alt}
                        onLoad={handleImgLoad}
                        draggable={false}
                        className='select-none block'
                        style={{
                            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                            transformOrigin: '0 0',
                            maxWidth: 'none',
                            maxHeight: 'none',
                        }}
                    />
                )}
            </div>

            {/* 悬浮控制按钮 */}
            <div className='absolute bottom-3 right-3 flex flex-col gap-1.5'>
                <Tooltip delay={0}>
                    <Tooltip.Trigger>
                        <Button
                            size='sm'
                            isIconOnly
                            variant='tertiary'
                            className='bg-white/80 backdrop-blur-sm shadow-sm'
                            onPress={resetPosition}
                        >
                            ⟳
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        重置位置
                    </Tooltip.Content>
                </Tooltip>
                <Tooltip delay={0}>
                    <Tooltip.Trigger>
                        <Button
                            size='sm'
                            isIconOnly
                            variant='tertiary'
                            className='bg-white/80 backdrop-blur-sm shadow-sm'
                            onPress={zoomIn}
                        >
                            +
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        放大
                    </Tooltip.Content>
                </Tooltip>
                <Tooltip delay={0}>
                    <Tooltip.Trigger>
                        <Button
                            size='sm'
                            isIconOnly
                            variant='tertiary'
                            className='bg-white/80 backdrop-blur-sm shadow-sm'
                            onPress={zoomOut}
                        >
                            −
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        缩小
                    </Tooltip.Content>
                </Tooltip>
                <Tooltip delay={0}>
                    <Tooltip.Trigger>
                        <Button
                            size='sm'
                            isIconOnly
                            variant='tertiary'
                            className='bg-white/80 backdrop-blur-sm shadow-sm text-xs'
                            onPress={toggleFit1x}
                        >
                            {isFitMode ? '1:1' : '⊞'}
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        {isFitMode ? '切换到 1:1' : '切换到适应窗口'}
                    </Tooltip.Content>
                </Tooltip>
            </div>

            {/* 缩放比例显示 */}
            <div className='absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded px-2 py-0.5 text-xs font-medium shadow-sm'>
                {Math.round(scale * 100)}%
            </div>
        </div>
    );
}
