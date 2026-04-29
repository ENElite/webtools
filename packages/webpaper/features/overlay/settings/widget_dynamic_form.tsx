import React from 'react';
import { useRef, useState } from 'react';

import { Button, ColorPicker, Form, Input, InputNumber, Radio, Switch, Tabs } from 'antd';
import { AiEditorPanel } from '@/features/editor';

import type { WidgetPropPrimitive } from '../types';
import type { WidgetSettingsSchema } from './schema';

type WidgetDynamicFormProps = {
    value: Record<string, WidgetPropPrimitive>;
    schema: WidgetSettingsSchema;
    onChange: (next: Record<string, WidgetPropPrimitive>, changedKey: string) => void;
};

export function WidgetDynamicForm({ value, schema, onChange }: WidgetDynamicFormProps) {
    const [draggingField, setDraggingField] = useState<string | null>(null);
    const inputRefMap = useRef<Record<string, HTMLInputElement | null>>({});

    const updateField = (key: string, nextValue: WidgetPropPrimitive) => {
        onChange({
            ...value,
            [key]: nextValue,
        }, key);
    };

    const shouldShowField = (key: string, expected: WidgetPropPrimitive) => {
        return value[key] === expected;
    };

    const readImageAsDataUrl = (file: File, fieldKey: string) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                updateField(fieldKey, reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleImageFile = (file: File | null, fieldKey: string) => {
        if (!file || !file.type.startsWith('image/')) {
            return;
        }
        readImageAsDataUrl(file, fieldKey);
    };

    const renderField = (field: WidgetSettingsSchema[number]) => {
        if (field.type === 'divider') {
            return null;
        }

        const currentValue = value[field.key];

        if (field.visibleWhen && !shouldShowField(field.visibleWhen.key, field.visibleWhen.equals)) {
            return null;
        }

        if (field.type === 'string') {
            if (field.readOnly) {
                return (
                    <Form.Item key={field.key} label={field.label}>
                        <Input value={typeof currentValue === 'string' ? currentValue : ''} readOnly disabled />
                    </Form.Item>
                );
            }

            return (
                <Form.Item key={field.key} label={field.label}>
                    <Input.TextArea
                        value={typeof currentValue === 'string' ? currentValue : ''}
                        placeholder={field.placeholder}
                        autoSize={{ minRows: 1 }}
                        onChange={(event) => updateField(field.key, event.target.value)}
                    />
                </Form.Item>
            );
        }

        if (field.type === 'boolean') {
            return (
                <Form.Item key={field.key} label={field.label}>
                    <Switch
                        checked={currentValue === true}
                        onChange={(checked) => updateField(field.key, checked)}
                    />
                </Form.Item>
            );
        }

        if (field.type === 'number') {
            return (
                <Form.Item key={field.key} label={field.label}>
                    <InputNumber
                        style={{ width: '100%', maxWidth: 200 }}
                        mode='spinner'
                        min={field.min}
                        max={field.max}
                        step={field.step ?? 1}
                        suffix={field.suffix}
                        value={typeof currentValue === 'number' ? currentValue : 0}
                        onChange={(next) => {
                            const safeNumber = typeof next === 'number' ? next : 0;
                            if (typeof field.modulo === 'number' && field.modulo > 0) {
                                const normalized = ((safeNumber % field.modulo) + field.modulo) % field.modulo;
                                updateField(field.key, normalized);
                                return;
                            }
                            updateField(field.key, safeNumber);
                        }}
                    />
                </Form.Item>
            );
        }

        if (field.type === 'color') {
            return (
                <Form.Item key={field.key} label={field.label}>
                    <ColorPicker
                        value={typeof currentValue === 'string' ? currentValue : '#000000'}
                        disabledAlpha={!field.alpha}
                        onChangeComplete={(next) => updateField(field.key, field.alpha ? next.toCssString() : next.toHexString())}
                        showText
                    />
                </Form.Item>
            );
        }

        if (field.type === 'image') {
            const inputId = `${field.key}-image-input`;

            return (
                <Form.Item key={field.key} label={field.label}>
                    <div className='flex flex-col gap-2'>
                        <Input
                            value={typeof currentValue === 'string' ? currentValue : ''}
                            placeholder={field.placeholder}
                            onChange={(event) => updateField(field.key, event.target.value)}
                        />

                        <input
                            id={inputId}
                            ref={(element) => {
                                inputRefMap.current[field.key] = element;
                            }}
                            type='file'
                            accept='image/*'
                            className='hidden'
                            onChange={(event) => {
                                const file = event.target.files?.[0] || null;
                                handleImageFile(file, field.key);
                                event.currentTarget.value = '';
                            }}
                        />

                        <div
                            className={`rounded border border-dashed p-3 text-sm ${draggingField === field.key ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-400/60'}`}
                            onDragEnter={(event) => {
                                event.preventDefault();
                                setDraggingField(field.key);
                            }}
                            onDragOver={(event) => {
                                event.preventDefault();
                                setDraggingField(field.key);
                            }}
                            onDragLeave={() => setDraggingField((current) => (current === field.key ? null : current))}
                            onDrop={(event) => {
                                event.preventDefault();
                                setDraggingField(null);
                                const file = event.dataTransfer.files?.[0] || null;
                                handleImageFile(file, field.key);
                            }}
                        >
                            <div className='mb-2'>拖拽本地图片到这里，自动转换为 dataURL。</div>
                            <Button
                                size='small'
                                htmlType='button'
                                onClick={() => {
                                    inputRefMap.current[field.key]?.click();
                                }}
                            >
                                选择本地图片
                            </Button>
                        </div>
                    </div>
                </Form.Item>
            );
        }

        if (field.type === 'editor') {
            return (
                <Form.Item key={field.key} label={field.label} labelCol={{ span: 24 }} wrapperCol={{ span: 24 }}>
                    <div className='overflow-hidden rounded border border-slate-300/60' style={{ width: '100%', minHeight: 420 }}>
                        <AiEditorPanel
                            value={typeof currentValue === 'string' ? currentValue : ''}
                            language={field.language ?? 'html'}
                            height={field.height ?? '100%'}
                            onChange={(nextContent) => {
                                updateField(field.key, nextContent);
                            }}
                        />
                    </div>
                </Form.Item>
            );
        }

        return (
            <Form.Item key={field.key} label={field.label}>
                <Radio.Group
                    value={typeof currentValue === 'string' || typeof currentValue === 'number' ? currentValue : undefined}
                    options={field.options}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    optionType='button'
                    buttonStyle='solid'
                />
            </Form.Item>
        );
    };

    const groups: Array<{ key: string; label: string; fields: WidgetSettingsSchema }> = [];
    let currentLabel = '设置';
    let currentFields: WidgetSettingsSchema[number][] = [];

    for (const field of schema) {
        if (field.type === 'divider') {
            if (currentFields.length > 0) {
                groups.push({
                    key: `group-${groups.length}`,
                    label: currentLabel,
                    fields: currentFields,
                });
            }

            currentLabel = field.label || `分组 ${groups.length + 1}`;
            currentFields = [];
            continue;
        }

        currentFields.push(field);
    }

    if (currentFields.length > 0) {
        groups.push({
            key: `group-${groups.length}`,
            label: currentLabel,
            fields: currentFields,
        });
    }

    return (
        <div className='flex h-full min-h-0 flex-col'>
            <Tabs
                className='flex h-full min-h-0 flex-1'
                tabBarStyle={{ marginBottom: 0 }}
                tabBarGutter={8}
                tabPlacement='start'
                indicator={{ align: 'start' }}
                defaultActiveKey={groups[groups.length - 1]?.key}
                items={groups.map((group) => ({
                    key: group.key,
                    label: group.label,
                    children: (
                        <div className='flex h-full min-h-0 flex-col overflow-hidden'>
                            <Form layout='horizontal' variant='outlined' labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} style={{ minHeight: 0 }}>
                                {group.fields.map((field) => renderField(field))}
                            </Form>
                        </div>
                    ),
                }))}
            />
        </div>
    );
}