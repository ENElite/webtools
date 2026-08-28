import { Header } from '@/components/Header';
import { HomeContent } from '@/components/HomeContent';
import { tools } from '@/lib/tools.generated';

export default async function HomePage() {

    return (
        <div className='min-h-screen bg-linear-to-br from-gray-50 to-gray-100'>
            <Header />
            <main className='container mx-auto px-4 py-8'>
                {/* Hero 部分 */}
                <section className='text-center mb-12'>
                    <h1 className='text-4xl font-bold mb-4'>前端工具集</h1>
                    <p className='text-xl text-gray-500 mb-8'>
                        快速、轻量的在线工具集合，提升你的工作效率
                    </p>
                </section>

                {/* 工具分类 */}
                <div className='mb-8'>
                    <HomeContent tools={tools} />
                </div>

                {/* 页脚 */}
                <footer className='text-center py-8 text-gray-500 text-sm'>
                    <p>WebTools - 前端工具集 © {new Date().getFullYear()}</p>
                </footer>
            </main>
        </div>
    );
}
