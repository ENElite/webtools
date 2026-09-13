'use client';

import { Badge, Card, CardContent } from '@webtools/ui';
import Link from 'next/link';
import type { Tool } from '@/lib/types';

interface ToolCardProps {
    tool: Tool;
}

export function ToolCard({ tool }: ToolCardProps) {
    return (
        <Link href={tool.href} className='group block h-full rounded-[var(--wt-radius-xl)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--wt-color-focus)]'>
            <Card className='h-full overflow-hidden transition duration-300 group-hover:-translate-y-1 group-hover:rotate-[-0.4deg] group-hover:shadow-xl'>
                <CardContent className='flex h-full flex-col items-center justify-center p-7'>
                    <span className='mb-4 grid size-16 place-items-center rounded-[40%_60%_58%_42%] bg-[var(--wt-color-accent-soft)] text-4xl transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110' aria-hidden='true'>{tool.icon}</span>
                    <h3 className='mb-2 text-center text-xl font-extrabold tracking-tight'>{tool.name}</h3>
                    <p className='text-center text-sm leading-6 text-[var(--wt-color-text-muted)]'>{tool.description}</p>
                    <div className='mt-5 flex flex-wrap justify-center gap-2'>
                        {tool.tags.map((tag) => (
                            <Badge key={tag}>{tag}</Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
