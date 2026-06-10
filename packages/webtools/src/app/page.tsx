'use client';

import { Tabs, Tab } from '@heroui/react';
import { Header } from '@/components/Header';
import { ToolCard } from '@/components/ToolCard';
import { tools, categories } from '@/lib/tools';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Hero 部分 */}
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">前端工具集</h1>
          <p className="text-xl text-gray-500 mb-8">
            快速、轻量的在线工具集合，提升你的工作效率
          </p>
        </section>

        {/* 工具分类 */}
        <Tabs aria-label="工具分类" className="mb-8">
          <Tab key="all" title="全部工具">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </Tab>
          {categories.map((category) => {
            const categoryTools = tools.filter(
              (tool) => tool.category === category.id
            );
            if (categoryTools.length === 0) return null;
            return (
              <Tab key={category.id} title={`${category.icon} ${category.name}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {categoryTools.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} />
                  ))}
                </div>
              </Tab>
            );
          })}
        </Tabs>

        {/* 页脚 */}
        <footer className="text-center py-8 text-gray-500 text-sm">
          <p>WebTools - 前端工具集 © {new Date().getFullYear()}</p>
        </footer>
      </main>
    </div>
  );
}
