'use client';

import Link from 'next/link';
import { Badge } from '@webtools/ui';

export function Header() {
    return (
        <nav className='sticky top-0 z-40 w-full border-b border-[var(--wt-color-border)] bg-[var(--wt-color-surface)] shadow-[var(--wt-shadow-sm)]'>
            <header className='mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6'>
                <div className='flex items-center gap-3'>
                    <Link href='/' className='group flex items-center gap-2 rounded-full font-black tracking-tight text-[var(--wt-color-text)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--wt-color-focus)]'>
                        <span className='grid size-10 place-items-center rounded-[42%_58%_38%_62%] bg-[var(--wt-color-accent)] text-xl text-white shadow-md transition-transform group-hover:rotate-8'>🧰</span>
                        <span className='text-xl'>WebTools</span>
                    </Link>
                    <Badge tone='accent' variant='solid'>Mochi</Badge>
                </div>
                <ul className='flex items-center gap-4'>
                    <li>
                        <Link
                            href='/'
                            className='rounded-full px-4 py-2 text-sm font-bold text-[var(--wt-color-text-muted)] transition hover:bg-[var(--wt-color-accent-soft)] hover:text-[var(--wt-color-accent-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--wt-color-focus)]'
                        >
                            首页
                        </Link>
                    </li>
                </ul>
            </header>
        </nav>
    );
}
