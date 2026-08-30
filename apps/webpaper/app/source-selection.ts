import type { AppSettings } from '../src/application';
import { buildKonachanTags } from '../src/domain';
import type { MediaSourceSelection } from '../src/features/media';

export function toSelection(settings: AppSettings): MediaSourceSelection {
    if (settings.source === 'bird-paper') {
        const params = settings.bird.mode === 'search' && settings.bird.query.trim()
            ? { mode: 'search' as const, query: settings.bird.query.trim() }
            : settings.bird.mode === 'category' && settings.bird.categoryId.trim()
                ? { mode: 'category' as const, categoryId: settings.bird.categoryId.trim() }
                : { mode: 'latest' as const };
        return { sourceId: 'bird-paper', pageSize: settings.pageSize, params };
    }
    if (settings.source === 'konachan') {
        return {
            sourceId: 'konachan',
            pageSize: settings.pageSize,
            params: {
                tags: buildKonachanTags(settings.konachan.tags, settings.konachan.rating),
                rating: settings.konachan.rating,
                quality: settings.konachan.quality,
            },
        };
    }
    return {
        sourceId: 'json',
        pageSize: settings.pageSize,
        params: { content: settings.jsonContent },
    };
}
