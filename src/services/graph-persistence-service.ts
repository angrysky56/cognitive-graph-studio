/**
 * Graph Persistence Service
 *
 * Handles saving and loading of complete graphs with metadata
 * Enables the "Saved Graphs" functionality for cross-graph search
 */

import { EnhancedGraphNode, EnhancedGraphEdge, EnhancedGraphCluster } from '../types/enhanced-graph'

export interface GraphMetadata {
  id: string
  title: string
  description: string
  created: Date
  modified: Date
  nodeCount: number
  edgeCount: number
  tags: string[]
  author?: string
  version: string
}

export interface SavedGraph {
  metadata: GraphMetadata
  nodes: Map<string, EnhancedGraphNode>
  edges: Map<string, EnhancedGraphEdge>
  clusters: Map<string, EnhancedGraphCluster>
}

export interface GraphPersistenceService {
  saveGraph(graph: SavedGraph): Promise<void>
  loadGraph(graphId: string): Promise<SavedGraph | null>
  listGraphs(): Promise<GraphMetadata[]>
  deleteGraph(graphId: string): Promise<void>
  searchAcrossGraphs(query: string): Promise<Array<{graphId: string, matches: any[]}>>
}

/**
 * Local storage implementation of graph persistence
 */
export class LocalGraphPersistenceService implements GraphPersistenceService {
  private readonly storageKey = 'cognitive_graphs'
  private readonly metadataKey = 'cognitive_graphs_metadata'

  async saveGraph(graph: SavedGraph): Promise<void> {
    try {
      // Update metadata
      graph.metadata.modified = new Date()
      graph.metadata.nodeCount = graph.nodes.size
      graph.metadata.edgeCount = graph.edges.size

      // Save graph data
      const graphData = {
        metadata: this.serializeMetadata(graph.metadata),
        nodes: Array.from(graph.nodes.entries()).map(([id, node]) => [id, this.serializeNode(node)]),
        edges: Array.from(graph.edges.entries()).map(([id, edge]) => [id, this.serializeEdge(edge)]),
        clusters: Array.from(graph.clusters.entries()).map(([id, cluster]) => [id, cluster])
      }

      localStorage.setItem(`${this.storageKey}_${graph.metadata.id}`, JSON.stringify(graphData))

      // Update metadata list
      await this.updateMetadataList(graph.metadata)

      console.log(`Graph "${graph.metadata.title}" saved successfully`)
    } catch (error) {
      console.error('Failed to save graph:', error)
      throw new Error(`Failed to save graph: ${error}`)
    }
  }

  async loadGraph(graphId: string): Promise<SavedGraph | null> {
    try {
      const graphDataStr = localStorage.getItem(`${this.storageKey}_${graphId}`)
      if (!graphDataStr) {
        return null
      }

      const graphData = JSON.parse(graphDataStr)

      return {
        metadata: this.deserializeMetadata(graphData.metadata),
        nodes: new Map(graphData.nodes.map(([id, node]: [string, any]) => [id, this.deserializeNode(node)])),
        edges: new Map(graphData.edges.map(([id, edge]: [string, any]) => [id, this.deserializeEdge(edge)])),
        clusters: new Map(graphData.clusters)
      }
    } catch (error) {
      console.error(`Failed to load graph ${graphId}:`, error)
      return null
    }
  }

  async listGraphs(): Promise<GraphMetadata[]> {
    try {
      const metadataStr = localStorage.getItem(this.metadataKey)
      if (!metadataStr) {
        return []
      }

      const metadataList = JSON.parse(metadataStr)
      return metadataList.map((meta: any) => this.deserializeMetadata(meta))
    } catch (error) {
      console.error('Failed to list graphs:', error)
      return []
    }
  }

  async deleteGraph(graphId: string): Promise<void> {
    try {
      // Remove graph data
      localStorage.removeItem(`${this.storageKey}_${graphId}`)

      // Update metadata list
      const metadataList = await this.listGraphs()
      const updatedList = metadataList.filter(meta => meta.id !== graphId)
      localStorage.setItem(this.metadataKey, JSON.stringify(updatedList.map(meta => this.serializeMetadata(meta))))

      console.log(`Graph ${graphId} deleted successfully`)
    } catch (error) {
      console.error(`Failed to delete graph ${graphId}:`, error)
      throw error
    }
  }

  async searchAcrossGraphs(query: string): Promise<Array<{graphId: string, matches: any[]}>> {
    try {
      const graphs = await this.listGraphs()
      const results: Array<{graphId: string, matches: any[]}> = []

      for (const graphMeta of graphs) {
        const graph = await this.loadGraph(graphMeta.id)
        if (!graph) continue

        const matches: any[] = []

        // Search in node labels and content
        for (const [nodeId, node] of graph.nodes) {
          const searchText = `${node.label} ${node.richContent.markdown}`.toLowerCase()
          if (searchText.includes(query.toLowerCase())) {
            matches.push({
              type: 'node',
              id: nodeId,
              label: node.label,
              content: node.richContent.markdown?.substring(0, 200) + '...'
            })
          }
        }

        // Search in edge labels
        for (const [edgeId, edge] of graph.edges) {
          if (edge.label && edge.label.toLowerCase().includes(query.toLowerCase())) {
            matches.push({
              type: 'edge',
              id: edgeId,
              label: edge.label
            })
          }
        }

        if (matches.length > 0) {
          results.push({ graphId: graphMeta.id, matches })
        }
      }

      return results
    } catch (error) {
      console.error('Failed to search across graphs:', error)
      return []
    }
  }

  private async updateMetadataList(metadata: GraphMetadata): Promise<void> {
    const metadataList = await this.listGraphs()
    const existingIndex = metadataList.findIndex(meta => meta.id === metadata.id)

    if (existingIndex >= 0) {
      metadataList[existingIndex] = metadata
    } else {
      metadataList.push(metadata)
    }

    localStorage.setItem(this.metadataKey, JSON.stringify(metadataList.map(meta => this.serializeMetadata(meta))))
  }

  private serializeMetadata(metadata: GraphMetadata): any {
    return {
      ...metadata,
      created: metadata.created.toISOString(),
      modified: metadata.modified.toISOString()
    }
  }

  private deserializeMetadata(data: any): GraphMetadata {
    return {
      ...data,
      created: new Date(data.created),
      modified: new Date(data.modified)
    }
  }

  private serializeNode(node: EnhancedGraphNode): any {
    return {
      ...node,
      metadata: {
        ...node.metadata,
        created: node.metadata.created.toISOString(),
        modified: node.metadata.modified.toISOString()
      },
      aiMetadata: {
        ...node.aiMetadata,
        lastProcessed: node.aiMetadata.lastProcessed.toISOString()
      },
      similarities: Array.from(node.similarities.entries())
    }
  }

  private deserializeNode(data: any): EnhancedGraphNode {
    return {
      ...data,
      metadata: {
        ...data.metadata,
        created: new Date(data.metadata.created),
        modified: new Date(data.metadata.modified)
      },
      aiMetadata: {
        ...data.aiMetadata,
        lastProcessed: new Date(data.aiMetadata.lastProcessed)
      },
      similarities: new Map(data.similarities || [])
    }
  }

  private serializeEdge(edge: EnhancedGraphEdge): any {
    return {
      ...edge,
      metadata: {
        ...edge.metadata,
        created: edge.metadata.created.toISOString(),
        modified: edge.metadata.modified.toISOString()
      }
    }
  }

  private deserializeEdge(data: any): EnhancedGraphEdge {
    return {
      ...data,
      metadata: {
        ...data.metadata,
        created: new Date(data.metadata.created),
        modified: new Date(data.metadata.modified)
      }
    }
  }
}

/**
 * Create a default graph metadata
 */
export function createDefaultGraphMetadata(title?: string): GraphMetadata {
  const now = new Date()
  return {
    id: `graph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: title || `Graph ${now.toLocaleDateString()}`,
    description: '',
    created: now,
    modified: now,
    nodeCount: 0,
    edgeCount: 0,
    tags: [],
    version: '1.0'
  }
}
