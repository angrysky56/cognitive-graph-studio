/**
 * Vector service for semantic search and embedding management
 * 
 * Implements the "vector databases for semantic search" concept from project blueprint.
 * Provides semantic similarity search, clustering, and embedding management
 * for the cognitive graph studio's "linked instantly" capability.
 * 
 * @module VectorService
 */

/**
 * Vector service for semantic search and embedding operations
 */

import { 
  SemanticSearchContext
} from '../types/enhanced-graph'

/**
 * Vector index configuration for optimal search performance
 */
export interface VectorIndexConfig {
  /** Embedding dimensions (typically 384, 768, or 1536) */
  dimensions: number
  /** Similarity metric for vector comparison */
  metric: 'cosine' | 'euclidean' | 'manhattan' | 'dot'
  /** Maximum number of vectors to store in memory */
  maxVectors: number
  /** Enable approximate nearest neighbor search for performance */
  useApproximateSearch: boolean
  /** Index persistence settings */
  persistence: {
    enabled: boolean
    path?: string
    autoSave: boolean
    saveInterval: number
  }
}

/**
 * Vector metadata for search optimization
 */
export interface VectorMetadata {
  /** Original node ID */
  nodeId: string
  /** Content hash for change detection */
  contentHash: string
  /** Creation timestamp */
  created: Date
  /** Last update timestamp */
  updated: Date
  /** Content type for filtering */
  contentType: 'title' | 'content' | 'summary' | 'combined'
  /** Additional search tags */
  tags: string[]
  /** Search boost factor */
  boost: number
}

/**
 * Stored vector with metadata and embedding
 */
export interface StoredVector {
  /** Unique vector ID */
  id: string
  /** High-dimensional embedding vector */
  embedding: number[]
  /** Associated metadata */
  metadata: VectorMetadata
  /** Optional vector normalization info */
  norm?: number
}

/**
 * Search result with similarity scoring
 */
export interface VectorSearchResult {
  /** Vector ID */
  vectorId: string
  /** Node ID from metadata */
  nodeId: string
  /** Similarity score (0-1, higher is more similar) */
  similarity: number
  /** Search metadata */
  metadata: VectorMetadata
  /** Optional explanation of why this result was returned */
  reasoning?: string
}

/**
 * Clustering result for graph organization
 */
export interface VectorCluster {
  /** Cluster ID */
  id: string
  /** Cluster centroid vector */
  centroid: number[]
  /** Vector IDs in this cluster */
  vectorIds: string[]
  /** Cluster coherence score (0-1) */
  coherence: number
  /** Cluster radius (maximum distance from centroid) */
  radius: number
  /** Cluster label (auto-generated or manual) */
  label?: string
}

/**
 * Vector service interface for semantic operations
 * 
 * Provides high-performance semantic search, clustering, and embedding
 * management for cognitive graph nodes with "vast info" capability.
 */
export interface IVectorService {
  /**
   * Initialize vector index with configuration
   * @param config - Vector index configuration
   * @returns Promise resolving when index is ready
   */
  initialize(config: VectorIndexConfig): Promise<void>

  /**
   * Add or update vector in the index
   * @param vector - Vector with embedding and metadata
   * @returns Promise resolving to vector ID
   */
  addVector(vector: Omit<StoredVector, 'id'>): Promise<string>

  /**
   * Remove vector from index
   * @param vectorId - Vector ID to remove
   * @returns Promise resolving to success status
   */
  removeVector(vectorId: string): Promise<boolean>

  /**
   * Update vector metadata without changing embedding
   * @param vectorId - Vector ID to update
   * @param metadata - New metadata
   * @returns Promise resolving to success status
   */
  updateMetadata(vectorId: string, metadata: Partial<VectorMetadata>): Promise<boolean>

  /**
   * Perform semantic search with context filtering
   * @param context - Search context with query and filters
   * @returns Promise resolving to ranked search results
   */
  search(context: SemanticSearchContext): Promise<VectorSearchResult[]>

  /**
   * Find similar vectors to a given vector
   * @param embedding - Query embedding vector
   * @param k - Number of results to return
   * @param filters - Optional metadata filters
   * @returns Promise resolving to similar vectors
   */
  findSimilar(
    embedding: number[], 
    k: number, 
    filters?: Partial<VectorMetadata>
  ): Promise<VectorSearchResult[]>

  /**
   * Cluster vectors for graph organization
   * @param vectorIds - Optional subset of vectors to cluster
   * @param numClusters - Target number of clusters
   * @returns Promise resolving to cluster results
   */
  clusterVectors(vectorIds?: string[], numClusters?: number): Promise<VectorCluster[]>

  /**
   * Get vector statistics and health metrics
   * @returns Promise resolving to index statistics
   */
  getStatistics(): Promise<{
    totalVectors: number
    dimensions: number
    memoryUsage: number
    lastUpdate: Date
    searchCount: number
    averageSearchTime: number
  }>

  /**
   * Rebuild index for optimization
   * @returns Promise resolving when rebuild is complete
   */
  rebuildIndex(): Promise<void>
}

/**
 * High-performance vector service implementation
 * 
 * Uses in-memory index with optional persistence for fast semantic search
 * and clustering operations on cognitive graph embeddings.
 */
export class VectorService implements IVectorService {
  private config: VectorIndexConfig | null = null
  private vectors: Map<string, StoredVector> = new Map()
  private normalizedVectors: Map<string, number[]> = new Map()
  private searchCount = 0
  private totalSearchTime = 0
  private lastUpdate = new Date()

  /**
   * Initialize vector service with configuration
   */
  async initialize(config: VectorIndexConfig): Promise<void> {
    this.config = config
    
    // Load persisted vectors if enabled
    if (config.persistence.enabled && config.persistence.path) {
      await this.loadPersistedVectors(config.persistence.path)
    }

    // Set up auto-save if enabled
    if (config.persistence.enabled && config.persistence.autoSave) {
      setInterval(
        () => this.saveVectors(),
        config.persistence.saveInterval * 1000
      )
    }
  }

  /**
   * Add or update vector in the index
   */
  async addVector(vector: Omit<StoredVector, 'id'>): Promise<string> {
    if (!this.config) {
      throw new Error('Vector service not initialized')
    }

    // Validate embedding dimensions
    if (vector.embedding.length !== this.config.dimensions) {
      throw new Error(
        `Embedding dimensions (${vector.embedding.length}) don't match config (${this.config.dimensions})`
      )
    }

    // Generate or reuse vector ID
    const vectorId = this.generateVectorId(vector.metadata.nodeId, vector.metadata.contentType)
    
    // Store vector
    const storedVector: StoredVector = {
      id: vectorId,
      ...vector
    }
    
    this.vectors.set(vectorId, storedVector)
    
    // Pre-compute normalized vector for cosine similarity
    if (this.config.metric === 'cosine') {
      this.normalizedVectors.set(vectorId, this.normalizeVector(vector.embedding))
    }

    this.lastUpdate = new Date()
    
    // Check memory limits
    if (this.vectors.size > this.config.maxVectors) {
      await this.evictOldestVectors()
    }

    return vectorId
  }

  /**
   * Remove vector from index
   */
  async removeVector(vectorId: string): Promise<boolean> {
    const removed = this.vectors.delete(vectorId)
    this.normalizedVectors.delete(vectorId)
    
    if (removed) {
      this.lastUpdate = new Date()
    }
    
    return removed
  }

  /**
   * Update vector metadata
   */
  async updateMetadata(vectorId: string, metadata: Partial<VectorMetadata>): Promise<boolean> {
    const vector = this.vectors.get(vectorId)
    
    if (!vector) {
      return false
    }

    vector.metadata = { ...vector.metadata, ...metadata, updated: new Date() }
    this.lastUpdate = new Date()
    
    return true
  }

  /**
   * Perform semantic search with advanced filtering
   */
  async search(context: SemanticSearchContext): Promise<VectorSearchResult[]> {
    if (!this.config) {
      throw new Error('Vector service not initialized')
    }

    const startTime = Date.now()
    
    let queryEmbedding: number[]
    
    if (context.embedding) {
      queryEmbedding = context.embedding
    } else {
      // This would need AI service integration for embedding generation
      throw new Error('Query embedding required for search')
    }

    // Apply filters to get candidate vectors
    const candidates = this.applyCandidateFilters(context.filters)
    
    // Calculate similarities
    const results: VectorSearchResult[] = []
    
    for (const vectorId of candidates) {
      const vector = this.vectors.get(vectorId)
      if (!vector) continue

      const similarity = this.calculateSimilarity(queryEmbedding, vector.embedding)
      
      results.push({
        vectorId,
        nodeId: vector.metadata.nodeId,
        similarity,
        metadata: vector.metadata
      })
    }

    // Sort by similarity and apply boost factors
    results.sort((a, b) => {
      const scoreA = a.similarity * a.metadata.boost
      const scoreB = b.similarity * b.metadata.boost
      return scoreB - scoreA
    })

    // Track search performance
    const searchTime = Date.now() - startTime
    this.searchCount++
    this.totalSearchTime += searchTime

    return results.slice(0, context.k)
  }

  /**
   * Find similar vectors to a given embedding
   */
  async findSimilar(
    embedding: number[], 
    k: number, 
    filters?: Partial<VectorMetadata>
  ): Promise<VectorSearchResult[]> {
    if (!this.config) {
      throw new Error('Vector service not initialized')
    }

    const candidates = filters ? this.applyCandidateFilters(filters) : Array.from(this.vectors.keys())
    const results: VectorSearchResult[] = []

    for (const vectorId of candidates) {
      const vector = this.vectors.get(vectorId)
      if (!vector) continue

      const similarity = this.calculateSimilarity(embedding, vector.embedding)
      
      results.push({
        vectorId,
        nodeId: vector.metadata.nodeId,
        similarity,
        metadata: vector.metadata
      })
    }

    results.sort((a, b) => b.similarity - a.similarity)
    return results.slice(0, k)
  }

  /**
   * Cluster vectors using k-means algorithm
   */
  async clusterVectors(vectorIds?: string[], numClusters?: number): Promise<VectorCluster[]> {
    if (!this.config) {
      throw new Error('Vector service not initialized')
    }

    const targetVectors = vectorIds 
      ? vectorIds.map(id => this.vectors.get(id)).filter(Boolean) as StoredVector[]
      : Array.from(this.vectors.values())

    if (targetVectors.length === 0) {
      return []
    }

    const k = numClusters ?? Math.min(Math.ceil(Math.sqrt(targetVectors.length / 2)), 10)
    
    // Initialize centroids randomly
    const centroids = this.initializeRandomCentroids(targetVectors, k)
    const clusters: VectorCluster[] = []
    let assignments = new Map<string, number>()
    
    // K-means iteration
    for (let iter = 0; iter < 50; iter++) {
      // Assign vectors to nearest centroids
      assignments = new Map<string, number>()
      
      for (const vector of targetVectors) {
        let bestCluster = 0
        let bestDistance = Infinity
        
        for (let i = 0; i < centroids.length; i++) {
          const distance = this.calculateDistance(vector.embedding, centroids[i])
          if (distance < bestDistance) {
            bestDistance = distance
            bestCluster = i
          }
        }
        
        assignments.set(vector.id, bestCluster)
      }
      
      // Update centroids
      const newCentroids = this.updateCentroids(targetVectors, assignments, k)
      
      // Check for convergence
      if (this.centroidsConverged(centroids, newCentroids)) {
        break
      }
      
      centroids.splice(0, centroids.length, ...newCentroids)
    }

    // Build cluster results
    for (let i = 0; i < k; i++) {
      const vectorsInCluster = targetVectors.filter(v => 
        assignments.get(v.id) === i
      )
      
      if (vectorsInCluster.length === 0) continue

      const coherence = this.calculateClusterCoherence(vectorsInCluster, centroids[i])
      const radius = this.calculateClusterRadius(vectorsInCluster, centroids[i])
      
      clusters.push({
        id: `cluster-${i}`,
        centroid: centroids[i],
        vectorIds: vectorsInCluster.map(v => v.id),
        coherence,
        radius
      })
    }

    return clusters
  }

  /**
   * Get index statistics
   */
  async getStatistics(): Promise<{
    totalVectors: number
    dimensions: number
    memoryUsage: number
    lastUpdate: Date
    searchCount: number
    averageSearchTime: number
  }> {
    const memoryUsage = this.estimateMemoryUsage()
    const averageSearchTime = this.searchCount > 0 ? this.totalSearchTime / this.searchCount : 0

    return {
      totalVectors: this.vectors.size,
      dimensions: this.config?.dimensions ?? 0,
      memoryUsage,
      lastUpdate: this.lastUpdate,
      searchCount: this.searchCount,
      averageSearchTime
    }
  }

  /**
   * Rebuild index for optimization
   */
  async rebuildIndex(): Promise<void> {
    if (!this.config) {
      throw new Error('Vector service not initialized')
    }

    // Clear caches
    this.normalizedVectors.clear()
    
    // Rebuild normalized vectors if using cosine similarity
    if (this.config.metric === 'cosine') {
      for (const [id, vector] of this.vectors.entries()) {
        this.normalizedVectors.set(id, this.normalizeVector(vector.embedding))
      }
    }

    this.lastUpdate = new Date()
  }

  /**
   * Private method: Generate deterministic vector ID
   */
  private generateVectorId(nodeId: string, contentType: string): string {
    return `${nodeId}:${contentType}`
  }

  /**
   * Private method: Normalize vector for cosine similarity
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    
    if (magnitude === 0) {
      return new Array(vector.length).fill(0)
    }
    
    return vector.map(val => val / magnitude)
  }

  /**
   * Private method: Calculate similarity between vectors
   */
  private calculateSimilarity(a: number[], b: number[]): number {
    if (!this.config) return 0

    switch (this.config.metric) {
      case 'cosine':
        return this.cosineSimilarity(a, b)
      case 'euclidean':
        return 1 / (1 + this.euclideanDistance(a, b))
      case 'manhattan':
        return 1 / (1 + this.manhattanDistance(a, b))
      case 'dot':
        return this.dotProduct(a, b)
      default:
        return this.cosineSimilarity(a, b)
    }
  }

  /**
   * Private method: Calculate distance between vectors
   */
  private calculateDistance(a: number[], b: number[]): number {
    if (!this.config) return Infinity

    switch (this.config.metric) {
      case 'cosine':
        return 1 - this.cosineSimilarity(a, b)
      case 'euclidean':
        return this.euclideanDistance(a, b)
      case 'manhattan':
        return this.manhattanDistance(a, b)
      case 'dot':
        return -this.dotProduct(a, b) // Negative for distance
      default:
        return this.euclideanDistance(a, b)
    }
  }

  /**
   * Private method: Cosine similarity calculation
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const normA = this.normalizeVector(a)
    const normB = this.normalizeVector(b)
    return this.dotProduct(normA, normB)
  }

  /**
   * Private method: Euclidean distance calculation
   */
  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0))
  }

  /**
   * Private method: Manhattan distance calculation
   */
  private manhattanDistance(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + Math.abs(val - b[i]), 0)
  }

  /**
   * Private method: Dot product calculation
   */
  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0)
  }

  /**
   * Private method: Apply candidate filters for search optimization
   */
  private applyCandidateFilters(filters: SemanticSearchContext['filters']): string[] {
    let candidates = Array.from(this.vectors.keys())

    if (!filters) return candidates

    if (filters.nodeTypes) {
      candidates = candidates.filter(id => {
        const vector = this.vectors.get(id)
        return vector && filters.nodeTypes!.includes(vector.metadata.contentType)
      })
    }

    if (filters.tags) {
      candidates = candidates.filter(id => {
        const vector = this.vectors.get(id)
        return vector && filters.tags!.some((tag: string) => vector.metadata.tags.includes(tag))
      })
    }

    if (filters.dateRange) {
      candidates = candidates.filter(id => {
        const vector = this.vectors.get(id)
        if (!vector) return false
        
        const created = vector.metadata.created
        return created >= filters.dateRange!.start && created <= filters.dateRange!.end
      })
    }

    return candidates
  }

  /**
   * Private method: Evict oldest vectors when memory limit exceeded
   */
  private async evictOldestVectors(): Promise<void> {
    if (!this.config) return

    const sortedVectors = Array.from(this.vectors.values())
      .sort((a, b) => a.metadata.updated.getTime() - b.metadata.updated.getTime())

    const toRemove = Math.floor(this.config.maxVectors * 0.1) // Remove 10%
    
    for (let i = 0; i < toRemove; i++) {
      await this.removeVector(sortedVectors[i].id)
    }
  }

  /**
   * Private method: Initialize random centroids for k-means
   */
  private initializeRandomCentroids(vectors: StoredVector[], k: number): number[][] {
    const centroids: number[][] = []
    // const dimensions = this.config?.dimensions ?? vectors[0].embedding.length // TODO: Use for validation

    for (let i = 0; i < k; i++) {
      const randomVector = vectors[Math.floor(Math.random() * vectors.length)]
      centroids.push([...randomVector.embedding])
    }

    return centroids
  }

  /**
   * Private method: Update centroids for k-means
   */
  private updateCentroids(
    vectors: StoredVector[], 
    assignments: Map<string, number>, 
    k: number
  ): number[][] {
    const centroids: number[][] = []
    const dimensions = this.config?.dimensions ?? vectors[0].embedding.length

    for (let i = 0; i < k; i++) {
      const clusterVectors = vectors.filter(v => assignments.get(v.id) === i)
      
      if (clusterVectors.length === 0) {
        // Random centroid if no vectors assigned
        centroids.push(new Array(dimensions).fill(0).map(() => Math.random()))
        continue
      }

      const centroid = new Array(dimensions).fill(0)
      
      for (const vector of clusterVectors) {
        for (let j = 0; j < dimensions; j++) {
          centroid[j] += vector.embedding[j]
        }
      }
      
      for (let j = 0; j < dimensions; j++) {
        centroid[j] /= clusterVectors.length
      }
      
      centroids.push(centroid)
    }

    return centroids
  }

  /**
   * Private method: Check if centroids have converged
   */
  private centroidsConverged(old: number[][], updated: number[][]): boolean {
    const threshold = 0.001
    
    for (let i = 0; i < old.length; i++) {
      const distance = this.euclideanDistance(old[i], updated[i])
      if (distance > threshold) {
        return false
      }
    }
    
    return true
  }

  /**
   * Private method: Calculate cluster coherence
   */
  private calculateClusterCoherence(vectors: StoredVector[], centroid: number[]): number {
    if (vectors.length === 0) return 0

    const distances = vectors.map(v => this.calculateDistance(v.embedding, centroid))
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length
    const maxDistance = Math.max(...distances)
    
    return maxDistance > 0 ? 1 - (avgDistance / maxDistance) : 1
  }

  /**
   * Private method: Calculate cluster radius
   */
  private calculateClusterRadius(vectors: StoredVector[], centroid: number[]): number {
    if (vectors.length === 0) return 0

    const distances = vectors.map(v => this.calculateDistance(v.embedding, centroid))
    return Math.max(...distances)
  }

  /**
   * Private method: Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    const vectorSize = this.config?.dimensions ?? 0
    const vectorCount = this.vectors.size
    
    // Rough estimate: 8 bytes per float + metadata overhead
    return vectorCount * (vectorSize * 8 + 1024) // 1KB metadata per vector
  }

  /**
   * Private method: Load persisted vectors from disk
   */
  private async loadPersistedVectors(path: string): Promise<void> {
    // Implementation would depend on the persistence mechanism
    // Could use IndexedDB, file system, or database
    console.log(`Loading vectors from ${path}`)
  }

  /**
   * Add node embedding for a graph node
   */
  async addNodeEmbedding(node: any): Promise<string> {
    // For now, generate a simple embedding based on content
    // In a real implementation, this would use an embedding model
    const content = `${node.label} ${node.content}`.toLowerCase()
    const words = content.split(/\s+/).filter(w => w.length > 2)
    
    // Create a simple bag-of-words embedding (768 dimensions)
    const embedding = new Array(768).fill(0)
    
    // Simple hash-based embedding
    for (const word of words) {
      const hash = this.simpleHash(word)
      const index = Math.abs(hash) % 768
      embedding[index] += 1 / words.length
    }
    
    const vectorId = await this.addVector({
      embedding,
      metadata: {
        nodeId: node.id,
        contentHash: this.simpleHash(content),
        created: new Date(),
        updated: new Date(),
        contentType: 'combined',
        tags: node.metadata?.tags || [],
        boost: 1.0
      }
    })
    
    return vectorId
  }

  /**
   * Search for similar content using text query
   */
  async searchSimilar(query: string, limit: number = 10): Promise<any[]> {
    // Generate embedding for the query
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    const queryEmbedding = new Array(768).fill(0)
    
    for (const word of words) {
      const hash = this.simpleHash(word)
      const index = Math.abs(hash) % 768
      queryEmbedding[index] += 1 / words.length
    }
    
    // Find similar vectors
    const results = await this.findSimilar(queryEmbedding, limit)
    
    // Convert to node-like results
    return results.map(result => ({
      nodeId: result.nodeId,
      similarity: result.similarity,
      metadata: result.metadata
    }))
  }

  /**
   * Simple hash function for text
   */
  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash
  }

  /**
   * Private method: Save vectors to disk
   */
  private async saveVectors(): Promise<void> {
    if (!this.config?.persistence.enabled || !this.config.persistence.path) {
      return
    }
    
    // Implementation would depend on the persistence mechanism
    console.log(`Saving ${this.vectors.size} vectors to ${this.config.persistence.path}`)
  }
}

// Export singleton instance
export const vectorService = new VectorService()
export default vectorService
