'use client';

import { Header } from './Header';

interface ToolLayoutProps {
    title: string;
    description: string;
    children: React.ReactNode;
}

export function ToolLayout({ title, description, children }: ToolLayoutProps) {
    return (
        <div className='flex min-h-screen flex-col'>
            <Header />
            <main className='mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:py-10'>
                {/* 工具头部 */}
                <section className='mb-8 shrink-0'>
                    <div className='mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--wt-color-surface)] px-3 py-1.5 text-xs font-bold text-[var(--wt-color-accent-hover)] shadow-[var(--wt-shadow-sm)] ring-1 ring-[var(--wt-color-border)]'>
                        <span aria-hidden='true'>✨</span> 小工具工作台
                    </div>
                    <h1 className='text-3xl font-black tracking-tight text-[var(--wt-color-text)] sm:text-4xl'>{title}</h1>
                    <p className='mt-2 max-w-3xl leading-7 text-[var(--wt-color-text-muted)]'>{description}</p>
                </section>

                {/* 工具内容 */}
                <section className='flex-1 flex flex-col'>{children}</section>
            </main>
        </div>
    );
}
