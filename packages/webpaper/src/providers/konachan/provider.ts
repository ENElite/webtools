import { fetchKonachan, type KonachanImageInfo } from './api';
import {
    buildKonachanPreviewUrl,
    buildKonachanQuery,
    buildKonachanQueryKey,
    pickKonachanUrl,
    type KonachanProviderSettings,
} from './settings';
import type { ProviderRecord } from '../../types';

type Notify = (type: 'success' | 'info' | 'warning' | 'error', message: string, description?: string) => void;

type RequestState = {
    key: string;
    page: number;
    index: number;
    images: KonachanImageInfo[];
    ids: Set<number>;
    exhausted: boolean;
};

function createRequestState(settings: KonachanProviderSettings): RequestState {
    return {
        key: buildKonachanQueryKey(settings),
        page: settings.page,
        index: 0,
        images: [],
        ids: new Set<number>(),
        exhausted: false,
    };
}

function toProviderRecord(image: KonachanImageInfo, settings: KonachanProviderSettings, page: number): ProviderRecord {
    const query = buildKonachanQuery(settings);

    return {
        provider: 'Konachan',
        providerId: 'Konachan',
        providerLabel: 'Konachan',
        type: 'image',
        sourceUrl: `https://konachan.net/post/show/${image.id}`,
        fileUrl: image.file_url,
        jpegUrl: image.jpeg_url,
        sampleUrl: image.sample_url,
        previewUrl: image.preview_url,
        displayUrl: pickKonachanUrl(image, settings.quality),
        id: image.id,
        parentId: image.parent_id || null,
        tags: image.tags.split(' ').map((tag) => tag.trim()).filter(Boolean),
        rating: image.rating,
        width: image.width,
        height: image.height,
        fileSize: image.file_size,
        creatorId: image.creator_id,
        author: image.author,
        source: image.source,
        createdAt: image.created_at,
        query,
        page,
        raw: image as Record<string, unknown>,
    };
}

export class KonachanProvider {
    private settings: KonachanProviderSettings;

    private requestState: RequestState;

    private consecutiveNetworkErrors = 0;

    private readonly maxNetworkErrors = 3;

    private readonly maxPageLoadsPerOperation = 8;

    private stoppedByNetworkErrors = false;

    public constructor(settings: KonachanProviderSettings, private readonly notify?: Notify) {
        this.settings = { ...settings };
        this.requestState = createRequestState(this.settings);
    }

    public get type(): string {
        return 'image';
    }

    public get name(): string {
        return 'Konachan';
    }

    public get queryKey(): string {
        return buildKonachanQueryKey(this.settings);
    }

    public get hasMore(): boolean {
        return !this.requestState.exhausted;
    }

    public get hasTemporaryError(): boolean {
        return this.consecutiveNetworkErrors > 0 && !this.stoppedByNetworkErrors;
    }

    public get isStoppedByNetworkErrors(): boolean {
        return this.stoppedByNetworkErrors;
    }

    public getPreviewUrl(): string {
        return buildKonachanPreviewUrl(this.settings);
    }

    public updateSettings(nextSettings: KonachanProviderSettings): void {
        const nextKey = buildKonachanQueryKey(nextSettings);
        this.settings = { ...nextSettings };

        if (nextKey !== this.requestState.key) {
            this.reset(nextSettings);
        }
    }

    public reset(nextSettings = this.settings): void {
        this.settings = { ...nextSettings };
        this.requestState = createRequestState(this.settings);
        this.consecutiveNetworkErrors = 0;
        this.stoppedByNetworkErrors = false;
    }

    public async getOne(): Promise<ProviderRecord | null> {
        const image = await this.pullNextImage();
        return image ? image.record : null;
    }

    public async peekOne(): Promise<ProviderRecord | null> {
        const image = await this.peekNextImage();
        return image ? image.record : null;
    }

    public async getAll(): Promise<ProviderRecord[]> {
        const result: ProviderRecord[] = [];
        let guard = 0;

        while (!this.requestState.exhausted && guard < 256) {
            guard += 1;
            const image = await this.pullNextImage();
            if (!image) {
                break;
            }
            result.push(image.record);
        }

        return result;
    }

    private async fetchPage(page: number): Promise<KonachanImageInfo[] | null> {
        if (this.stoppedByNetworkErrors) {
            return null;
        }

        const query = buildKonachanQuery(this.settings);
        const endpoint = `${this.settings.baseUrl}?page=${page}&tags=${query}`;

        try {
            const result = await fetchKonachan(endpoint);
            this.consecutiveNetworkErrors = 0;
            return result;
        } catch (error) {
            this.consecutiveNetworkErrors += 1;
            const message = error instanceof Error ? error.message : 'Unknown error';

            if (this.consecutiveNetworkErrors >= this.maxNetworkErrors) {
                this.stoppedByNetworkErrors = true;
                this.requestState.exhausted = true;
                this.notify?.(
                    'error',
                    'Konachan 请求已停止',
                    `连续 ${this.consecutiveNetworkErrors} 次网络异常。${message}`
                );
                return null;
            }

            this.notify?.(
                'warning',
                'Konachan 网络异常',
                `第 ${this.consecutiveNetworkErrors}/${this.maxNetworkErrors} 次失败：${message}`
            );
            return null;
        }
    }

    private async loadPage(page: number): Promise<KonachanImageInfo[] | null> {
        const images = await this.fetchPage(page);
        if (images === null) {
            if (this.stoppedByNetworkErrors) {
                this.requestState.exhausted = true;
            }
            return null;
        }

        if (images.length === 0) {
            return [];
        }

        return images;
    }

    private async ensureImages(): Promise<boolean> {
        if (this.requestState.exhausted) {
            return false;
        }

        if (this.requestState.key !== this.queryKey) {
            this.reset(this.settings);
        }

        if (this.requestState.images.length === 0) {
            const firstPage = await this.loadPage(this.requestState.page);
            if (firstPage === null) {
                return false;
            }

            if (firstPage.length === 0 && this.requestState.page > 1) {
                this.requestState.page = 1;
                const fallback = await this.loadPage(this.requestState.page);
                if (fallback === null || fallback.length === 0) {
                    this.requestState.exhausted = true;
                    return false;
                }
                this.requestState.images = fallback;
            } else {
                this.requestState.images = firstPage;
            }
        }

        return this.requestState.images.length > 0;
    }

    private async pullNextImage(): Promise<{ record: ProviderRecord; image: KonachanImageInfo } | null> {
        const ready = await this.ensureImages();
        if (!ready) {
            return null;
        }

        let guard = 0;
        let pageLoads = 0;

        while (guard < 128) {
            guard += 1;

            if (this.requestState.index >= this.requestState.images.length) {
                if (pageLoads >= this.maxPageLoadsPerOperation) {
                    this.requestState.exhausted = true;
                    return null;
                }

                pageLoads += 1;
                this.requestState.index = 0;
                this.requestState.page += 1;
                const nextPage = await this.loadPage(this.requestState.page);

                if (nextPage === null) {
                    return null;
                }

                if (nextPage.length === 0) {
                    this.requestState.page = 1;
                    const fallback = await this.loadPage(this.requestState.page);
                    if (fallback === null || fallback.length === 0) {
                        this.requestState.exhausted = true;
                        return null;
                    }
                    this.requestState.images = fallback;
                } else {
                    this.requestState.images = nextPage;
                }
            }

            const candidate = this.requestState.images[this.requestState.index];
            this.requestState.index += 1;

            if (!candidate) {
                continue;
            }

            if (this.requestState.ids.has(candidate.id)) {
                continue;
            }

            this.requestState.ids.add(candidate.id);

            if (this.settings.skipPid && candidate.parent_id && this.requestState.ids.has(candidate.parent_id)) {
                continue;
            }

            if (candidate.parent_id) {
                this.requestState.ids.add(candidate.parent_id);
            }

            return {
                image: candidate,
                record: toProviderRecord(candidate, this.settings, this.requestState.page),
            };
        }

        this.requestState.exhausted = true;
        return null;
    }

    private async peekNextImage(): Promise<{ record: ProviderRecord; image: KonachanImageInfo } | null> {
        // Clone current state for peeking without affecting actual state
        const peekState: RequestState = {
            key: this.requestState.key,
            page: this.requestState.page,
            index: this.requestState.index,
            images: [...this.requestState.images],
            ids: new Set(this.requestState.ids),
            exhausted: this.requestState.exhausted,
        };

        if (peekState.exhausted) {
            return null;
        }

        if (peekState.images.length === 0) {
            const firstPage = await this.loadPage(peekState.page);
            if (firstPage === null || firstPage.length === 0) {
                return null;
            }
            peekState.images = firstPage;
        }

        let guard = 0;
        let pageLoads = 0;

        while (guard < 128) {
            guard += 1;

            if (peekState.index >= peekState.images.length) {
                if (pageLoads >= this.maxPageLoadsPerOperation) {
                    return null;
                }

                pageLoads += 1;
                peekState.index = 0;
                peekState.page += 1;
                const nextPage = await this.loadPage(peekState.page);

                if (nextPage === null || nextPage.length === 0) {
                    return null;
                }

                peekState.images = nextPage;
            }

            const candidate = peekState.images[peekState.index];
            peekState.index += 1;

            if (!candidate) {
                continue;
            }

            if (peekState.ids.has(candidate.id)) {
                continue;
            }

            peekState.ids.add(candidate.id);

            if (this.settings.skipPid && candidate.parent_id && peekState.ids.has(candidate.parent_id)) {
                continue;
            }

            if (candidate.parent_id) {
                peekState.ids.add(candidate.parent_id);
            }

            return {
                image: candidate,
                record: toProviderRecord(candidate, this.settings, peekState.page),
            };
        }

        return null;
    }
}
