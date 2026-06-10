'use client';

import { Button, Spacer } from '@heroui/react';
import Link from 'next/link';
import { Header } from './Header';

interface ToolLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function ToolLayout({ title, description, children }: ToolLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* 工具头部 */}
        <section className="mb-8">
          <Button
            as={Link}
            href="/"
            variant="light"
            className="mb-4"
            startContent={<span>←</span>}
          >
            返回首页
          </Button>
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-gray-500">{description}</p>
        </section>

        {/* 工具内容 */}
        <section>{children}</section>
      </main>
    </div>
  );
}
