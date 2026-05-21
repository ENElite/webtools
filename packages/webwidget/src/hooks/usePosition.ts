import { useLayoutEffect, useState } from "react";

export function usePosition(target: HTMLElement | null) {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    // 使用 observe API 监听 target 和 container 的位置变化
    useLayoutEffect(() => {
        if (!target) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target !== target)
                    continue;

                const { x, y } = entry.contentRect;
                setPosition({ x, y });
            }
        });
        resizeObserver.observe(target);
        return () => {
            resizeObserver.disconnect();
        };
    }, [target]);
    return position;
}