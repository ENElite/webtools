export type {
    AIMode,
    AIMessage,
    AIEditChange,
    AIProvider,
    AIProviderSendParams,
    AIProviderChunk,
    AIStatus,
    EditorSelection,
} from './types';

export { useAIEditor, type UseAIEditorReturn } from './useAIEditor';
export { useEditorDecorations, type UseEditorDecorationsReturn } from './useEditorDecorations';
export { AIFloatingButton } from './AIFloatingButton';
export { AIChatDialog } from './AIChatDialog';
export { createDeepSeekProvider, type DeepSeekProviderConfig } from './providers/deepseek';
