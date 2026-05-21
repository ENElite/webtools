'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useElementSize, useDebounce, useDevicePixelRatio } from '@reactuses/core';
import { useLive2D } from './useLive2D';
import { Progress } from 'antd';
import type { WidgetRendererProps } from '../types';
import type { Live2dWidgetProps } from './schema';

export function Live2dWidget(props: WidgetRendererProps<Live2dWidgetProps>) {
    const { widget } = props;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const onHit = useCallback((area: string) => {
        console.log(`Hit area: ${area}`);
    }, []);
    const { l2d, resize, loading, loadInfo } = useLive2D(canvasRef, {
        modelPath: widget.props.modelPath,
        renderPrecision: widget.props.renderPrecision,
    });

    // 自动缩放
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [elemWidth, elemHeight] = useElementSize(containerRef.current);
    const { width, height } = useDebounce({ width: elemWidth, height: elemHeight }, widget.props.resizeDelay ?? 300);
    const renderPrecision = widget.props.renderPrecision;
    const { pixelRatio } = useDevicePixelRatio();
    useEffect(() => {
        resize(width, height, renderPrecision, pixelRatio);
    }, [resize, width, height, renderPrecision, pixelRatio]);

    const containerStyle: CSSProperties = {
        visibility: loading === 'loaded' ? 'visible' : 'hidden',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
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
                <canvas ref={canvasRef} style={{ height: '100%' }} />
            </div>
        </>
    );
}
