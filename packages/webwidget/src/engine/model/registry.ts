import type { WidgetKind, WidgetFlatProps, WidgetRenderer } from './types';
import type { InspectorSchema } from '../editor';

export interface WidgetRegistration {
    renderer: WidgetRenderer<any>;
    defaults: WidgetFlatProps;
    label: string;
    schema?: InspectorSchema;
}

export class WidgetRegistry {
    private registrations = new Map<string, WidgetRegistration>();

    register(kind: WidgetKind, registration: WidgetRegistration): void {
        this.registrations.set(kind, registration);
    }

    getRenderer(kind: WidgetKind): WidgetRenderer<any> | null {
        return this.registrations.get(kind)?.renderer ?? null;
    }

    getDefaults(kind: WidgetKind): WidgetFlatProps | null {
        return this.registrations.get(kind)?.defaults ?? null;
    }

    getLabel(kind: WidgetKind): string {
        return this.registrations.get(kind)?.label ?? kind;
    }

    getSchema(kind: WidgetKind): InspectorSchema | null {
        return this.registrations.get(kind)?.schema ?? null;
    }

    getAllKinds(): WidgetKind[] {
        return Array.from(this.registrations.keys()) as WidgetKind[];
    }

    isRegistered(kind: WidgetKind): boolean {
        return this.registrations.has(kind);
    }
}

// Singleton registry instance
export const widgetRegistry = new WidgetRegistry();
