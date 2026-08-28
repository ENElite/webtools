'use client';

import { ColorPicker, Input, InputNumber, Select, Slider, Switch } from 'antd';
import type { JsonValue } from '@webtools/widget-core';

import { createInspectorControlCatalog } from './schema';
import type { InspectorControlProps } from './schema';

function StringControl({ value, onChange }: InspectorControlProps) {
    return <Input value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)} />;
}

function NumberControl({ field, value, onChange }: InspectorControlProps) {
    return (
        <InputNumber
            className='wt-studio-full-control'
            value={typeof value === 'number' ? value : null}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={(next) => onChange(next ?? undefined)}
        />
    );
}

function SliderControl({ field, value, onChange }: InspectorControlProps) {
    return (
        <Slider
            value={typeof value === 'number' ? value : 0}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={onChange}
        />
    );
}

function BooleanControl({ value, onChange }: InspectorControlProps) {
    return <Switch checked={value === true} onChange={onChange} />;
}

function EnumControl({ field, value, onChange }: InspectorControlProps) {
    return (
        <Select
            className='wt-studio-full-control'
            value={value as string | number | undefined}
            options={field.options ? [...field.options] : []}
            onChange={(next: JsonValue) => onChange(next)}
        />
    );
}

function ColorControl({ value, onChange }: InspectorControlProps) {
    return (
        <ColorPicker
            value={typeof value === 'string' ? value : '#000000'}
            showText
            onChange={(_, css) => onChange(css)}
        />
    );
}

function TagsControl({ value, onChange }: InspectorControlProps) {
    const tags = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
    return <Select mode='tags' className='wt-studio-full-control' value={tags} onChange={(next) => onChange(next)} />;
}

export function createDefaultInspectorControls() {
    return createInspectorControlCatalog([
        { kind: 'string', Control: StringControl },
        { kind: 'number', Control: NumberControl },
        { kind: 'slider', Control: SliderControl },
        { kind: 'boolean', Control: BooleanControl },
        { kind: 'enum', Control: EnumControl },
        { kind: 'color', Control: ColorControl },
        { kind: 'tags', Control: TagsControl },
    ]);
}
