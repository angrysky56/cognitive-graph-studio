/**
 * Main graph store for Cognitive Graph Studio
 * Uses Zustand for efficient state management
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { GraphNode, GraphEdge, GraphCluster } from '@/types/graph'

interface GraphState {
  // Core graph data
  nodes: Map<string, GraphNode>
  edges: Map<string, GraphEdge>
  clusters: Map<string, GraphCluster>
  
  // UI state
  selectedNodes: Set<string>
  selectedEdges: Set<string>
  hoveredNode: string | null
  isLoading: boolean
  
  // View state
  viewport: {
    x: number
    y: number
    zoom: number
  }
  
  // Actions
  addNode: (node: GraphNode) => void
  updateNode: (id: string, updates: Partial<GraphNode>) => void
  removeNode: (id: string) => void
  
  addEdge: (edge: GraphEdge) => void
  updateEdge: (id: string, updates: Partial<GraphEdge>) => void
  removeEdge: (id: string) => void
  
  selectNode: (id: string) => void
  deselectNode: (id: string) => void
  clearSelection: () => void
  
  setViewport: (viewport: Partial<GraphState['viewport']>) => void
  setLoading: (loading: boolean) => void
  setHoveredNode: (id: string | null) => void
}

const useGraphStore = create<GraphState>()(
  devtools(
    persist(
      (set, _get) => ({
        // Initialize state
        nodes: new Map(),
        edges: new Map(),
        clusters: new Map(),
        selectedNodes: new Set(),
        selectedEdges: new Set(),
        hoveredNode: null,
        isLoading: false,
        viewport: { x: 0, y: 0, zoom: 1 },

        // Node actions
        addNode: (node) => set((state) => {
          const newNodes = new Map(state.nodes)
          newNodes.set(node.id, node)
          return { nodes: newNodes }
        }),

        updateNode: (id, updates) => set((state) => {
          const newNodes = new Map(state.nodes)
          const existingNode = newNodes.get(id)
          if (existingNode) {
            newNodes.set(id, { ...existingNode, ...updates })
          }
          return { nodes: newNodes }
        }),

        removeNode: (id) => set((state) => {
          const newNodes = new Map(state.nodes)
          const newEdges = new Map(state.edges)
          newNodes.delete(id)
          // Remove edges connected to this node
          Array.from(newEdges.entries()).forEach(([edgeId, edge]) => {
            if (edge.source === id || edge.target === id) {
              newEdges.delete(edgeId)
            }
          })
          return { nodes: newNodes, edges: newEdges }
        }),

        // Edge actions
        addEdge: (edge) => set((state) => {
          const newEdges = new Map(state.edges)
          newEdges.set(edge.id, edge)
          return { edges: newEdges }
        }),

        updateEdge: (id, updates) => set((state) => {
          const newEdges = new Map(state.edges)
          const existingEdge = newEdges.get(id)
          if (existingEdge) {
            newEdges.set(id, { ...existingEdge, ...updates })
          }
          return { edges: newEdges }
        }),

        removeEdge: (id) => set((state) => {
          const newEdges = new Map(state.edges)
          newEdges.delete(id)
          return { edges: newEdges }
        }),

        // Selection actions
        selectNode: (id) => set((state) => {
          const newSelected = new Set(state.selectedNodes)
          newSelected.add(id)
          return { selectedNodes: newSelected }
        }),

        deselectNode: (id) => set((state) => {
          const newSelected = new Set(state.selectedNodes)
          newSelected.delete(id)
          return { selectedNodes: newSelected }
        }),

        clearSelection: () => set(() => ({
          selectedNodes: new Set(),
          selectedEdges: new Set()
        })),

        // UI actions
        setViewport: (viewport) => set((state) => ({
          viewport: { ...state.viewport, ...viewport }
        })),

        setLoading: (loading) => set(() => ({ isLoading: loading })),

        setHoveredNode: (id) => set(() => ({ hoveredNode: id }))
      }),
      {
        name: 'cognitive-graph-storage',
        storage: {
          getItem: (name) => {
            const value = localStorage.getItem(name)
            return value ? JSON.parse(value, (key, val) => {
              if (key === 'nodes' || key === 'edges' || key === 'clusters') {
                return new Map(val)
              }
              if (key === 'selectedNodes' || key === 'selectedEdges') {
                return new Set(val)
              }
              return val
            }) : null
          },
          setItem: (name, value) => {
            localStorage.setItem(name, JSON.stringify(value, (_key, val) => {
              if (val instanceof Map) {
                return Array.from(val.entries())
              }
              if (val instanceof Set) {
                return Array.from(val)
              }
              return val
            }))
          },
          removeItem: (name) => localStorage.removeItem(name)
        }
      }
    ),
    { name: 'graph-store' }
  )
)

export default useGraphStore
