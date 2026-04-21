import type { WidgetFlatProps, WidgetPropPrimitive } from '../types';

export type WidgetFieldKey<T extends Record<string, WidgetPropPrimitive>> = Extract<keyof T, string>;

export type WidgetFieldVisibility<T extends Record<string, WidgetPropPrimitive> = WidgetFlatProps> = {
    key: WidgetFieldKey<T>;
    equals: string | number | boolean | null;
};

export type WidgetFieldSchema<T extends Record<string, WidgetPropPrimitive> = WidgetFlatProps> =
    | {
        key: WidgetFieldKey<T>;
        label: string;
        type: 'string';
        placeholder?: string;
        visibleWhen?: WidgetFieldVisibility<T>;
    }
    | {
        key: WidgetFieldKey<T>;
        label: string;
        type: 'number';
        min?: number;
        max?: number;
        step?: number;
        suffix?: string;
        modulo?: number;
        visibleWhen?: WidgetFieldVisibility<T>;
    }
    | {
        key: WidgetFieldKey<T>;
        label: string;
        type: 'enum';
        options: Array<{
            label: string;
            value: string | number;
        }>;
        visibleWhen?: WidgetFieldVisibility<T>;
    }
    | {
        key: WidgetFieldKey<T>;
        label: string;
        type: 'color';
        alpha?: boolean;
        visibleWhen?: WidgetFieldVisibility<T>;
    }
    | {
        key: WidgetFieldKey<T>;
        label: string;
        type: 'image';
        placeholder?: string;
        visibleWhen?: WidgetFieldVisibility<T>;
    }
    | {
        type: 'divider';
        label?: string;
    };

export type WidgetSettingsSchema<T extends Record<string, WidgetPropPrimitive> = WidgetFlatProps> = ReadonlyArray<WidgetFieldSchema<T>>;
