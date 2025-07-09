/**
 * Fixed Graph Canvas Component for Cognitive Graph Studio
 * Resolves: zoom behavior, canvas interactions, force simulation stability
 * 
 * @fileoverview Enhanced D3.js graph visualization with proper event handling,
 * stable force simulation, and robust user interactions
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { Box, IconButton, Tooltip, Fab, ToggleButtonGroup, ToggleButton, Typography } from '@mui/material'
import { 
  Add, ZoomIn, ZoomOut, CenterFocusStrong, AccountTree, 
  ScatterPlot, FormatAlignJustify, Hub, Psychology, Edit
} from '@mui/icons-material'
import * as d3 from 'd3'
import useGraphStore from '@/stores/graphStore'
import { GraphNode, GraphEdge } from '@/types/graph'
import { graphColors } from '@/utils/theme'
import { createSemanticClusters, calculateOptimalClusterPositions, suggestSemanticConnections, type SemanticCluster } from '@/utils/semanticAnalysis'
import ConnectionSuggestions from './ConnectionSuggestions'
import NodeEditor from './NodeEditor'
import GraphStatusBar from './GraphStatusBar'

interface GraphCanvasProps {
  width?: number
  height?: number
}

type LayoutType = 'force' | 'hierarchical' | 'circular' | 'cluster'

/**
 * Interface for D3.js simulation node data
 */
interface SimulationNode extends GraphNode {
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

/**
 * Interface for D3.js simulation link data
 */
interface SimulationLink extends GraphEdge {
  source: SimulationNode
  target: SimulationNode
}

/**
 * Fixed and enhanced graph canvas component with proper D3.js interactions
 */
const GraphCanvasFixed: React.FC<GraphCanvasProps> = ({ 
  width = 800, 
  height = 600 
}) => {
  // Refs for D3.js integration
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null)
  
  // Component state
  const [dimensions, setDimensions] = useState({ width, height })
  const [layoutType, setLayoutType] = useState<LayoutType>('force')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showNodeEditor, setShowNodeEditor] = useState(false)
  const [isSimulationRunning, setIsSimulationRunning] = useState(false)
  
  // Graph store state
  const {
    nodes,
    edges,
    selectedNodes,
    addNode,
    selectNode,
    deselectNode,
    clearSelection,
    setHoveredNode,
    setViewport
  } = useGraphStore()

  // Convert Map to Array for D3.js with proper typing
  const nodeArray = useMemo((): SimulationNode[] => 
    Array.from(nodes.values()).map(node => ({
      ...node,
      x: node.position?.x || Math.random() * dimensions.width,
      y: node.position?.y || Math.random() * dimensions.height
    })), [nodes, dimensions])

  const edgeArray = useMemo((): GraphEdge[] => 
    Array.from(edges.values()), [edges])

  // Enhanced semantic clustering with memoization
  const semanticClusters = useMemo((): SemanticCluster[] => {
    if (nodeArray.length < 2) return []
    return createSemanticClusters(nodeArray, 0.3, 8)
  }, [nodeArray])

  // Optimized cluster positions
  const clusterPositions = useMemo(() => {
    return calculateOptimalClusterPositions(semanticClusters, dimensions.width, dimensions.height)
  }, [semanticClusters, dimensions])

  // AI-powered connection suggestions
  const connectionSuggestions = useMemo(() => {
    const existingEdges = new Set(edgeArray.map(e => `${e.source}-${e.target}`))
    return suggestSemanticConnections(nodeArray, existingEdges, 0.4, 5)
  }, [nodeArray, edgeArray])

  /**
   * Creates an optimized D3.js force simulation based on layout type
   */
  const createStableSimulation = useCallback((
    nodes: SimulationNode[], 
    edges: GraphEdge[], 
    layout: LayoutType
  ): d3.Simulation<SimulationNode, SimulationLink> => {
    
    // Convert edges to simulation links with proper node references
    const links: SimulationLink[] = edges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)
      
      if (!sourceNode || !targetNode) {
        console.warn(`Invalid edge: ${edge.id}`, edge)
        return null
      }
      
      return {
        ...edge,
        source: sourceNode,
        target: targetNode
      }
    }).filter(Boolean) as SimulationLink[]

    const simulation = d3.forceSimulation(nodes)

    // Configure forces based on layout type with optimized parameters
    switch (layout) {
      case 'hierarchical':
        simulation
          .force('link', d3.forceLink<SimulationNode, SimulationLink>(links)
            .id(d => d.id)
            .distance(120)
            .strength(0.7)
          )
          .force('charge', d3.forceManyBody()
            .strength(-800)
            .distanceMax(300)
          )
          .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
          .force('collision', d3.forceCollide().radius(50))
          .force('y', d3.forceY().strength(0.2))
        break

      case 'circular':
        simulation
          .force('link', d3.forceLink<SimulationNode, SimulationLink>(links)
            .id(d => d.id)
            .distance(100)
            .strength(0.5)
          )
          .force('charge', d3.forceManyBody()
            .strength(-400)
            .distanceMax(200)
          )
          .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
          .force('collision', d3.forceCollide().radius(40))
          .force('radial', d3.forceRadial(
            Math.min(dimensions.width, dimensions.height) / 3, 
            dimensions.width / 2, 
            dimensions.height / 2
          ).strength(0.4))
        break

      case 'cluster':
        simulation
          .force('link', d3.forceLink<SimulationNode, SimulationLink>(links)
            .id(d => d.id)
            .distance(80)
            .strength(0.4)
          )
          .force('charge', d3.forceManyBody()
            .strength(-300)
            .distanceMax(150)
          )
          .force('collision', d3.forceCollide().radius(35))
          .force('cluster', () => {
            nodes.forEach(node => {
              const cluster = semanticClusters.find(c => c.nodes.some(n => n.id === node.id))
              if (cluster) {
                const clusterCenter = clusterPositions.get(cluster.id)
                if (clusterCenter && node.x !== undefined && node.y !== undefined) {
                  const alpha = simulation.alpha()
                  node.vx = (node.vx || 0) + (clusterCenter.x - node.x) * alpha * 0.1
                  node.vy = (node.vy || 0) + (clusterCenter.y - node.y) * alpha * 0.1
                }
              }
            })
          })
        break

      default: // force layout with optimized parameters
        simulation
          .force('link', d3.forceLink<SimulationNode, SimulationLink>(links)
            .id(d => d.id)
            .distance(100)
            .strength(0.4)
          )
          .force('charge', d3.forceManyBody()
            .strength(-500)
            .distanceMax(400)
          )
          .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
          .force('collision', d3.forceCollide().radius(40))
        break
    }

    // Optimize simulation performance
    simulation
      .alpha(0.3) // Lower initial energy for stability
      .alphaDecay(0.02) // Slower decay for smoother convergence
      .velocityDecay(0.8) // Higher friction for stability

    return simulation
  }, [dimensions, semanticClusters, clusterPositions])

  /**
   * Handles canvas click events for node creation
   */
  const handleCanvasClick = useCallback((event: MouseEvent) => {
    if (!svgRef.current) return
    
    // Get the actual SVG element that was clicked
    const target = event.target as Element
    
    // Only create node if clicking on the main SVG background, not on any child elements
    if (target === svgRef.current || target.tagName === 'rect' && target.classList.contains('background')) {
      const svg = d3.select(svgRef.current)
      const transform = d3.zoomTransform(svgRef.current)
      
      // Calculate real coordinates accounting for zoom and pan
      const rect = svgRef.current.getBoundingClientRect()
      const x = (event.clientX - rect.left - transform.x) / transform.k
      const y = (event.clientY - rect.top - transform.y) / transform.k
      
      createNewNode(x, y)
    }
  }, [])

  /**
   * Creates a new node at the specified coordinates
   */
  const createNewNode = useCallback((x: number, y: number) => {
    const newNode: GraphNode = {
      id: crypto.randomUUID(),
      label: 'New Node',
      content: 'Click to edit this node...',
      type: 'concept',
      position: { x, y },
      metadata: {
        created: new Date(),
        modified: new Date(),
        tags: [],
        color: graphColors.nodes.concept
      },
      connections: [],
      aiGenerated: false
    }
    
    addNode(newNode)
    // Auto-select and open editor for new nodes
    selectNode(newNode.id)
    setShowNodeEditor(true)
  }, [addNode, selectNode])

  /**
   * Node styling functions
   */
  const getNodeRadius = useCallback((node: GraphNode): number => {
    const baseSize = 20
    const connectionBonus = Math.min(node.connections.length * 3, 15)
    const contentBonus = Math.min((node.content?.length || 0) / 20, 10)
    return Math.min(baseSize + connectionBonus + contentBonus, 45)
  }, [])

  const getNodeColor = useCallback((node: GraphNode): string => {
    if (selectedNodes.has(node.id)) {
      return '#4da6ff'
    }
    
    // Color by cluster membership
    const clusterColors = d3.schemeCategory10
    for (let i = 0; i < semanticClusters.length; i++) {
      if (semanticClusters[i].nodes.some(n => n.id === node.id)) {
        return clusterColors[i % clusterColors.length]
      }
    }
    
    return graphColors.nodes[node.type] || graphColors.nodes.concept
  }, [selectedNodes, semanticClusters])

  /**
   * Zoom control handlers
   */
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(300).call(
      zoomBehaviorRef.current.scaleBy, 1.5
    )
  }, [])

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(300).call(
      zoomBehaviorRef.current.scaleBy, 1 / 1.5
    )
  }, [])

  const handleZoomReset = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(500).call(
      zoomBehaviorRef.current.transform,
      d3.zoomIdentity
    )
  }, [])

  /**
   * Layout change handler
   */
  const handleLayoutChange = useCallback((newLayout: LayoutType) => {
    setLayoutType(newLayout)
    if (simulationRef.current) {
      simulationRef.current.alpha(0.5).restart()
    }
  }, [])

  /**
   * Main D3.js rendering effect
   */
  useEffect(() => {
    if (!svgRef.current || nodeArray.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Add background rectangle for click detection
    svg.append('rect')
      .attr('class', 'background')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')

    // Setup zoom behavior with proper event handling
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        const { transform } = event
        mainGroup.attr('transform', transform.toString())
        setViewport({
          x: transform.x,
          y: transform.y,
          zoom: transform.k
        })
      })
      .on('start', () => {
        svg.style('cursor', 'grabbing')
      })
      .on('end', () => {
        svg.style('cursor', 'grab')
      })

    zoomBehaviorRef.current = zoomBehavior
    svg.call(zoomBehavior)

    // Prevent context menu on right click
    svg.on('contextmenu', (event) => {
      event.preventDefault()
    })

    // Main group for all graph elements
    const mainGroup = svg.append('g').attr('class', 'main-group')

    // Create and configure simulation
    const simulation = createStableSimulation(nodeArray, edgeArray, layoutType)
    simulationRef.current = simulation

    // Track simulation state
    simulation.on('tick', () => setIsSimulationRunning(simulation.alpha() > 0.005))

    // Render cluster hulls (for cluster layout)
    if (layoutType === 'cluster' && semanticClusters.length > 0) {
      const clusterGroup = mainGroup.append('g').attr('class', 'clusters')
      
      semanticClusters.forEach((cluster, index) => {
        if (cluster.nodes.length < 2) return
        
        const clusterNodes = cluster.nodes.filter(n => n.x !== undefined && n.y !== undefined)
        if (clusterNodes.length < 2) return
        
        const hull = d3.polygonHull(clusterNodes.map(d => [d.x!, d.y!]))
        if (!hull) return

        clusterGroup.append('path')
          .datum(hull)
          .attr('class', 'cluster-hull')
          .attr('d', d3.line().curve(d3.curveCardinalClosed.tension(0.85)))
          .style('fill', d3.schemeCategory10[index % d3.schemeCategory10.length])
          .style('fill-opacity', 0.1)
          .style('stroke', d3.schemeCategory10[index % d3.schemeCategory10.length])
          .style('stroke-opacity', 0.3)
          .style('stroke-width', 2)
      })
    }

    // Create arrow markers for directed edges
    const defs = svg.append('defs')
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#666')
      .style('stroke', 'none')

    // Render links with proper typing
    const links = simulation.force('link') as d3.ForceLink<SimulationNode, SimulationLink>
    const linkSelection = mainGroup.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links.links())
      .join('line')
      .attr('stroke', d => graphColors.edges[d.type] || graphColors.edges.semantic)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.weight || 1) * 2)
      .attr('marker-end', 'url(#arrowhead)')

    // Render nodes with enhanced interactions
    const nodeSelection = mainGroup.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodeArray)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')

    // Node circles with enhanced styling
    const circles = nodeSelection.append('circle')
      .attr('r', getNodeRadius)
      .attr('fill', getNodeColor)
      .attr('stroke', '#fff')
      .attr('stroke-width', d => selectedNodes.has(d.id) ? 3 : 1.5)
      .style('filter', 'drop-shadow(0 0 6px rgba(77, 166, 255, 0.4))')

    // Node labels with proper positioning
    nodeSelection.append('text')
      .text(d => d.label.length > 15 ? d.label.substring(0, 15) + '...' : d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('fill', '#e0e0e0')
      .attr('pointer-events', 'none')
      .style('user-select', 'none')

    // Enhanced drag behavior with visual feedback
    const dragBehavior = d3.drag<SVGGElement, SimulationNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
        
        // Visual feedback
        d3.select(event.sourceEvent.currentTarget)
          .select('circle')
          .attr('stroke-width', 4)
          .attr('r', getNodeRadius(d) + 3)
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
        
        // Remove visual feedback
        d3.select(event.sourceEvent.currentTarget)
          .select('circle')
          .attr('stroke-width', selectedNodes.has(d.id) ? 3 : 1.5)
          .attr('r', getNodeRadius(d))
      })

    nodeSelection.call(dragBehavior)

    // Enhanced click handling with proper event management
    nodeSelection.on('click', (event, d) => {
      event.stopPropagation()
      
      if (event.shiftKey || event.ctrlKey) {
        // Multi-select
        if (selectedNodes.has(d.id)) {
          deselectNode(d.id)
        } else {
          selectNode(d.id)
        }
      } else {
        // Single select
        clearSelection()
        selectNode(d.id)
      }
      
      // Update visual state
      circles.attr('stroke-width', node => selectedNodes.has(node.id) ? 3 : 1.5)
    })

    // Double-click to edit
    nodeSelection.on('dblclick', (event, d) => {
      event.stopPropagation()
      selectNode(d.id)
      setShowNodeEditor(true)
    })

    // Enhanced hover effects with connection highlighting
    nodeSelection
      .on('mouseenter', (event, d) => {
        setHoveredNode(d.id)
        
        // Highlight connected nodes and edges
        const connectedIds = new Set<string>()
        links.links().forEach(link => {
          if (link.source.id === d.id) connectedIds.add(link.target.id)
          if (link.target.id === d.id) connectedIds.add(link.source.id)
        })
        
        circles.attr('opacity', node => 
          connectedIds.has(node.id) || node.id === d.id ? 1 : 0.3
        )
        
        linkSelection.attr('opacity', link =>
          link.source.id === d.id || link.target.id === d.id ? 0.8 : 0.1
        )
        
        // Scale up hovered node
        d3.select(event.currentTarget)
          .select('circle')
          .transition()
          .duration(200)
          .attr('r', getNodeRadius(d) + 5)
      })
      .on('mouseleave', () => {
        setHoveredNode(null)
        
        // Reset all visual states
        circles
          .attr('opacity', 1)
          .transition()
          .duration(200)
          .attr('r', getNodeRadius)
          
        linkSelection.attr('opacity', 0.6)
      })

    // Update positions on simulation tick
    simulation.on('tick', () => {
      linkSelection
        .attr('x1', d => d.source.x || 0)
        .attr('y1', d => d.source.y || 0)
        .attr('x2', d => d.target.x || 0)
        .attr('y2', d => d.target.y || 0)

      nodeSelection.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`)
    })

    // Canvas click handler for node creation
    const handleClick = (event: MouseEvent) => handleCanvasClick(event)
    svgRef.current.addEventListener('click', handleClick)

    return () => {
      simulation.stop()
      if (svgRef.current) {
        svgRef.current.removeEventListener('click', handleClick)
      }
    }
  }, [
    nodeArray, 
    edgeArray, 
    dimensions, 
    selectedNodes, 
    layoutType, 
    semanticClusters, 
    createStableSimulation,
    getNodeRadius,
    getNodeColor,
    handleCanvasClick,
    selectNode,
    deselectNode,
    clearSelection,
    setHoveredNode,
    setViewport
  ])

  /**
   * Handle container resize
   */
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }

    const resizeObserver = new ResizeObserver(handleResize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [])

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%',
        overflow: 'hidden',
        bgcolor: 'background.paper'
      }}
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ 
          background: 'radial-gradient(ellipse at center, #1e1e2e 0%, #0a0a0f 100%)',
          cursor: 'grab'
        }}
      />
      
      {/* Layout Controls */}
      <Box sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        bgcolor: 'surface.level2',
        borderRadius: 1,
        p: 1,
        boxShadow: 2
      }}>
        <ToggleButtonGroup
          value={layoutType}
          exclusive
          onChange={(_, value) => value && handleLayoutChange(value)}
          size="small"
        >
          <ToggleButton value="force" aria-label="force layout">
            <Tooltip title="Force-Directed Layout">
              <ScatterPlot />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="hierarchical" aria-label="hierarchical layout">
            <Tooltip title="Hierarchical Layout">
              <AccountTree />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="circular" aria-label="circular layout">
            <Tooltip title="Circular Layout">
              <Hub />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="cluster" aria-label="cluster layout">
            <Tooltip title="Semantic Clustering">
              <FormatAlignJustify />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Zoom Controls */}
      <Box sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}>
        <Tooltip title="Zoom In">
          <IconButton 
            onClick={handleZoomIn}
            sx={{ 
              bgcolor: 'surface.level2',
              boxShadow: 1,
              '&:hover': { bgcolor: 'surface.level3' }
            }}
          >
            <ZoomIn />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Zoom Out">
          <IconButton 
            onClick={handleZoomOut}
            sx={{ 
              bgcolor: 'surface.level2',
              boxShadow: 1,
              '&:hover': { bgcolor: 'surface.level3' }
            }}
          >
            <ZoomOut />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Reset View">
          <IconButton 
            onClick={handleZoomReset}
            sx={{ 
              bgcolor: 'surface.level2',
              boxShadow: 1,
              '&:hover': { bgcolor: 'surface.level3' }
            }}
          >
            <CenterFocusStrong />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="AI Connection Suggestions">
          <IconButton 
            onClick={() => setShowSuggestions(!showSuggestions)}
            sx={{ 
              bgcolor: showSuggestions ? 'primary.main' : 'surface.level2',
              color: showSuggestions ? 'primary.contrastText' : 'inherit',
              boxShadow: 1,
              '&:hover': { 
                bgcolor: showSuggestions ? 'primary.dark' : 'surface.level3' 
              }
            }}
          >
            <Psychology />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Simulation Status */}
      {isSimulationRunning && (
        <Box sx={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          px: 2,
          py: 0.5,
          borderRadius: 1,
          typography: 'caption'
        }}>
          Simulation Running...
        </Box>
      )}

      {/* Graph Stats */}
      <Box sx={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        bgcolor: 'surface.level2',
        borderRadius: 1,
        p: 1,
        boxShadow: 1
      }}>
        <Typography variant="caption" color="text.secondary">
          Nodes: {nodeArray.length} | Edges: {edgeArray.length}
          {layoutType === 'cluster' && ` | Clusters: ${semanticClusters.length}`}
        </Typography>
      </Box>

      {/* Add Node FAB */}
      <Fab
        color="primary"
        aria-label="add node"
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          boxShadow: 3
        }}
        onClick={() => createNewNode(dimensions.width / 2, dimensions.height / 2)}
      >
        <Add />
      </Fab>

      {/* Connection Suggestions Panel */}
      <ConnectionSuggestions
        suggestions={connectionSuggestions}
        visible={showSuggestions}
        onClose={() => setShowSuggestions(false)}
      />

      {/* Node Editor Modal */}
      <NodeEditor
        visible={showNodeEditor}
        onClose={() => setShowNodeEditor(false)}
      />

      {/* Status Bar */}
      <GraphStatusBar
        clusterCount={semanticClusters.length}
        layoutType={layoutType}
      />
    </Box>
  )
}

export default GraphCanvasFixed