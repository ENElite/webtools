import React from 'react';
import { useRef, useState } from 'react';

import { Button, ColorPicker, Form, Input, InputNumber, Radio, Switch, Tabs } from 'antd';

import { AiEditorPanel } from '@/components/editor';

import { TagsInput } from './tags';
import { FontPicker } from './font_picker';
import { CombinerPicker } from './combiner';
import type { SettingsFieldSchema, SettingsSchema, SettingsValuePrimitive, SettingsValues } from './schema';

type SettingsDynamicFormProps<TValues extends SettingsValues = SettingsValues> = {
    value: TValues;
    schema: SettingsSchema<TValues>;
    onChange: (next: TValues, changedKey: keyof TValues & string) => void;
};

export function SettingsDynamicForm<TValues extends SettingsValues>({ value, schema, onChange }: SettingsDynamicFormProps<TValues>) {
    const [draggingField, setDraggingField] = useState<string | null>(null);
    const inputRefMap = useRef<Record<string, HTMLInputElement | null>>({});

    const updateField = (key: keyof TValues & string, nextValue: SettingsValuePrimitive) => {
        onChange({
            ...value,
            [key]: nextValue,
        } as TValues, key);
    };

    const shouldShowField = (key: keyof TValues & string, expected: SettingsValuePrimitive) => {
        return value[key] === expected;
    };

    const readImageAsDataUrl = (file: File, fieldKey: keyof TValues & string) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                updateField(fieldKey, reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleImageFile = (file: File | null, fieldKey: keyof TValues & string) => {
        if (!file || !file.type.startsWith('image/')) {
            return;
        }
        readImageAsDataUrl(file, fieldKey);
    };

    const renderField = (field: SettingsFieldSchema<TValues>) => {
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

        if (field.type === 'font') {
            return (
                <Form.Item key={field.key} label={field.label}>
                    <FontPicker
                        value={typeof currentValue === 'string' ? currentValue : undefined}
                        onChange={(nextFont) => updateField(field.key, nextFont)}
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
                            chat={field.chat ?? true}
                            onChange={(nextContent) => {
                                updateField(field.key, nextContent);
                            }}
                        />
                    </div>
                </Form.Item>
            );
        }

        if (field.type === 'enum') {
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
        }

        if (field.type === 'combiner') {
            const operatorValue = value[field.operatorKey] as string | number | null | undefined;
            const combinerValue = value[field.valueKey] as string | number | null | undefined;

            const handleCombinerChange = (nextOperator: string | number | null, nextValue: string | number | null): boolean => {
                const updates = {
                    ...value,
                    [field.operatorKey]: nextOperator,
                    [field.valueKey]: nextValue,
                } as TValues;
                onChange(updates, field.key);
                return true;
            };

            return (
                <Form.Item key={field.key} label={field.label}>
                    <CombinerPicker
                        operatorValue={operatorValue as string | null}
                        valueValue={combinerValue as string | number | null}
                        operatorOptions={field.operatorOptions}
                        valueOptions={field.valueOptions}
                        label={field.label}
                        onChange={handleCombinerChange}
                    />
                </Form.Item>
            );
        }

        if (field.type === 'tags') {
            const splitter = field.splitter ?? ',';
            let tags: string[] = [];
            if (typeof currentValue === 'string') {
                tags = currentValue
                    .split(splitter)
                    .map((tag) => tag.trim())
                    .filter((tag) => tag.length > 0);
            }
            return (
                <Form.Item key={field.key} label={field.label}>
                    <TagsInput
                        value={tags}
                        onChange={(nextValue) => updateField(field.key, nextValue.join(splitter))}
                    />
                </Form.Item>
            );
        }

        return null;
    };

    const groups: Array<{ key: string; label: string; fields: SettingsFieldSchema<TValues>[]; default?: boolean; }> = [];
    let currentLabel = '设置';
    let defaultKey: string = `group-0`;
    let currentFields: SettingsFieldSchema<TValues>[] = [];

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
            defaultKey = field.default ? `group-${groups.length}` : defaultKey;
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
        <Tabs
            classNames={{
                root: 'h-full min-h-0 custom-tabs',
                header: 'mb-0',
                content: 'h-full overflow-y-auto pr-2',
            }}
            tabBarGutter={8}
            tabPlacement='start'
            indicator={{ align: 'start' }}
            defaultActiveKey={defaultKey}
            items={groups.map((group) => ({
                key: group.key,
                label: group.label,
                children: (
                    <Form
                        layout='horizontal'
                        variant='outlined'
                        labelCol={{ span: 6 }}
                        wrapperCol={{ span: 18 }}
                    >
                        {group.fields.map((field) => renderField(field))}
                    </Form>
                ),
            }))}
        />
    );
}