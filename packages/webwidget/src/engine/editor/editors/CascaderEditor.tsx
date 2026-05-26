import { Cascader } from 'antd';
import type { EditorProps } from '../registry';

type CascaderOption = {
    value: string;
    label: string;
    children?: CascaderOption[];
};

export default function CascaderEditor({ item, value, onChange }: EditorProps) {
    const options = (item.meta?.['options'] as CascaderOption[]) ?? [];

    return (
        <Cascader
            options={options}
            value={value}
            onChange={(val) => {
                if (val && val.length > 0) {
                    onChange({ set: { [item.bind as string]: val[val.length - 1] } as any });
                }
            }}
            changeOnSelect
            style={{ width: '100%' }}
            popupMatchSelectWidth
        />
    );
}
