/**
 * Comprehensive Fix Script for Cognitive Graph Studio
 * Addresses the core interaction and functionality issues
 */

import * as d3 from 'd3'
import { SimulationNodeDatum, SimulationLinkDatum } from 'd3'

// Types for our graph data
interface GraphNode extends SimulationNodeDatum {
  id: string
  [key: string]: any
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  [key: string]: any
}

// 1. Fix: Improve node interaction in the graph canvas
export const createNodeInteraction = (simulation: d3.Simulation<GraphNode, GraphLink>) => {
  const drag = d3.drag<SVGCircleElement, GraphNode>()
    .on('start', function(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
      d3.select(this).classed('dragging', true)
    })
    .on('drag', function(event, d) {
      d.fx = event.x
      d.fy = event.y
    })
    .on('end', function(event, d) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
      d3.select(this).classed('dragging', false)
    })

  return drag
}

// 2. Fix: Proper click handling for node selection
export const setupClickHandling = (
  nodeSelection: d3.Selection<SVGCircleElement, GraphNode, SVGGElement, unknown>,
  selectNode: (id: string) => void,
  deselectNode: (id: string) => void,
  clearSelection: () => void,
  selectedNodes: Set<string>
) => {
  nodeSelection.on('click', function(event, d) {
    event.stopPropagation()

    if (event.shiftKey) {
      // Multi-select with shift
      if (selectedNodes.has(d.id)) {
        deselectNode(d.id)
      } else {
        selectNode(d.id)
      }
    } else {
      // Clear previous selection and select this node
      clearSelection()
      selectNode(d.id)
    }

    // Update visual selection
    updateNodeSelection(selectedNodes)
  })
}

// 3. Fix: Update visual selection state
export const updateNodeSelection = (selectedNodes: Set<string>) => {
  d3.selectAll<SVGCircleElement, GraphNode>('.node circle')
    .attr('stroke-width', d => selectedNodes.has(d.id) ? 3 : 1.5)
    .attr('stroke', d => selectedNodes.has(d.id) ? '#4da6ff' : '#fff')
}

// 4. Fix: Proper zoom and pan behavior
export const setupZoomBehavior = (
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  g: d3.Selection<SVGGElement, unknown, null, undefined>
) => {
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 4])
    .on('zoom', function(event) {
      const { transform } = event
      g.attr('transform', transform)
    })

  svg.call(zoom)

  // Enable mouse wheel zoom
  svg.on('wheel', function(event) {
    event.preventDefault()
  })

  return zoom
}

// 5. Fix: Canvas click for deselection
export const setupCanvasClick = (
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  clearSelection: () => void,
  selectedNodes: Set<string>
) => {
  svg.on('click', function(event) {
    if (event.target === svg.node()) {
      clearSelection()
      updateNodeSelection(selectedNodes)
    }
  })
}
