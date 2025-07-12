/**
 * Enhanced Graph Store for Cognitive Graph Studio
 * 
 * Integrates with the GraphEngine to provide reactive state management
 * for the cognitive graph with AI capabilities, semantic search, and
 * real-time updates through the enhanced architecture.
 * 
 * @module EnhancedGraphStore
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { 
  EnhancedGraphNode, 
  EnhancedGraphEdge, 
  EnhancedGraphCluster,
  SemanticSearchContext,
  SemanticSearchResult
} from '../types/enhanced-graph'
import { 
  GraphEngine, 
  IGraphEngine, 
  GraphEngineConfig, 
  GraphOperationContext, 
  GraphOperationResult,
  GraphStateChangeEvent
} from '../core/GraphEngine'
import { SavedGraph } from '../services/graph-persistence-service'

/**
 * Enhanced graph store state interface
 */
interface EnhancedGraphState {
  // Core graph data
  nodes: Map<string, EnhancedGraphNode>
  edges: Map<string, EnhancedGraphEdge>
  clusters: Map<string, EnhancedGraphCluster>
  
  // UI state
  selectedNodes: Set<string>
  selectedEdges: Set<string>
  hoveredNode: string | null
  hoveredEdge: string | null
  
  // Search state
  searchResults: SemanticSearchResult[]
  searchQuery: string
  isSearching: boolean
  
  // Operation state
  isLoading: boolean
  currentOperation: string | null
  operationProgress: number
  
  // View state
  viewport: {
    x: number
    y: number
    z: number
    zoom: number
    mode: 'free' | 'orbit' | 'fly' | 'top-down'
  }
  
  // AI state
  aiEnabled: boolean
  autoEnhanceEnabled: boolean
  lastDiscoveryQuery: string | null
  
  // Statistics
  statistics: {
    nodeCount: number
    edgeCount: number
    clusterCount: number
    lastModified: Date
    totalOperations: number
    averageConfidence: number
  }
  
  // Engine reference
  engine: IGraphEngine | null
  
  // Internal flags
  isSync: boolean
  
  // Actions
  initializeEngine: (config: GraphEngineConfig) => Promise<void>
  
  // Node operations
  createNode: (nodeData: Partial<EnhancedGraphNode>, userContext?: any) => Promise<GraphOperationResult>
  updateNode: (nodeId: string, updates: Partial<EnhancedGraphNode>, userContext?: any) => Promise<GraphOperationResult>
  deleteNode: (nodeId: string, userContext?: any) => Promise<GraphOperationResult>
  
  // Edge operations
  createEdge: (edgeData: Partial<EnhancedGraphEdge>, userContext?: any) => Promise<GraphOperationResult>
  updateEdge: (edgeId: string, updates: Partial<EnhancedGraphEdge>, userContext?: any) => Promise<GraphOperationResult>
  deleteEdge: (edgeId: string, userContext?: any) => Promise<GraphOperationResult>
  
  // Search operations
  search: (searchContext: SemanticSearchContext, userContext?: any) => Promise<GraphOperationResult>
  clearSearch: () => void
  
  // Discovery operations
  discover: (query: string, userContext?: any) => Promise<GraphOperationResult>
  autoEnhance: (nodeIds?: string[], userContext?: any) => Promise<GraphOperationResult>
  
  // Selection operations
  selectNode: (nodeId: string) => void
  deselectNode: (nodeId: string) => void
  selectEdge: (edgeId: string) => void
  deselectEdge: (edgeId: string) => void
  clearSelection: () => void
  
  // Hover operations
  setHoveredNode: (nodeId: string | null) => void
  setHoveredEdge: (edgeId: string | null) => void
  
  // View operations
  setViewport: (viewport: Partial<EnhancedGraphState['viewport']>) => void
  focusOnNode: (nodeId: string, duration?: number) => Promise<void>
  
  // AI operations
  setAIEnabled: (enabled: boolean) => void
  setAutoEnhanceEnabled: (enabled: boolean) => void
  
  // Utility operations
  exportGraph: (format: 'json' | 'graphml' | 'cytoscape' | 'gephi', options?: any) => Promise<string>
  importGraph: (data: string, format: 'json' | 'graphml' | 'cytoscape', userContext?: any) => Promise<GraphOperationResult>
  loadGraph: (graph: SavedGraph) => void
  
  // Internal state management
  syncWithEngine: () => void
  handleEngineEvent: (event: GraphStateChangeEvent) => void
  setLoading: (loading: boolean) => void
  setCurrentOperation: (operation: string | null, progress?: number) => void
}

/**
 * Create enhanced graph store with GraphEngine integration
 */
const useEnhancedGraphStore = create<EnhancedGraphState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        nodes: new Map(),
        edges: new Map(),
        clusters: new Map(),
        selectedNodes: new Set(),
        selectedEdges: new Set(),
        hoveredNode: null,
        hoveredEdge: null,
        searchResults: [],
        searchQuery: '',
        isSearching: false,
        isLoading: false,
        currentOperation: null,
        operationProgress: 0,
        viewport: { 
          x: 0, 
          y: 0, 
          z: 150, 
          zoom: 1, 
          mode: 'free' as const 
        },
        aiEnabled: true,
        autoEnhanceEnabled: true,
        lastDiscoveryQuery: null,
        statistics: {
          nodeCount: 0,
          edgeCount: 0,
          clusterCount: 0,
          lastModified: new Date(),
          totalOperations: 0,
          averageConfidence: 0
        },
        engine: null,
        isSync: false,

        // Initialize GraphEngine
        initializeEngine: async (config: GraphEngineConfig) => {
          try {
            set({ isLoading: true, currentOperation: 'Initializing AI services...' })
            
            const engine = new GraphEngine()
            await engine.initialize(config)
            
            // Subscribe to engine events
            engine.subscribe((event: GraphStateChangeEvent) => {
              get().handleEngineEvent(event)
            })
            
            set({ 
              engine, 
              isLoading: false, 
              currentOperation: null,
              aiEnabled: true
            })
            
            // Sync initial state
            get().syncWithEngine()
            
          } catch (error) {
            console.error('Failed to initialize engine:', error)
            set({ 
              isLoading: false, 
              currentOperation: null, 
              aiEnabled: false 
            })
          }
        },

        // Node operations
        createNode: async (nodeData: Partial<EnhancedGraphNode>, userContext?: any) => {
          const state = get()
          if (!state.engine) {
            throw new Error('Engine not initialized')
          }

          set({ isLoading: true, currentOperation: 'Creating node...' })
          
          try {
            const context: GraphOperationContext = {
              operationId: crypto.randomUUID(),
              type: 'create',
              user: userContext?.user || { id: 'user', preferences: {} },
              parameters: userContext?.parameters || {},
              startTime: new Date(),
              timeoutMs: 30000
            }

            const result = await state.engine.createNode(nodeData, context)
            
            if (result.success) {
              state.syncWithEngine()
            }
            
            set({ isLoading: false, currentOperation: null })
            return result
            
          } catch (error) {
            set({ isLoading: false, currentOperation: null })
            throw error
          }
        },

        updateNode: async (nodeId: string, updates: Partial<EnhancedGraphNode>, userContext?: any) => {
          const state = get()
          if (!state.engine) {
            throw new Error('Engine not initialized')
          }

          set({ isLoading: true, currentOperation: 'Updating node...' })
          
          try {
            const context: GraphOperationContext = {
              operationId: crypto.randomUUID(),
              type: 'update',
              user: userContext?.user || { id: 'user', preferences: {} },
              parameters: userContext?.parameters || {},
              startTime: new Date(),
              timeoutMs: 30000
            }

            const result = await state.engine.updateNode(nodeId, updates, context)
            
            if (result.success) {
              state.syncWithEngine()
            }
            
            set({ isLoading: false, currentOperation: null })
            return result
            
          } catch (error) {
            set({ isLoading: false, currentOperation: null })
            throw error
          }
        },

        deleteNode: async (nodeId: string, userContext?: any) => {
          const state = get()
          if (!state.engine) {
            throw new Error('Engine not initialized')
          }

          set({ isLoading: true, currentOperation: 'Deleting node...' })
          
          try {
            const context: GraphOperationContext = {
              operationId: crypto.randomUUID(),
              type: 'delete',
              user: userContext?.user || { id: 'user', preferences: {} },
              parameters: userContext?.parameters || {},
              startTime: new Date(),
              timeoutMs: 30000
            }

            const result = await state.engine.deleteNode(nodeId, context)
            
            if (result.success) {
              // Remove from selections
              const newSelectedNodes = new Set(state.selectedNodes)
              newSelectedNodes.delete(nodeId)
              
              set({ 
                selectedNodes: newSelectedNodes,
                hoveredNode: state.hoveredNode === nodeId ? null : state.hoveredNode
              })
              
              state.syncWithEngine()
            }
            
            set({ isLoading: false, currentOperation: null })
            return result
            
          } catch (error) {
            set({ isLoading: false, currentOperation: null })
            throw error
          }
        },

        // Edge operations
        createEdge: async (edgeData: Partial<EnhancedGraphEdge>, userContext?: any) => {
          const state = get()
          if (!state.engine) {
            throw new Error('Engine not initialized')
          }

          set({ isLoading: true, currentOperation: 'Creating relationship...' })
          
          try {
            const context: GraphOperationContext = {
              operationId: crypto.randomUUID(),
              type: 'create',
              user: userContext?.user || { id: 'user', preferences: {} },
              parameters: userContext?.parameters || {},
              startTime: new Date(),
              timeoutMs: 30000
            }

            const result = await state.engine.createEdge(edgeData, context)
            
            if (result.success) {
              state.syncWithEngine()
            }
            
            set({ isLoading: false, currentOperation: null })
            return result
            
          } catch (error) {
            set({ isLoading: false, currentOperation: null })
            throw error
          }
        },

        updateEdge: async (edgeId: string, updates: Partial<EnhancedGraphEdge>, userContext?: any) => {
          const state = get()
          if (!state.engine) {
            throw new Error('Engine not initialized')
          }

          set({ isLoading: true, currentOperation: 'Updating relationship...' })
          
          try {
            // For now, find and update the edge directly in the store
            // TODO: Implement in GraphEngine when edge update method is added
            const existingEdge = state.edges.get(edgeId)
            if (!existingEdge) {
              throw new Error(`Edge ${edgeId} not found`)
            }

            const updatedEdge: EnhancedGraphEdge = {
              ...existingEdge,
              ...updates,
              metadata: {
                ...existingEdge.metadata,
                ...updates.metadata,
                modified: new Date()
              }
            }

            // Update directly in store for now
            set(state => {
              const newEdges = new Map(state.edges)
              newEdges.set(edgeId, updatedEdge)
              return { edges: newEdges, isLoading: false, currentOperation: null }
            })

            return {
              success: true,
              data: { edge: updatedEdge },
              metadata: {
                operationId: crypto.randomUUID(),
                duration: 100,
                confidence: 1.0,
                affectedNodes: [updatedEdge.source, updatedEdge.target],
                affectedEdges: [edgeId],
                agentsUsed: []
              },
              suggestions: ['Verify relationship changes are accurate']
            }
          } catch (error) {
            set({ isLoading: false, currentOperation: null })
            throw error
          }
        },

        deleteEdge: async (edgeId: string, userContext?: any) => {
          const state = get()
          if (!state.engine) {
            throw new Error('Engine not initialized')
          }

          set({ isLoading: true, currentOperation: 'Removing relationship...' })
          
          try {
            // For now, delete the edge directly from the store
            // TODO: Implement in GraphEngine when edge delete method is added
            const existingEdge = state.edges.get(edgeId)
            if (!existingEdge) {
              throw new Error(`Edge ${edgeId} not found`)
            }

            // Remove from selections
            const newSelectedEdges = new Set(state.selectedEdges)
            newSelectedEdges.delete(edgeId)

            // Remove edge
            set(state => {
              const newEdges = new Map(state.edges)
              newEdges.delete(edgeId)
              return { 
                edges: newEdges, 
                selectedEdges: newSelectedEdges,
                hoveredEdge: state.hoveredEdge === edgeId ? null : state.hoveredEdge,
                isLoading: false, 
                currentOperation: null 
              }
            })

            return {
              success: true,
              data: { edgeId },
              metadata: {
                operationId: crypto.randomUUID(),
                duration: 100,
                confidence: 1.0,
                affectedNodes: [existingEdge.source, existingEdge.target],
                affectedEdges: [edgeId],
                agentsUsed: []
              },
              suggestions: ['Consider if this affects graph connectivity']
            }
          } catch (error) {
            set({ isLoading: false, currentOperation: null })
            throw error
          }
        },

        // Search operations
        search: async (searchContext: SemanticSearchContext, userContext?: any) => {
          const state = get()
          if (!state.engine) {
            throw new Error('Engine not initialized')
          }

          set({ 
            isSearching: true, 
            searchQuery: searchContext.query,
            currentOperation: 'Searching...' 
          })
          
          try {
            const context: GraphOperationContext = {
              operationId: crypto.randomUUID(),
              type: 'search',
              user: userContext?.user || { id: 'user', preferences: {} },
              parameters: userContext?.parameters || {},
              startTime: new Date(),
              timeoutMs: 30000
            }

            const result = await state.engine.search(searchContext, context)
            
            if (result.success) {
              set({ 
                searchResults: result.data.results || [],
                isSearching: false,
                currentOperation: null
              })
            } else {
              set({ 
                searchResults: [],
                isSearching: false,
                currentOperation: null
              })
            }
            
            return result
            
          } catch (error) {
            set({ 
              searchResults: [],
              isSearching: false,
              currentOperation: null
            })
            throw error
          }
        },

        clearSearch: () => {
          set({ 
            searchResults: [], 
            searchQuery: '',
            isSearching: false
          })
        },

        // Discovery operations
        discover: async (query: string, userContext?: any) => {
          const state = get()
          if (!state.engine) {
            throw new Error('Engine not initialized')
          }

          set({ 
            isLoading: true, 
            currentOperation: 'Discovering new content...',
            lastDiscoveryQuery: query
          })
          
          try {
            const context: GraphOperationContext = {
              operationId: crypto.randomUUID(),
              type: 'discover',
              user: userContext?.user || { id: 'user', preferences: {} },
              parameters: { discoveryQuery: query, ...userContext?.parameters },
              startTime: new Date(),
              timeoutMs: 60000 // Longer timeout for discovery
            }

            const result = await state.engine.discover(query, context)
            
            if (result.success) {
              state.syncWithEngine()
            }
            
            set({ isLoading: false, currentOperation: null })
            return result
            
          } catch (error) {
            set({ isLoading: false, currentOperation: null })
            throw error
          }
        },

        autoEnhance: async (nodeIds?: string[], userContext?: any) => {
          const state = get()
          if (!state.engine || !state.autoEnhanceEnabled) {
            throw new Error('Engine not initialized or auto-enhance disabled')
          }

          set({ 
            isLoading: true, 
            currentOperation: 'Enhancing graph with AI...' 
          })
          
          try {
            const context: GraphOperationContext = {
              operationId: crypto.randomUUID(),
              type: 'update',
              user: userContext?.user || { id: 'ai-system', preferences: {} },
              parameters: { autoEnhance: true, ...userContext?.parameters },
              startTime: new Date(),
              timeoutMs: 120000 // Longer timeout for auto-enhancement
            }

            const result = await state.engine.autoEnhance(nodeIds, context)
            
            if (result.success) {
              state.syncWithEngine()
            }
            
            set({ isLoading: false, currentOperation: null })
            return result
            
          } catch (error) {
            set({ isLoading: false, currentOperation: null })
            throw error
          }
        },

        // Selection operations
        selectNode: (nodeId: string) => {
          set(state => {
            const newSelected = new Set(state.selectedNodes)
            newSelected.add(nodeId)
            return { selectedNodes: newSelected }
          })
        },

        deselectNode: (nodeId: string) => {
          set(state => {
            const newSelected = new Set(state.selectedNodes)
            newSelected.delete(nodeId)
            return { selectedNodes: newSelected }
          })
        },

        selectEdge: (edgeId: string) => {
          set(state => {
            const newSelected = new Set(state.selectedEdges)
            newSelected.add(edgeId)
            return { selectedEdges: newSelected }
          })
        },

        deselectEdge: (edgeId: string) => {
          set(state => {
            const newSelected = new Set(state.selectedEdges)
            newSelected.delete(edgeId)
            return { selectedEdges: newSelected }
          })
        },

        clearSelection: () => {
          set({ 
            selectedNodes: new Set(), 
            selectedEdges: new Set() 
          })
        },

        // Graph loading
        loadGraph: (graph: SavedGraph) => {
          set({
            nodes: graph.nodes,
            edges: graph.edges,
            clusters: graph.clusters,
            selectedNodes: new Set(),
            selectedEdges: new Set(),
            hoveredNode: null,
            hoveredEdge: null,
            statistics: {
              nodeCount: graph.nodes.size,
              edgeCount: graph.edges.size,
              clusterCount: graph.clusters.size,
              lastModified: graph.metadata.modified,
              totalOperations: 0,
              averageConfidence: 0
            }
          })
          console.log(`Loaded graph: ${graph.metadata.title}`)
        },

        // Hover operations
        setHoveredNode: (nodeId: string | null) => {
          set({ hoveredNode: nodeId })
        },

        setHoveredEdge: (edgeId: string | null) => {
          set({ hoveredEdge: edgeId })
        },

        // View operations
        setViewport: (viewport: Partial<EnhancedGraphState['viewport']>) => {
          set(state => ({
            viewport: { ...state.viewport, ...viewport }
          }))
        },

        focusOnNode: async (nodeId: string, _duration = 1000) => {
          // This would integrate with the 3D visualization service
          // For now, just update viewport to center on node
          const state = get()
          const node = state.nodes.get(nodeId)
          
          if (node && node.position3D) {
            set(state => ({
              viewport: {
                ...state.viewport,
                x: node.position3D.x,
                y: node.position3D.y,
                z: node.position3D.z + 50 // Offset for viewing
              }
            }))
          }
        },

        // AI operations
        setAIEnabled: (enabled: boolean) => {
          set({ aiEnabled: enabled })
        },

        setAutoEnhanceEnabled: (enabled: boolean) => {
          set({ autoEnhanceEnabled: enabled })
        },

        // Utility operations
        exportGraph: async (format: 'json' | 'graphml' | 'cytoscape' | 'gephi', options?: any) => {
          const state = get()
          if (!state.engine) {
            throw new Error('Engine not initialized')
          }

          set({ isLoading: true, currentOperation: 'Exporting graph...' })
          
          try {
            const result = await state.engine.export(format, options)
            set({ isLoading: false, currentOperation: null })
            return result
          } catch (error) {
            set({ isLoading: false, currentOperation: null })
            throw error
          }
        },

        importGraph: async (data: string, format: 'json' | 'graphml' | 'cytoscape', userContext?: any) => {
          const state = get()
          if (!state.engine) {
            throw new Error('Engine not initialized')
          }

          set({ isLoading: true, currentOperation: 'Importing graph...' })
          
          try {
            const context: GraphOperationContext = {
              operationId: crypto.randomUUID(),
              type: 'create',
              user: userContext?.user || { id: 'user', preferences: {} },
              parameters: { import: true, format, ...userContext?.parameters },
              startTime: new Date(),
              timeoutMs: 60000
            }

            const result = await state.engine.import(data, format, context)
            
            if (result.success) {
              state.syncWithEngine()
            }
            
            set({ isLoading: false, currentOperation: null })
            return result
            
          } catch (error) {
            set({ isLoading: false, currentOperation: null })
            throw error
          }
        },

        // Internal state management
        syncWithEngine: () => {
          const state = get()
          if (!state.engine || state.isSync) return

          // Set sync flag to prevent re-entrant calls
          set({ isSync: true })

          try {
            const graphState = state.engine.getGraphState()
            
            // Calculate average confidence
            const confidenceValues = Array.from(graphState.nodes.values())
              .map(node => node.aiMetadata.confidenceScore)
            
            const averageConfidence = confidenceValues.length > 0 
              ? confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length
              : 0

            set({
              nodes: graphState.nodes,
              edges: graphState.edges,
              clusters: graphState.clusters,
              statistics: {
                ...graphState.statistics,
                averageConfidence
              },
              isSync: false
            })
          } catch (error) {
            console.error('Sync with engine failed:', error)
            set({ isSync: false })
          }
        },

        handleEngineEvent: (event: GraphStateChangeEvent) => {
          const state = get()
          
          // Prevent handling events during sync to avoid infinite loops
          if (state.isSync) return
          
          // Update UI based on engine events
          switch (event.type) {
            case 'node-added':
            case 'node-updated':
            case 'node-removed':
            case 'edge-added':
            case 'edge-updated':
            case 'edge-removed':
            case 'cluster-updated':
              // Use a timeout to debounce rapid events
              setTimeout(() => {
                const currentState = get()
                if (!currentState.isSync) {
                  currentState.syncWithEngine()
                }
              }, 10)
              break
              
            case 'search-completed':
              // Search results are handled by the search method
              break
              
            case 'discovery-completed':
              // Discovery completion is handled by the discover method
              break
          }
        },

        setLoading: (loading: boolean) => {
          set({ isLoading: loading })
        },

        setCurrentOperation: (operation: string | null, progress = 0) => {
          set({ currentOperation: operation, operationProgress: progress })
        }
      }),
      {
        name: 'enhanced-cognitive-graph-storage',
        storage: {
          getItem: (name) => {
            const value = localStorage.getItem(name)
            if (!value) return null
            
            try {
              return JSON.parse(value, (key, val) => {
                // Restore Map and Set objects
                if (key === 'nodes' || key === 'edges' || key === 'clusters') {
                  return new Map(val)
                }
                if (key === 'selectedNodes' || key === 'selectedEdges') {
                  return new Set(val)
                }
                if (key === 'similarities') {
                  return new Map(val)
                }
                return val
              })
            } catch {
              return null
            }
          },
          setItem: (name, value) => {
            try {
              const serialized = JSON.stringify(value, (_key, val) => {
                // Serialize Map and Set objects
                if (val instanceof Map) {
                  return Array.from(val.entries())
                }
                if (val instanceof Set) {
                  return Array.from(val)
                }
                return val
              })
              localStorage.setItem(name, serialized)
            } catch (error) {
              console.error('Failed to save to localStorage:', error)
            }
          },
          removeItem: (name) => localStorage.removeItem(name)
        },
        // Only persist certain fields, not the engine instance
        partialize: (state) => ({
          viewport: state.viewport,
          aiEnabled: state.aiEnabled,
          autoEnhanceEnabled: state.autoEnhanceEnabled,
          lastDiscoveryQuery: state.lastDiscoveryQuery,
        }) as any,
      }
    ),
    { name: 'enhanced-graph-store' }
  )
)

export default useEnhancedGraphStore
export type { EnhancedGraphState }
