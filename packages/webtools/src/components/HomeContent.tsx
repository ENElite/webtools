'use client';

import { Tabs } from '@heroui/react';
import { ToolCard } from '@/components/ToolCard';
import type { Tool } from '@/lib/types';
import { categories } from '@/lib/tools';

interface HomeContentProps {
    tools: Tool[];
}

export function HomeContent({ tools }: HomeContentProps) {
    return (
        <Tabs>
            <Tabs.ListContainer>
                <Tabs.List aria-label='工具分类'>
                    <Tabs.Tab id='all'>
                        全部工具
                        <Tabs.Indicator />
                    </Tabs.Tab>
                    {categories.map((category) => {
                        const categoryTools = tools.filter(
                            (tool) => tool.category === category.id
                        );
                        if (categoryTools.length === 0) return null;
                        return (
                            <Tabs.Tab key={category.id} id={category.id}>
                                {category.icon} {category.name}
                                <Tabs.Indicator />
                            </Tabs.Tab>
                        );
                    })}
                </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id='all'>
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'>
                    {tools.map((tool) => (
                        <ToolCard key={tool.id} tool={tool} />
                    ))}
                </div>
            </Tabs.Panel>
            {categories.map((category) => {
                const categoryTools = tools.filter(
                    (tool) => tool.category === category.id
                );
                if (categoryTools.length === 0) return null;
                return (
                    <Tabs.Panel key={category.id} id={category.id}>
                        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'>
                            {categoryTools.map((tool) => (
                                <ToolCard key={tool.id} tool={tool} />
                            ))}
                        </div>
                    </Tabs.Panel>
                );
            })}
        </Tabs>
    );
}
