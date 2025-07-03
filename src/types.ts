// Type definitions for treemap data structures

export interface TreemapData {
  labels: string[];
  parents: string[];
  values: number[];
  ids?: string[];
  text?: string[];
}

export interface TreemapConfig {
  title?: string;
  colorscale?: string;
  showscale?: boolean;
  width?: number;
  height?: number;
}

export interface TreemapNode {
  id: string;
  label: string;
  parent: string;
  value: number;
  children?: TreemapNode[];
}

// Helper function to convert hierarchical data to flat treemap format
export function flattenTreeData(nodes: TreemapNode[]): TreemapData {
  const labels: string[] = [];
  const parents: string[] = [];
  const values: number[] = [];
  const ids: string[] = [];

  function processNode(node: TreemapNode) {
    labels.push(node.label);
    parents.push(node.parent);
    values.push(node.value);
    ids.push(node.id);

    if (node.children) {
      node.children.forEach(child => {
        child.parent = node.id;
        processNode(child);
      });
    }
  }

  nodes.forEach(node => processNode(node));

  return { labels, parents, values, ids };
} 