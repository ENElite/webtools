'use client';

import { useEffect, useMemo, useRef } from 'react';
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
            classNames={{
                root: "max-h-100 overflow-auto",
            }}
        >
            <div style={{ width: '100%', height: '100%' }}>
                {content}
            </div>
        </Dropdown>
    );
}
