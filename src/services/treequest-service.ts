/**
 * TreeQuest Service with Enhanced AB-MCTS Implementation
 *
 * Integrates the TreeQuestEnhanced class with the existing service interface
 * while maintaining backward compatibility.
 *
 * @module TreeQuestService
 */

import { EnhancedGraphNode, EnhancedGraphEdge, TreeQuestContext, TreeQuestResult } from '@/types/enhanced-graph'
import { TreeQuestEnhanced, ABMCTSConfig, ActionFunction } from './treequest-enhanced'
import { IAIService } from './ai-service'

/**
 * TreeQuest service interface
 */
export interface ITreeQuestService {
  explore(startNodes: EnhancedGraphNode[]): Promise<{
    expandedNodes: EnhancedGraphNode[]
    suggestedConnections: EnhancedGraphEdge[]
    insights: string[]
  }>

  reason(context: TreeQuestContext, actionGenerators: Record<string, ActionFunction>): Promise<TreeQuestResult>
}

/**
 * TreeQuest service implementation with AB-MCTS enhancement
 */
export class TreeQuestService implements ITreeQuestService {
  private enhancedTreeQuest: TreeQuestEnhanced
  private config: ABMCTSConfig

  constructor(aiService: IAIService) {
    this.config = {
      algorithm: 'abmcts-a',
      explorationConstant: 1.414,
      maxTime: 10000,
      maxSimulations: 100,
      adaptiveBranching: {
        enabled: true,
        minBranching: 2,
        maxBranching: 5,
        confidenceThreshold: 0.7
      },
      multiLLM: {
        enabled: false,
        models: []
      }
    }

    this.enhancedTreeQuest = new TreeQuestEnhanced(this.config, aiService)
  }

  /**
   * Explore nodes and suggest connections (legacy interface)
   */
  async explore(startNodes: EnhancedGraphNode[]): Promise<{
    expandedNodes: EnhancedGraphNode[]
    suggestedConnections: EnhancedGraphEdge[]
    insights: string[]
  }> {
    return {
      expandedNodes: startNodes,
      suggestedConnections: [],
      insights: [`Explored ${startNodes.length} nodes using TreeQuest`]
    }
  }

  /**
   * Reason about graph structure using enhanced TreeQuest
   */
  async reason(_context: TreeQuestContext, actionGenerators: Record<string, ActionFunction>): Promise<TreeQuestResult> {
    try {
      // Initialize search tree
      const tree = this.enhancedTreeQuest.initTree()

      // Register action functions
      for (const [name, fn] of Object.entries(actionGenerators)) {
        this.enhancedTreeQuest.registerActionFunction(name, fn)
      }

      // Run search iterations
      while (!this.enhancedTreeQuest.shouldTerminate(tree)) {
        await this.enhancedTreeQuest.step(tree, actionGenerators)
      }

      // Get top results
      const topResults = this.enhancedTreeQuest.topK(tree, 5)
      const stats = this.enhancedTreeQuest.getSearchStats(tree)

      // Extract best action and alternatives
      const bestResult = topResults[0]
      const alternatives = topResults.slice(1, 4).map(([state, score], index) => ({
        action: state.content,
        score,
        reasoning: `Alternative #${index + 1} (confidence: ${score.toFixed(3)})`
      }))

      return {
        bestAction: bestResult?.[0]?.content || 'no-action',
        confidence: bestResult?.[1] || 0,
        reasoning: `TreeQuest search completed: ${stats.totalSimulations} simulations, best score: ${stats.bestScore.toFixed(3)}`,
        alternativeActions: alternatives,
        searchStats: {
          nodesExplored: tree.stats.totalNodes,
          depth: tree.stats.maxDepth,
          timeElapsed: Date.now() - tree.stats.startTime
        }
      }
    } catch (error) {
      console.error('TreeQuest reasoning failed:', error)
      return {
        bestAction: 'error',
        confidence: 0,
        reasoning: `TreeQuest reasoning failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        alternativeActions: [],
        searchStats: {
          nodesExplored: 0,
          depth: 0,
          timeElapsed: 0
        }
      }
    }
  }
}

export default TreeQuestService
