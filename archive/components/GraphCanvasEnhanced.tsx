/**
 * Enhanced Graph Canvas Component with Semantic Clustering
 * Fixes: mouse wheel zoom, semantic clustering, content-based organization
 */

import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Box, IconButton, Tooltip, Fab, ToggleButtonGroup, ToggleButton, Typography } from '@mui/material'
import { 
  Add, ZoomIn, ZoomOut, CenterFocusStrong, AccountTree, 
  ScatterPlot, FormatAlignJustify, Hub, Psychology
} from '@mui/icons-material'
import * as d3 from 'd3'
import useGraphStore from '@/stores/graphStore'
import { GraphNode } from '@/types/graph'
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

const GraphCanvasEnhanced: React.FC<GraphCanvasProps> = ({ 
  width = 800, 
  height = 600 
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width, height })
  const [layoutType, setLayoutType] = useState<LayoutType>('force')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showNodeEditor, setShowNodeEditor] = useState(false)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, undefined> | null>(null)
  
  const {
    nodes,
    edges,
    selectedNodes,
    addNode,
    selectNode,
    deselectNode,
    setHoveredNode,
    setViewport
  } = useGraphStore()

  // Convert Map to Array for D3
  const nodeArray = Array.from(nodes.values())
  const edgeArray = Array.from(edges.values())

  // Enhanced semantic clustering using content similarity
  const semanticClusters = useMemo(() => {
    if (nodeArray.length < 2) return []
    return createSemanticClusters(nodeArray, 0.3, 8)
  }, [nodeArray])

  // Calculate optimal cluster positions
  const clusterPositions = useMemo(() => {
    return calculateOptimalClusterPositions(semanticClusters, dimensions.width, dimensions.height)
  }, [semanticClusters, dimensions])

  // Suggest semantic connections
  const connectionSuggestions = useMemo(() => {
    const existingEdges = new Set(edgeArray.map(e => `${e.source}-${e.target}`))
    return suggestSemanticConnections(nodeArray, existingEdges, 0.4, 5)
  }, [nodeArray, edgeArray])

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Setup zoom behavior with mouse wheel support
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        const { transform } = event
        g.attr('transform', transform)
        setViewport({
          x: transform.x,
          y: transform.y,
          zoom: transform.k
        })
      })

    zoomRef.current = zoom
    svg.call(zoom)

    // Enable mouse wheel zoom
    svg.on('wheel', (event) => {
      event.preventDefault()
      const zoomDirection = event.deltaY > 0 ? 0.9 : 1.1
      svg.transition().duration(100).call(
        zoom.scaleBy as any, zoomDirection
      )
    })

    // Main group for all graph elements
    const g = svg.append('g')

    // Create enhanced force simulation based on layout type
    const simulation = createSimulation(nodeArray, edgeArray, layoutType, semanticClusters)
    simulationRef.current = simulation

    // Render clusters first (behind nodes)
    if (layoutType === 'cluster') {
      renderClusters(g, semanticClusters)
    }

    // Create links with enhanced styling
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(edgeArray)
      .join('line')
      .attr('stroke', (d) => graphColors.edges[d.type] || graphColors.edges.semantic)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.sqrt(d.weight) * 2)
      .attr('marker-end', 'url(#arrowhead)')

    // Add arrow markers
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 13)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 13)
      .attr('markerHeight', 13)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#666')
      .style('stroke', 'none')

    // Create nodes with enhanced visuals
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodeArray)
      .join('g')
      .attr('class', 'node')

    // Node circles
    const circles = node.append('circle')
      .attr('r', (d) => getNodeRadius(d))
      .attr('fill', (d) => getNodeColor(d, semanticClusters))
      .attr('stroke', '#fff')
      .attr('stroke-width', (d) => selectedNodes.has(d.id) ? 3 : 1.5)
      .style('cursor', 'pointer')
      .attr('opacity', 0.9)

    // Add glow effect
    circles.style('filter', 'drop-shadow(0 0 6px rgba(77, 166, 255, 0.4))')

    // Node labels with better positioning
    node.append('text')
      .text((d) => truncateLabel(d.label))
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('fill', '#e0e0e0')
      .attr('pointer-events', 'none')
      .style('user-select', 'none')

    // Enhanced drag behavior
    const drag = d3.drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
        // Add visual feedback
        d3.select(event.sourceEvent.currentTarget)
          .select('circle')
          .attr('stroke-width', 4)
          .attr('r', getNodeRadius(d) + 2)
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

    node.call(drag as any)

    // Enhanced click handlers
    node.on('click', (event, d) => {
      event.stopPropagation()
      if (event.shiftKey) {
        // Multi-select with shift
        if (selectedNodes.has(d.id)) {
          deselectNode(d.id)
        } else {
          selectNode(d.id)
        }
      } else {
        // Single select
        if (selectedNodes.has(d.id)) {
          deselectNode(d.id)
        } else {
          selectNode(d.id)
        }
      }
    })

    // Double-click to edit node
    node.on('dblclick', (event, d) => {
      event.stopPropagation()
      selectNode(d.id)
      setShowNodeEditor(true)
    })

    // Enhanced hover effects
    node
      .on('mouseenter', (event, d) => {
        setHoveredNode(d.id)
        
        // Highlight connected nodes
        const connectedNodeIds = new Set([
          ...edgeArray.filter(e => e.source === d.id || e.target === d.id)
                    .map(e => e.source === d.id ? e.target : e.source)
        ])
        
        node.selectAll('circle')
          .attr('opacity', (nodeData: any) => 
            connectedNodeIds.has(nodeData.id) || nodeData.id === d.id ? 1 : 0.3
          )
          
        link.attr('opacity', (linkData: any) =>
          linkData.source.id === d.id || linkData.target.id === d.id ? 0.8 : 0.1
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
        
        // Reset all nodes and links
        node.selectAll('circle')
          .attr('opacity', 0.9)
          .transition()
          .duration(200)
          .attr('r', (d: any) => getNodeRadius(d))
          
        link.attr('opacity', 0.6)
      })

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    // Handle canvas clicks for creating new nodes
    svg.on('click', (event) => {
      if (event.target === svgRef.current) {
        const [x, y] = d3.pointer(event)
        const transform = d3.zoomTransform(svg.node()!)
        const realX = (x - transform.x) / transform.k
        const realY = (y - transform.y) / transform.k
        
        handleCreateNode(realX, realY)
      }
    })

    return () => {
      simulation.stop()
    }
  }, [nodeArray, edgeArray, dimensions, selectedNodes, layoutType, semanticClusters])

  const createSimulation = (
    nodes: GraphNode[], 
    edges: any[], 
    layout: LayoutType,
    clusters: SemanticCluster[]
  ) => {
    const simulation = d3.forceSimulation(nodes)

    switch (layout) {
      case 'hierarchical':
        return simulation
          .force('link', d3.forceLink(edges)
            .id((d: any) => d.id)
            .distance(100)
            .strength(0.8)
          )
          .force('charge', d3.forceManyBody().strength(-800))
          .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
          .force('collision', d3.forceCollide().radius(40))
          .force('y', d3.forceY().strength(0.1))

      case 'circular':
        return simulation
          .force('link', d3.forceLink(edges)
            .id((d: any) => d.id)
            .distance(80)
          )
          .force('charge', d3.forceManyBody().strength(-300))
          .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
          .force('collision', d3.forceCollide().radius(35))
          .force('radial', d3.forceRadial(Math.min(dimensions.width, dimensions.height) / 3, 
                                       dimensions.width / 2, dimensions.height / 2).strength(0.3))

      case 'cluster':
        // Enhanced clustering with semantic grouping using pre-calculated positions
        return simulation
          .force('link', d3.forceLink(edges)
            .id((d: any) => d.id)
            .distance(60)
            .strength(0.5)
          )
          .force('charge', d3.forceManyBody().strength(-200))
          .force('collision', d3.forceCollide().radius(30))
          .force('cluster', () => {
            nodes.forEach(node => {
              // Find which cluster this node belongs to
              const cluster = clusters.find(c => c.nodes.some(n => n.id === node.id))
              if (cluster) {
                const clusterCenter = clusterPositions.get(cluster.id)
                if (clusterCenter) {
                  node.vx = (node.vx || 0) + (clusterCenter.x - (node.x || 0)) * 0.1
                  node.vy = (node.vy || 0) + (clusterCenter.y - (node.y || 0)) * 0.1
                }
              }
            })
          })

      default: // force
        return simulation
          .force('link', d3.forceLink(edges)
            .id((d: any) => d.id)
            .distance(100)
            .strength(0.3)
          )
          .force('charge', d3.forceManyBody().strength(-400))
          .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
          .force('collision', d3.forceCollide().radius(35))
    }
  }

  const renderClusters = (g: d3.Selection<SVGGElement, unknown, null, undefined>, clusters: SemanticCluster[]) => {
    const clusterColors = d3.schemeCategory10
    let colorIndex = 0

    clusters.forEach((cluster) => {
      if (cluster.nodes.length < 2) return

      const hull = d3.polygonHull(cluster.nodes.map(d => [d.x || 0, d.y || 0]))
      if (!hull) return

      g.append('path')
        .datum(hull)
        .attr('class', 'cluster-hull')
        .attr('d', d3.line().curve(d3.curveCardinalClosed.tension(0.85)) as any)
        .style('fill', clusterColors[colorIndex % clusterColors.length])
        .style('fill-opacity', 0.1)
        .style('stroke', clusterColors[colorIndex % clusterColors.length])
        .style('stroke-opacity', 0.3)
        .style('stroke-width', 2)

      colorIndex++
    })
  }

  const getNodeRadius = (node: GraphNode): number => {
    const baseSize = 20
    const connectionBonus = node.connections.length * 2
    const contentBonus = Math.min((node.content?.length || 0) / 10, 10)
    return Math.min(baseSize + connectionBonus + contentBonus, 40)
  }

  const getNodeColor = (node: GraphNode, clusters: SemanticCluster[]): string => {
    if (selectedNodes.has(node.id)) {
      return '#4da6ff'
    }
    
    // Color by cluster
    const clusterColors = d3.schemeCategory10
    let clusterIndex = 0
    for (const cluster of clusters) {
      if (cluster.nodes.some(n => n.id === node.id)) {
        return clusterColors[clusterIndex % clusterColors.length]
      }
      clusterIndex++
    }
    
    return graphColors.nodes[node.type] || graphColors.nodes.concept
  }

  const truncateLabel = (label: string): string => {
    return label.length > 15 ? label.substring(0, 15) + '...' : label
  }

  const handleCreateNode = (x: number, y: number) => {
    const newNode: GraphNode = {
      id: crypto.randomUUID(),
      label: 'New Node',
      content: '',
      type: 'concept',
      position: { x, y },
      metadata: {
        created: new Date(),
        modified: new Date(),
        tags: [],
        color: graphColors.nodes.concept
      },
      connections: [],
      aiGenerated: false,
      x,
      y
    }
    
    addNode(newNode)
  }

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current)
    if (zoomRef.current) {
      svg.transition().call(
        zoomRef.current.scaleBy as any, 1.5
      )
    }
  }

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current)
    if (zoomRef.current) {
      svg.transition().call(
        zoomRef.current.scaleBy as any, 1 / 1.5
      )
    }
  }

  const handleCenter = () => {
    const svg = d3.select(svgRef.current)
    if (zoomRef.current) {
      svg.transition().call(
        zoomRef.current.transform as any,
        d3.zoomIdentity.translate(dimensions.width / 2, dimensions.height / 2).scale(1)
      )
    }
  }

  const handleLayoutChange = (newLayout: LayoutType) => {
    setLayoutType(newLayout)
    if (simulationRef.current) {
      simulationRef.current.alpha(1).restart()
    }
  }

  // Update dimensions on container resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current?.parentElement) {
        const rect = svgRef.current.parentElement.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <Box sx={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%',
      overflow: 'hidden'
    }}>
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
        p: 1
      }}>
        <ToggleButtonGroup
          value={layoutType}
          exclusive
          onChange={(_, value) => value && handleLayoutChange(value)}
          size="small"
        >
          <ToggleButton value="force" aria-label="force layout">
            <Tooltip title="Force Layout">
              <ScatterPlot />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="hierarchical" aria-label="hierarchical layout">
            <Tooltip title="Hierarchical">
              <AccountTree />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="circular" aria-label="circular layout">
            <Tooltip title="Circular">
              <Hub />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="cluster" aria-label="cluster layout">
            <Tooltip title="Semantic Clusters">
              <FormatAlignJustify />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Graph Controls */}
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
              '&:hover': { bgcolor: 'surface.level3' }
            }}
          >
            <ZoomOut />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Center View">
          <IconButton 
            onClick={handleCenter}
            sx={{ 
              bgcolor: 'surface.level2',
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
              '&:hover': { bgcolor: showSuggestions ? 'primary.dark' : 'surface.level3' }
            }}
          >
            <Psychology />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Cluster Info */}
      {layoutType === 'cluster' && (
        <Box sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          bgcolor: 'surface.level2',
          borderRadius: 1,
          p: 1,
          maxWidth: 200
        }}>
          <Typography variant="caption" color="text.secondary">
            {semanticClusters.length} semantic clusters detected
          </Typography>
        </Box>
      )}

      {/* Add Node FAB */}
      <Fab
        color="primary"
        aria-label="add node"
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
        }}
        onClick={() => handleCreateNode(
          dimensions.width / 2, 
          dimensions.height / 2
        )}
      >
        <Add />
      </Fab>

      {/* AI Connection Suggestions */}
      <ConnectionSuggestions
        suggestions={connectionSuggestions}
        visible={showSuggestions}
        onClose={() => setShowSuggestions(false)}
      />

      {/* Node Editor */}
      <NodeEditor
        visible={showNodeEditor}
        onClose={() => setShowNodeEditor(false)}
      />

      {/* Graph Status Bar */}
      <GraphStatusBar
        clusterCount={semanticClusters.length}
        layoutType={layoutType}
      />
    </Box>
  )
}

export default GraphCanvasEnhanced