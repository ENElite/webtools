export type KonachanImageInfo = {
    id: number;
    parent_id: number;
    tags: string;
    rating: string;
    width: number;
    height: number;
    file_size: number;
    file_url: string;
    jpeg_url?: string;
    sample_url?: string;
    preview_url: string;
    author: string;
    source: string;
    md5: string;
    creator_id: number;
    created_at: number;
} & Record<string, unknown>;

export type QualityKey = 'file_url' | 'jpeg_url' | 'sample_url' | 'preview_url';

type Option = {
    value: string;
    label: string;
};

function makeSizeOptions(prefix: string, values: string[]): Option[] {
    return values.flatMap((value) => [
        { value: `${prefix}:${value}..`, label: `>= ${value}` },
        { value: `${prefix}:${value}`, label: `= ${value}` },
        { value: `${prefix}:..${value}`, label: `<= ${value}` },
    ]);
}

const widthValues = ['2560', '1920', '1680', '1600', '1440', '1400', '1280', '1152', '1024'];
const heightValues = ['1600', '1200', '1080', '1050', '1024', '960', '900', '864', '800', '768'];

export const ratingOptions: Option[] = [
    { value: 'rating:safe', label: 'safe' },
    { value: 'rating:questionable', label: 'questionable' },
    { value: 'rating:explicit', label: 'explicit' },
];

export const widthOptions = makeSizeOptions('width', widthValues);
export const heightOptions = makeSizeOptions('height', heightValues);

export const qualityOptions: Array<{ value: QualityKey; label: string }> = [
    { value: 'file_url', label: '原图' },
    { value: 'jpeg_url', label: '高清' },
    { value: 'sample_url', label: '普通' },
    { value: 'preview_url', label: '缩略图' },
];

function delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
    });
}

export async function fetchKonachan(url: string, retry = 3): Promise<KonachanImageInfo[]> {
    let attempt = 0;
    let lastError: unknown = null;

    while (attempt < retry) {
        try {
            const response = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }

            const data: unknown = await response.json();
            if (!Array.isArray(data)) {
                throw new Error('Invalid response payload');
            }

            return data as KonachanImageInfo[];
        } catch (error) {
            lastError = error;
            attempt += 1;
            if (attempt >= retry) {
                throw lastError instanceof Error ? lastError : new Error('Request failed');
            }

            await delay(1000 * 2 ** attempt);
        }
    }

    throw lastError instanceof Error ? lastError : new Error('Request failed');
}
