'use client';

// 公共 UI 基于 Ark UI 的组件自行管理上下文，目前无需应用级 Provider。
export function Providers({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
