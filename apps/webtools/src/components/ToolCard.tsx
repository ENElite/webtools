'use client';

import { Card } from '@heroui/react';
import Link from 'next/link';
import type { Tool } from '@/lib/types';

interface ToolCardProps {
    tool: Tool;
}

export function ToolCard({ tool }: ToolCardProps) {
    return (
        <Link href={tool.href} className='block w-full h-full'>
            <Card className='w-full h-full hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer'>
                <Card.Content className='flex flex-col items-center justify-center p-6'>
                    <span className='text-4xl mb-4'>{tool.icon}</span>
                    <h3 className='text-xl font-bold mb-2 text-center'>{tool.name}</h3>
                    <p className='text-gray-500 text-center text-sm'>{tool.description}</p>
                    <div className='flex flex-wrap justify-center gap-2 mt-4'>
                        {tool.tags.map((tag) => (
                            <span
                                key={tag}
                                className='px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600'
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </Card.Content>
            </Card>
        </Link>
    );
}
