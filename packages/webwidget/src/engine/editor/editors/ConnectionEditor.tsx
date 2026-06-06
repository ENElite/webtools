/**
 * ConnectionEditor — 信号/槽连接设置编辑器
 *
 * 工作流：
 * 1. 创建连接 → 展示 card
 * 2. 选择信号 (signal) → 从当前 widget 可发出的信号中选择
 * 3. 选择目标 (target) → 从所有 widget 中选择，默认当前 widget
 * 4. 选择槽位 (slot) → 根据信号前缀匹配，只显示兼容的 slot
 * 5. 配置槽位参数 → 根据选中的 slot 类型，展示其参数 schema
 */

import { useCallback, useMemo, useState } from 'react';
import { Button, Card, Select, Slider, Switch, Input, Tag, Space } from 'antd';
import type { EditorProps } from '../registry';
import type { Connection, SlotParamValue } from '../../model/bindings';
import type { SlotParamSchemaItem } from '../../slots/registry';
import { getAllSlots, getSlot } from '../../slots/registry';
import { useOverlayStore } from '../../../store/overlayStore';
import { widgetRuntimeRegistry } from '../../../runtime/WidgetRuntimeRegistry';

// ─── 信号选项 ─────────────────────────────────────────────────────────────────

type SignalOption = {
    value: string;
    label: string;
    group: string;
};

/**
 * 信号选项 — value 必须与实际发射的 signal.type 完全一致。
 * signal.type 不包含 source 前缀（source 是独立字段）。
 */
const SIGNAL_OPTIONS: SignalOption[] = [
    // 生命周期（type: 'mount' | 'unmount' | 'visible' | 'hidden'）
    { value: 'mount', label: '挂载时', group: '生命周期' },
    { value: 'unmount', label: '卸载时', group: '生命周期' },
    { value: 'visible', label: '可见', group: '生命周期' },
    { value: 'hidden', label: '隐藏', group: '生命周期' },
    // 系统（type: 'idle' | 'active'）
    { value: 'idle', label: '空闲', group: '系统' },
    { value: 'active', label: '活跃', group: '系统' },
    // 交互（type: 'mouse.enter' | 'mouse.leave' | 'mouse.click'）
    { value: 'mouse.enter', label: '鼠标进入', group: '交互' },
    { value: 'mouse.leave', label: '鼠标离开', group: '交互' },
    { value: 'mouse.click', label: '鼠标点击', group: '交互' },
];

/**
 * 从信号类型推断信号源。
 * 'mount' → 'lifecycle', 'mouse.click' → 'user', 'idle' → 'system'
 */
function inferSignalSource(signalType: string): string {
    const option = SIGNAL_OPTIONS.find(o => o.value === signalType);
    return option?.group === '生命周期' ? 'lifecycle'
        : option?.group === '系统' ? 'system'
        : option?.group === '交互' ? 'user'
        : 'widget';
}

// ─── 根据信号源匹配可用 slot（含目标 widget 的 runtime slot） ──────────────

/**
 * 获取与信号兼容的 slot 列表。
 * slot.accepts 声明它接受的信号源（如 'lifecycle', 'user', 'system'）。
 * 匹配时检查 signalSource 是否在 accepts 列表中。
 */
function getSlotsForSignal(signalSource: string, targetWidgetId?: string): Array<{ type: string; label: string; group: string }> {
    const result: Array<{ type: string; label: string; group: string }> = [];
    const seen = new Set<string>();

    // 1. 全局 slot registry
    const allSlots = getAllSlots();
    for (const slot of allSlots) {
        const matches = slot.accepts.length === 0 || slot.accepts.includes(signalSource);
        if (matches) {
            result.push({ type: slot.type, label: slot.label, group: slot.group });
            seen.add(slot.type);
        }
    }

    // 2. 目标 widget 的 WidgetRuntime 注册的 slot
    if (targetWidgetId) {
        const runtime = widgetRuntimeRegistry.get(targetWidgetId);
        if (runtime) {
            const runtimeSlots = runtime.getRegisteredSlotTypes();
            for (const slotType of runtimeSlots) {
                if (seen.has(slotType)) continue;
                const parts = slotType.split('.');
                const group = parts.length >= 2 ? parts.slice(0, 2).join('.') : slotType;
                result.push({ type: slotType, label: slotType, group });
                seen.add(slotType);
            }
        }
    }

    return result;
}

// ─── slot 参数编辑器 ──────────────────────────────────────────────────────────

function SlotParamEditor({
    schema,
    values,
    onChange,
}: {
    schema: SlotParamSchemaItem[];
    values: Record<string, SlotParamValue>;
    onChange: (key: string, value: SlotParamValue) => void;
}) {
    if (schema.length === 0) return null;

    return (
        <div style={{ padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
            {schema.map(param => (
                <div key={param.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ width: 70, textAlign: 'right', fontSize: 12, color: '#666', flexShrink: 0 }}>{param.label}</span>
                    <div style={{ flex: 1 }}>
                        {renderParamField(param, values[param.key] ?? param.default, (val) => onChange(param.key, val))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function renderParamField(
    schema: SlotParamSchemaItem,
    value: SlotParamValue | undefined,
    onChange: (val: SlotParamValue) => void,
) {
    switch (schema.type) {
        case 'enum':
            return (
                <Select
                    value={value}
                    options={(schema.meta?.['options'] as Array<{ label: string; value: string }>) ?? []}
                    onChange={onChange}
                    size="small"
                    style={{ width: '100%' }}
                />
            );
        case 'slider':
            return (
                <Slider
                    value={typeof value === 'number' ? value : Number(value) || 0}
                    min={schema.meta?.['min'] as number ?? 0}
                    max={schema.meta?.['max'] as number ?? 1}
                    step={schema.meta?.['step'] as number ?? 0.01}
                    onChange={onChange}
                />
            );
        case 'boolean':
            return (
                <Switch
                    checked={value === true}
                    onChange={onChange}
                    size="small"
                />
            );
        case 'color':
            return (
                <Input
                    value={String(value ?? '')}
                    onChange={(e) => onChange(e.target.value)}
                    size="small"
                    type="color"
                    style={{ width: 60, padding: 0, border: 'none' }}
                />
            );
        case 'number':
            return (
                <Input
                    type="number"
                    value={String(value ?? '')}
                    onChange={(e) => onChange(Number(e.target.value))}
                    size="small"
                />
            );
        case 'string':
        default:
            return (
                <Input
                    value={String(value ?? '')}
                    onChange={(e) => onChange(e.target.value)}
                    size="small"
                />
            );
    }
}

// ─── 单个连接卡片 ─────────────────────────────────────────────────────────────

function ConnectionCard({
    connection,
    currentWidgetId,
    onChange,
    onDelete,
}: {
    connection: Connection;
    currentWidgetId: string;
    onChange: (next: Connection) => void;
    onDelete: () => void;
}) {
    const [showParams, setShowParams] = useState(false);

    // 直接从 store 读取 widgets
    const widgets = useOverlayStore((s) => s.widgets);

    // 目标 widget 选项
    const targetOptions = useMemo(() =>
        widgets.map(w => ({ label: `${w.label} (${w.kind})`, value: w.id })),
        [widgets],
    );

    // 当前选中的 slot 定义
    const slotDef = useMemo(() => getSlot(connection.slot), [connection.slot]);

    // 根据信号源匹配可用 slot（含目标 widget 的 runtime slot）
    const effectiveTarget = connection.target || currentWidgetId;
    const signalSource = useMemo(() => inferSignalSource(connection.signal), [connection.signal]);
    const availableSlots = useMemo(
        () => getSlotsForSignal(signalSource, effectiveTarget),
        [signalSource, effectiveTarget],
    );

    // 当前信号对应的默认信号选项
    const currentSignalOption = useMemo(
        () => SIGNAL_OPTIONS.find(o => o.value === connection.signal),
        [connection.signal],
    );

    // 当前 slot 的默认参数
    const defaultParams = useMemo(() => {
        if (!slotDef) return {};
        const defaults: Record<string, SlotParamValue> = {};
        for (const p of slotDef.paramSchema) {
            if (p.default !== undefined) defaults[p.key] = p.default;
        }
        return defaults;
    }, [slotDef]);

    const handleSignalChange = useCallback((value: string) => {
        const source = inferSignalSource(value);
        const compatibleSlots = getSlotsForSignal(source, effectiveTarget);
        const stillCompatible = compatibleSlots.some(s => s.type === connection.slot);
        if (stillCompatible) {
            onChange({ ...connection, signal: value });
        } else {
            const firstSlot = compatibleSlots[0];
            onChange({
                ...connection,
                signal: value,
                slot: firstSlot?.type ?? '',
                params: firstSlot ? defaultParams : undefined,
            });
        }
    }, [connection, onChange, defaultParams, effectiveTarget]);

    const handleTargetChange = useCallback((value: string) => {
        onChange({ ...connection, target: value });
    }, [connection, onChange]);

    const handleSlotChange = useCallback((value: string) => {
        const def = getSlot(value);
        const defaults: Record<string, SlotParamValue> = {};
        if (def) {
            for (const p of def.paramSchema) {
                if (p.default !== undefined) defaults[p.key] = p.default;
            }
        }
        onChange({ ...connection, slot: value, params: defaults });
    }, [connection, onChange]);

    const handleParamChange = useCallback((key: string, value: SlotParamValue) => {
        onChange({
            ...connection,
            params: { ...connection.params, [key]: value },
        });
    }, [connection, onChange]);

    return (
        <Card
            size="small"
            style={{ marginBottom: 8 }}
            title={
                <Space size={4}>
                    <Tag color="blue">{currentSignalOption?.label ?? connection.signal}</Tag>
                    <span style={{ color: '#999' }}>→</span>
                    <Tag color="green">{slotDef?.label ?? connection.slot}</Tag>
                </Space>
            }
            extra={
                <Button
                    type="text"
                    size="small"
                    danger
                    icon={<span aria-hidden='true' className='inline-block h-4 w-4 icon-[octicon--trash-16]' />}
                    onClick={onDelete}
                />
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* 信号选择 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 70, textAlign: 'right', fontSize: 12, color: '#666', flexShrink: 0 }}>触发信号</span>
                    <Select
                        value={connection.signal}
                        onChange={handleSignalChange}
                        style={{ flex: 1 }}
                        size="small"
                        showSearch
                        optionFilterProp="label"
                        options={Object.entries(
                            SIGNAL_OPTIONS.reduce<Record<string, SignalOption[]>>((acc, opt) => {
                                if (!acc[opt.group]) acc[opt.group] = [];
                                acc[opt.group]!.push(opt);
                                return acc;
                            }, {}),
                        ).map(([group, opts]) => ({
                            label: group,
                            options: opts.map(o => ({ label: o.label, value: o.value })),
                        }))}
                    />
                </div>

                {/* 目标选择 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 70, textAlign: 'right', fontSize: 12, color: '#666', flexShrink: 0 }}>目标组件</span>
                    <Select
                        value={connection.target || undefined}
                        placeholder={currentWidgetId ? `当前组件 (${currentWidgetId})` : '选择目标'}
                        onChange={handleTargetChange}
                        style={{ flex: 1 }}
                        size="small"
                        allowClear
                        options={targetOptions}
                        showSearch
                        optionFilterProp="label"
                    />
                </div>

                {/* 槽位选择 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 70, textAlign: 'right', fontSize: 12, color: '#666', flexShrink: 0 }}>槽位</span>
                    <Select
                        value={connection.slot}
                        onChange={handleSlotChange}
                        style={{ flex: 1 }}
                        size="small"
                        options={Object.entries(
                            availableSlots.reduce<Record<string, Array<{ type: string; label: string; group: string }>>>((acc, slot) => {
                                if (!acc[slot.group]) acc[slot.group] = [];
                                acc[slot.group]!.push(slot);
                                return acc;
                            }, {}),
                        ).map(([group, slots]) => ({
                            label: group,
                            options: slots.map(s => ({ label: s.label, value: s.type })),
                        }))}
                    />
                </div>

                {/* 槽位参数 */}
                {slotDef && slotDef.paramSchema.length > 0 && (
                    <>
                        <Button
                            type="link"
                            size="small"
                            onClick={() => setShowParams(!showParams)}
                            style={{ padding: 0, marginBottom: 0 }}
                        >
                            {showParams ? '收起参数' : '配置参数'}
                        </Button>
                        {showParams && (
                            <SlotParamEditor
                                schema={slotDef.paramSchema}
                                values={connection.params ?? defaultParams}
                                onChange={handleParamChange}
                            />
                        )}
                    </>
                )}
            </div>
        </Card>
    );
}

// ─── 主编辑器组件 ─────────────────────────────────────────────────────────────

export default function ConnectionEditor({ item, value, onChange }: EditorProps) {
    const connections: Connection[] = useMemo(() => {
        return Array.isArray(value) ? value : [];
    }, [value]);

    const activeWidgetId = useOverlayStore((s) => s.activeWidgetId);

    const bindPath = item.bind as string;

    const handleAdd = useCallback(() => {
        const newConnection: Connection = {
            signal: 'mount',
            target: activeWidgetId ?? '',
            slot: 'animation',
            params: { duration: 0.3, delay: 0, easing: 'ease-out' },
        };
        onChange({ set: { [bindPath]: [...connections, newConnection] } as any });
    }, [connections, onChange, bindPath, activeWidgetId]);

    const handleUpdate = useCallback((index: number, next: Connection) => {
        const nextConnections = connections.map((c, i) => (i === index ? next : c));
        onChange({ set: { [bindPath]: nextConnections } as any });
    }, [connections, onChange, bindPath]);

    const handleDelete = useCallback((index: number) => {
        const nextConnections = connections.filter((_, i) => i !== index);
        onChange({ set: { [bindPath]: nextConnections } as any });
    }, [connections, onChange, bindPath]);

    return (
        <div style={{ padding: 4 }}>
            {connections.map((connection, index) => (
                <ConnectionCard
                    key={`${connection.signal}-${connection.slot}-${index}`}
                    connection={connection}
                    currentWidgetId={activeWidgetId ?? ''}
                    onChange={(next) => handleUpdate(index, next)}
                    onDelete={() => handleDelete(index)}
                />
            ))}
            <Button
                type="dashed"
                block
                icon={<span aria-hidden='true' className='inline-block h-4 w-4 icon-[octicon--plus-16]' />}
                onClick={handleAdd}
                style={{ marginTop: connections.length > 0 ? 8 : 0 }}
            >
                添加连接
            </Button>
        </div>
    );
}
