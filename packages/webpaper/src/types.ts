export type Provider = 'Konachan' | 'Bilibili' | 'Json' | 'History' | 'Unknown';
export type ProviderType = 'image' | 'video';


export type HistoryRecord = {
    sequence: number;
    type: ProviderType;
    provider: Provider;
    sourceUrl: string;
    fileUrl: string;
    jpegUrl?: string;
    sampleUrl?: string;
    previewUrl: string;
    displayUrl: string;
    id: number;
    parentId: number | null;
    tags: string[];
    rating: string;
    width: number;
    height: number;
    fileSize: number;
    creatorId: number;
    author: string;
    source: string;
    createdAt: number;
    query: string;
    page: number;
    raw: Record<string, unknown>;
};

export type ProviderRecord = Omit<HistoryRecord, 'sequence'>;
