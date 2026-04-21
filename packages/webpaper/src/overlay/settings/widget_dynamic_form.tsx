import { useRef, useState } from 'react';

import { Button, ColorPicker, Divider, Form, Input, InputNumber, Radio } from 'antd';

import type { WidgetPropPrimitive } from '../types';
import type { WidgetSettingsSchema } from './types';

type WidgetDynamicFormProps = {
    value: Record<string, WidgetPropPrimitive>;
    schema: WidgetSettingsSchema;
    onChange: (next: Record<string, WidgetPropPrimitive>) => void;
};

export function WidgetDynamicForm({ value, schema, onChange }: WidgetDynamicFormProps) {
    const [draggingField, setDraggingField] = useState<string | null>(null);
    const inputRefMap = useRef<Record<string, HTMLInputElement | null>>({});

    const updateField = (key: string, nextValue: WidgetPropPrimitive) => {
        onChange({
            ...value,
            [key]: nextValue,
        });
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

    return (
        <Form layout='horizontal' variant='outlined'>
            {schema.map((field, index) => {
                if (field.type === 'divider') {
                    return <Divider key={`divider-${index}`} />;
                }

                const currentValue = value[field.key];

                if (field.visibleWhen && !shouldShowField(field.visibleWhen.key, field.visibleWhen.equals)) {
                    return null;
                }

                if (field.type === 'string') {
                    return (
                        <Form.Item key={field.key} label={field.label}>
                            <Input
                                value={typeof currentValue === 'string' ? currentValue : ''}
                                placeholder={field.placeholder}
                                onChange={(event) => updateField(field.key, event.target.value)}
                            />
                        </Form.Item>
                    );
                }

                if (field.type === 'number') {
                    return (
                        <Form.Item key={field.key} label={field.label}>
                            <InputNumber
                                style={{ width: '100%' }}
                                mode='spinner'
                                min={field.min}
                                max={field.max}
                                step={field.step ?? 1}
                                value={typeof currentValue === 'number' ? currentValue : 0}
                                onChange={(next) => updateField(field.key, typeof next === 'number' ? next : 0)}
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
            })}
        </Form>
    );
}
