/**
 * Comprehensive Fix Script for Cognitive Graph Studio
 * Addresses the core interaction and functionality issues
 */

// 1. Fix: Ensure Material UI theme works properly
import { ThemeProvider } from '@mui/material/styles'

// 2. Fix: Improve node interaction in the graph canvas
const fixNodeInteraction = () => {
  // Enhanced drag behavior with proper event handling
  const drag = d3.drag()
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

// 3. Fix: Proper click handling for node selection
const fixClickHandling = (node, selectNode, deselectNode, selectedNodes) => {
  node.on('click', function(event, d) {
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
      selectedNodes.clear()
      selectNode(d.id)
    }
    
    // Update visual selection
    updateNodeSelection()
  })
}

// 4. Fix: Update visual selection state
const updateNodeSelection = () => {
  d3.selectAll('.node circle')
    .attr('stroke-width', d => selectedNodes.has(d.id) ? 3 : 1.5)
    .attr('stroke', d => selectedNodes.has(d.id) ? '#4da6ff' : '#fff')
}

// 5. Fix: Proper zoom and pan behavior
const fixZoomBehavior = (svg, g) => {
  const zoom = d3.zoom()
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

// 6. Fix: Canvas click for deselection
const fixCanvasClick = (svg, clearSelection) => {
  svg.on('click', function(event) {
    if (event.target === svg.node()) {
      clearSelection()
      updateNodeSelection()
    }
  })
}

export {
  fixNodeInteraction,
  fixClickHandling,
  updateNodeSelection,
  fixZoomBehavior,
  fixCanvasClick
}
