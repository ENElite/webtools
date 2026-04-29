import type { ProviderRecord } from '@/shared/types';

export type CoordinatorEvent =
    | { type: 'provider-record-loaded'; record: ProviderRecord }
    | { type: 'provider-switched'; provider: 'Konachan' | 'Json' | 'History' }
    | { type: 'overlay-widget-created'; widgetId: string; widgetKind: string };

export class WebpaperCoordinator {
    private listeners = new Set<(event: CoordinatorEvent) => void>();

    public emit(event: CoordinatorEvent): void {
        for (const listener of this.listeners) {
            listener(event);
        }
    }

    public subscribe(listener: (event: CoordinatorEvent) => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
}

export const webpaperCoordinator = new WebpaperCoordinator();
