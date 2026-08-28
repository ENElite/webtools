export type EditorPosition = {
    line: number;
    column: number;
};

export type EditorRange = {
    start: EditorPosition;
    end: EditorPosition;
};

export type AIChangeKind = 'insert' | 'delete' | 'replace';

export type AITextChange = {
    id: string;
    kind: AIChangeKind;
    range: EditorRange;
    text?: string;
};

export type AIChangeSetInput = {
    id?: string;
    kind: AIChangeKind;
    range: EditorRange;
    text?: string;
};

export type AIOperation = {
    id: string;
    label?: string;
    changes: AITextChange[];
    metadata?: Record<string, string | number | boolean | null>;
};

export type AIOperationInput = {
    id?: string;
    label?: string;
    changes: AIChangeSetInput[];
    metadata?: Record<string, string | number | boolean | null>;
};

export type EditorChangeStatus = 'pending' | 'accepted' | 'reverted';

export type EditorOperationStatus = 'pending' | 'accepted' | 'reverted';

export type ResolvedAIChange = AITextChange & {
    inverse: AITextChange;
    status: EditorChangeStatus;
};

export type EditorOperationRecord = {
    id: string;
    label?: string;
    status: EditorOperationStatus;
    changes: ResolvedAIChange[];
    appliedAt: number;
    metadata?: Record<string, string | number | boolean | null>;
};

export type EditorDocumentState = {
    originalText: string;
    currentText: string;
    version: number;
};

export type EditorState = {
    document: EditorDocumentState;
    operations: EditorOperationRecord[];
    lastError: EditorEngineError | null;
};

export type EditorCommandResult = {
    ok: boolean;
    state: EditorState;
    error?: EditorEngineError;
};

export type EditorErrorCode =
    | 'invalid-position'
    | 'invalid-range'
    | 'invalid-change'
    | 'out-of-bounds'
    | 'operation-not-found'
    | 'change-not-found'
    | 'stale-operation';

export type EditorEngineError = {
    code: EditorErrorCode;
    message: string;
    operationId?: string;
    changeId?: string;
};

export type EditorTheme = 'vs' | 'vs-dark' | 'hc-black';

export type EditorSaveHandler = (content: string) => void | Promise<void>;

export type EditorController = {
    state: EditorState;
    applyAIChanges: (operation: AIOperationInput) => EditorCommandResult;
    acceptOperation: (operationId: string) => EditorCommandResult;
    revertOperation: (operationId: string) => EditorCommandResult;
    acceptChange: (operationId: string, changeId: string) => EditorCommandResult;
    revertChange: (operationId: string, changeId: string) => EditorCommandResult;
    resetToOriginal: () => EditorCommandResult;
    setCurrentText: (value: string) => EditorCommandResult;
};