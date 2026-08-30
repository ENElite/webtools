import { WebpaperApp } from './WebpaperApp';
import { prefetchDefaultKonachanPage } from './server-konachan-prefetch';

export const revalidate = 60;

export default async function Page() {
    const initialMediaPage = await prefetchDefaultKonachanPage();
    return <WebpaperApp {...(initialMediaPage ? { initialMediaPage } : {})} />;
}
