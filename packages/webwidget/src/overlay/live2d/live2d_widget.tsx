'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useElementSize, useDebounce } from '@reactuses/core';
import { useLive2D } from '../../hooks';
import { Progress } from 'antd';
import type { WidgetRendererProps } from '../types';
import type { Live2dWidgetProps } from './schema';

export function Live2dWidget(props: WidgetRendererProps<Live2dWidgetProps>) {
    const { widget } = props;
    // const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const onHit = useCallback((area: string) => {
        console.log(`Hit area: ${area}`);
    }, []);

    // 根据模型来源选择对应的路径
    const modelPath = widget.props.source === 'url' ? (widget.props.modelUrl || widget.props.modelPath) : widget.props.modelPath;

    const { l2d, resize, loading, loadInfo, canvas } = useLive2D(modelPath, {
        scale: widget.props.scale * 100,
        renderPrecision: widget.props.renderPrecision,
    });
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


    const containerStyle: CSSProperties = {
        visibility: loading === 'loaded' ? 'visible' : 'hidden',
        height: '100%',
        overflow: 'hidden',
        minHeight: 0,
    };

    const percent = Math.round(((loadInfo?.loaded ?? 0) / (loadInfo?.total ?? 1)) * 100);

    return (
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
}
