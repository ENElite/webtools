import { useMemo } from 'react';
import { Form, Tabs } from 'antd';

import type { InspectorProps, InspectorSchemaItem } from './types';
import { getEditor } from './registry';

function readPath(source: any, path: string): any {
    return path.split('.').reduce((current: any, segment: string) => {
        if (current == null) return undefined;
        return current[segment];
    }, source);
}

function resolveBindValue(source: any, bind: string | string[]): any {
    if (Array.isArray(bind)) {
        const result: Record<string, any> = {};
        for (const path of bind) {
            result[path] = readPath(source, path);
        }
        return result;
    }
    return readPath(source, bind);
}

export function PropertyInspector({ value, schema, pages, onChange }: InspectorProps) {
    const groups = useMemo(() => {
        const visiblePages = (pages ?? [])
            .filter((p) => p.visible !== false)
            .sort((a, b) => a.order - b.order);

        const fieldGroups = new Map<string, InspectorSchemaItem[]>();
        for (const item of schema) {
            const list = fieldGroups.get(item.page) ?? [];
            list.push(item);
            fieldGroups.set(item.page, list);
        }

        for (const list of fieldGroups.values()) {
            list.sort((a, b) => a.order - b.order);
        }

        return visiblePages
            .filter((p) => fieldGroups.has(p.key))
            .map((page) => ({
                key: page.key,
                label: page.label,
                fields: fieldGroups.get(page.key)!,
            }));
    }, [schema, pages]);

    const renderField = (item: InspectorSchemaItem) => {
        if (item.visibleWhen) {
            const condValue = readPath(value, item.visibleWhen.key);
            if (condValue !== item.visibleWhen.equals) {
                return null;
            }
        }

        const Editor = getEditor(item.type);
        if (!Editor) {
            return (
                <Form.Item key={item.key} label={item.label}>
                    <div className='text-sm text-slate-400'>No editor registered: {item.type}</div>
                </Form.Item>
            );
        }

        const isMultiBind = Array.isArray(item.bind);
        const editorValue = resolveBindValue(value, item.bind);

        return (
            <Form.Item key={item.key} label={item.label} labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
                <Editor
                    item={item}
                    value={editorValue}
                    onChange={onChange}
                />
            </Form.Item>
        );
    };

    if (groups.length === 0) {
        return (
            <div className='flex items-center justify-center w-full h-full text-gray-400'>
                无法加载设置面板
            </div>
        );
    }

    const defaultKey = groups[0]?.key;

    return (
        <Tabs
            classNames={{
                root: 'h-full min-h-0 [&_.ant-tabs-content]:h-full',
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

export default PropertyInspector;
