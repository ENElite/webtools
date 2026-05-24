import type { SettingsTreeDataNode } from '../../engine/editor';
import modelsJson from './models.json';

type Live2dModelsJson = {
    version: string;
    generatedAt: string;
    total: number;
    tree: {
        label: string;
        children?: Live2dModelsTreeNode[];
    };
};

type Live2dModelsTreeNode = {
    label: string;
    url?: string;
    isLeaf?: boolean;
    children?: Live2dModelsTreeNode[];
};

function toTreeDataNodes(nodes: Live2dModelsTreeNode[], parentPath = ''): SettingsTreeDataNode[] {
    return nodes.map((node) => {
        const currentPath = parentPath ? `${parentPath}/${node.label}` : node.label;
        const hasChildren = Boolean(node.children?.length);

        return {
            title: node.label,
            value: node.url ?? currentPath,
            children: hasChildren ? toTreeDataNodes(node.children ?? [], currentPath) : undefined,
            selectable: !hasChildren,
        };
    });
}

const live2dModels = modelsJson as Live2dModelsJson;

export const LIVE2D_MODEL_TREE_DATA: SettingsTreeDataNode[] = toTreeDataNodes(live2dModels.tree.children ?? []);
export const LIVE2D_MODELS_JSON = live2dModels;
