import { Header } from '@/components/Header';
import { HomeContent } from '@/components/HomeContent';
import { tools } from '@/lib/tools.generated';

export default async function HomePage() {

    return (
        <div className='min-h-screen'>
            <Header />
            <main className='mx-auto max-w-7xl px-4 py-10 sm:px-6'>
                {/* Hero 部分 */}
                <section className='relative mb-12 overflow-hidden rounded-[2.25rem] border border-[var(--wt-color-border)] bg-[var(--wt-color-surface)] px-6 py-12 text-center shadow-[var(--wt-shadow-md)] sm:px-12'>
                    <span className='absolute -left-4 top-4 text-5xl opacity-30' aria-hidden='true'>🌸</span>
                    <span className='absolute -right-3 bottom-1 text-6xl opacity-25' aria-hidden='true'>🫧</span>
                    <p className='mb-3 text-sm font-extrabold tracking-[0.18em] text-[var(--wt-color-accent-hover)]'>HANDY · FRIENDLY · LOCAL</p>
                    <h1 className='text-4xl font-black tracking-tight text-[var(--wt-color-text)] sm:text-5xl'>把麻烦工作变成小事</h1>
                    <p className='mx-auto mt-4 max-w-2xl text-lg leading-8 text-[var(--wt-color-text-muted)]'>
                        快速、轻量的在线工具集合，提升你的工作效率
                    </p>
                </section>

                {/* 工具分类 */}
                <div className='mb-8'>
                    <HomeContent tools={tools} />
                </div>

                {/* 页脚 */}
                <footer className='py-10 text-center text-sm text-[var(--wt-color-text-muted)]'>
                    <p>WebTools - 前端工具集 © {new Date().getFullYear()}</p>
                </footer>
            </main>
        </div>
    );
}
