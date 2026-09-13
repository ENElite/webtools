export const KNOWN_MEDIA_SOURCE_IDS = ['konachan', 'bird-paper', 'json'] as const;

export type KnownMediaSourceId = (typeof KNOWN_MEDIA_SOURCE_IDS)[number];
export type MediaSourceId = KnownMediaSourceId | (string & {});

interface MediaItemBase {
    readonly id: string;
    readonly sourceId: MediaSourceId;
    readonly url: string;
    readonly raw: unknown;
}

export interface ImageMediaItem extends MediaItemBase {
    readonly kind: 'image';
    readonly previewUrl?: string;
    readonly width?: number;
    readonly height?: number;
}

export interface VideoMediaItem extends MediaItemBase {
    readonly kind: 'video';
    readonly posterUrl?: string;
    readonly durationSeconds?: number;
}

/**
 * The persistent media model. Rendering code must narrow on `kind` before
 * reading kind-specific fields.
 */
export type MediaItem = ImageMediaItem | VideoMediaItem;
