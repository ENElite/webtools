'use client';

import Link from 'next/link';

export function Header() {
    return (
        <nav className='sticky top-0 z-40 w-full border-b border-gray-200 bg-white/80 backdrop-blur-sm'>
            <header className='flex h-16 items-center justify-between px-6'>
                <div className='flex items-center gap-3'>
                    <Link href='/' className='font-bold text-xl text-blue-600'>
                        WebTools
                    </Link>
                </div>
                <ul className='flex items-center gap-4'>
                    <li>
                        <Link
                            href='/'
                            className='text-gray-600 hover:text-blue-600 transition-colors'
                        >
                            首页
                        </Link>
                    </li>
                </ul>
            </header>
        </nav>
    );
}
