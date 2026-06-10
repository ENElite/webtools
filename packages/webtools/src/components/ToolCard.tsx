'use client';

import { Card, CardBody, CardFooter, Button } from '@heroui/react';
import Link from 'next/link';
import { Tool } from '@/lib/tools';

interface ToolCardProps {
  tool: Tool;
}

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <Card className="w-full h-full hover:shadow-lg transition-shadow duration-300">
      <CardBody className="flex flex-col items-center justify-center p-6">
        <span className="text-4xl mb-4">{tool.icon}</span>
        <h3 className="text-xl font-bold mb-2 text-center">{tool.name}</h3>
        <p className="text-gray-500 text-center text-sm">{tool.description}</p>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {tool.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      </CardBody>
      <CardFooter className="justify-center pb-6">
        <Button
          as={Link}
          href={tool.href}
          color="primary"
          variant="flat"
          className="w-full"
        >
          打开工具
        </Button>
      </CardFooter>
    </Card>
  );
}
