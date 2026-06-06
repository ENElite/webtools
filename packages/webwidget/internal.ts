// ─── Internal API ─────────────────────────────────────────────────────────────
// This file provides access to internal APIs that are not part of the public surface.
// Use these only when the public API doesn't provide what you need.
// Import from '@webtools/webwidget/internal'

// Signal Bus (singleton)
export { signalBus } from './src/engine/signal/bus';

// History Manager (internal)
export { CommandHistoryManager } from './src/engine/commands/history-manager';

// Slot Runtime internals
export { SlotExecutor } from './src/engine/slots/executor';

// Runtime internals
export { ControlsRegistry } from './src/runtime/runtimes/controlsRegistry';

// All hooks (including internal)
export * from './src/hooks';

// All components
export * from './src/components/settings';
export * from './src/components/editor';
