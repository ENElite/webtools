export type SettingsValuePrimitive = string | number | boolean | null;

export type SettingsValues = Record<string, SettingsValuePrimitive>;

export type SettingsFieldVisibility<T extends SettingsValues = SettingsValues> = {
    key: Extract<keyof T, string>;
    equals: SettingsValuePrimitive;
};

export type SettingsTreeDataNode = {
    title: string;
    value: string;
    children?: SettingsTreeDataNode[];
    selectable?: boolean;
};

export type SettingsFieldSchema<T extends SettingsValues = SettingsValues> =
    | {
        key: Extract<keyof T, string>;
        label: string;
        type: 'string';
        placeholder?: string;
        readOnly?: boolean;
        visibleWhen?: SettingsFieldVisibility<T>;
    }
    | {
        key: Extract<keyof T, string>;
        label: string;
        type: 'number';
        min?: number;
        max?: number;
        step?: number;
        suffix?: string;
        modulo?: number;
        visibleWhen?: SettingsFieldVisibility<T>;
    }
    | {
        key: Extract<keyof T, string>;
        label: string;
        type: 'slider';
        min?: number;
        max?: number;
        step?: number;
        suffix?: string;
        visibleWhen?: SettingsFieldVisibility<T>;
    }
    | {
        key: Extract<keyof T, string>;
        label: string;
        type: 'boolean';
        visibleWhen?: SettingsFieldVisibility<T>;
    }
    | {
        key: Extract<keyof T, string>;
        label: string;
        type: 'enum';
        options: Array<{
            label: string;
            value: string | number;
        }>;
        visibleWhen?: SettingsFieldVisibility<T>;
    }
    | {
        key: Extract<keyof T, string>;
        label: string;
        type: 'treeSelect';
        treeData: SettingsTreeDataNode[];
        placeholder?: string;
        allowClear?: boolean;
        visibleWhen?: SettingsFieldVisibility<T>;
    }
    | {
        key: Extract<keyof T, string>;
        label: string;
        type: 'color';
        alpha?: boolean;
        visibleWhen?: SettingsFieldVisibility<T>;
    }
    | {
        key: Extract<keyof T, string>;
        label: string;
        type: 'font';
        visibleWhen?: SettingsFieldVisibility<T>;
    }
    | {
        key: Extract<keyof T, string>;
        label: string;
        type: 'image';
        placeholder?: string;
        visibleWhen?: SettingsFieldVisibility<T>;
    }
    | {
        key: Extract<keyof T, string>;
        label: string;
        type: 'editor';
        language?: string;
        height?: string | number;
        saveButtonText?: string;
        chat?: boolean;
        visibleWhen?: SettingsFieldVisibility<T>;
    }
    | {
        key: Extract<keyof T, string>;
        label: string;
        type: 'combiner';
        operatorKey: Extract<keyof T, string>;
        valueKey: Extract<keyof T, string>;
        operatorOptions: Array<{
            label: string;
            value: string | number;
        }>;
        valueOptions: Array<{
            label: string;
            value: string | number;
        }>;
        visibleWhen?: SettingsFieldVisibility<T>;
    }
    | {
        key: Extract<keyof T, string>;
        label: string;
        type: 'tags';
        splitter?: string; // 是否以空格分隔，默认为逗号分隔
        placeholder?: string;
        visibleWhen?: SettingsFieldVisibility<T>;
    }
    | {
        type: 'divider';
        label?: string;
        default?: boolean;
    };

export type SettingsSchema<T extends SettingsValues = SettingsValues> = ReadonlyArray<SettingsFieldSchema<T>>;