'use client';

// HeroUI v3 不再需要 Provider
// 直接渲染 children
export function Providers({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
