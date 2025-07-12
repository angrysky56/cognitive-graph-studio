/**
 * Service integration layer for Cognitive Graph Studio
 *
 * Coordinates between AI, Vector, and TreeQuest services to provide
 * unified cognitive graph operations with enhanced reasoning capabilities.
 *
 * @module ServiceIntegration
 */

import { IAIService, AIService, LLMConfig } from './ai-service'
import { IVectorService, VectorService, VectorIndexConfig } from './vector-service'
import { TreeQuestEnhanced, ABMCTSConfig, TreeQuestState, ActionFunction } from './treequest-enhanced'
import {
  EnhancedGraphNode,
  SemanticSearchContext,
  SemanticSearchResult,
  TreeQuestContext,
  TreeQuestResult
} from '../types/enhanced-graph'

/**
 * Integrated service configuration
 */
export interface IntegratedServiceConfig {
  /** AI service configurations */
  ai: {
    providers: LLMConfig[]
    defaultProvider: 'gemini' | 'openai' | 'anthropic' | 'local-ollama' | 'local-lm-studio'
  }
  /** Vector service configuration */
  vector: VectorIndexConfig
  /** TreeQuest configuration */
  treequest: ABMCTSConfig
  /** Integration settings */
  integration: {
    /** Enable automatic embedding generation */
    autoEmbedding: boolean
    /** Enable TreeQuest for complex queries */
    useTreeQuestForComplexQueries: boolean
    /** Complexity threshold for TreeQuest activation */
    complexityThreshold: number
    /** Cache settings */
    cache: {
      enabled: boolean
      ttl: number
      maxSize: number
    }
  }
}

/**
 * Enhanced query interface for multi-service operations
 */
export interface EnhancedQuery {
  /** Primary query text */
  query: string
  /** Query type classification */
  type: 'simple' | 'complex' | 'reasoning' | 'discovery'
  /** Context nodes for enhanced reasoning */
  contextNodes?: string[]
  /** Semantic search filters */
  filters?: SemanticSearchContext['filters']
  /** TreeQuest reasoning parameters */
  reasoning?: {
    depth: number
    timeLimit: number
    useMultiModel: boolean
  }
  /** AI generation parameters */
  generation?: {
    temperature: number
    maxTokens: number
    model?: string
  }
}

/**
 * Unified query result with multi-service data
 */
export interface EnhancedQueryResult {
  /** Search results with semantic scoring */
  searchResults: SemanticSearchResult[]
  /** Generated content from AI */
  generatedContent?: string
  /** TreeQuest reasoning result */
  reasoningResult?: TreeQuestResult
  /** Performance metrics */
  metrics: {
    totalTime: number
    searchTime: number
    generationTime: number
    reasoningTime: number
    tokensUsed: number
    confidence: number
  }
  /** Service metadata */
  metadata: {
    servicesUsed: string[]
    cacheHit: boolean
    complexityScore: number
  }
}

/**
 * Integrated service manager for cognitive graph operations
 *
 * Provides unified interface to AI, Vector, and TreeQuest services
 * with intelligent routing and optimization capabilities.
 */
export class CognitiveGraphService {
  private aiService: IAIService
  private vectorService: IVectorService
  private treeQuestService: TreeQuestEnhanced
  private config: IntegratedServiceConfig
  private queryCache: Map<string, EnhancedQueryResult> = new Map()
  private isInitialized = false

  /**
   * Initialize integrated service
   */
  constructor(config: IntegratedServiceConfig) {
    this.config = config

    // Initialize AI service
    this.aiService = new AIService(
      config.ai.providers,
      config.ai.defaultProvider
    )

    // Initialize Vector service
    this.vectorService = new VectorService()

    // Initialize TreeQuest service
    this.treeQuestService = new TreeQuestEnhanced(config.treequest, this.aiService)
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Initialize vector service
      await this.vectorService.initialize(this.config.vector)

      // Register default TreeQuest action functions
      await this.registerDefaultActionFunctions()

      this.isInitialized = true
    } catch (error) {
      throw new Error(`Failed to initialize services: ${error}`)
    }
  }

  /**
   * Execute enhanced query with multi-service coordination
   */
  async executeEnhancedQuery(query: EnhancedQuery): Promise<EnhancedQueryResult> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    const startTime = Date.now()
    const cacheKey = this.generateCacheKey(query)

    // Check cache if enabled
    if (this.config.integration.cache.enabled && this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey)!
      cached.metadata.cacheHit = true
      return cached
    }

    const result: EnhancedQueryResult = {
      searchResults: [],
      metrics: {
        totalTime: 0,
        searchTime: 0,
        generationTime: 0,
        reasoningTime: 0,
        tokensUsed: 0,
        confidence: 0
      },
      metadata: {
        servicesUsed: [],
        cacheHit: false,
        complexityScore: this.calculateComplexityScore(query)
      }
    }

    // 1. Semantic Search (if needed)
    if (query.type === 'simple' || query.type === 'complex' || query.type === 'discovery') {
      result.searchResults = await this.performSemanticSearch(query)
      result.metadata.servicesUsed.push('vector')
    }

    // 2. AI Generation (if needed)
    if (query.type === 'complex' || query.type === 'discovery') {
      const generationResult = await this.performAIGeneration(query, result.searchResults)
      result.generatedContent = generationResult.content
      result.metrics.generationTime = generationResult.time
      result.metrics.tokensUsed += generationResult.tokens
      result.metadata.servicesUsed.push('ai')
    }

    // 3. TreeQuest Reasoning (for complex queries)
    if (this.shouldUseTreeQuest(query, result.metadata.complexityScore)) {
      const reasoningResult = await this.performTreeQuestReasoning(query, result.searchResults)
      result.reasoningResult = reasoningResult.result
      result.metrics.reasoningTime = reasoningResult.time
      result.metadata.servicesUsed.push('treequest')
    }

    // Calculate final metrics
    result.metrics.totalTime = Date.now() - startTime
    result.metrics.confidence = this.calculateOverallConfidence(result)

    // Cache result if enabled
    if (this.config.integration.cache.enabled) {
      this.cacheResult(cacheKey, result)
    }

    return result
  }

  /**
   * Add node with automatic embedding generation
   */
  async addNodeWithEmbedding(node: Omit<EnhancedGraphNode, 'richContent.embeddings'>): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    let embeddings: number[] = []

    if (this.config.integration.autoEmbedding) {
      // Generate embedding for node content
      const content = node.richContent.markdown + ' ' +
                    node.richContent.keyTerms.join(' ') + ' ' +
                    (node.richContent.summary || '')

      const embeddingResponse = await this.aiService.generateEmbedding({
        text: content
      })

      embeddings = embeddingResponse.embedding
    }

    // Add vector to vector service
    const vectorId = await this.vectorService.addVector({
      embedding: embeddings,
      metadata: {
        nodeId: node.id,
        contentHash: this.hashContent(node.richContent.markdown),
        created: new Date(),
        updated: new Date(),
        contentType: 'combined',
        tags: node.richContent.keyTerms,
        boost: 1.0
      }
    })

    return vectorId
  }

  /**
   * Perform semantic search with AI enhancement
   */
  private async performSemanticSearch(query: EnhancedQuery): Promise<SemanticSearchResult[]> {
    const searchStart = Date.now()

    // Generate query embedding
    const embeddingResponse = await this.aiService.generateEmbedding({
      text: query.query
    })

    // Perform vector search
    const searchContext: SemanticSearchContext = {
      query: query.query,
      embedding: embeddingResponse.embedding,
      filters: query.filters || {},
      k: 10
    }

    const vectorResults = await this.vectorService.search(searchContext)

    // Convert to semantic search results
    const searchResults: SemanticSearchResult[] = vectorResults.map(result => ({
      node: this.createMockEnhancedNode(result.nodeId), // Would fetch actual node
      score: result.similarity,
      reasoning: 'Semantic similarity match',
      highlights: [{
        field: 'content',
        snippet: query.query.substring(0, 100),
        score: result.similarity
      }]
    }))

    this.updateMetrics('search', Date.now() - searchStart)
    return searchResults
  }

  /**
   * Perform AI content generation
   */
  private async performAIGeneration(
    query: EnhancedQuery,
    searchResults: SemanticSearchResult[]
  ): Promise<{ content: string; time: number; tokens: number }> {
    const genStart = Date.now()

    // Build context from search results
    const context = searchResults
      .slice(0, 3)
      .map(result => result.node.richContent.markdown)
      .join('\n\n')

    const prompt = `Based on the following context, ${query.query}\n\nContext:\n${context}`

    const response = await this.aiService.generateText({
      prompt,
      systemPrompt: 'You are an expert knowledge synthesis agent.',
      temperature: query.generation?.temperature || 0.7,
      maxTokens: query.generation?.maxTokens || 8164
    })

    return {
      content: response.content,
      time: Date.now() - genStart,
      tokens: response.metadata.tokens.total
    }
  }

  /**
   * Perform TreeQuest enhanced reasoning
   */
  private async performTreeQuestReasoning(
    query: EnhancedQuery,
    searchResults: SemanticSearchResult[]
  ): Promise<{ result: TreeQuestResult; time: number }> {
    const reasoningStart = Date.now()

    // Create TreeQuest context
    const treeQuestContext: TreeQuestContext = {
      problemStatement: query.query,
      currentNode: searchResults[0]?.node.id || 'root',
      availableActions: ['explore', 'synthesize', 'critique', 'expand'],
      searchDepth: query.reasoning?.depth || 3,
      timeLimit: query.reasoning?.timeLimit || 30,
      constraints: {}
    }

    // Create action functions
    const actionFunctions: Record<string, ActionFunction> = {
      explore: this.createExploreActionFunction(query, searchResults),
      synthesize: this.createSynthesizeActionFunction(query, searchResults),
      critique: this.createCritiqueActionFunction(query, searchResults),
      expand: this.createExpandActionFunction(query, searchResults)
    }

    // Create initial tree
    const initialState: TreeQuestState = {
      id: crypto.randomUUID(),
      content: treeQuestContext.problemStatement,
      context: [],
      metadata: {
        depth: 0,
        path: [],
        score: 0,
        confidence: 1.0
      }
    }

    const tree = this.treeQuestService.initTree(initialState)

    // Execute search with time limit
    const startTime = Date.now()
    const timeLimit = treeQuestContext.timeLimit * 1000

    while (!this.treeQuestService.shouldTerminate(tree) &&
           (Date.now() - startTime) < timeLimit) {
      await this.treeQuestService.step(tree, actionFunctions)
    }

    // Get best result
    const topResults = this.treeQuestService.topK(tree, 5)
    const bestResult = topResults[0]

    if (!bestResult) {
      throw new Error('No valid results found')
    }

    const result: TreeQuestResult = {
      bestAction: bestResult[0].metadata.path[bestResult[0].metadata.path.length - 1] || 'no-action',
      confidence: bestResult[0].metadata.confidence,
      reasoning: `Selected based on AB-MCTS exploration with score ${bestResult[1].toFixed(3)}`,
      alternativeActions: topResults.slice(1, 4).map((result, index) => ({
        action: result[0].metadata.path[result[0].metadata.path.length - 1] || `alternative-${index}`,
        score: result[1],
        reasoning: `Alternative path with score ${result[1].toFixed(3)}`
      })),
      searchStats: {
        nodesExplored: tree.nodes.size,
        depth: tree.stats.maxDepth,
        timeElapsed: Date.now() - startTime
      }
    }

    return {
      result,
      time: Date.now() - reasoningStart
    }
  }

  /**
   * Register default action functions for TreeQuest
   */
  private async registerDefaultActionFunctions(): Promise<void> {
    // These would be more sophisticated in practice
    const defaultActions: Record<string, ActionFunction> = {
      'generate': async (parentState) => {
        const newState: TreeQuestState = {
          id: crypto.randomUUID(),
          content: `Generated from: ${parentState?.content || 'root'}`,
          context: parentState ? [...parentState.context, parentState.content] : [],
          metadata: {
            depth: (parentState?.metadata.depth || 0) + 1,
            path: [...(parentState?.metadata.path || []), 'generate'],
            score: Math.random(),
            confidence: 0.8
          }
        }
        return [newState, newState.metadata.score]
      },

      'refine': async (parentState) => {
        if (!parentState) {
          throw new Error('Refine action requires parent state')
        }

        const newState: TreeQuestState = {
          id: crypto.randomUUID(),
          content: `Refined: ${parentState.content}`,
          context: [...parentState.context, parentState.content],
          metadata: {
            depth: parentState.metadata.depth + 1,
            path: [...parentState.metadata.path, 'refine'],
            score: Math.min(1.0, parentState.metadata.score + 0.1),
            confidence: parentState.metadata.confidence + 0.05
          }
        }
        return [newState, newState.metadata.score]
      }
    }

    for (const [name, fn] of Object.entries(defaultActions)) {
      this.treeQuestService.registerActionFunction(name, fn)
    }
  }

  /**
   * Create explore action function
   */
  private createExploreActionFunction(
    query: EnhancedQuery,
    _searchResults: SemanticSearchResult[]
  ): ActionFunction {
    return async (parentState) => {
      const newState: TreeQuestState = {
        id: crypto.randomUUID(),
        content: `Exploring: ${query.query}`,
        context: parentState ? [...parentState.context, parentState.content] : [],
        metadata: {
          depth: (parentState?.metadata.depth || 0) + 1,
          path: [...(parentState?.metadata.path || []), 'explore'],
          score: _searchResults.length > 0 ? _searchResults[0].score : 0.5,
          confidence: 0.7
        }
      }
      return [newState, newState.metadata.score]
    }
  }

  /**
   * Create synthesize action function
   */
  private createSynthesizeActionFunction(
    query: EnhancedQuery,
    _searchResults: SemanticSearchResult[]
  ): ActionFunction {
    return async (parentState) => {
      const newState: TreeQuestState = {
        id: crypto.randomUUID(),
        content: `Synthesizing insights for: ${query.query}`,
        context: parentState ? [...parentState.context, parentState.content] : [],
        metadata: {
          depth: (parentState?.metadata.depth || 0) + 1,
          path: [...(parentState?.metadata.path || []), 'synthesize'],
          score: 0.8,
          confidence: 0.9
        }
      }
      return [newState, newState.metadata.score]
    }
  }

  /**
   * Create critique action function
   */
  private createCritiqueActionFunction(
    query: EnhancedQuery,
    _searchResults: SemanticSearchResult[]
  ): ActionFunction {
    return async (parentState) => {
      const newState: TreeQuestState = {
        id: crypto.randomUUID(),
        content: `Critiquing approach to: ${query.query}`,
        context: parentState ? [...parentState.context, parentState.content] : [],
        metadata: {
          depth: (parentState?.metadata.depth || 0) + 1,
          path: [...(parentState?.metadata.path || []), 'critique'],
          score: 0.6,
          confidence: 0.8
        }
      }
      return [newState, newState.metadata.score]
    }
  }

  /**
   * Create expand action function
   */
  private createExpandActionFunction(
    query: EnhancedQuery,
    _searchResults: SemanticSearchResult[]
  ): ActionFunction {
    return async (parentState) => {
      const newState: TreeQuestState = {
        id: crypto.randomUUID(),
        content: `Expanding on: ${query.query}`,
        context: parentState ? [...parentState.context, parentState.content] : [],
        metadata: {
          depth: (parentState?.metadata.depth || 0) + 1,
          path: [...(parentState?.metadata.path || []), 'expand'],
          score: 0.75,
          confidence: 0.85
        }
      }
      return [newState, newState.metadata.score]
    }
  }

  /**
   * Determine if TreeQuest should be used for query
   */
  private shouldUseTreeQuest(query: EnhancedQuery, complexityScore: number): boolean {
    return query.type === 'reasoning' ||
           (this.config.integration.useTreeQuestForComplexQueries &&
            complexityScore >= this.config.integration.complexityThreshold)
  }

  /**
   * Calculate query complexity score
   */
  private calculateComplexityScore(query: EnhancedQuery): number {
    let score = 0

    // Query length factor
    score += Math.min(0.3, query.query.length / 1000)

    // Type factor
    const typeScores = { simple: 0.1, complex: 0.6, reasoning: 0.9, discovery: 0.7 }
    score += typeScores[query.type] || 0.5

    // Context factor
    if (query.contextNodes && query.contextNodes.length > 0) {
      score += Math.min(0.2, query.contextNodes.length * 0.05)
    }

    // Reasoning parameters factor
    if (query.reasoning) {
      score += 0.2
      if (query.reasoning.useMultiModel) score += 0.1
    }

    return Math.min(1.0, score)
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(result: EnhancedQueryResult): number {
    let confidence = 0
    let factors = 0

    if (result.searchResults.length > 0) {
      confidence += result.searchResults[0].score
      factors++
    }

    if (result.reasoningResult) {
      confidence += result.reasoningResult.confidence
      factors++
    }

    return factors > 0 ? confidence / factors : 0.5
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(query: EnhancedQuery): string {
    return `${query.type}:${query.query}:${JSON.stringify(query.filters || {})}`
  }

  /**
   * Cache query result
   */
  private cacheResult(key: string, result: EnhancedQueryResult): void {
    if (this.queryCache.size >= this.config.integration.cache.maxSize) {
      // Remove oldest entry
      const firstKey = this.queryCache.keys().next().value
      if (firstKey) {
        this.queryCache.delete(firstKey)
      }
    }

    this.queryCache.set(key, result)

    // Set TTL cleanup
    setTimeout(() => {
      this.queryCache.delete(key)
    }, this.config.integration.cache.ttl)
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(operation: string, time: number): void {
    // Implementation for performance tracking
    console.log(`${operation} completed in ${time}ms`)
  }

  /**
   * Hash content for change detection
   */
  private hashContent(content: string): string {
    // Simple hash implementation
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString()
  }

  /**
   * Create mock enhanced node (would fetch real node in practice)
   */
  private createMockEnhancedNode(nodeId: string): EnhancedGraphNode {
    // This would fetch the actual node from the graph database
    return {
      id: nodeId,
      type: 'concept',
      label: `Node ${nodeId}`,
      position: { x: 0, y: 0 },
      richContent: {
        markdown: `Content for node ${nodeId}`,
        keyTerms: ['example', 'node'],
        relatedConcepts: [],
        sources: [],
        attachments: []
      },
      aiMetadata: {
        confidenceScore: 0.8,
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
      metadata: {
        created: new Date(),
        modified: new Date(),
        tags: ['mock'],
        author: 'system',
        color: '#cccccc',
        size: 1
      }
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    ai: boolean
    vector: boolean
    treequest: boolean
    overall: boolean
  }> {
    const [aiConnectionResult, vectorHealth] = await Promise.all([
      this.aiService.testConnection(this.config.ai.defaultProvider),
      this.checkVectorServiceHealth()
    ])

    const aiHealth = !!aiConnectionResult && typeof aiConnectionResult === 'object' && 'success' in aiConnectionResult
      ? (aiConnectionResult as any).success
      : false

    const treeQuestHealth = true // TreeQuest is local, always healthy

    return {
      ai: aiHealth,
      vector: vectorHealth,
      treequest: treeQuestHealth,
      overall: aiHealth && vectorHealth && treeQuestHealth
    }
  }

  /**
   * Check vector service health
   */
  private async checkVectorServiceHealth(): Promise<boolean> {
    try {
      await this.vectorService.getStatistics()
      return true
    } catch {
      return false
    }
  }
}