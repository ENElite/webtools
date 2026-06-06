// ─── Public API ───────────────────────────────────────────────────────────────
// This file defines the curated public API surface for @webtools/webwidget.
// Internal APIs should be imported from specific subpath exports.

// Model & Types
export {
    type WidgetId,
    type WidgetKind,
    type WidgetStyle,
    type WidgetLayout,
    type WidgetFlatProps,
    type WidgetPropPrimitive,
    type WidgetHorizontalAnchor,
    type WidgetVerticalAnchor,
    type WidgetRendererProps,
    type WidgetRenderer,
    type WidgetRendererMap,
    type WidgetModel,
    type WidgetRegistration,
    WidgetKinds,
} from './src/engine/model';

// Widget Factory
export {
    createWidget,
    createWidgetRegistry,
    registerWidgetRenderer,
    resolveWidgetRenderer,
    resolveWidgetSettingsSchema,
    createOverlayRendererMap,
    defaultWidgetLabel,
    generateWidgetId,
    DEFAULT_OVERLAY_Z_INDEX,
    DEFAULT_SNAP_THRESHOLD,
    DEFAULT_WIDGET_STYLE,
    DEFAULT_WIDGET_LAYOUT,
    widgetRegistry,
} from './src/engine/model';

// Commands
export {
    type Command,
    type CommandSnapshot,
    type CommandHistoryState,
    type CommandExecutionResult,
    generateCommandId,
    AddWidgetCommand,
    RemoveWidgetCommand,
    UpdateWidgetCommand,
    MoveWidgetCommand,
    ChangeWidgetLayoutCommand,
    CopyWidgetCommand,
    BatchCommand,
} from './src/engine/commands';

// Editor
export {
    type InspectorSchema,
    type InspectorSchemaItem,
    type PageDefinition,
    type PageRegistry,
    type BindPath,
    type Patch,
    PropertyInspector,
    WIDGET_PAGE_REGISTRY,
    applyChange,
    diffObjects,
} from './src/engine/editor';

// Runtime
export {
    OverlayRoot,
    Widget,
    RuntimeProvider,
    useRuntime,
} from './src/runtime';

// Store
export {
    useOverlayStore,
    useWidgetStore,
    useWidgetAction,
} from './src/store';

// Components (settings)
export {
    SettingsFormPanel,
    buildFontString,
    parseFontString,
    type FontPickerValue,
    DEFAULT_FONT_FAMILIES,
    type FontFamilyOption,
    TagsInput,
    CombinerPicker,
    type CombinerOperator,
    type CombinerOption,
    type CombinerValue,
} from './src/components/settings';

// Components (clock defaults)
export { DEFAULT_CLOCK_WIDGET_PROPS } from './src/components/clock';

// Hooks (public)
export {
    useLive2D,
    useScaledCanvas,
    type ScaledCanvas,
    type UseScaledCanvasOptions,
} from './src/hooks';

// Animation types (from model)
export {
    type AnimationEffect,
    type MotionType,
    type AnimationEasing,
    type AnimationDirection,
    type AnimationConfig,
} from './src/engine/model';

// Signal system
export {
    type SignalSource,
    type WidgetSignal,
    type SystemSignal,
    type UserSignal,
    type LifecycleSignal,
    type Signal,
} from './src/engine/signal';

// Slots
export {
    type SlotDefinition,
    type SlotContext,
    type SlotParamSchemaItem,
} from './src/engine/slots';

// Devtools
export {
    DevtoolsPanel,
    useDevtoolsStore,
    useDevtoolsShortcut,
    useSignalLog,
    type DevtoolsTab,
    type SignalLogEntry,
} from './src/devtools';

// Styles
import './styles.css';
