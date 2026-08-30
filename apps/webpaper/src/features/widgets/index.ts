import { createWidgetCatalog } from '@webtools/widget-core';
import { createWidgetViewCatalog } from '@webtools/widget-react';
import { createWidgetInspectorCatalog } from '@webtools/widget-studio';

import { clockWidgetDefinition, clockWidgetInspector, clockWidgetView } from './clock';
import { htmlWidgetDefinition, htmlWidgetInspector, htmlWidgetView } from './html';
import { iframeWidgetDefinition, iframeWidgetInspector, iframeWidgetView } from './iframe';
import { imageWidgetDefinition, imageWidgetInspector, imageWidgetView } from './image';
import { live2dWidgetDefinition, live2dWidgetInspector, live2dWidgetView } from './live2d';
import { textWidgetDefinition, textWidgetInspector, textWidgetView } from './text';
import { videoWidgetDefinition, videoWidgetInspector, videoWidgetView } from './video';

export * from './clock';
export * from './html';
export * from './iframe';
export * from './image';
export * from './live2d';
export * from './text';
export * from './video';

/** Declarative plugin data. Importing this module never mutates a registry. */
export const definitions = Object.freeze([
    textWidgetDefinition,
    clockWidgetDefinition,
    imageWidgetDefinition,
    videoWidgetDefinition,
    iframeWidgetDefinition,
    htmlWidgetDefinition,
    live2dWidgetDefinition,
] as const);

export const views = Object.freeze([
    textWidgetView,
    clockWidgetView,
    imageWidgetView,
    videoWidgetView,
    iframeWidgetView,
    htmlWidgetView,
    live2dWidgetView,
] as const);

export const inspectors = Object.freeze([
    textWidgetInspector,
    clockWidgetInspector,
    imageWidgetInspector,
    videoWidgetInspector,
    iframeWidgetInspector,
    htmlWidgetInspector,
    live2dWidgetInspector,
] as const);

export const builtInWidgetDefinitions = definitions;
export const builtInWidgetViews = views;
export const builtInWidgetInspectors = inspectors;

/** Creates isolated catalogs for one application/runtime instance. */
export function createBuiltInWidgetCatalogs() {
    return Object.freeze({
        definitions: createWidgetCatalog(definitions),
        views: createWidgetViewCatalog(views),
        inspectors: createWidgetInspectorCatalog(inspectors),
    });
}
