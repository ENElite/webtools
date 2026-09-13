import type { WidgetOperation, WidgetTransaction } from './types';

export function createTransaction(
    operations: readonly WidgetOperation[],
    description?: string,
): WidgetTransaction {
    return description === undefined
        ? { operations: [...operations] }
        : { operations: [...operations], description };
}

export function isWidgetTransaction(
    input: WidgetOperation | WidgetTransaction,
): input is WidgetTransaction {
    return 'operations' in input;
}
