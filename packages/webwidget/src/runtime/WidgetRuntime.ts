/**
 * WidgetRuntime — 每个 widget 的运行时管理器
 *
 * 统一管理：
 * - Signal 集合：widget 可以发出的 signal
 * - Slot 集合：widget 可以接收并处理的 slot
 * - Connection 集合：signal → slot 的连接关系
 *
 * 设计参考 Qt 的 QObject：每个对象管理自己的信号、槽和连接。
 */

import type { Connection } from '../engine/model/bindings';
import { signalBus } from '../engine/signal';
import type { Signal } from '../engine/signal';
import { getSlot } from '../engine/slots/registry';
import { logSlot } from '../engine/signal/logger';

export type Unsubscribe = () => void;

export type SignalHandler = (signal: Signal) => void;

export type SlotHandler = (
    params: Record<string, unknown>,
    ctx: {
        signal: { type: string; payload: unknown; source: string };
        sourceWidgetId: string;
        targetWidgetId: string;
        emit: (type: string, payload?: unknown) => void;
    },
) => void;

export class WidgetRuntime {
    readonly id: string;

    private _slots = new Map<string, SlotHandler>();
    private _connections: Connection[] = [];
    private _signalUnsubscribes = new Map<string, Unsubscribe>();
    private _disposed = false;

    constructor(id: string) {
        this.id = id;
    }

    get disposed(): boolean {
        return this._disposed;
    }

    // ── Signal 管理 ──────────────────────────────────────────────────────────

    /**
     * 发射信号到全局 signalBus。
     */
    emit(type: string, payload?: unknown): void {
        if (this._disposed) return;
        const signal: Signal = {
            timestamp: Date.now(),
            source: 'widget',
            type: type as any,
            payload: payload as any,
            widgetId: this.id,
        };
        signalBus.emit(signal);
    }

    /**
     * 监听全局 signalBus 中特定类型的信号。
     * 返回取消订阅函数。
     */
    on(type: string, handler: SignalHandler): Unsubscribe {
        const unsub = signalBus.on(type as any, handler as any);
        this._signalUnsubscribes.set(type, unsub);
        return () => {
            unsub();
            this._signalUnsubscribes.delete(type);
        };
    }

    // ── Slot 管理 ────────────────────────────────────────────────────────────

    /**
     * 注册一个 slot handler。
     * 组件自行决定可以注册哪些 slot。
     * 返回取消注册函数。
     */
    registerSlot(type: string, handler: SlotHandler): Unsubscribe {
        this._slots.set(type, handler);
        return () => {
            this._slots.delete(type);
        };
    }

    /**
     * 取消注册一个 slot。
     */
    unregisterSlot(type: string): void {
        this._slots.delete(type);
    }

    /**
     * 获取已注册的 slot handler。
     */
    getSlotHandler(type: string): SlotHandler | undefined {
        return this._slots.get(type);
    }

    /**
     * 获取所有已注册的 slot 类型。
     */
    getRegisteredSlotTypes(): string[] {
        return [...this._slots.keys()];
    }

    // ── Connection 管理 ──────────────────────────────────────────────────────

    /**
     * 添加一个连接。
     */
    connect(connection: Connection): void {
        this._connections.push(connection);
        this._setupConnectionListener(connection);
    }

    /**
     * 移除满足条件的连接。
     */
    disconnect(predicate: (c: Connection) => boolean): void {
        const removed = this._connections.filter(predicate);
        this._connections = this._connections.filter(c => !predicate(c));
        // 清理被移除连接的监听器
        for (const conn of removed) {
            this._cleanupConnectionListener(conn);
        }
    }

    /**
     * 获取所有连接。
     */
    getConnections(): readonly Connection[] {
        return this._connections;
    }

    /**
     * 批量设置连接（替换所有现有连接）。
     */
    setConnections(connections: Connection[]): void {
        // 清理旧连接
        for (const conn of this._connections) {
            this._cleanupConnectionListener(conn);
        }
        this._connections = [...connections];
        // 设置新连接
        for (const conn of this._connections) {
            this._setupConnectionListener(conn);
        }
    }

    // ── 连接路由 ─────────────────────────────────────────────────────────────

    private _connectionListeners = new Map<string, Unsubscribe>();

    private _getConnectionKey(conn: Connection): string {
        return `${conn.signal}:${conn.target}:${conn.slot}`;
    }

    private _setupConnectionListener(conn: Connection): void {
        const key = this._getConnectionKey(conn);
        if (this._connectionListeners.has(key)) return;

        const unsub = signalBus.on(conn.signal as any, (signal: Signal) => {
            if (this._disposed) return;
            // 连接总是从当前 widget 发出，检查信号来源
            if (signal.widgetId !== this.id) return;

            // 目标 widget：空字符串 = 自身
            const targetId = conn.target || this.id;

            // 执行目标 slot，传递连接参数
            this._executeSlot(conn.slot, signal, targetId, conn.params);
        });

        this._connectionListeners.set(key, unsub);
    }

    private _cleanupConnectionListener(conn: Connection): void {
        const key = this._getConnectionKey(conn);
        const unsub = this._connectionListeners.get(key);
        if (unsub) {
            unsub();
            this._connectionListeners.delete(key);
        }
    }

    private _executeSlot(slotType: string, signal: Signal, targetWidgetId: string, params?: Record<string, unknown>): void {
        logSlot(slotType, this.id, targetWidgetId, signal.type);

        // 优先查找本实例的 slot handler
        const handler = this._slots.get(slotType);
        if (handler) {
            handler(params ?? {}, {
                signal: {
                    type: signal.type,
                    payload: signal.payload,
                    source: signal.source,
                },
                sourceWidgetId: this.id,
                targetWidgetId,
                emit: (_type, payload) => this.emit(_type, payload),
            });
            return;
        }

        // Fallback 到全局 slot registry
        const definition = getSlot(slotType);
        if (definition) {
            import('./runtimes/controlsRegistry').then(({ getControls }) => {
                const controls = getControls(targetWidgetId);
                console.log(`[WidgetRuntime] executing slot "${slotType}" for ${targetWidgetId}, controls: ${controls ? 'found' : 'null'}`);
                definition.execute(params as any, {
                    widgetId: this.id,
                    targetWidgetId,
                    signalType: signal.type,
                    prev: signal.payload?.prev,
                    next: signal.payload?.next,
                    getControls,
                    updateWidget: () => {},
                    emit: (_source, type, prev, next) => this.emit(type, { prev, next }),
                });
            });
        } else {
            console.warn(`[WidgetRuntime] slot "${slotType}" not found in global registry`);
        }
    }

    // ── 生命周期 ─────────────────────────────────────────────────────────────

    /**
     * 销毁 runtime，清理所有订阅和连接。
     */
    dispose(): void {
        if (this._disposed) return;
        this._disposed = true;

        // 清理 signal 监听
        for (const unsub of this._signalUnsubscribes.values()) {
            unsub();
        }
        this._signalUnsubscribes.clear();

        // 清理 connection 监听
        for (const unsub of this._connectionListeners.values()) {
            unsub();
        }
        this._connectionListeners.clear();

        // 清理 slot 和 connection 数据
        this._slots.clear();
        this._connections = [];
    }
}
