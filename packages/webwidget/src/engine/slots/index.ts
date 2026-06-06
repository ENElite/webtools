export type {
    SlotParamSchemaItem,
    SlotContext,
    SlotDefinition,
    AnimationControls,
} from './registry';

export {
    registerSlot,
    unregisterSlot,
    getSlot,
    getAllSlots,
    getSlotsForSignalType,
    getSlotsByGroup,
    isSlotCompatibleWithSignal,
} from './registry';

export type { ExecutorDeps } from './executor';
export { createSlotExecutor } from './executor';

export { registerBuiltinSlots } from './builtins';
