export { useMaximize } from '../hooks/useMaximize';
export { CodeEditor, type CodeEditorHandle, type CodeEditorProps, type CodeEditorSaveHandler } from './CodeEditor';

// AI
export {
    type AIMode,
    type AIMessage,
    type AIEditChange,
    type AIProvider,
    type AIProviderSendParams,
    type AIProviderChunk,
    type EditorSelection,
} from './ai/types';
export { useAIEditor, type UseAIEditorReturn } from './ai/useAIEditor';
export { useEditorDecorations, type UseEditorDecorationsReturn } from './ai/useEditorDecorations';
export { AIFloatingButton } from './ai/AIFloatingButton';
export { AIChatDialog } from './ai/AIChatDialog';
