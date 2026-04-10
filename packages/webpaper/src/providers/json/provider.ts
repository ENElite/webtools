import type { ProviderRecord } from '../../types';
import type { JsonProviderSettings } from './settings';

function normalizeRecord(input: Record<string, unknown>, index: number): ProviderRecord {
    const getString = (key: string): string | undefined => (typeof input[key] === 'string' ? (input[key] as string) : undefined);
    const getNumber = (key: string): number | undefined => (typeof input[key] === 'number' ? (input[key] as number) : undefined);
    const type = input['type'] === 'video' ? 'video' : 'image';
    const displayUrl = getString('display_url') ?? getString('file_url') ?? '';
    const previewUrl = getString('preview_url') ?? displayUrl;
    const tagsValue = input['tags'];
    const tags = Array.isArray(tagsValue) ? tagsValue.filter((tag): tag is string => typeof tag === 'string') : [];

    return {
        type: type,
        provider: 'Json',
        sourceUrl: getString('source_url') ?? '',
        fileUrl: getString('file_url') ?? displayUrl,
        jpegUrl: getString('jpeg_url'),
        previewUrl: previewUrl,
        displayUrl: displayUrl,
        id: getNumber('id') ?? index + 1,
        parentId: getNumber('parent_id') ?? null,
        tags: tags,
        rating: getString('rating') ?? 'unknown',
        width: getNumber('width') ?? 1920,
        height: getNumber('height') ?? 1080,
        fileSize: getNumber('file_size') ?? 0,
        creatorId: getNumber('creator_id') ?? 0,
        author: getString('author') ?? 'json',
        source: getString('source') ?? '',
        createdAt: getNumber('created_at') ?? Date.now(),
        query: getString('query') ?? 'json',
        page: getNumber('page') ?? 1,
        raw: input,
    };
}

function parseJsonRecords(jsonText: string): ProviderRecord[] {
    const parsed = JSON.parse(jsonText) as unknown;
    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed
        .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
        .map((item, index) => normalizeRecord(item, index))
        .filter((item) => Boolean(item.displayUrl));
}

export class JsonProvider {
    private settings: JsonProviderSettings;

    private records: ProviderRecord[] = [];

    private index = 0;

    public constructor(settings: JsonProviderSettings) {
        this.settings = { ...settings };
        this.rebuild();
    }

    public get type(): string {
        return this.records[this.index]?.type ?? 'image';
    }

    public get name(): string {
        return 'Json';
    }

    public get queryKey(): string {
        return JSON.stringify({ jsonText: this.settings.jsonText });
    }

    public get hasMore(): boolean {
        return this.records.length > 0;
    }

    public get hasTemporaryError(): boolean {
        return false;
    }

    public get isStoppedByNetworkErrors(): boolean {
        return false;
    }

    public updateSettings(nextSettings: JsonProviderSettings): void {
        if (nextSettings.jsonText !== this.settings.jsonText) {
            this.settings = { ...nextSettings };
            this.rebuild();
            return;
        }

        this.settings = { ...nextSettings };
    }

    public reset(nextSettings = this.settings): void {
        this.settings = { ...nextSettings };
        this.rebuild();
    }

    public async getOne(): Promise<ProviderRecord | null> {
        if (this.records.length === 0) {
            return null;
        }

        const record = this.records[this.index] ?? null;
        this.index = (this.index + 1) % this.records.length;
        return record;
    }

    public async peekOne(): Promise<ProviderRecord | null> {
        if (this.records.length === 0) {
            return null;
        }

        return this.records[this.index] ?? null;
    }

    public setCurrentById(id: number): void {
        const targetIndex = this.records.findIndex((item) => item.id === id);
        if (targetIndex >= 0) {
            this.index = targetIndex;
        }
    }

    private rebuild(): void {
        try {
            this.records = parseJsonRecords(this.settings.jsonText);
        } catch {
            this.records = [];
        }

        this.index = 0;
    }
}
