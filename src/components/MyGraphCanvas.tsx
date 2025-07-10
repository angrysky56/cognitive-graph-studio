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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Tooltip,
  Chip,
  Typography,
  Card,
  CardContent,
  ButtonGroup,
  Divider,
  Button,
} from '@mui/material';
import {
  AccountTree,
  Refresh,
  ViewModule,
  Hub,
  GridView,
  ScatterPlot,
  AccountBalance,
} from '@mui/icons-material';

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

// Custom edge types
import SemanticEdge from './edges/SemanticEdge';
import HierarchicalEdge from './edges/HierarchicalEdge';

/**
 * Node type registry for React Flow
 */
const nodeTypes = {
  concept: ConceptNode,
  source: SourceNode,
  idea: IdeaNode,
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
}) => {
  const theme = useTheme();
  const [currentLayout, setCurrentLayout] = useState<LayoutAlgorithm>('dagre');
  const [layoutDirection] = useState<LayoutDirection>('TB');

  const { nodes: storeNodes, edges: storeEdges, selectedNodes, createNode, createEdge, updateNode, deleteNode, selectNode, deselectNode, deleteEdge } = useEnhancedGraphStore();

  // Convert store data to React Flow format
  const convertToReactFlowNodes = useCallback((graphNodes: Map<string, EnhancedGraphNode>): Node[] => {
    return Array.from(graphNodes.values()).map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        label: node.label,
        content: node.richContent.markdown, // Use richContent.markdown
        metadata: node.metadata,
        aiGenerated: node.aiGenerated,
        selected: selectedNodes.has(node.id),
        onSelect: () => selectNode(node.id),
        onDeselect: () => deselectNode(node.id),
        onUpdate: (updates: Partial<EnhancedGraphNode>) => updateNode(node.id, updates),
        onDelete: () => deleteNode(node.id),
        onClick: () => onNodeClick?.(node),
      },
      selected: selectedNodes.has(node.id),
    }));
  }, [selectedNodes, selectNode, deselectNode, updateNode, deleteNode, onNodeClick]);

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
        onClick: () => onEdgeClick?.(edge),
      },
      label: edge.label,
      animated: edge.visual.animated, // Use visual.animated
      style: {
        stroke: edge.visual.color, // Use visual.color
        strokeWidth: Math.max(1, edge.weight * 2),
      },
    }));
  }, [theme.palette.primary.main, onEdgeClick]);

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

  // Update React Flow when store changes
  useEffect(() => {
    setNodes(convertToReactFlowNodes(storeNodes));
  }, [storeNodes, convertToReactFlowNodes, setNodes]);

  useEffect(() => {
    setEdges(convertToReactFlowEdges(storeEdges));
  }, [storeEdges, convertToReactFlowEdges, setEdges]);

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
    
    // Sync position changes back to store
    changes.forEach((change) => {
      if (change.type === 'position' && change.position) {
        updateNode(change.id, { position: change.position });
      }
    });
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
    
    // Update store with new positions
    layoutedElements.nodes.forEach((node) => {
      updateNode(node.id, { position: node.position });
    });
  }, [nodes, edges, width, height, layoutDirection, setNodes, setEdges, updateNode]);

  

  const handleLayoutChange = async (layout: LayoutAlgorithm) => {
    setCurrentLayout(layout);
    await applyLayout(layout);
  };

  // Create new node on canvas click
  const handlePaneClick = useCallback((event: React.MouseEvent) => {
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
      connections: [],
      aiGenerated: false,
      metadata: { created: new Date(), modified: new Date(), tags: [] }
    };

    createNode(newNode);
  }, [createNode]);

  // Apply initial layout
  useEffect(() => {
    if (nodes.length > 0) {
      applyLayout(currentLayout);
    }
  }, [nodes.length, applyLayout, currentLayout]);

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
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
        
        {/* Layout Controls Panel */}
        <Panel position="top-right">
          <Card sx={{ p: 1, minWidth: 200 }}>
            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Graph Layout
              </Typography>
              
              <ButtonGroup orientation="vertical" size="small" fullWidth>
                <Button
                  variant={currentLayout === 'dagre' ? 'contained' : 'outlined'}
                  startIcon={<AccountTree />}
                  onClick={() => handleLayoutChange('dagre')}
                  size="small"
                >
                  Hierarchical
                </Button>
                <Button
                  variant={currentLayout === 'circular' ? 'contained' : 'outlined'}
                  startIcon={<Hub />}
                  onClick={() => handleLayoutChange('circular')}
                  size="small"
                >
                  Circular
                </Button>
                <Button
                  variant={currentLayout === 'grid' ? 'contained' : 'outlined'}
                  startIcon={<GridView />}
                  onClick={() => handleLayoutChange('grid')}
                  size="small"
                >
                  Grid
                </Button>
                <Button
                  variant={currentLayout === 'radial' ? 'contained' : 'outlined'}
                  startIcon={<ScatterPlot />}
                  onClick={() => handleLayoutChange('radial')}
                  size="small"
                >
                  Radial
                </Button>
                <Button
                  variant={currentLayout === 'tree' ? 'contained' : 'outlined'}
                  startIcon={<AccountBalance />}
                  onClick={() => handleLayoutChange('tree')}
                  size="small"
                >
                  Tree
                </Button>
                <Button
                  variant={currentLayout === 'force' ? 'contained' : 'outlined'}
                  startIcon={<ViewModule />}
                  onClick={() => handleLayoutChange('force')}
                  size="small"
                >
                  Force
                </Button>
              </ButtonGroup>
              
              <Divider sx={{ my: 1 }} />
              
              <Tooltip title="Refresh Layout">
                <Button
                  onClick={() => applyLayout(currentLayout)}
                  size="small"
                  fullWidth
                  startIcon={<Refresh />}
                  sx={{ 
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1
                  }}
                >
                  <Typography variant="caption">
                    Refresh
                  </Typography>
                </Button>
              </Tooltip>
            </CardContent>
          </Card>
        </Panel>

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
