import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { MediaItem } from '../../domain';
import { HistoryDrawer } from './history-drawer';

const items: readonly MediaItem[] = [
    { id: 'cover', sourceId: 'json', kind: 'image', url: '/cover.jpg', raw: null },
    { id: 'clip', sourceId: 'json', kind: 'video', url: '/clip.mp4', posterUrl: '/clip.jpg', raw: null },
];

describe('HistoryDrawer', () => {
    it('filters typed media history without depending on provider-specific records', () => {
        const markup = renderToStaticMarkup(
            <HistoryDrawer
                open
                items={items}
                search='video'
                onSearchChange={vi.fn()}
                onSelect={vi.fn()}
                onClose={vi.fn()}
            />,
        );

        expect(markup).toContain('json · video · clip');
        expect(markup).not.toContain('json · image · cover');
        expect(markup).toContain('role="dialog"');
    });

    it('renders nothing while closed', () => {
        const markup = renderToStaticMarkup(
            <HistoryDrawer
                open={false}
                items={items}
                search=''
                onSearchChange={vi.fn()}
                onSelect={vi.fn()}
                onClose={vi.fn()}
            />,
        );
        expect(markup).toBe('');
    });
});
