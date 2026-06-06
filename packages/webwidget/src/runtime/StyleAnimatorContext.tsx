/**
 * StyleAnimatorContext — 提供当前 animate style 给 slot 使用
 *
 * slot 在执行容器动画时，需要知道当前的 animate style，
 * 以便在 controls.start() 中合并，避免丢失 CSS 属性。
 */

import { createContext, useContext } from 'react';
import type { CSSProperties } from 'react';

const StyleAnimateContext = createContext<CSSProperties>({});

export const StyleAnimateProvider = StyleAnimateContext.Provider;

export function useStyleAnimate(): CSSProperties {
    return useContext(StyleAnimateContext);
}
