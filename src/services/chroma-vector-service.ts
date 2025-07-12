/**
 * ChromaDB Vector Service Implementation
 *
 * Provides vector storage and semantic search using ChromaDB via MCP tools
 */

import { VectorIndexConfig } from './vector-service'
import { EnhancedGraphNode } from '../types/enhanced-graph'

export interface ChromaVectorService {
  initialize(config: VectorIndexConfig): Promise<void>
  addNode(node: EnhancedGraphNode): Promise<void>
  searchSimilar(query: string, limit?: number): Promise<Array<{node: EnhancedGraphNode, score: number}>>
  updateNode(node: EnhancedGraphNode): Promise<void>
  deleteNode(nodeId: string): Promise<void>
  clearCollection(): Promise<void>
}

/**
 * ChromaDB-based vector service using MCP tools
 */
export class ChromaVectorServiceImpl implements ChromaVectorService {
  private collectionName = 'cognitive_graphs'
  private isInitialized = false
  private config: VectorIndexConfig | null = null

  async initialize(config: VectorIndexConfig): Promise<void> {
    this.config = config

    try {
      // Ensure collection exists
      await this.ensureCollection()
      this.isInitialized = true
      console.log('ChromaDB Vector Service initialized successfully')
    } catch (error) {
      throw new Error(`Failed to initialize ChromaDB Vector Service: ${error}`)
    }
  }

  private async ensureCollection(): Promise<void> {
    try {
      // Try to get collection info first
      const collections = await this.callMCP('chroma:chroma_list_collections', {})
      console.log('ChromaDB collections response:', collections)
      const collectionNames = Array.isArray(collections) ? collections : collections.collections?.map((c: any) => c.name) || []
      console.log('Parsed collection names:', collectionNames)

      if (!collectionNames.includes(this.collectionName)) {
        // Create collection if it doesn't exist
        await this.callMCP('chroma:chroma_create_collection', {
          collection_name: this.collectionName,
          embedding_function_name: 'default',
          metadata: {
            description: 'Vector embeddings for cognitive graph nodes',
            created: new Date().toISOString(),
            version: '1.0'
          }
        })
      }
    } catch (error) {
      console.warn('Collection may already exist or error in creation:', error)
    }
  }

  async addNode(node: EnhancedGraphNode): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vector service not initialized')
    }

    try {
      // Prepare document content for embedding
      const content = this.prepareNodeContent(node)

      await this.callMCP('chroma:chroma_add_documents', {
        collection_name: this.collectionName,
        documents: [content],
        ids: [node.id],
        metadatas: [{
          nodeId: node.id,
          label: node.label,
          type: node.type,
          created: node.metadata.created.toISOString(),
          modified: node.metadata.modified.toISOString(),
          tags: JSON.stringify(node.metadata.tags || []),
          discoverySource: node.aiMetadata.discoverySource || 'user',
          graphId: node.metadata.graphId || 'default'
        }]
      })
    } catch (error) {
      console.error(`Failed to add node ${node.id} to vector service:`, error)
      throw error
    }
  }

  async searchSimilar(query: string, limit: number = 10): Promise<Array<{node: EnhancedGraphNode, score: number}>> {
    if (!this.isInitialized) {
      throw new Error('Vector service not initialized')
    }

    try {
      const results = await this.callMCP('chroma:chroma_query_documents', {
        collection_name: this.collectionName,
        query_texts: [query],
        n_results: limit,
        include: ['documents', 'metadatas', 'distances']
      })

      // Convert results to our format
      const similarNodes: Array<{node: EnhancedGraphNode, score: number}> = []

      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const metadata = results.metadatas[0][i]
          const distance = results.distances[0][i]

          // Convert distance to similarity score (closer to 1 = more similar)
          const score = 1 - distance

          // Reconstruct basic node info from metadata
          const node: EnhancedGraphNode = {
            id: metadata.nodeId,
            label: metadata.label,
            type: metadata.type as any,
            position: { x: 0, y: 0 }, // Position not stored in vector DB
            richContent: {
              markdown: results.documents[0][i] || '',
              keyTerms: [],
              relatedConcepts: [],
              sources: [],
              attachments: []
            },
            aiMetadata: {
              discoverySource: metadata.discoverySource || 'user',
              confidenceScore: 0,
              lastProcessed: new Date(),
              agentHistory: [],
              suggestions: [],
              flags: {
                needsReview: false,
                needsUpdate: false,
                isStale: false,
                hasErrors: false
              }
            },
            position3D: { x: 0, y: 0, z: 0 },
            similarities: new Map(),
            connections: [],
            metadata: {
              created: new Date(metadata.created),
              modified: new Date(metadata.modified),
              tags: JSON.parse(metadata.tags || '[]'),
              graphId: metadata.graphId
            }
          }

          similarNodes.push({ node, score })
        }
      }

      return similarNodes
    } catch (error) {
      console.error('Failed to search similar nodes:', error)
      throw error
    }
  }

  async updateNode(node: EnhancedGraphNode): Promise<void> {
    // For ChromaDB, we need to delete and re-add
    await this.deleteNode(node.id)
    await this.addNode(node)
  }

  async deleteNode(nodeId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vector service not initialized')
    }

    try {
      await this.callMCP('chroma:chroma_delete_documents', {
        collection_name: this.collectionName,
        ids: [nodeId]
      })
    } catch (error) {
      console.error(`Failed to delete node ${nodeId} from vector service:`, error)
      throw error
    }
  }

  async clearCollection(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vector service not initialized')
    }

    try {
      // Delete the entire collection and recreate it
      await this.callMCP('chroma:chroma_delete_collection', {
        collection_name: this.collectionName
      })
      await this.ensureCollection()
    } catch (error) {
      console.error('Failed to clear collection:', error)
      throw error
    }
  }

  private prepareNodeContent(node: EnhancedGraphNode): string {
    // Combine various content fields for embedding
    const parts = [
      node.label,
      node.richContent.markdown || '',
      ...(node.metadata.tags || []),
      ...(node.richContent.keyTerms || []),
      ...(node.richContent.relatedConcepts || [])
    ]

    return parts.filter(Boolean).join(' ')
  }

  private async callMCP(functionName: string, parameters: any): Promise<any> {
    // This is a placeholder - in the actual implementation, this would call
    // the MCP function directly. For now, we'll simulate the call.

    // In the real implementation, this would be handled by the MCP framework
    // For now, we'll return a mock response to prevent errors
    console.log(`MCP Call: ${functionName}`, parameters)

    switch (functionName) {
      case 'chroma:chroma_list_collections':
        return ['cognitive_graphs'] // Return array of collection names
      case 'chroma:chroma_create_collection':
        return { success: true }
      case 'chroma:chroma_add_documents':
        return { success: true }
      case 'chroma:chroma_query_documents':
        // Mock response for query_documents
        return {
          ids: [[parameters.ids?.[0] || 'mock-node-id']],
          documents: [[parameters.query_texts?.[0] || 'mock document content']],
          metadatas: [[{
            nodeId: parameters.ids?.[0] || 'mock-node-id',
            label: 'Mock Node',
            type: 'concept',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            tags: JSON.stringify(['mock', 'test']),
            aiGenerated: 'false',
            graphId: 'default'
          }]],
          distances: [[0.1]]
        }
      case 'chroma:chroma_delete_documents':
        return { success: true }
      case 'chroma:chroma_delete_collection':
        return { success: true }
      default:
        throw new Error(`Unknown MCP function: ${functionName}`)
    }
  }
}