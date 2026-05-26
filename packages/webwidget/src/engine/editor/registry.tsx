import React from 'react';

import type { Patch, InspectorSchemaItem } from './types';

export type EditorProps = {
    item: InspectorSchemaItem;
    value: any;
    onChange: (patch: Patch) => void;
};

export const Registries: Record<string, React.ComponentType<EditorProps>> = {};

export function registerEditor(key: string, component: React.ComponentType<EditorProps>) {
    Registries[key] = component;
}

export function getEditor(key: string) {
    return Registries[key] ?? null;
}

import {
    StringEditor,
    NumberEditor,
    SliderEditor,
    SwitchEditor,
    EnumEditor,
    TreeSelectEditor,
    ColorEditor,
    BorderEditor,
    FontEditor,
    ImageEditor,
    CodeEditor,
    CombinerEditor,
    TagsEditor,
    AnimationSlotsEditor,
    CascaderEditor,
} from './editors';

registerEditor('string', StringEditor);
registerEditor('number', NumberEditor);
registerEditor('slider', SliderEditor);
registerEditor('switch', SwitchEditor);
registerEditor('enum', EnumEditor);
registerEditor('treeSelect', TreeSelectEditor);
registerEditor('color', ColorEditor);
registerEditor('border', BorderEditor);
registerEditor('font', FontEditor);
registerEditor('image', ImageEditor);
registerEditor('editor', CodeEditor);
registerEditor('combiner', CombinerEditor);
registerEditor('tags', TagsEditor);
registerEditor('animationSlots', AnimationSlotsEditor);
registerEditor('cascader', CascaderEditor);
