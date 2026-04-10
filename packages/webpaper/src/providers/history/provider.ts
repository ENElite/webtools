import type { HistoryRecord, ProviderRecord } from '../../types';

export class HistoryProvider {
    private records: HistoryRecord[];

    private index = 0;

    public constructor(records: HistoryRecord[]) {
        this.records = [...records];
    }

    public get type(): string {
        return this.records[this.index]?.type ?? 'image';
    }

    public get name(): string {
        return 'History';
    }

    public get queryKey(): string {
        const last = this.records.at(-1);
        return `${this.records.length}:${last?.sequence ?? 0}`;
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

    public reset(records = this.records): void {
        this.records = [...records];
        this.index = 0;
    }

    public setCurrentBySequence(sequence: number): void {
        const targetIndex = this.records.findIndex((item) => item.sequence === sequence);
        if (targetIndex >= 0) {
            this.index = targetIndex;
        }
    }

    public async getOne(): Promise<ProviderRecord | null> {
        if (this.records.length === 0) {
            return null;
        }

        const record = this.records[this.index] ?? null;
        this.index = (this.index + 1) % this.records.length;
        return record ? { ...record } : null;
    }

    public async peekOne(): Promise<ProviderRecord | null> {
        if (this.records.length === 0) {
            return null;
        }

        const record = this.records[this.index] ?? null;
        return record ? { ...record } : null;
    }
}
