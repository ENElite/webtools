import type { WidgetFlatProps, WidgetPropPrimitive, WidgetStyle } from '../types';
import { DEFAULT_WIDGET_COMMON_PROPS, type WidgetCommonProps } from './common';

export type SettingsWidgetProps = {
    sourceWidgetId: string;
    draftValues: string; // JSON-serialized WidgetSettingsDraft
} & WidgetCommonProps;

export const DEFAULT_SETTINGS_WIDGET_STYLE: WidgetStyle = {
    width: '700px',
    height: '450px',
    transform: 'translate(100px, 100px) rotate(0deg)',
    borderRadius: '16px',
}

export const DEFAULT_SETTINGS_WIDGET_PROPS: SettingsWidgetProps = {
    ...DEFAULT_WIDGET_COMMON_PROPS,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    shadowRadius: 4,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    sourceWidgetId: '',
    draftValues: '{}',
};

export type WidgetStyleSettingsDraft = {
    width: number;
    height: number;
    x: number;
    y: number;
    rotation: number;
};

export const STYLE_WIDGET_SETTINGS_SCHEMA = [
    {
        key: 'width',
        label: '宽度',
        type: 'number',
        min: 0,
        max: 4096,
        step: 1,
    },
    {
        key: 'height',
        label: '高度',
        type: 'number',
        min: 0,
        max: 4096,
        step: 1,
    },
    {
        key: 'x',
        label: 'X',
        type: 'number',
        min: 0,
        max: 4096,
        step: 1,
    },
    {
        key: 'y',
        label: 'Y',
        type: 'number',
        min: 0,
        max: 4096,
        step: 1,
    },
    {
        key: 'rotation',
        label: '旋转',
        type: 'number',
        min: -360,
        max: 360,
        step: 1,
        suffix: 'degree',
        modulo: 360,
    },
] satisfies WidgetSettingsSchema<WidgetStyleSettingsDraft>;



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
        key: WidgetFieldKey<T>;
        label: string;
        type: 'editor';
        language?: string;
        height?: string | number;
        saveButtonText?: string;
        visibleWhen?: WidgetFieldVisibility<T>;
    }
    | {
        type: 'divider';
        label?: string;
    };

export type WidgetSettingsSchema<T extends Record<string, WidgetPropPrimitive> = WidgetFlatProps> = ReadonlyArray<WidgetFieldSchema<T>>;
