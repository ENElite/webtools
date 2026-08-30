import { WebpaperApp } from './WebpaperApp';
import { preloadFirstMediaImage } from './preload-first-media';
import { prefetchDefaultKonachanPage } from './server-konachan-prefetch';

export const revalidate = 60;

export default async function Page() {
    const initialMediaPage = await prefetchDefaultKonachanPage();
    preloadFirstMediaImage(initialMediaPage);
    return <WebpaperApp {...(initialMediaPage ? { initialMediaPage } : {})} />;
}
