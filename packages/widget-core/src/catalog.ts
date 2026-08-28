import type { JsonObject, PluginDefinition, WidgetCatalog, WidgetKind } from './types';

export function defineWidgetPlugin<TProps extends JsonObject>(
    definition: PluginDefinition<TProps>,
): PluginDefinition<TProps> {
    return definition;
}

export function createWidgetCatalog(
    definitions: readonly PluginDefinition[],
): WidgetCatalog {
    const registrations = new Map<WidgetKind, PluginDefinition>();

    for (const definition of definitions) {
        if (registrations.has(definition.kind)) {
            throw new Error(`Widget plugin already registered: ${definition.kind}`);
        }

        const parsedDefaults = definition.propsSchema.parse(resolveDefaults(definition));
        const registration: PluginDefinition = Object.freeze({
            kind: definition.kind,
            label: definition.label,
            propsSchema: definition.propsSchema,
            // Always return a fresh schema-owned value. Callers never receive the
            // catalog's canonical default object by reference.
            defaultProps: () => definition.propsSchema.parse(parsedDefaults),
        });
        registrations.set(definition.kind, registration);
    }

    const kinds = Object.freeze([...registrations.keys()]);

    return Object.freeze({
        kinds,
        has(kind: WidgetKind): boolean {
            return registrations.has(kind);
        },
        get(kind: WidgetKind): PluginDefinition {
            const definition = registrations.get(kind);
            if (!definition) {
                throw new Error(`Unknown widget kind: ${kind}`);
            }
            return definition;
        },
        createProps(kind: WidgetKind, input: JsonObject = {}): JsonObject {
            const definition = this.get(kind);
            return definition.propsSchema.parse({
                ...resolveDefaults(definition),
                ...input,
            });
        },
        validateProps(kind: WidgetKind, input: unknown): JsonObject {
            return this.get(kind).propsSchema.parse(input);
        },
    });
}

function resolveDefaults(definition: PluginDefinition): JsonObject {
    return typeof definition.defaultProps === 'function'
        ? definition.defaultProps()
        : definition.defaultProps;
}
