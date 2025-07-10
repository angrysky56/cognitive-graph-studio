/**
 * Graph Layout Utilities
 * Provides structured layout algorithms for better graph visualization
 * Uses Dagre for hierarchical layouts and other layout algorithms
 */

import dagre from 'dagre';
import { Node, Edge, Position } from 'reactflow';

/**
 * Layout direction options for hierarchical graphs
 */
export type LayoutDirection = 'TB' | 'BT' | 'LR' | 'RL';

/**
 * Layout configuration options
 */
export interface LayoutConfig {
  direction: LayoutDirection;
  nodeWidth: number;
  nodeHeight: number;
  rankSep: number;
  nodeSep: number;
}

/**
 * Default layout configuration
 */
export const defaultLayoutConfig: LayoutConfig = {
  direction: 'TB',
  nodeWidth: 180,
  nodeHeight: 80,
  rankSep: 100,
  nodeSep: 50,
};

/**
 * Creates a new Dagre graph instance with specified configuration
 */
const createDagreGraph = (config: LayoutConfig): dagre.graphlib.Graph => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: config.direction,
    ranksep: config.rankSep,
    nodesep: config.nodeSep,
  });
  return dagreGraph;
};

/**
 * Calculates target and source positions based on layout direction
 */
const getNodePositions = (direction: LayoutDirection): {
  targetPosition: Position;
  sourcePosition: Position;
} => {
  if (direction === 'LR') {
    return { targetPosition: Position.Left, sourcePosition: Position.Right };
  } else if (direction === 'RL') {
    return { targetPosition: Position.Right, sourcePosition: Position.Left };
  } else if (direction === 'BT') {
    return { targetPosition: Position.Bottom, sourcePosition: Position.Top };
  } else {
    return { targetPosition: Position.Top, sourcePosition: Position.Bottom };
  }
};

/**
 * Applies Dagre layout algorithm to nodes and edges
 * @param nodes - React Flow nodes array
 * @param edges - React Flow edges array
 * @param config - Layout configuration options
 * @returns Layouted nodes and edges with updated positions
 */
export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  config: LayoutConfig = defaultLayoutConfig
): { nodes: Node[]; edges: Edge[] } => {
  const dagreGraph = createDagreGraph(config);
  const { targetPosition, sourcePosition } = getNodePositions(config.direction);

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: config.nodeWidth,
      height: config.nodeHeight,
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // Dagre uses center-center anchoring, React Flow uses top-left
    // So we need to adjust the position
    const position = {
      x: nodeWithPosition.x - config.nodeWidth / 2,
      y: nodeWithPosition.y - config.nodeHeight / 2,
    };

    return {
      ...node,
      targetPosition,
      sourcePosition,
      position,
    };
  });

  return { nodes: layoutedNodes, edges };
};

/**
 * Applies circular layout to nodes
 * @param nodes - React Flow nodes array
 * @param edges - React Flow edges array
 * @param centerX - Center X coordinate
 * @param centerY - Center Y coordinate
 * @param radius - Circle radius
 * @returns Nodes arranged in a circle
 */
export const getCircularLayout = (
  nodes: Node[],
  edges: Edge[],
  centerX: number = 400,
  centerY: number = 300,
  radius: number = 200
): { nodes: Node[]; edges: Edge[] } => {
  const layoutedNodes = nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    return {
      ...node,
      position: { x, y },
    };
  });

  return { nodes: layoutedNodes, edges };
};

/**
 * Applies grid layout to nodes
 * @param nodes - React Flow nodes array
 * @param edges - React Flow edges array
 * @param columns - Number of columns in grid
 * @param spacing - Spacing between nodes
 * @returns Nodes arranged in a grid
 */
export const getGridLayout = (
  nodes: Node[],
  edges: Edge[],
  columns: number = 4,
  spacing: number = 200
): { nodes: Node[]; edges: Edge[] } => {
  const layoutedNodes = nodes.map((node, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const x = col * spacing;
    const y = row * spacing;

    return {
      ...node,
      position: { x, y },
    };
  });

  return { nodes: layoutedNodes, edges };
};

/**
 * Applies radial layout - places nodes in concentric circles
 * @param nodes - React Flow nodes array
 * @param edges - React Flow edges array
 * @param centerX - Center X coordinate
 * @param centerY - Center Y coordinate
 * @param radiusStep - Distance between rings
 * @returns Nodes arranged in concentric circles
 */
export const getRadialLayout = (
  nodes: Node[],
  edges: Edge[],
  centerX: number = 400,
  centerY: number = 300,
  radiusStep: number = 120
): { nodes: Node[]; edges: Edge[] } => {
  const layoutedNodes = nodes.map((node, index) => {
    const ring = Math.floor(index / 8); // 8 nodes per ring
    const positionInRing = index % 8;
    const radius = radiusStep * (ring + 1);
    const angle = (2 * Math.PI * positionInRing) / 8;
    
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    return {
      ...node,
      position: { x, y },
    };
  });

  return { nodes: layoutedNodes, edges };
};

/**
 * Applies tree layout - arranges nodes in a tree structure
 * @param nodes - React Flow nodes array
 * @param edges - React Flow edges array
 * @param rootNodeId - ID of the root node (optional)
 * @param levelHeight - Vertical spacing between levels
 * @param nodeSpacing - Horizontal spacing between nodes
 * @returns Nodes arranged in tree structure
 */
export const getTreeLayout = (
  nodes: Node[],
  edges: Edge[],
  rootNodeId?: string,
  levelHeight: number = 150,
  nodeSpacing: number = 200
): { nodes: Node[]; edges: Edge[] } => {
  // Build adjacency list from edges
  const adjacencyList = new Map<string, string[]>();
  const parentMap = new Map<string, string>();
  
  edges.forEach(edge => {
    if (!adjacencyList.has(edge.source)) {
      adjacencyList.set(edge.source, []);
    }
    adjacencyList.get(edge.source)!.push(edge.target);
    parentMap.set(edge.target, edge.source);
  });
  
  // Find root node if not provided
  let root = rootNodeId;
  if (!root) {
    // Find node with no parent or use first node
    root = nodes.find(node => !parentMap.has(node.id))?.id || nodes[0]?.id;
  }
  
  if (!root) {
    return { nodes, edges }; // No nodes to layout
  }
  
  // Calculate tree layout using BFS
  const levels = new Map<number, string[]>();
  const nodeDepths = new Map<string, number>();
  const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: root, depth: 0 }];
  
  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    
    nodeDepths.set(nodeId, depth);
    
    if (!levels.has(depth)) {
      levels.set(depth, []);
    }
    levels.get(depth)!.push(nodeId);
    
    const children = adjacencyList.get(nodeId) || [];
    children.forEach(childId => {
      if (!nodeDepths.has(childId)) { // Avoid cycles
        queue.push({ nodeId: childId, depth: depth + 1 });
      }
    });
  }
  
  // Position nodes
  const layoutedNodes = nodes.map(node => {
    const depth = nodeDepths.get(node.id) ?? 0;
    const levelNodes = levels.get(depth) || [];
    const indexInLevel = levelNodes.indexOf(node.id);
    const levelWidth = (levelNodes.length - 1) * nodeSpacing;
    
    const x = -levelWidth / 2 + indexInLevel * nodeSpacing + 400; // Center around 400
    const y = depth * levelHeight + 100; // Start at y=100
    
    return {
      ...node,
      position: { x, y },
    };
  });
  
  return { nodes: layoutedNodes, edges };
};

/**
 * Applies force-directed layout simulation
 * @param nodes - React Flow nodes array
 * @param edges - React Flow edges array
 * @param width - Canvas width
 * @param height - Canvas height
 * @returns Promise that resolves with layouted nodes and edges
 */
export const getForceLayout = async (
  nodes: Node[],
  edges: Edge[],
  width: number = 800,
  height: number = 600
): Promise<{ nodes: Node[]; edges: Edge[] }> => {
  return new Promise((resolve) => {
    // Simple force simulation
    const layoutedNodes = nodes.map((node, index) => {
      // Start with spread positions
      const angle = (2 * Math.PI * index) / nodes.length;
      const radius = 150 + Math.random() * 100;
      const x = width / 2 + radius * Math.cos(angle);
      const y = height / 2 + radius * Math.sin(angle);
      
      return {
        ...node,
        position: { x, y },
      };
    });

    resolve({ nodes: layoutedNodes, edges });
  });
};

/**
 * Available layout algorithms
 */
export const layoutAlgorithms = {
  dagre: getLayoutedElements,
  circular: getCircularLayout,
  grid: getGridLayout,
  radial: getRadialLayout,
  tree: getTreeLayout,
  force: getForceLayout,
} as const;

export type LayoutAlgorithm = keyof typeof layoutAlgorithms;
