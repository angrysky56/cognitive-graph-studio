/**
 * Simplified Working Graph Canvas
 * 
 * Focuses on reliable functionality over complex features.
 * Fixes interaction issues and provides stable visualization.
 * 
 * @module WorkingGraphCanvas
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Box, IconButton, Tooltip, Typography, Paper } from '@mui/material'
import { 
  Add as AddIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import * as d3 from 'd3'
import useGraphStore from '@/stores/graphStore'
import { GraphNode, GraphEdge } from '@/types/graph'
import { v4 as uuidv4 } from 'uuid'

interface WorkingGraphCanvasProps {
  width?: number
  height?: number
}

const WorkingGraphCanvas: React.FC<WorkingGraphCanvasProps> = ({ 
  width = 800, 
  height = 600 
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width, height })
  
  const {
    nodes,
    edges,
    selectedNodes,
    addNode,
    addEdge,
    selectNode,
    deselectNode,
    clearSelection,
    setHoveredNode
  } = useGraphStore()

  // Convert Maps to Arrays
  const nodeArray = Array.from(nodes.values())
  const edgeArray = Array.from(edges.values())

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return

    const handleResize = () => {
      const rect = containerRef.current!.getBoundingClientRect()
      setDimensions({
        width: rect.width - 40, // Account for padding
        height: rect.height - 100 // Account for controls
      })
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Main D3 rendering effect
  useEffect(() => {
    if (!svgRef.current || nodeArray.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Set up the SVG
    svg
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .style('background', '#0a0e1a')
      .style('cursor', 'grab')

    // Create main group
    const g = svg.append('g')

    // Set up zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(nodeArray)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(edgeArray)
        .id(d => d.id)
        .distance(100)
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide().radius(30))

    // Create links
    const links = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(edgeArray)
      .join('line')
      .attr('stroke', '#64b5f6')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.weight) * 2)

    // Create nodes
    const nodeGroups = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodeArray)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')

    // Node circles
    const circles = nodeGroups.append('circle')
      .attr('r', d => 15 + (d.metadata.size || 0) / 5)
      .attr('fill', d => getNodeColor(d.type))
      .attr('stroke', d => selectedNodes.has(d.id) ? '#ffeb3b' : '#fff')
      .attr('stroke-width', d => selectedNodes.has(d.id) ? 3 : 1)

    // Node labels
    const labels = nodeGroups.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')

    // Node interactions
    nodeGroups
      .on('click', (event, d) => {
        event.stopPropagation()
        if (selectedNodes.has(d.id)) {
          deselectNode(d.id)
        } else {
          selectNode(d.id)
        }
        
        // Update stroke
        circles
          .attr('stroke', node => selectedNodes.has(node.id) || node.id === d.id ? '#ffeb3b' : '#fff')
          .attr('stroke-width', node => selectedNodes.has(node.id) || node.id === d.id ? 3 : 1)
      })
      .on('mouseover', (event, d) => {
        setHoveredNode(d.id)
        
        // Highlight connected nodes
        const connectedNodes = new Set<string>()
        edgeArray.forEach(edge => {
          if (edge.source === d.id) connectedNodes.add(edge.target)
          if (edge.target === d.id) connectedNodes.add(edge.source)
        })

        circles
          .style('opacity', node => 
            node.id === d.id || connectedNodes.has(node.id) ? 1 : 0.3
          )
        
        links
          .style('opacity', edge => 
            edge.source === d.id || edge.target === d.id ? 1 : 0.1
          )
      })
      .on('mouseout', () => {
        setHoveredNode(null)
        circles.style('opacity', 1)
        links.style('opacity', 0.6)
      })

    // Drag behavior
    const drag = d3.drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    nodeGroups.call(drag)

    // Background click to clear selection
    svg.on('click', () => {
      clearSelection()
      circles
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
    })

    // Update positions on simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y)

      nodeGroups
        .attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Cleanup
    return () => {
      simulation.stop()
    }

  }, [nodeArray, edgeArray, selectedNodes, dimensions])

  // Node color mapping
  const getNodeColor = (type: string): string => {
    const colors = {
      concept: '#4fc3f7',
      idea: '#81c784',
      source: '#ffb74d',
      cluster: '#f06292',
      person: '#ba68c8',
      organization: '#ff8a65',
      location: '#aed581',
      technology: '#64b5f6',
      topic: '#90a4ae'
    }
    return colors[type as keyof typeof colors] || '#90a4ae'
  }

  // Add new node at center
  const handleAddNode = useCallback(() => {
    const newNode: GraphNode = {
      id: uuidv4(),
      label: `New Node ${nodeArray.length + 1}`,
      content: 'Click to edit this node content',
      type: 'concept',
      position: { 
        x: dimensions.width / 2 + (Math.random() - 0.5) * 100, 
        y: dimensions.height / 2 + (Math.random() - 0.5) * 100
      },
      metadata: {
        created: new Date(),
        modified: new Date(),
        tags: []
      },
      connections: [],
      aiGenerated: false
    }
    addNode(newNode)
  }, [addNode, nodeArray.length, dimensions])

  // Zoom controls
  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current)
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 1.5
    )
  }

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current)
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 0.67
    )
  }

  const handleCenter = () => {
    const svg = d3.select(svgRef.current)
    svg.transition().duration(500).call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity
    )
  }

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        bgcolor: '#0a0e1a',
        borderRadius: 1,
        overflow: 'hidden'
      }}
    >
      {/* Controls */}
      <Box sx={{ 
        position: 'absolute', 
        top: 16, 
        left: 16, 
        zIndex: 10,
        display: 'flex',
        gap: 1
      }}>
        <Tooltip title="Add Node">
          <IconButton 
            onClick={handleAddNode}
            sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom In">
          <IconButton 
            onClick={handleZoomIn}
            sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
          >
            <ZoomInIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out">
          <IconButton 
            onClick={handleZoomOut}
            sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
          >
            <ZoomOutIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Center View">
          <IconButton 
            onClick={handleCenter}
            sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
          >
            <CenterIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Graph Info */}
      <Paper sx={{ 
        position: 'absolute', 
        top: 16, 
        right: 16, 
        p: 2,
        bgcolor: 'rgba(0,0,0,0.7)',
        color: 'white'
      }}>
        <Typography variant="body2">
          {nodeArray.length} nodes • {edgeArray.length} edges
        </Typography>
        {selectedNodes.size > 0 && (
          <Typography variant="caption">
            {selectedNodes.size} selected
          </Typography>
        )}
      </Paper>

      {/* Main SVG */}
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />

      {/* Instructions */}
      {nodeArray.length === 0 && (
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.7)'
        }}>
          <Typography variant="h6" gutterBottom>
            No nodes to display
          </Typography>
          <Typography variant="body2">
            Click the + button to add a node or import a document
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default WorkingGraphCanvas
