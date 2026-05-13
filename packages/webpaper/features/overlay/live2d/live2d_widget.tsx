'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useElementSize, useDebounce } from '@reactuses/core';
import { useLive2D } from './useLive2D';

// settings JSON loaded via cached dynamic import to avoid refetch on remount
import type { WidgetRendererProps } from '../types';
import type { Live2dWidgetProps } from './schema';

const LIVE2D_WIDGET_LOG_PREFIX = '[Live2D:widget]';

/**
 * Live2D widget - 管理 Pixi Application 和 Live2D 模型
 */
export function Live2dWidget(props: WidgetRendererProps<Live2dWidgetProps>) {
    const { widget } = props;
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [elemWidth, elemHeight] = useElementSize(containerRef.current);
    // Debounce size changes for renderer resize (avoid flicker from frequent updates)
    const debouncedSize = useDebounce({ width: elemWidth, height: elemHeight }, widget.props.resizeDelay);
    const onHit = useCallback((areas) => {
        console.info(`${LIVE2D_WIDGET_LOG_PREFIX} model hit`, { widgetId: widget.id, areas });
    }, [widget.id]);
    const { canvas, resize } = useLive2D({
        modelPath: widget.props.modelPath,
        userScale: widget.props.scale,
        enableInteraction: widget.props.enableInteraction,
        enablePointerTracking: widget.props.enablePointerTracking,
        autoAnimation: widget.props.autoAnimation,
        renderPrecision: widget.props.renderPrecision,
        width: elemWidth || 0,
        height: elemHeight || 0,
        onHit: onHit,
    });

    useEffect(() => {
        resize(debouncedSize.width, debouncedSize.height);
    }, [debouncedSize.width, debouncedSize.height, resize]);

    // append / remove canvas produced by useLive2D
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !canvas) return;
        const c = canvas;
        if (!c) return;
        if (!container.contains(c)) {
            container.appendChild(c);
            c.style.display = 'block';
            c.style.height = '100%';
        }
        return () => {
            try {
                if (c && container.contains(c)) container.removeChild(c);
            } catch (e) { }
        };
    }, [canvas]);

    const containerStyle: CSSProperties = {
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
        minHeight: 0,
    };

    return (
        <>
            <div ref={containerRef} style={containerStyle} />
        </>
    );
}
