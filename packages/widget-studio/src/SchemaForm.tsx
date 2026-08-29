'use client';

import { useMemo } from 'react';
import { Accordion, Alert, Field, Tabs } from '@webtools/ui';
import type { JsonObject, JsonValue } from '@webtools/widget-core';

import { readPath } from './path';
import type { InspectorControlCatalog, InspectorField, InspectorPage, InspectorSchema } from './schema';

export interface SchemaFormProps<TValue extends JsonObject> {
    readonly value: TValue;
    readonly schema: InspectorSchema;
    readonly controls: InspectorControlCatalog;
    readonly onChange: (path: string, value: JsonValue | undefined) => void;
}

interface PageFields {
    readonly page: InspectorPage;
    readonly fields: readonly InspectorField[];
}

function groupFields(fields: readonly InspectorField[]): Map<string, InspectorField[]> {
    const groups = new Map<string, InspectorField[]>();
    for (const field of fields) {
        if (!field.group) continue;
        const group = groups.get(field.group) ?? [];
        group.push(field);
        groups.set(field.group, group);
    }
    return groups;
}

export function SchemaForm<TValue extends JsonObject>({ value, schema, controls, onChange }: SchemaFormProps<TValue>) {
    const pages = useMemo<PageFields[]>(() => {
        const definitions = schema.pages?.length
            ? [...schema.pages]
            : [{ key: 'main', label: '属性', order: 0 }];
        return definitions
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((page) => ({
                page,
                fields: schema.fields
                    .filter((field) => (field.page ?? 'main') === page.key)
                    .filter((field) => !field.visibleWhen
                        || readPath(value, field.visibleWhen.path) === field.visibleWhen.equals)
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
            }))
            .filter(({ fields }) => fields.length > 0);
    }, [schema, value]);

    const renderField = (field: InspectorField) => {
        if (!controls.has(field.control)) {
            return <Alert key={field.key} tone='warning'>Unknown control: {field.control}</Alert>;
        }
        const Control = controls.get(field.control).Control;
        return (
            <Field key={field.key} label={field.label} description={field.description}>
                <Control field={field} value={readPath(value, field.path)} onChange={(next) => onChange(field.path, next)} />
            </Field>
        );
    };

    if (pages.length === 0) return <Alert tone='info'>没有可编辑属性</Alert>;

    return (
        <Tabs
            orientation='vertical'
            className='wt-studio-schema-tabs'
            items={pages.map(({ page, fields }) => {
                const ungrouped = fields.filter((field) => !field.group);
                const groups = groupFields(fields);
                return {
                    value: page.key,
                    label: page.label,
                    content: (
                        <div className='wt-studio-form'>
                            {ungrouped.map(renderField)}
                            {groups.size > 0 ? (
                                <Accordion
                                    multiple
                                    className='wt-studio-field-groups'
                                    items={[...groups.entries()].map(([group, grouped]) => ({
                                        value: group,
                                        title: group,
                                        content: <div className='wt-studio-field-group'>{grouped.map(renderField)}</div>,
                                    }))}
                                />
                            ) : null}
                        </div>
                    ),
                };
            })}
        />
    );
}
