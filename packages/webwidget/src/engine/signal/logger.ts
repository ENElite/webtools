/**
 * SignalLogger — 集中式信号与槽位日志
 *
 * 所有信号发射和槽位执行的日志集中在此处。
 * 开发时可通过 `enableSignalLog(true)` 开启。
 */

let _enabled = false;

export function enableSignalLog(enabled: boolean): void {
    _enabled = enabled;
}

export function isSignalLogEnabled(): boolean {
    return _enabled;
}

export function logSignal(type: string, widgetId?: string, payload?: unknown): void {
    if (!_enabled) return;
    console.log(
        `%c⚡ signal %c${type}%c ${widgetId ? `[${widgetId}]` : ''}`,
        'color: #888; font-weight: bold',
        'color: #0af; font-weight: bold',
        'color: #888',
        payload ?? '',
    );
}

export function logSlot(slotType: string, sourceWidgetId: string, targetWidgetId: string, signalType: string): void {
    if (!_enabled) return;
    console.log(
        `%c🔧 slot %c${slotType}%c ← signal %c${signalType}%c ${sourceWidgetId} → ${targetWidgetId}`,
        'color: #888; font-weight: bold',
        'color: #fa0; font-weight: bold',
        'color: #888',
        'color: #0af',
        'color: #888',
    );
}
