import { TreeSelect } from 'antd';
import type { EditorProps } from '../registry';
import type { SettingsTreeDataNode } from '../types';

export default function TreeSelectEditor({ item, value, onChange }: EditorProps) {
    const bind = item.bind as string;
    const current = value;
    const meta = item.meta ?? {};

    return (
        <TreeSelect
            className='w-full'
            value={typeof current === 'string' ? current : undefined}
            treeData={meta['treeData'] as SettingsTreeDataNode[] | undefined}
            placeholder={meta['placeholder'] as string | undefined}
            allowClear={(meta['allowClear'] as boolean) ?? true}
            showSearch
            treeDefaultExpandAll={false}
            onChange={(nextValue) => onChange({ set: { [bind]: typeof nextValue === 'string' ? nextValue : '' } })}
        />
    );
}
