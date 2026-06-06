import { describe, expect, it } from 'vitest';

import { createWidget } from '@webwidget';
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
} from '@webwidget';
import type { WidgetLayout, WidgetModel } from '@webwidget';

function makeWidget(id: string, overrides: Partial<WidgetModel> = {}): WidgetModel {
    const base = createWidget('text');

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
        const base = makeWidget('a');
        const widget = makeWidget('b', { label: 'New widget' });
        const command = new AddWidgetCommand(widget);
        const snapshot = makeSnapshot([base]);

        const next = command.execute(snapshot);
        expect(next).toHaveLength(2);
        expect(next[1]).toBe(widget);

        const undone = command.undo(makeSnapshot(next));
        expect(undone).toEqual([base]);
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
        const first = makeWidget('a');
        const second = makeWidget('b');
        const command = new RemoveWidgetCommand('b');

        const next = command.execute(makeSnapshot([first, second]));
        expect(next).toEqual([first]);
        expect(command.canExecute(makeSnapshot([first, second]))).toBe(true);
        expect(command.canExecute(makeSnapshot([first]))).toBe(false);

        const undone = command.undo(makeSnapshot(next));
        expect(undone).toEqual([first, second]);
    });

    it('updates widget fields and restores the previous values on undo', () => {
        const original = makeWidget('a', { label: 'Alpha', locked: false });
        const command = new UpdateWidgetCommand('a', {
            label: 'Beta',
            locked: true,
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
            },
        });
        const updatedLayout: WidgetLayout = {
            ...original.layout,
            x: 60,
            y: 70,
            rotation: 45,
        };
        const command = new UpdateWidgetCommand('a', { layout: updatedLayout });

        const next = command.execute(makeSnapshot([original]));
        expect(next[0]?.layout).toEqual(updatedLayout);

        const undone = command.undo(makeSnapshot(next));
        expect(undone[0]?.layout).toEqual(original.layout);
    });

    it('moves widgets up, down, top and bottom with undo support', () => {
        const a = makeWidget('a');
        const b = makeWidget('b');
        const c = makeWidget('c');

        const moveUp = new MoveWidgetCommand('b', 'up');
        const movedUp = moveUp.execute(makeSnapshot([a, b, c]));
        expect(movedUp.map((widget) => widget.id)).toEqual(['a', 'c', 'b']);
        expect(moveUp.undo(makeSnapshot(movedUp)).map((widget) => widget.id)).toEqual(['a', 'b', 'c']);

        const moveDown = new MoveWidgetCommand('b', 'down');
        const movedDown = moveDown.execute(makeSnapshot([a, b, c]));
        expect(movedDown.map((widget) => widget.id)).toEqual(['b', 'a', 'c']);
        expect(moveDown.undo(makeSnapshot(movedDown)).map((widget) => widget.id)).toEqual(['a', 'b', 'c']);

        const moveTop = new MoveWidgetCommand('a', 'top');
        const movedTop = moveTop.execute(makeSnapshot([a, b, c]));
        expect(movedTop.map((widget) => widget.id)).toEqual(['b', 'c', 'a']);
        expect(moveTop.undo(makeSnapshot(movedTop)).map((widget) => widget.id)).toEqual(['a', 'b', 'c']);

        const moveBottom = new MoveWidgetCommand('c', 'bottom');
        const movedBottom = moveBottom.execute(makeSnapshot([a, b, c]));
        expect(movedBottom.map((widget) => widget.id)).toEqual(['c', 'a', 'b']);
        expect(moveBottom.undo(makeSnapshot(movedBottom)).map((widget) => widget.id)).toEqual(['a', 'b', 'c']);
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
            },
        });
        const sibling = makeWidget('sibling');
        const command = new CopyWidgetCommand('source');

        const next = command.execute(makeSnapshot([source, sibling]));
        expect(next).toHaveLength(3);
        expect(next[0]?.id).toBe('source');
        expect(next[1]?.id).not.toBe('sibling');
        expect(next[2]?.id).toBe('sibling');
        expect(next[1]?.label).toBe(source.label);
        expect(next[1]?.layout.x).toBe(source.layout.x + 2);
        expect(next[1]?.layout.y).toBe(source.layout.y + 2);

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
        const a = makeWidget('a');
        const b = makeWidget('b', { label: 'Beta' });
        const update = new UpdateWidgetCommand('b', { label: 'Gamma' });
        const move = new MoveWidgetCommand('b', 'down');
        const batch = new BatchCommand([update, move], 'update and move');

        const next = batch.execute(makeSnapshot([a, b]));
        expect(next.map((widget) => widget.id)).toEqual(['b', 'a']);
        expect(next[0]?.label).toBe('Gamma');

        const undone = batch.undo(makeSnapshot(next));
        expect(undone.map((widget) => widget.id)).toEqual(['a', 'b']);
        expect(undone[1]?.label).toBe('Beta');
    });
});
