'use client';

import { Alert, Collapse, Form, Tabs, Typography } from 'antd';
import { useMemo } from 'react';
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
            return <Alert key={field.key} type='warning' message={`Unknown control: ${field.control}`} />;
        }
        const Control = controls.get(field.control).Control;
        return (
            <Form.Item key={field.key} label={field.label} tooltip={field.description}>
                <Control field={field} value={readPath(value, field.path)} onChange={(next) => onChange(field.path, next)} />
            </Form.Item>
        );
    };

    if (pages.length === 0) return <Alert type='info' message='没有可编辑属性' />;

    return (
        <Tabs
            tabPosition='left'
            items={pages.map(({ page, fields }) => {
                const ungrouped = fields.filter((field) => !field.group);
                const groups = groupFields(fields);
                return {
                    key: page.key,
                    label: page.label,
                    children: (
                        <Form layout='vertical' className='wt-studio-form'>
                            {ungrouped.map(renderField)}
                            {[...groups.entries()].map(([group, grouped]) => (
                                <Collapse
                                    key={group}
                                    ghost
                                    items={[{
                                        key: group,
                                        label: <Typography.Text strong>{group}</Typography.Text>,
                                        children: grouped.map(renderField),
                                    }]}
                                />
                            ))}
                        </Form>
                    ),
                };
            })}
        />
    );
}
