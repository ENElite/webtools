'use client';

import { Tabs } from '@webtools/ui';
import { ToolCard } from '@/components/ToolCard';
import type { Tool } from '@/lib/types';
import { categories } from '@/lib/tools';

interface HomeContentProps {
    tools: Tool[];
}

export function HomeContent({ tools }: HomeContentProps) {
    const renderTools = (items: Tool[]) => (
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
            {items.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
            ))}
        </div>
    );

    const items = [
        {
            value: 'all',
            label: `✨ 全部工具 · ${tools.length}`,
            content: renderTools(tools),
        },
        ...categories.flatMap((category) => {
            const categoryTools = tools.filter((tool) => tool.category === category.id);
            return categoryTools.length > 0
                ? [{
                    value: category.id,
                    label: `${category.icon} ${category.name} · ${categoryTools.length}`,
                    content: renderTools(categoryTools),
                }]
                : [];
        }),
    ];

    return (
        <Tabs defaultValue='all' items={items} />
    );
}
