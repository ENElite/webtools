'use client';

import { Header } from './Header';

interface ToolLayoutProps {
    title: string;
    description: string;
    children: React.ReactNode;
}

export function ToolLayout({ title, description, children }: ToolLayoutProps) {
    return (
        <div className='min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100'>
            <Header />
            <main className='container mx-auto px-4 py-8 flex-1 flex flex-col'>
                {/* 工具头部 */}
                <section className='mb-8 shrink-0'>
                    <h1 className='text-3xl font-bold mb-2'>{title}</h1>
                    <p className='text-gray-500'>{description}</p>
                </section>

                {/* 工具内容 */}
                <section className='flex-1 flex flex-col'>{children}</section>
            </main>
        </div>
    );
}
