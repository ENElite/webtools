'use client';

import { ColorPicker, NumberInput, Select, Slider, Switch, TagsInput, TextInput } from '@webtools/ui';

import { createInspectorControlCatalog } from './schema';
import type { InspectorControlProps } from './schema';
import { CodeEditor } from './code/CodeEditor';

function StringControl({ field, value, onChange, ...controlProps }: InspectorControlProps) {
    return (
        <TextInput
            {...controlProps}
            aria-label={field.label}
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => onChange(event.target.value)}
        />
    );
}

function NumberControl({ field, value, onChange, ...controlProps }: InspectorControlProps) {
    return (
        <NumberInput
            {...controlProps}
            aria-label={field.label}
            className='wt-studio-full-control'
            value={typeof value === 'number' ? value : null}
            {...(field.min === undefined ? {} : { min: field.min })}
            {...(field.max === undefined ? {} : { max: field.max })}
            {...(field.step === undefined ? {} : { step: field.step })}
            onValueChange={(next) => onChange(next ?? undefined)}
        />
    );
}

function SliderControl({ field, value, onChange, ...controlProps }: InspectorControlProps) {
    return (
        <Slider
            {...controlProps}
            aria-label={field.label}
            value={typeof value === 'number' ? value : 0}
            {...(field.min === undefined ? {} : { min: field.min })}
            {...(field.max === undefined ? {} : { max: field.max })}
            {...(field.step === undefined ? {} : { step: field.step })}
            onValueChange={(next) => onChange(next)}
        />
    );
}

function BooleanControl({ field, value, onChange, ...controlProps }: InspectorControlProps) {
    return (
        <Switch
            {...controlProps}
            aria-label={field.label}
            checked={value === true}
            onCheckedChange={onChange}
        />
    );
}

function EnumControl({ field, value, onChange, ...controlProps }: InspectorControlProps) {
    return (
        <Select
            {...controlProps}
            aria-label={field.label}
            className='wt-studio-full-control'
            {...(typeof value === 'string' || typeof value === 'number' ? { value } : {})}
            options={field.options ? [...field.options] : []}
            onValueChange={(next) => onChange(next)}
        />
    );
}

function ColorControl({ field, value, onChange, ...controlProps }: InspectorControlProps) {
    return (
        <ColorPicker
            {...controlProps}
            aria-label={field.label}
            value={typeof value === 'string' ? value : '#000000'}
            onValueChange={onChange}
        />
    );
}

function TagsControl({ field, value, onChange, ...controlProps }: InspectorControlProps) {
    const tags = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
    return (
        <TagsInput
            {...controlProps}
            aria-label={field.label}
            className='wt-studio-full-control'
            value={tags}
            onValueChange={onChange}
        />
    );
}

function CodeControl({ field, value, onChange, id, ...controlProps }: InspectorControlProps) {
    return (
        <div id={id} role='group' aria-label={field.label} className='wt-studio-code-control' {...controlProps}>
            <CodeEditor
                value={typeof value === 'string' ? value : ''}
                language={field.language ?? 'html'}
                height={260}
                showSaveButton={false}
                onContentChange={onChange}
            />
        </div>
    );
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
        { kind: 'code', Control: CodeControl },
    ]);
}
