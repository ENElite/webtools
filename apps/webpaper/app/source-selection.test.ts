import { describe, expect, it } from 'vitest';

import { DEFAULT_APP_SETTINGS } from '../src/application';
import { toSelection } from './source-selection';

describe('source selection', () => {
    it('injects one selected Konachan rating after sanitizing and deduplicating tags', () => {
        const selection = toSelection({
            ...DEFAULT_APP_SETTINGS,
            source: 'konachan',
            konachan: {
                ...DEFAULT_APP_SETTINGS.konachan,
                tags: 'cat rating:safe cat landscape rating:explicit',
                rating: 'questionable',
            },
        });

        expect(selection).toMatchObject({
            sourceId: 'konachan',
            params: {
                tags: 'cat landscape rating:questionable',
                rating: 'questionable',
            },
        });
    });
});
