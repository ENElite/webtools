import { WebpaperApp } from './WebpaperApp';
import { preloadInitialMediaImages } from './preload-initial-media';
import { prefetchDefaultKonachanPage } from './server-konachan-prefetch';

export const revalidate = 60;

export default async function Page() {
    const initialMediaPage = await prefetchDefaultKonachanPage();
    preloadInitialMediaImages(initialMediaPage);
    return <WebpaperApp {...(initialMediaPage ? { initialMediaPage } : {})} />;
}
