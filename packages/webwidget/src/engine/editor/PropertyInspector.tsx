import { useMemo } from 'react';
import { Collapse, Divider, Form, Tabs } from 'antd';

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

type PageGroup = {
    key: string;
    label: string;
    fields: InspectorSchemaItem[];
    groups: Map<string, InspectorSchemaItem[]>;
};

export function PropertyInspector({ value, schema, pages, onChange }: InspectorProps) {
    const pageGroups = useMemo(() => {
        const visiblePages = (pages ?? [])
            .filter((p) => p.visible !== false)
            .sort((a, b) => a.order - b.order);

        const fieldByPage = new Map<string, InspectorSchemaItem[]>();
        for (const item of schema) {
            const list = fieldByPage.get(item.page) ?? [];
            list.push(item);
            fieldByPage.set(item.page, list);
        }

        for (const list of fieldByPage.values()) {
            list.sort((a, b) => a.order - b.order);
        }

        return visiblePages
            .filter((p) => fieldByPage.has(p.key))
            .map((page): PageGroup => {
                const items = fieldByPage.get(page.key)!;
                const ungrouped: InspectorSchemaItem[] = [];
                const grouped = new Map<string, InspectorSchemaItem[]>();

                for (const item of items) {
                    if (item.group) {
                        const list = grouped.get(item.group) ?? [];
                        list.push(item);
                        grouped.set(item.group, list);
                    } else {
                        ungrouped.push(item);
                    }
                }

                for (const list of grouped.values()) {
                    list.sort((a, b) => a.order - b.order);
                }

                return {
                    key: page.key,
                    label: page.label,
                    fields: ungrouped,
                    groups: grouped,
                };
            });
    }, [schema, pages]);

    const renderField = (item: InspectorSchemaItem) => {
        if (item.visibleWhen) {
            const condValue = readPath(value, item.visibleWhen.field);
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

    const renderFields = (fields: InspectorSchemaItem[]) => {
        return fields.map((field) => renderField(field));
    };

    if (pageGroups.length === 0) {
        return (
            <div className='flex items-center justify-center w-full h-full text-gray-400'>
                无法加载设置面板
            </div>
        );
    }

    const defaultKey = pageGroups[0]?.key;

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
            items={pageGroups.map((pageGroup) => ({
                key: pageGroup.key,
                label: pageGroup.label,
                children: (
                    <Form
                        layout='horizontal'
                        variant='outlined'
                        labelCol={{ span: 6 }}
                        wrapperCol={{ span: 18 }}
                    >
                        {renderFields(pageGroup.fields)}
                        {Array.from(pageGroup.groups.entries()).map(([groupName, groupFields], index) => (
                            <div key={groupName}>
                                {index > 0 && <Divider plain className='my-2' />}
                                <Collapse
                                    ghost
                                    className='mb-2'
                                    items={[{
                                        key: groupName,
                                        label: groupName,
                                        children: renderFields(groupFields),
                                    }]}
                                />
                            </div>
                        ))}
                    </Form>
                ),
            }))}
        />
    );
}

export default PropertyInspector;
