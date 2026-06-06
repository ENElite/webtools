import { describe, expect, it } from 'vitest';

import { createWidget, WidgetKinds } from '../src/engine/model/widget';
import {
    AddWidgetCommand,
    BatchCommand,
    ChangeWidgetLayoutCommand,
    CommandHistoryManager,
    CopyWidgetCommand,
    MoveWidgetCommand,
    RemoveWidgetCommand,
    UpdateWidgetCommand,
    type Command,
    type CommandSnapshot,
} from '../src/engine/commands';
import type { WidgetLayout, WidgetModel } from '../src/engine/model';

function makeWidget(id: string, overrides: Partial<WidgetModel> = {}): WidgetModel {
    const base = createWidget(WidgetKinds.TEXT);

    return {
        ...base,
        ...overrides,
        id,
        kind: overrides.kind ?? base.kind,
        label: overrides.label ?? base.label,
        style: {
            ...base.style,
            ...overrides.style,
        },
        layout: {
            ...base.layout,
            ...overrides.layout,
        },
        props: {
            ...base.props,
            ...(overrides.props ?? {}),
        },
    };
}

function makeSnapshot(widgets: WidgetModel[], activeWidgetId: string | null = null): CommandSnapshot {
    return {
        widgets,
        activeWidgetId,
    };
}

function createHistoryCommand(id: string): Command {
    return {
        id,
        type: 'test-command',
        timestamp: 0,
        execute: (snapshot) => snapshot.widgets,
        undo: (snapshot) => snapshot.widgets,
        canExecute: () => true,
        getDescription: () => id,
    };
}

describe('CommandHistoryManager', () => {
    it('tracks undo and redo stacks', () => {
        const manager = new CommandHistoryManager();
        const command1 = createHistoryCommand('c1');
        const command2 = createHistoryCommand('c2');

        manager.execute(command1);
        manager.execute(command2);

        expect(manager.getState()).toEqual({
            pastCommands: [command1, command2],
            futureCommands: [],
            canUndo: true,
            canRedo: false,
        });

        expect(manager.undo()).toBe(command2);
        expect(manager.getState()).toEqual({
            pastCommands: [command1],
            futureCommands: [command2],
            canUndo: true,
            canRedo: true,
        });

        expect(manager.redo()).toBe(command2);
        expect(manager.getState()).toEqual({
            pastCommands: [command1, command2],
            futureCommands: [],
            canUndo: true,
            canRedo: false,
        });
    });

    it('drops redo history when a new command is executed after undo', () => {
        const manager = new CommandHistoryManager();
        const command1 = createHistoryCommand('c1');
        const command2 = createHistoryCommand('c2');
        const command3 = createHistoryCommand('c3');

        manager.execute(command1);
        manager.execute(command2);
        expect(manager.undo()).toBe(command2);

        manager.execute(command3);

        expect(manager.getState()).toEqual({
            pastCommands: [command1, command3],
            futureCommands: [],
            canUndo: true,
            canRedo: false,
        });
    });

    it('respects history size limits', () => {
        const manager = new CommandHistoryManager(2);
        const command1 = createHistoryCommand('c1');
        const command2 = createHistoryCommand('c2');
        const command3 = createHistoryCommand('c3');

        manager.execute(command1);
        manager.execute(command2);
        manager.execute(command3);

        expect(manager.getState().pastCommands).toEqual([command2, command3]);
        expect(manager.getHistorySize()).toEqual({ past: 2, future: 0 });
    });

    it('clears all history', () => {
        const manager = new CommandHistoryManager();
        manager.execute(createHistoryCommand('c1'));
        manager.undo();

        manager.clear();

        expect(manager.getState()).toEqual({
            pastCommands: [],
            futureCommands: [],
            canUndo: false,
            canRedo: false,
        });
    });
});

describe('Widget commands', () => {
    it('adds a widget and undoes the insertion', () => {
        const base = makeWidget('a', { layout: { order: 1 } as WidgetLayout });
        const widget = makeWidget('b', { label: 'New widget', layout: { order: 2 } as WidgetLayout });
        const command = new AddWidgetCommand(widget);
        const snapshot = makeSnapshot([base]);

        const next = command.execute(snapshot);
        expect(next).toHaveLength(2);
        expect(next[1]?.id).toBe('b');
        expect(next[1]?.layout.order).toBe(2); // max order (1) + 1

        const undone = command.undo(makeSnapshot(next));
        expect(undone).toHaveLength(1);
        expect(undone[0]?.id).toBe('a');
    });

    it('replaces an existing widget with the same id', () => {
        const original = makeWidget('same-id', { label: 'Original' });
        const replacement = makeWidget('same-id', { label: 'Replacement' });
        const command = new AddWidgetCommand(replacement);

        const next = command.execute(makeSnapshot([original]));

        expect(next).toHaveLength(1);
        expect(next[0]?.label).toBe('Replacement');
    });

    it('removes a widget and restores it on undo', () => {
        const first = makeWidget('a', { layout: { order: 1 } as WidgetLayout });
        const second = makeWidget('b', { layout: { order: 2 } as WidgetLayout });
        const command = new RemoveWidgetCommand('b');

        const next = command.execute(makeSnapshot([first, second]));
        expect(next).toHaveLength(1);
        expect(next[0]?.id).toBe('a');
        expect(next[0]?.layout.order).toBe(1);
        expect(command.canExecute(makeSnapshot([first, second]))).toBe(true);
        expect(command.canExecute(makeSnapshot([first]))).toBe(false);

        const undone = command.undo(makeSnapshot(next));
        expect(undone).toHaveLength(2);
        expect(undone.find((w) => w.id === 'a')?.layout.order).toBe(1);
        expect(undone.find((w) => w.id === 'b')?.layout.order).toBe(2);
    });

    it('updates widget fields and restores the previous values on undo', () => {
        const original = makeWidget('a', { label: 'Alpha', locked: false });
        const command = new UpdateWidgetCommand('a', {
            set: { label: 'Beta', locked: true },
        });

        const next = command.execute(makeSnapshot([original]));
        expect(next[0]?.label).toBe('Beta');
        expect(next[0]?.locked).toBe(true);

        const undone = command.undo(makeSnapshot(next));
        expect(undone[0]?.label).toBe('Alpha');
        expect(undone[0]?.locked).toBe(false);
    });

    it('updates widget layout and restores the previous layout on undo', () => {
        const original = makeWidget('a', {
            layout: {
                anchorX: 'left',
                anchorY: 'top',
                x: 10,
                y: 20,
                w: 30,
                h: 40,
                rotation: 0,
                adapt: 'fixed',
                order: 1,
            },
        });
        const updatedLayout: WidgetLayout = {
            ...original.layout,
            x: 60,
            y: 70,
            rotation: 45,
        };
        const command = new UpdateWidgetCommand('a', {
            set: { 'layout.x': updatedLayout.x, 'layout.y': updatedLayout.y, 'layout.rotation': updatedLayout.rotation },
        });

        const next = command.execute(makeSnapshot([original]));
        expect(next[0]?.layout).toEqual(updatedLayout);

        const undone = command.undo(makeSnapshot(next));
        expect(undone[0]?.layout).toEqual(original.layout);
    });

    it('moves widgets up, down, top and bottom with undo support', () => {
        const a = makeWidget('a', { layout: { order: 1 } as WidgetLayout });
        const b = makeWidget('b', { layout: { order: 2 } as WidgetLayout });
        const c = makeWidget('c', { layout: { order: 3 } as WidgetLayout });

        const moveUp = new MoveWidgetCommand('b', 'up');
        const movedUp = moveUp.execute(makeSnapshot([a, b, c]));
        // b (order 2) swaps with c (order 3): b=3, c=2
        expect(movedUp.find((w) => w.id === 'a')?.layout.order).toBe(1);
        expect(movedUp.find((w) => w.id === 'b')?.layout.order).toBe(3);
        expect(movedUp.find((w) => w.id === 'c')?.layout.order).toBe(2);
        const undoneUp = moveUp.undo(makeSnapshot(movedUp));
        expect(undoneUp.find((w) => w.id === 'a')?.layout.order).toBe(1);
        expect(undoneUp.find((w) => w.id === 'b')?.layout.order).toBe(2);
        expect(undoneUp.find((w) => w.id === 'c')?.layout.order).toBe(3);

        const moveDown = new MoveWidgetCommand('b', 'down');
        const movedDown = moveDown.execute(makeSnapshot([a, b, c]));
        // b (order 2) swaps with a (order 1): b=1, a=2
        expect(movedDown.find((w) => w.id === 'a')?.layout.order).toBe(2);
        expect(movedDown.find((w) => w.id === 'b')?.layout.order).toBe(1);
        expect(movedDown.find((w) => w.id === 'c')?.layout.order).toBe(3);
        const undoneDown = moveDown.undo(makeSnapshot(movedDown));
        expect(undoneDown.find((w) => w.id === 'a')?.layout.order).toBe(1);
        expect(undoneDown.find((w) => w.id === 'b')?.layout.order).toBe(2);
        expect(undoneDown.find((w) => w.id === 'c')?.layout.order).toBe(3);

        const moveTop = new MoveWidgetCommand('a', 'top');
        const movedTop = moveTop.execute(makeSnapshot([a, b, c]));
        // a (order 1) → max(3), b shifts 2→1, c shifts 3→2
        expect(movedTop.find((w) => w.id === 'a')?.layout.order).toBe(3);
        expect(movedTop.find((w) => w.id === 'b')?.layout.order).toBe(1);
        expect(movedTop.find((w) => w.id === 'c')?.layout.order).toBe(2);
        const undoneTop = moveTop.undo(makeSnapshot(movedTop));
        expect(undoneTop.find((w) => w.id === 'a')?.layout.order).toBe(1);
        expect(undoneTop.find((w) => w.id === 'b')?.layout.order).toBe(2);
        expect(undoneTop.find((w) => w.id === 'c')?.layout.order).toBe(3);

        const moveBottom = new MoveWidgetCommand('c', 'bottom');
        const movedBottom = moveBottom.execute(makeSnapshot([a, b, c]));
        // c (order 3) → 1, a shifts 1→2, b shifts 2→3
        expect(movedBottom.find((w) => w.id === 'a')?.layout.order).toBe(2);
        expect(movedBottom.find((w) => w.id === 'b')?.layout.order).toBe(3);
        expect(movedBottom.find((w) => w.id === 'c')?.layout.order).toBe(1);
        const undoneBottom = moveBottom.undo(makeSnapshot(movedBottom));
        expect(undoneBottom.find((w) => w.id === 'a')?.layout.order).toBe(1);
        expect(undoneBottom.find((w) => w.id === 'b')?.layout.order).toBe(2);
        expect(undoneBottom.find((w) => w.id === 'c')?.layout.order).toBe(3);
    });

    it('copies a widget and removes the copy on undo', () => {
        const source = makeWidget('source', {
            layout: {
                anchorX: 'left',
                anchorY: 'top',
                x: 12,
                y: 18,
                w: 30,
                h: 40,
                rotation: 0,
                adapt: 'fixed',
                order: 1,
            },
        });
        const sibling = makeWidget('sibling', { layout: { order: 2 } as WidgetLayout });
        const command = new CopyWidgetCommand('source');

        const next = command.execute(makeSnapshot([source, sibling]));
        expect(next).toHaveLength(3);
        const copy = next.find((w) => w.id !== 'source' && w.id !== 'sibling');
        expect(copy).toBeDefined();
        expect(copy?.label).toBe(source.label);
        expect(copy?.layout.x).toBe(source.layout.x + 2);
        expect(copy?.layout.y).toBe(source.layout.y + 2);
        expect(copy?.layout.order).toBe(3); // max order (2) + 1

        const undone = command.undo(makeSnapshot(next));
        expect(undone.map((widget) => widget.id)).toEqual(['source', 'sibling']);
    });

    it('changes layout and restores the previous layout on undo', () => {
        const original = makeWidget('a', {
            layout: {
                anchorX: 'left',
                anchorY: 'top',
                x: 5,
                y: 6,
                w: 7,
                h: 8,
                rotation: 0,
                adapt: 'fixed',
                order: 1,
            },
        });
        const patch: Partial<WidgetLayout> = {
            x: 15,
            y: 16,
            rotation: 90,
        };
        const command = new ChangeWidgetLayoutCommand('a', patch);

        const next = command.execute(makeSnapshot([original]));
        expect(next[0]?.layout).toMatchObject(patch);

        const undone = command.undo(makeSnapshot(next));
        expect(undone[0]?.layout).toEqual(original.layout);
    });

    it('combines commands atomically in a batch', () => {
        const a = makeWidget('a', { layout: { order: 1 } as WidgetLayout });
        const b = makeWidget('b', { label: 'Beta', layout: { order: 2 } as WidgetLayout });
        const update = new UpdateWidgetCommand('b', { set: { label: 'Gamma' } });
        const move = new MoveWidgetCommand('b', 'down');
        const batch = new BatchCommand([update, move], 'update and move');

        const next = batch.execute(makeSnapshot([a, b]));
        // b (order 2) swaps with a (order 1): b=1, a=2
        expect(next.find((w) => w.id === 'a')?.layout.order).toBe(2);
        expect(next.find((w) => w.id === 'b')?.layout.order).toBe(1);
        expect(next.find((w) => w.id === 'b')?.label).toBe('Gamma');

        const undone = batch.undo(makeSnapshot(next));
        expect(undone.find((w) => w.id === 'a')?.layout.order).toBe(1);
        expect(undone.find((w) => w.id === 'b')?.layout.order).toBe(2);
        expect(undone.find((w) => w.id === 'b')?.label).toBe('Beta');
    });
});
