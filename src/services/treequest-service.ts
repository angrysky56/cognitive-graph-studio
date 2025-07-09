/**
 * TreeQuest service implementation using enhanced AB-MCTS algorithms
 * 
 * This service provides a simplified interface to the enhanced TreeQuest implementation
 * while maintaining backward compatibility with the existing system architecture.
 * 
 * @module TreeQuestService
 */

import { TreeQuestEnhanced, ABMCTSConfig, ABMCTSTree, TreeQuestState } from './treequest-enhanced'
import { 
  TreeQuestContext, 
  TreeQuestResult 
} from '../types/enhanced-graph'
import { IAIService } from './ai-service'

/**
 * TreeQuest configuration for reasoning operations (legacy compatibility)
 */
export interface TreeQuestConfig {
  /** Algorithm variant: A (aggregation) or M (mixed models) */
  algorithm: 'abmcts-a' | 'abmcts-m' | 'standard-mcts'
  /** Maximum search depth for tree exploration */
  maxDepth: number
  /** Time limit for search in seconds */
  timeLimit: number
  /** Number of simulations per search */
  simulations: number
  /** Exploration vs exploitation parameter (UCB1) */
  explorationConstant: number
  /** Multiple LLM configurations for ABMCTS-M */
  llmConfigs: {
    provider: string
    model: string
    weight: number
  }[]
  /** Enable adaptive branching */
  adaptiveBranching: boolean
  /** Confidence threshold for early termination */
  confidenceThreshold: number
}

/**
 * TreeQuest reasoning service interface (legacy compatibility)
 */
export interface ITreeQuestService {
  /**
   * Initialize TreeQuest service with configuration
   */
  initialize(config: TreeQuestConfig, aiService: IAIService): Promise<void>

  /**
   * Execute TreeQuest reasoning for decision making
   */
  reason(
    context: TreeQuestContext,
    generators: Record<string, (state: any) => Promise<{ action: string; newState: any; reward: number; confidence: number; reasoning: string }>>
  ): Promise<TreeQuestResult>

  /**
   * Create new search tree for problem exploration
   */
  createSearchTree(initialState: any, availableActions: string[]): Promise<ABMCTSTree>

  /**
   * Perform single search iteration
   */
  searchIteration(
    tree: ABMCTSTree,
    generators: Record<string, (state: any) => Promise<{ action: string; newState: any; reward: number; confidence: number; reasoning: string }>>
  ): Promise<ABMCTSTree>

  /**
   * Get best action from current search tree
   */
  getBestAction(tree: ABMCTSTree): {
    action: string
    confidence: number
    reasoning: string
    alternatives: { action: string; score: number; reasoning: string }[]
  }

  /**
   * Get search tree statistics and diagnostics
   */
  analyzeTree(tree: ABMCTSTree): {
    depth: number
    breadth: number
    convergence: number
    explorationRate: number
    optimalPath: string[]
    nodeDistribution: Record<number, number>
  }
}

/**
 * Simplified TreeQuest service interface for backward compatibility
 */
export class TreeQuestService implements ITreeQuestService {
  private enhancedService: TreeQuestEnhanced | null = null
  private config: ABMCTSConfig | null = null

  /**
   * Initialize TreeQuest service with enhanced implementation
   */
  async initialize(config: TreeQuestConfig, aiService: IAIService): Promise<void> {
    // Convert legacy config to enhanced config
    const enhancedConfig: ABMCTSConfig = {
      algorithm: config.algorithm as 'abmcts-a' | 'abmcts-m',
      explorationConstant: config.explorationConstant,
      maxTime: config.timeLimit * 1000,
      maxSimulations: config.simulations,
      adaptiveBranching: {
        enabled: config.adaptiveBranching,
        minBranching: 2,
        maxBranching: 5,
        confidenceThreshold: config.confidenceThreshold
      },
      multiLLM: {
        enabled: config.algorithm === 'abmcts-m',
        models: config.llmConfigs.map(llm => ({
          provider: llm.provider,
          model: llm.model,
          weight: llm.weight
        }))
      }
    }

    this.config = enhancedConfig
    this.enhancedService = new TreeQuestEnhanced(enhancedConfig, aiService)
  }

  /**
   * Execute TreeQuest reasoning using enhanced AB-MCTS
   */
  async reason(
    context: TreeQuestContext,
    generators: Record<string, (state: any) => Promise<{ action: string; newState: any; reward: number; confidence: number; reasoning: string }>>
  ): Promise<TreeQuestResult> {
    if (!this.enhancedService || !this.config) {
      throw new Error('TreeQuest service not initialized')
    }

    // Convert generators to enhanced format
    const enhancedGenerators: Record<string, (parentState: TreeQuestState | null) => Promise<[TreeQuestState, number]>> = {}
    
    for (const [actionName, generator] of Object.entries(generators)) {
      enhancedGenerators[actionName] = async (parentState) => {
        const result = await generator(parentState)
        
        const newState: TreeQuestState = {
          id: crypto.randomUUID(),
          content: result.newState.content || result.action,
          context: parentState ? [...parentState.context, parentState.content] : [],
          metadata: {
            depth: (parentState?.metadata.depth || 0) + 1,
            path: [...(parentState?.metadata.path || []), result.action],
            score: result.reward,
            confidence: result.confidence
          }
        }
        
        return [newState, result.reward]
      }
    }

    // Create initial tree
    const initialState: TreeQuestState = {
      id: crypto.randomUUID(),
      content: context.problemStatement,
      context: [],
      metadata: {
        depth: 0,
        path: [],
        score: 0,
        confidence: 1.0
      }
    }

    const tree = this.enhancedService.initTree(initialState)

    // Execute search with time limit
    const startTime = Date.now()
    const timeLimit = context.timeLimit * 1000

    while (!this.enhancedService.shouldTerminate(tree) && 
           (Date.now() - startTime) < timeLimit) {
      await this.enhancedService.step(tree, enhancedGenerators)
    }

    // Get best result
    const topResults = this.enhancedService.topK(tree, 5)
    const bestResult = topResults[0]
    const alternativeResults = topResults.slice(1, 4)

    if (!bestResult) {
      throw new Error('No valid results found')
    }

    const searchStats = this.enhancedService.getSearchStats(tree)

    return {
      bestAction: bestResult[0].metadata.path[bestResult[0].metadata.path.length - 1] || 'no-action',
      confidence: bestResult[0].metadata.confidence,
      reasoning: `Selected based on AB-MCTS exploration with score ${bestResult[1].toFixed(3)}`,
      alternativeActions: alternativeResults.map((result, index) => ({
        action: result[0].metadata.path[result[0].metadata.path.length - 1] || `alternative-${index}`,
        score: result[1],
        reasoning: `Alternative path with score ${result[1].toFixed(3)}`
      })),
      searchStats: {
        nodesExplored: searchStats.totalNodes,
        depth: searchStats.maxDepth,
        timeElapsed: searchStats.elapsedTime
      }
    }
  }

  /**
   * Create search tree (backward compatibility)
   */
  async createSearchTree(initialState: any, _availableActions: string[]): Promise<ABMCTSTree> {
    if (!this.enhancedService) {
      throw new Error('TreeQuest service not initialized')
    }

    const treeQuestState: TreeQuestState = {
      id: crypto.randomUUID(),
      content: initialState.content || 'initial',
      context: [],
      metadata: {
        depth: 0,
        path: [],
        score: 0,
        confidence: 1.0
      }
    }

    return this.enhancedService.initTree(treeQuestState)
  }

  /**
   * Perform single search iteration (backward compatibility)
   */
  async searchIteration(
    tree: ABMCTSTree,
    generators: Record<string, (state: any) => Promise<{ action: string; newState: any; reward: number; confidence: number; reasoning: string }>>
  ): Promise<ABMCTSTree> {
    if (!this.enhancedService) {
      throw new Error('TreeQuest service not initialized')
    }

    // Convert generators to enhanced format
    const enhancedGenerators: Record<string, (parentState: TreeQuestState | null) => Promise<[TreeQuestState, number]>> = {}
    
    for (const [actionName, generator] of Object.entries(generators)) {
      enhancedGenerators[actionName] = async (parentState) => {
        const result = await generator(parentState)
        
        const newState: TreeQuestState = {
          id: crypto.randomUUID(),
          content: result.newState.content || result.action,
          context: parentState ? [...parentState.context, parentState.content] : [],
          metadata: {
            depth: (parentState?.metadata.depth || 0) + 1,
            path: [...(parentState?.metadata.path || []), result.action],
            score: result.reward,
            confidence: result.confidence
          }
        }
        
        return [newState, result.reward]
      }
    }

    return await this.enhancedService.step(tree, enhancedGenerators)
  }

  /**
   * Get best action from search tree (backward compatibility)
   */
  getBestAction(tree: ABMCTSTree): {
    action: string
    confidence: number
    reasoning: string
    alternatives: { action: string; score: number; reasoning: string }[]
  } {
    if (!this.enhancedService) {
      throw new Error('TreeQuest service not initialized')
    }

    const topResults = this.enhancedService.topK(tree, 4)
    
    if (topResults.length === 0) {
      return {
        action: 'no-action',
        confidence: 0,
        reasoning: 'No actions explored',
        alternatives: []
      }
    }

    const best = topResults[0]
    const alternatives = topResults.slice(1).map((result, index) => ({
      action: result[0].metadata.path[result[0].metadata.path.length - 1] || `alternative-${index}`,
      score: result[1],
      reasoning: `Alternative with score ${result[1].toFixed(3)}`
    }))

    return {
      action: best[0].metadata.path[best[0].metadata.path.length - 1] || 'best-action',
      confidence: best[0].metadata.confidence,
      reasoning: `Best action selected with AB-MCTS score ${best[1].toFixed(3)}`,
      alternatives
    }
  }

  /**
   * Analyze search tree structure (backward compatibility)
   */
  analyzeTree(tree: ABMCTSTree): {
    depth: number
    breadth: number
    convergence: number
    explorationRate: number
    optimalPath: string[]
    nodeDistribution: Record<number, number>
  } {
    if (!this.enhancedService) {
      throw new Error('TreeQuest service not initialized')
    }

    const stats = this.enhancedService.getSearchStats(tree)
    
    return {
      depth: stats.maxDepth,
      breadth: stats.totalNodes / Math.max(1, stats.maxDepth),
      convergence: stats.convergenceRate,
      explorationRate: stats.totalNodes / Math.max(1, stats.totalSimulations),
      optimalPath: this.extractOptimalPath(tree),
      nodeDistribution: this.calculateNodeDistribution(tree)
    }
  }

  /**
   * Extract optimal path from tree
   */
  private extractOptimalPath(tree: ABMCTSTree): string[] {
    if (!this.enhancedService) {
      return []
    }

    const topResult = this.enhancedService.topK(tree, 1)[0]
    return topResult ? topResult[0].metadata.path : []
  }

  /**
   * Configure TreeQuest service with simplified settings
   */
  configure(settings: {
    algorithm: string
    maxSimulations: number
    timeLimit: number
    explorationConstant: number
  }): void {
    const config: TreeQuestConfig = {
      algorithm: settings.algorithm as any,
      maxDepth: 10,
      timeLimit: settings.timeLimit,
      simulations: settings.maxSimulations,
      explorationConstant: settings.explorationConstant,
      llmConfigs: [],
      adaptiveBranching: true,
      confidenceThreshold: 0.8
    }

    // Store config for later initialization
    this.storedConfig = config
    console.log('TreeQuest configured:', settings)
  }

  /**
   * Explore concepts starting from given nodes
   */
  async explore(startNodes: any[]): Promise<any> {
    if (!this.storedConfig) {
      throw new Error('TreeQuest service not configured')
    }

    // Simple exploration simulation
    const explorationResults = {
      bestPaths: [],
      insights: [
        `Explored ${startNodes.length} starting concepts`,
        'TreeQuest would generate new conceptual branches here',
        'This is a simplified implementation for demonstration'
      ],
      searchTree: [],
      totalIterations: this.storedConfig.simulations,
      exploredNodes: startNodes.length * 3
    }

    return explorationResults
  }

  private storedConfig: TreeQuestConfig | null = null

  /**
   * Calculate node distribution by depth
   */
  private calculateNodeDistribution(tree: ABMCTSTree): Record<number, number> {
    const distribution: Record<number, number> = {}
    
    for (const node of tree.nodes.values()) {
      const depth = node.state.metadata.depth
      distribution[depth] = (distribution[depth] || 0) + 1
    }
    
    return distribution
  }
}

// Export singleton instance
export const treeQuestService = new TreeQuestService()
export default treeQuestService
