import type { WidgetModel } from "../model";

type Path<T> =
    T extends object
    ? {
        [K in keyof T & string]:
        T[K] extends object
        ? K | `${K}.${Path<T[K]>}`
        : K
    }[keyof T & string]
    : never

type PathValue<
    T,
    P extends string
> =
    P extends `${infer K}.${infer R}`
    ? K extends keyof T
    ? PathValue<T[K], R>
    : never
    : P extends keyof T
    ? T[P]
    : never

/**
 * Widget 属性路径（不带前缀）。
 * 示例: 'style.opacity', 'layout.x', 'props.fontSize'
 */
export type WidgetPath = Path<WidgetModel>;

/**
 * Widget 信号类型路径（带 'model.' 前缀）。
 * 示例: 'model.style.opacity', 'model.layout.x', 'model.props.fontSize'
 */
export type WidgetSignalType = `model.${WidgetPath}`;

export type BindPath = WidgetPath | WidgetPath[];

export type Patch = {
    set?: { [K in WidgetPath]?: PathValue<WidgetModel, K> };
    unset?: WidgetPath[];
};

export type BindPathValue<T extends WidgetPath> = PathValue<WidgetModel, T>;

export type SettingsTreeDataNode = {
    title: string;
    value: string;
    children?: SettingsTreeDataNode[];
    selectable?: boolean;
};

export type PageDefinition = {
    key: string;
    label: string;
    icon?: string;
    order: number;
    visible?: boolean;
    disabled?: boolean;
    permissions?: string[];
    i18n?: Record<string, string>;
};

export type PageRegistry = ReadonlyArray<PageDefinition>;

export type InspectorSchemaItem = {
    // schema 唯一标识与展示名
    key: string;
    label?: string;
    // 属性编辑器类型
    type: string;
    meta?: Record<string, any>;
    // 绑定路径
    bind: BindPath;
    // 分页分组排序展示
    page: string;
    group?: string;
    order: number;
    visibleWhen?: { field: WidgetPath; equals: any };
};

export type InspectorSchema = ReadonlyArray<InspectorSchemaItem>;

export type InspectorProps = {
    value: WidgetModel;
    schema: InspectorSchema;
    pages?: PageRegistry;
    onChange: (patch: Patch) => void;
};
