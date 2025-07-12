/**
 * MyGraphCanvas Component - Modern React Flow-based Graph Visualization
 * Replaces the poor D3.js implementation with a maintainable React Flow solution
 *
 * Features:
 * - Interactive node-link graph with React Flow
 * - Automatic layout using Dagre algorithms
 * - Customizable node and edge types
 * - Integrated AI interaction capabilities
 * - Material UI theming integration
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  BackgroundVariant,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  Box,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useEnhancedGraphStore from '@/stores/enhancedGraphStore';
import { EnhancedGraphNode, EnhancedGraphEdge } from '@/types/enhanced-graph';
import {
  getLayoutedElements,
  getCircularLayout,
  getGridLayout,
  getRadialLayout,
  getTreeLayout,
  getForceLayout,
  LayoutAlgorithm,
  LayoutDirection,
  defaultLayoutConfig
} from '@/utils/layout';

// Custom node types
import ConceptNode from './nodes/ConceptNode';
import SourceNode from './nodes/SourceNode';
import IdeaNode from './nodes/IdeaNode';
import DefaultNode from './nodes/DefaultNode';

// Custom edge types
import SemanticEdge from './edges/SemanticEdge';
import HierarchicalEdge from './edges/HierarchicalEdge';

/**
 * Enhanced node type registry for React Flow
 * Includes all known types plus fallback for unknown types
 */
const nodeTypes = {
  // Primary node types
  concept: ConceptNode,
  source: SourceNode,
  idea: IdeaNode,

  // Extended node types using DefaultNode
  topic: DefaultNode,
  technology: DefaultNode,
  ionic: DefaultNode,
  organization: DefaultNode,
  tool: DefaultNode,
  framework: DefaultNode,
  library: DefaultNode,
  service: DefaultNode,
  api: DefaultNode,
  component: DefaultNode,
  feature: DefaultNode,
  workflow: DefaultNode,
  process: DefaultNode,
  method: DefaultNode,
  strategy: DefaultNode,
  approach: DefaultNode,
  pattern: DefaultNode,
  template: DefaultNode,
  resource: DefaultNode,
  document: DefaultNode,
  reference: DefaultNode,
  example: DefaultNode,
  demo: DefaultNode,
  tutorial: DefaultNode,
  guide: DefaultNode,
  standard: DefaultNode,
  convention: DefaultNode,
  configuration: DefaultNode,
  setting: DefaultNode,
  environment: DefaultNode,
  deployment: DefaultNode,
  monitoring: DefaultNode,
  analytics: DefaultNode,
  metrics: DefaultNode,
  insight: DefaultNode,
  analysis: DefaultNode,
  research: DefaultNode,
  study: DefaultNode,
  experiment: DefaultNode,
  test: DefaultNode,
  validation: DefaultNode,
  verification: DefaultNode,
  optimization: DefaultNode,
  enhancement: DefaultNode,
  improvement: DefaultNode,
  update: DefaultNode,
  version: DefaultNode,
  release: DefaultNode,
  milestone: DefaultNode,
  goal: DefaultNode,
  objective: DefaultNode,
  target: DefaultNode,
  requirement: DefaultNode,
  specification: DefaultNode,
  design: DefaultNode,
  architecture: DefaultNode,
  model: DefaultNode,
  schema: DefaultNode,
  interface: DefaultNode,
  endpoint: DefaultNode,
  database: DefaultNode,
  storage: DefaultNode,
  cache: DefaultNode,
  session: DefaultNode,
  state: DefaultNode,
  context: DefaultNode,
  scope: DefaultNode,
  namespace: DefaultNode,
  module: DefaultNode,
  package: DefaultNode,
  dependency: DefaultNode,

  // Fallback for any unknown types
  default: DefaultNode,
};

/**
 * Edge type registry for React Flow
 */
const edgeTypes = {
  semantic: SemanticEdge,
  hierarchical: HierarchicalEdge,
};

/**
 * Graph canvas component props
 */
interface MyGraphCanvasProps {
  width?: number;
  height?: number;
  onNodeClick?: (node: EnhancedGraphNode) => void;
  onEdgeClick?: (edge: EnhancedGraphEdge) => void;
  layoutTrigger?: {
    algorithm: LayoutAlgorithm;
    direction?: LayoutDirection;
    timestamp: number;
  };
}

/**
 * MyGraphCanvas - Modern React Flow implementation
 *
 * Provides a clean, maintainable graph visualization using React Flow
 * with automatic layout algorithms and AI integration capabilities
 */
const MyGraphCanvas: React.FC<MyGraphCanvasProps> = ({
  width = 800,
  height = 600,
  onNodeClick,
  onEdgeClick,
  layoutTrigger,
}) => {
  const theme = useTheme();
  const [currentLayout] = useState<LayoutAlgorithm>('dagre');
  const [layoutDirection] = useState<LayoutDirection>('TB');
  
  // Ref to prevent infinite loops during layout updates
  const isUpdatingLayout = useRef(false);

  const {
    nodes: storeNodes,
    edges: storeEdges,
    createNode,
    createEdge,
    updateNode,
    deleteNode,
    selectNode,
    deleteEdge
  } = useEnhancedGraphStore();

  // Stable callback functions to prevent re-renders
  const handleNodeSelect = useCallback((nodeId: string, node: EnhancedGraphNode) => {
    console.log('Node selected:', nodeId, node.label);
    selectNode(nodeId);
    onNodeClick?.(node);
  }, [selectNode, onNodeClick]);

  const handleNodeEdit = useCallback((nodeId: string) => {
    console.log('Edit node via NodeEditorPanel:', nodeId);
  }, []);

  const handleNodeDelete = useCallback((nodeId: string, nodeLabel: string) => {
    if (window.confirm(`Delete "${nodeLabel}"?`)) {
      deleteNode(nodeId);
    }
  }, [deleteNode]);

  // Convert store data to React Flow format - enhanced with callbacks
  const convertToReactFlowNodes = useCallback((graphNodes: Map<string, EnhancedGraphNode>): Node[] => {
    return Array.from(graphNodes.values()).map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        label: node.label,
        content: node.richContent?.markdown || '',
        metadata: node.metadata,
        aiGenerated: node.aiMetadata?.discoverySource?.includes('ai') || false,
        type: node.type,
        // Interaction callbacks for DefaultNode components (if needed by custom node types)
        onEdit: () => handleNodeEdit(node.id),
        onDelete: () => handleNodeDelete(node.id, node.label),
      },
    }));
  }, [handleNodeEdit, handleNodeDelete]);

  const handleEdgeClick = useCallback((edge: EnhancedGraphEdge) => {
    onEdgeClick?.(edge);
  }, [onEdgeClick]);

  const convertToReactFlowEdges = useCallback((graphEdges: Map<string, EnhancedGraphEdge>): Edge[] => {
    return Array.from(graphEdges.values()).map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      data: {
        label: edge.label,
        weight: edge.weight,
        metadata: edge.metadata,
        semantics: edge.semantics,
        visual: edge.visual,
        discovery: edge.discovery,
        onClick: () => handleEdgeClick(edge),
      },
      label: edge.label,
      animated: edge.visual.animated,
      style: {
        stroke: edge.visual.color,
        strokeWidth: Math.max(1, edge.weight * 2),
      },
    }));
  }, [handleEdgeClick]);

  // Initialize React Flow nodes and edges
  const initialNodes = useMemo(() =>
    convertToReactFlowNodes(storeNodes),
    [storeNodes, convertToReactFlowNodes]
  );

  const initialEdges = useMemo(() =>
    convertToReactFlowEdges(storeEdges),
    [storeEdges, convertToReactFlowEdges]
  );

  // React Flow state management
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update React Flow when store changes (with debouncing to prevent loops)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setNodes(convertToReactFlowNodes(storeNodes));
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [storeNodes, convertToReactFlowNodes]); // Re-added convertToReactFlowNodes since it's now stable

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setEdges(convertToReactFlowEdges(storeEdges));
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [storeEdges, convertToReactFlowEdges]); // Re-added convertToReactFlowEdges since it's now stable

  // Handle connection creation
  const onConnect = useCallback((params: Edge | Connection) => {
    const newEdge: Partial<EnhancedGraphEdge> = {
      id: `${params.source}-${params.target}`,
      source: params.source!,
      target: params.target!,
      type: 'semantic',
      label: 'related to',
      weight: 1,
      metadata: {
        created: new Date(),
        modified: new Date(),
        confidence: 1.0,
        aiGenerated: false
      },
      semantics: {
        strength: 1.0,
        bidirectional: false,
        context: 'User-created connection',
        keywords: []
      },
      visual: {
        curvature: 0.1,
        opacity: 0.7,
        animated: false,
        color: '#aaaaaa'
      },
      discovery: {
        discoveredBy: 'user',
        confidence: 1.0,
        reasoning: 'User-created connection'
      }
    };

    createEdge(newEdge);
    setEdges((eds) => addEdge(params, eds));
  }, [createEdge, setEdges]);

  // Handle node changes
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);

    // Only sync position changes back to store if not updating layout
    if (!isUpdatingLayout.current) {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateNode(change.id, { position: change.position });
        }
      });
    }
  }, [onNodesChange, updateNode]);

  // Handle edge changes
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);

    // Handle edge deletions
    changes.forEach((change) => {
      if (change.type === 'remove') {
        deleteEdge(change.id);
      }
    });
  }, [onEdgesChange, deleteEdge]);

  // Apply layout algorithm
  const applyLayout = useCallback(async (algorithm: LayoutAlgorithm, direction?: LayoutDirection) => {
    try {
      isUpdatingLayout.current = true; // Prevent store sync during layout
      
      const layoutConfig = {
        ...defaultLayoutConfig,
        direction: direction || layoutDirection,
      };

      let layoutedElements;

      switch (algorithm) {
        case 'circular':
          layoutedElements = getCircularLayout(nodes, edges, width / 2, height / 2);
          break;
        case 'grid':
          layoutedElements = getGridLayout(nodes, edges, 4, 250);
          break;
        case 'radial':
          layoutedElements = getRadialLayout(nodes, edges, width / 2, height / 2);
          break;
        case 'tree':
          layoutedElements = getTreeLayout(nodes, edges);
          break;
        case 'force':
          layoutedElements = await getForceLayout(nodes, edges, width, height);
          break;
        case 'dagre':
        default:
          layoutedElements = getLayoutedElements(nodes, edges, layoutConfig);
          break;
      }

      setNodes(layoutedElements.nodes);
      setEdges(layoutedElements.edges);

      // Reset flag after a delay to allow React Flow to settle
      setTimeout(() => {
        isUpdatingLayout.current = false;
      }, 100);
    } catch (error) {
      console.error('Layout application failed:', error);
      isUpdatingLayout.current = false;
    }
  }, [nodes, edges, width, height, layoutDirection]);

  // Respond to external layout trigger changes
  useEffect(() => {
    if (layoutTrigger) {
      applyLayout(layoutTrigger.algorithm, layoutTrigger.direction);
    }
  }, [layoutTrigger, applyLayout]);



  // Create new node on canvas click (with shift key)
  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    // Only create new nodes when shift key is pressed
    if (!event.shiftKey) return;

    const bounds = (event.target as HTMLElement).getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    const newNode: Partial<EnhancedGraphNode> = {
      label: 'New Node',
      type: 'concept',
      position: { x, y },
      richContent: { markdown: '', keyTerms: [], relatedConcepts: [], sources: [], attachments: [] },
      aiMetadata: { confidenceScore: 0, lastProcessed: new Date(), agentHistory: [], suggestions: [], flags: { needsReview: false, needsUpdate: false, isStale: false, hasErrors: false } },
      position3D: { x: 0, y: 0, z: 0 },
      similarities: new Map(),
      metadata: { created: new Date(), modified: new Date(), tags: [] }
    };

    createNode(newNode);
  }, [createNode]);

  // Handle node clicks
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Prevent default to avoid conflicts with selection
    event.preventDefault();
    event.stopPropagation();
    
    console.log('React Flow node clicked:', node.id);
    
    // Find the corresponding enhanced node from store and call our selection handler
    const storeNodes = useEnhancedGraphStore.getState().nodes;
    const enhancedNode = storeNodes.get(node.id);
    if (enhancedNode) {
      handleNodeSelect(node.id, enhancedNode);
    }
  }, [handleNodeSelect]);

  // Handle React Flow selection changes - DISABLED to fix node selection bug
  // const handleSelectionChange = useCallback((params: OnSelectionChangeParams) => {
  //   // Get current selected nodes from store
  //   const currentSelected = useEnhancedGraphStore.getState().selectedNodes;
  //   const newSelectedNodeIds = new Set(params.nodes.map(n => n.id));

  //   // Update store selection to match React Flow
  //   newSelectedNodeIds.forEach(nodeId => {
  //     if (!currentSelected.has(nodeId)) {
  //       selectNode(nodeId);
  //     }
  //   });

  //   // Remove nodes that are no longer selected
  //   currentSelected.forEach(nodeId => {
  //     if (!newSelectedNodeIds.has(nodeId)) {
  //       deselectNode(nodeId);
  //     }
  //   });
  // }, [selectNode, deselectNode]);

  // Apply initial layout
  useEffect(() => {
    if (nodes.length > 0 && nodes.length <= 3) { // Only auto-layout for small graphs
      applyLayout(currentLayout);
    }
  }, [nodes.length, currentLayout]); // Removed applyLayout dependency to prevent re-layouts

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onPaneClick={handlePaneClick}
        onNodeClick={handleNodeClick}
        // onSelectionChange={handleSelectionChange} // DISABLED - using onNodeClick instead
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{
          padding: 0.1, // 10% padding around the graph
          minZoom: 0.1,
          maxZoom: 2,
          includeHiddenNodes: false
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        attributionPosition="bottom-left"
        style={{
          background: theme.palette.background.default,
        }}
      >
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'concept': return theme.palette.primary.main;
              case 'source': return theme.palette.secondary.main;
              case 'idea': return theme.palette.success.main;
              default: return theme.palette.grey[500];
            }
          }}
          style={{
            backgroundColor: theme.palette.background.paper,
          }}
        />
        <Controls
          style={{
            backgroundColor: theme.palette.background.paper,
          }}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={12}
          size={1}
          color={theme.palette.divider}
        />

        {/* Graph Stats Panel */}
        <Panel position="top-left">
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={`${nodes.length} nodes`}
              size="small"
              sx={{ bgcolor: 'background.paper' }}
            />
            <Chip
              label={`${edges.length} edges`}
              size="small"
              sx={{ bgcolor: 'background.paper' }}
            />
          </Box>
        </Panel>
      </ReactFlow>
    </Box>
  );
};

export default MyGraphCanvas;