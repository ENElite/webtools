'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useElementSize, useDebounce } from '@reactuses/core';
import { useLive2D, useLive2DSlots } from '../../hooks';
import { Progress, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import type { WidgetRendererProps } from '../../engine/model';
import type { Live2dWidgetProps } from './schema';

export function Live2dWidget(props: WidgetRendererProps<Live2dWidgetProps>) {
    const { widget } = props;
    // 根据模型来源选择对应的路径
    const modelPath = widget.props.source === 'url' ? (widget.props.modelUrl || widget.props.modelPath) : widget.props.modelPath;

    const { l2d, resize, loading, loadInfo, canvas } = useLive2D(modelPath, {
        scale: widget.props.scale * 100,
        renderPrecision: widget.props.renderPrecision,
    });

    // 动态注册所有 motion 和 expression 为 slot
    useLive2DSlots(l2d, widget.id, loading);
    // 自动缩放
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [elemWidth, elemHeight] = useElementSize(containerRef.current);
    const { width, height } = useDebounce({ width: elemWidth, height: elemHeight }, widget.props.resizeDelay ?? 0);
    useEffect(() => {
        resize(width, height);
    }, [resize, width, height]);

    // 将 useLive2D 返回的 canvas 插入到 container 中显示
    useEffect(() => {
        const container = containerRef.current;
        const el = canvas as HTMLCanvasElement | null;
        if (!container || !el) return;

        // 确保样式
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.display = 'block';

        container.appendChild(el);
        return () => {
            try {
                if (container.contains(el)) container.removeChild(el);
            } catch (e) { }
        };
    }, [canvas, containerRef.current]);

    // 右键菜单控制状态（移动端长按支持）
    const [contextMenuOpen, setContextMenuOpen] = useState(false);
    const [touchPosition, setTouchPosition] = useState<{ x: number; y: number } | null>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

    // 长按触发右键菜单（移动端支持）
    const handleTouchStart = useCallback((e: TouchEvent) => {
        const touch = e.touches[0];
        if (touch) {
            // 记录触摸坐标
            setTouchPosition({ x: touch.clientX, y: touch.clientY });

            // 开始长按计时
            longPressTimerRef.current = setTimeout(() => {
                setContextMenuOpen(true);
            }, 500);
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        // 清除长按计时器
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const handleTouchMove = useCallback(() => {
        // 移动时取消长按检测
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
            }
        };
    }, []);

    // 构建右键菜单项：motions + expressions
    const contextMenuItems = useMemo<NonNullable<MenuProps['items']>>(() => {
        if (!l2d || loading !== 'loaded') return [];

        const items: NonNullable<MenuProps['items']> = [];

        // Motions
        const motions = l2d.getMotions();
        const groupNames = Object.keys(motions);
        if (groupNames.length === 1) {
            // 单 group：子项提升到上一级
            const group = groupNames[0]!;
            const files = motions[group] ?? [];
            const prefix = group.trim() ? `${group.trim()} / ` : '';
            items.push(...files.map((file, index) => ({
                key: `motion-${group}-${index}`,
                label: `${prefix}${file.split('/').pop()?.replace(/\..*$/, '') ?? file}`,
                onClick: () => l2d.playMotion(group, index),
            })));
        } else if (groupNames.length > 1) {
            // 多 group：空名分配默认名
            items.push({
                key: 'motions',
                label: 'Motions',
                children: groupNames.map((group, i) => ({
                    key: `motion-group-${group}`,
                    label: group.trim() || `group-${i + 1}`,
                    children: (motions[group] ?? []).map((file, index) => ({
                        key: `motion-${group}-${index}`,
                        label: file.split('/').pop()?.replace(/\..*$/, '') ?? file,
                        onClick: () => l2d.playMotion(group, index),
                    })),
                })),
            });
        }

        // Expressions
        const expressions = l2d.getExpressions();
        if (expressions.length > 0) {
            items.push({
                key: 'expressions',
                label: 'Expressions',
                children: expressions.map((id) => ({
                    key: `expr-${id}`,
                    label: id,
                    onClick: () => l2d.setExpression(id),
                })),
            });
        }

        return items;
    }, [l2d, loading]);

    const containerStyle: CSSProperties = {
        visibility: loading === 'loaded' ? 'visible' : 'hidden',
        height: '100%',
        overflow: 'hidden',
        minHeight: 0,
    };

    const percent = Math.round(((loadInfo?.loaded ?? 0) / (loadInfo?.total ?? 1)) * 100);

    // 菜单样式（用于定位到触摸位置）
    const dropdownStyle: CSSProperties = touchPosition
        ? {
            position: 'fixed',
            left: touchPosition.x,
            top: touchPosition.y,
        }
        : {};

    // 处理菜单打开/关闭
    const handleOpenChange = (open: boolean) => {
        setContextMenuOpen(open);
        if (!open) {
            setTouchPosition(null);
        }
    };

    // 容器引用和事件绑定
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        // 阻止事件冒泡（防止触发父级 Webpaper 的右键菜单）
        const onTouchStartWithStop = (e: TouchEvent) => {
            e.stopPropagation();
            handleTouchStart(e);
        };

        wrapper.addEventListener('touchstart', onTouchStartWithStop, { passive: false });
        wrapper.addEventListener('touchend', handleTouchEnd, { passive: true });
        wrapper.addEventListener('touchmove', handleTouchMove, { passive: true });
        wrapper.addEventListener('touchcancel', handleTouchEnd, { passive: true });

        return () => {
            wrapper.removeEventListener('touchstart', onTouchStartWithStop);
            wrapper.removeEventListener('touchend', handleTouchEnd);
            wrapper.removeEventListener('touchmove', handleTouchMove);
            wrapper.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchEnd, handleTouchMove]);

    const content = (
        <>
            {loading !== 'loaded' ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    padding: 12
                }}>
                    <Progress
                        type="circle"
                        size="small"
                        steps={loadInfo?.total}
                        percent={percent}
                        showInfo={false}
                        strokeColor="#52c41a"
                        format={() => `${loadInfo?.loaded} / ${loadInfo?.total}`}
                    />
                </div>
            ) : null}
            <div ref={containerRef} style={containerStyle}>
                {/* canvas will be appended here by useEffect when ready */}
            </div>
        </>
    );

    if (!contextMenuItems || contextMenuItems.length === 0) {
        return content;
    }

    return (
        <Dropdown
            menu={{ items: contextMenuItems ?? [] }}
            trigger={['contextMenu']}
            open={contextMenuOpen}
            onOpenChange={handleOpenChange}
            overlayStyle={dropdownStyle}
            classNames={{
                root: "max-h-100 overflow-auto",
            }}
        >
            <div ref={wrapperRef} style={{ width: '100%', height: '100%' }}>
                {content}
            </div>
        </Dropdown>
    );
}
