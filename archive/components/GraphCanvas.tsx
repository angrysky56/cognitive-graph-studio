/**
 * TODO: Replace this custom D3.js implementation with React Flow.
 * See issues_and_improvements.md for more details.
 *
 * Graph Canvas Component - Core visualization using D3.js
 * Implements interactive node-link graph with clustering
 */

import React, { useRef, useEffect, useState } from 'react'
import { Box, IconButton, Tooltip, Fab } from '@mui/material'
import { Add, ZoomIn, ZoomOut, CenterFocusStrong } from '@mui/icons-material'
import * as d3 from 'd3'
import useGraphStore from '@/stores/graphStore'
import { GraphNode } from '@/types/graph'
import { graphColors } from '@/utils/theme'

interface GraphCanvasProps {
  width?: number
  height?: number
}

const GraphCanvas: React.FC<GraphCanvasProps> = ({ 
  width = 800, 
  height = 600 
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width, height })
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  
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

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Setup zoom behavior
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

    // Main group for all graph elements
    const g = svg.append('g')

    // Create force simulation
    const simulation = d3.forceSimulation(nodeArray)
      .force('link', d3.forceLink(edgeArray)
        .id((d: any) => d.id)
        .distance(100)
        .strength(0.1)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide().radius(30))

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(edgeArray)
      .join('line')
      .attr('stroke', (d) => graphColors.edges[d.type] || graphColors.edges.semantic)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.sqrt(d.weight) * 2)

    // Create nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(nodeArray)
      .join('circle')
      .attr('r', 20)
      .attr('fill', (d) => graphColors.nodes[d.type] || graphColors.nodes.concept)
      .attr('stroke', '#fff')
      .attr('stroke-width', (d) => selectedNodes.has(d.id) ? 3 : 1.5)
      .style('cursor', 'pointer')

    // Add labels
    const labels = g.append('g')
      .selectAll('text')
      .data(nodeArray)
      .join('text')
      .text((d) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '12px')
      .attr('fill', '#e0e0e0')
      .attr('pointer-events', 'none')
      .style('user-select', 'none')

    // Add drag behavior
    const drag = d3.drag<SVGCircleElement, GraphNode>()
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

    node.call(drag as any)

    // Add click handlers
    node.on('click', (event, d) => {
      event.stopPropagation()
      if (selectedNodes.has(d.id)) {
        deselectNode(d.id)
      } else {
        selectNode(d.id)
      }
    })

    // Add hover handlers
    node
      .on('mouseenter', (event, d) => {
        setHoveredNode(d.id)
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('r', 25)
      })
      .on('mouseleave', (event) => {
        setHoveredNode(null)
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('r', 20)
      })

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node
        .attr('cx', (d) => d.x!)
        .attr('cy', (d) => d.y!)

      labels
        .attr('x', (d) => d.x!)
        .attr('y', (d) => d.y!)
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
  }, [nodeArray, edgeArray, dimensions, selectedNodes])

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
      aiGenerated: false
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
      </Box>

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
    </Box>
  )
}

export default GraphCanvas
