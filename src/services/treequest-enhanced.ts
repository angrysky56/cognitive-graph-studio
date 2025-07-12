/**
 * Enhanced TreeQuest implementation with AB-MCTS algorithms
 *
 * TypeScript implementation of TreeQuest algorithms based on SakanaAI's research:
 * "Wider or Deeper? Scaling LLM Inference-Time Compute with Adaptive Branching Tree Search"
 *
 * Implements:
 * - AB-MCTS-A (Adaptive Branching with Node Aggregation)
 * - AB-MCTS-M (Adaptive Branching with Mixed Models)
 * - Multi-LLM support for enhanced reasoning
 *
 * @module TreeQuestEnhanced
 */

import { IAIService } from './ai-service'

/**
 * State representation for TreeQuest reasoning
 */
export interface TreeQuestState {
  /** Unique state identifier */
  id: string
  /** Content or problem representation */
  content: string
  /** Context from parent states */
  context: string[]
  /** Metadata for state tracking */
  metadata: {
    depth: number
    path: string[]
    score: number
    confidence: number
  }
}

/**
 * Action function type for state generation
 */
export type ActionFunction = (parentState: TreeQuestState | null) => Promise<[TreeQuestState, number]>

/**
 * Enhanced TreeQuest node with AB-MCTS metadata
 */
export interface ABMCTSNode {
  /** Node identifier */
  id: string
  /** Parent node ID */
  parentId: string | null
  /** Child node IDs */
  children: string[]
  /** Associated state */
  state: TreeQuestState
  /** Visit count for UCB1 */
  visits: number
  /** Total reward accumulated */
  totalReward: number
  /** Average reward */
  averageReward: number
  /** Action that led to this state */
  action: string | null
  /** UCB1 value cache */
  ucb1Value: number
  /** Node expansion status */
  isFullyExpanded: boolean
  /** Available actions from this node */
  availableActions: string[]
  /** LLM model that generated this node */
  generatedBy: string
  /** Generation confidence score */
  confidence: number
  /** Adaptive branching factor */
  branchingFactor: number
}

/**
 * AB-MCTS search tree
 */
export interface ABMCTSTree {
  /** Root node ID */
  rootId: string
  /** All nodes indexed by ID */
  nodes: Map<string, ABMCTSNode>
  /** Tree statistics */
  stats: {
    totalNodes: number
    maxDepth: number
    totalSimulations: number
    startTime: number
    bestScore: number
  }
}

/**
 * AB-MCTS configuration
 */
export interface ABMCTSConfig {
  /** Algorithm variant */
  algorithm: 'abmcts-a' | 'abmcts-m'
  /** Exploration constant for UCB1 */
  explorationConstant: number
  /** Maximum search time in milliseconds */
  maxTime: number
  /** Maximum number of simulations */
  maxSimulations: number
  /** Adaptive branching parameters */
  adaptiveBranching: {
    enabled: boolean
    minBranching: number
    maxBranching: number
    confidenceThreshold: number
  }
  /** Multi-LLM configuration for ABMCTS-M */
  multiLLM: {
    enabled: boolean
    models: {
      provider: string
      model: string
      weight: number
    }[]
  }
}

/**
 * Enhanced TreeQuest service with full AB-MCTS implementation
 */
export class TreeQuestEnhanced {
  private config: ABMCTSConfig
  private aiService: IAIService
  private actionFunctions: Map<string, ActionFunction> = new Map()

  /**
   * Initialize enhanced TreeQuest service
   */
  constructor(config: ABMCTSConfig, aiService: IAIService) {
    this.config = config
    this.aiService = aiService
  }

  /**
   * Register action functions for state generation
   */
  registerActionFunction(actionName: string, actionFn: ActionFunction): void {
    this.actionFunctions.set(actionName, actionFn)
  }

  /**
   * Create initial search tree
   */
  initTree(initialState?: TreeQuestState): ABMCTSTree {
    const rootState = initialState || {
      id: crypto.randomUUID(),
      content: 'initial_state',
      context: [],
      metadata: {
        depth: 0,
        path: [],
        score: 0,
        confidence: 1.0
      }
    }

    const rootNode: ABMCTSNode = {
      id: crypto.randomUUID(),
      parentId: null,
      children: [],
      state: rootState,
      visits: 0,
      totalReward: 0,
      averageReward: 0,
      action: null,
      ucb1Value: Infinity,
      isFullyExpanded: false,
      availableActions: Array.from(this.actionFunctions.keys()),
      generatedBy: 'root',
      confidence: 1.0,
      branchingFactor: this.config.adaptiveBranching.maxBranching
    }

    return {
      rootId: rootNode.id,
      nodes: new Map([[rootNode.id, rootNode]]),
      stats: {
        totalNodes: 1,
        maxDepth: 0,
        totalSimulations: 0,
        startTime: Date.now(),
        bestScore: 0
      }
    }
  }

  /**
   * Perform single AB-MCTS iteration
   */
  async step(tree: ABMCTSTree, actionFunctions: Record<string, ActionFunction>): Promise<ABMCTSTree> {
    // Update action functions
    for (const [name, fn] of Object.entries(actionFunctions)) {
      this.actionFunctions.set(name, fn)
    }

    // 1. Selection: Navigate to leaf using enhanced UCB1
    const selectedNode = this.selectNode(tree)

    // 2. Expansion: Adaptive branching based on node confidence
    if (!selectedNode.isFullyExpanded) {
      await this.expandNode(tree, selectedNode)
    }

    // 3. Simulation: Multi-model simulation for ABMCTS-M
    const simulationResult = await this.simulate(selectedNode)

    // 4. Backpropagation: Update rewards and statistics
    this.backpropagate(tree, selectedNode.id, simulationResult.reward)

    // Update tree statistics
    tree.stats.totalSimulations++
    tree.stats.bestScore = Math.max(tree.stats.bestScore, simulationResult.reward)

    return tree
  }

  /**
   * Get top-k best states from tree
   */
  topK(tree: ABMCTSTree, k: number): Array<[TreeQuestState, number]> {
    const allNodes = Array.from(tree.nodes.values())

    // Sort by average reward
    const sortedNodes = allNodes
      .filter(node => node.visits > 0)
      .sort((a, b) => b.averageReward - a.averageReward)
      .slice(0, k)

    return sortedNodes.map(node => [node.state, node.averageReward])
  }

  /**
   * Enhanced UCB1 selection with adaptive branching
   */
  private selectNode(tree: ABMCTSTree): ABMCTSNode {
    let currentNode = tree.nodes.get(tree.rootId)!

    while (currentNode.children.length > 0) {
      if (!currentNode.isFullyExpanded) {
        return currentNode
      }

      // Enhanced UCB1 with confidence weighting
      let bestChild: ABMCTSNode | null = null
      let bestValue = -Infinity

      for (const childId of currentNode.children) {
        const child = tree.nodes.get(childId)!
        const ucb1 = this.calculateEnhancedUCB1(child, currentNode.visits)

        if (ucb1 > bestValue) {
          bestValue = ucb1
          bestChild = child
        }
      }

      currentNode = bestChild!
    }

    return currentNode
  }

  /**
   * Enhanced UCB1 calculation with confidence and adaptive factors
   */
  private calculateEnhancedUCB1(node: ABMCTSNode, parentVisits: number): number {
    if (node.visits === 0) {
      return Infinity
    }

    // Standard UCB1 components
    const exploitation = node.averageReward
    const exploration = Math.sqrt(Math.log(parentVisits) / node.visits)

    // Confidence bonus for high-confidence nodes
    const confidenceBonus = node.confidence * 0.1

    // Adaptive branching factor influence
    const branchingPenalty = Math.log(node.branchingFactor) * 0.05

    return exploitation +
           this.config.explorationConstant * exploration +
           confidenceBonus -
           branchingPenalty
  }

  /**
   * Adaptive node expansion with confidence-based branching
   */
  private async expandNode(tree: ABMCTSTree, node: ABMCTSNode): Promise<void> {
    const availableActions = node.availableActions.filter(
      action => !node.children.some(childId => {
        const child = tree.nodes.get(childId)!
        return child.action === action
      })
    )

    if (availableActions.length === 0) {
      node.isFullyExpanded = true
      return
    }

    // Determine adaptive branching factor
    const branchingFactor = this.calculateAdaptiveBranching(node)
    const actionsToExpand = availableActions.slice(0, branchingFactor)

    for (const action of actionsToExpand) {
      await this.createChildNode(tree, node, action)
    }

    // Mark as fully expanded if all actions processed
    if (availableActions.length <= branchingFactor) {
      node.isFullyExpanded = true
    }
  }

  /**
   * Calculate adaptive branching factor based on node properties
   */
  private calculateAdaptiveBranching(node: ABMCTSNode): number {
    if (!this.config.adaptiveBranching.enabled) {
      return this.config.adaptiveBranching.maxBranching
    }

    const { minBranching, maxBranching, confidenceThreshold } = this.config.adaptiveBranching

    // Higher confidence = more exploration (wider branching)
    const confidenceFactor = node.confidence >= confidenceThreshold ? 1.5 : 0.8

    // Deeper nodes get less branching
    const depthPenalty = Math.max(0.5, 1 - (node.state.metadata.depth * 0.1))

    const calculatedBranching = Math.round(
      (minBranching + (maxBranching - minBranching) * confidenceFactor * depthPenalty)
    )

    return Math.max(minBranching, Math.min(maxBranching, calculatedBranching))
  }

  /**
   * Create child node using action function
   */
  private async createChildNode(tree: ABMCTSTree, parent: ABMCTSNode, action: string): Promise<void> {
    const actionFn = this.actionFunctions.get(action)
    if (!actionFn) {
      return
    }

    try {
      const [newState, score] = await actionFn(parent.state)

      // Select LLM for ABMCTS-M
      const selectedModel = this.selectLLMForGeneration()

      const childNode: ABMCTSNode = {
        id: crypto.randomUUID(),
        parentId: parent.id,
        children: [],
        state: {
          ...newState,
          metadata: {
            ...newState.metadata,
            depth: parent.state.metadata.depth + 1,
            path: [...parent.state.metadata.path, action],
            score
          }
        },
        visits: 0,
        totalReward: 0,
        averageReward: 0,
        action,
        ucb1Value: 0,
        isFullyExpanded: false,
        availableActions: Array.from(this.actionFunctions.keys()),
        generatedBy: selectedModel,
        confidence: Math.random(), // Would be set by actual LLM call
        branchingFactor: this.calculateAdaptiveBranching(parent)
      }

      tree.nodes.set(childNode.id, childNode)
      parent.children.push(childNode.id)
      tree.stats.totalNodes++
      tree.stats.maxDepth = Math.max(tree.stats.maxDepth, childNode.state.metadata.depth)

    } catch (error) {
      console.warn(`Failed to create child node for action ${action}:`, error)
    }
  }

  /**
   * Multi-model simulation for enhanced reasoning
   */
  private async simulate(node: ABMCTSNode): Promise<{ reward: number; confidence: number }> {
    if (this.config.algorithm === 'abmcts-m' && this.config.multiLLM.enabled) {
      return this.multiModelSimulation(node)
    } else {
      return this.singleModelSimulation(node)
    }
  }

  /**
   * Single model simulation (ABMCTS-A)
   */
  private async singleModelSimulation(node: ABMCTSNode): Promise<{ reward: number; confidence: number }> {
    // For now, use node's existing score with some exploration bonus
    const baseReward = node.state.metadata.score
    const explorationBonus = 1.0 / (1.0 + node.visits)
    const confidenceWeight = node.confidence

    const reward = (baseReward + explorationBonus) * confidenceWeight

    return {
      reward: Math.max(0, Math.min(1, reward)),
      confidence: node.confidence
    }
  }

  /**
   * Multi-model simulation with weighted ensemble (ABMCTS-M)
   */
  private async multiModelSimulation(node: ABMCTSNode): Promise<{ reward: number; confidence: number }> {
    const modelResults: Array<{ reward: number; confidence: number; weight: number }> = []

    for (const modelConfig of this.config.multiLLM.models) {
      try {
        // Simulate LLM evaluation of the state
        const prompt = `Evaluate the quality of this state: "${node.state.content}"`

        const response = await this.aiService.generateText({
          prompt,
          maxTokens: 8164,
          temperature: 0.1
        }, {
          provider: modelConfig.provider as any,
          model: modelConfig.model
        })

        // Extract numeric score from response (simplified)
        const score = this.extractScoreFromResponse(response.content)

        modelResults.push({
          reward: score,
          confidence: response.metadata.confidence || 0.8,
          weight: modelConfig.weight
        })

      } catch (error) {
        console.warn(`Model ${modelConfig.model} simulation failed:`, error)
      }
    }

    if (modelResults.length === 0) {
      return this.singleModelSimulation(node)
    }

    // Weighted average of model results
    const totalWeight = modelResults.reduce((sum, result) => sum + result.weight, 0)
    const weightedReward = modelResults.reduce(
      (sum, result) => sum + (result.reward * result.weight), 0
    ) / totalWeight

    const avgConfidence = modelResults.reduce(
      (sum, result) => sum + result.confidence, 0
    ) / modelResults.length

    return {
      reward: Math.max(0, Math.min(1, weightedReward)),
      confidence: avgConfidence
    }
  }

  /**
   * Extract numeric score from LLM response
   */
  private extractScoreFromResponse(response: string): number {
    // Look for numeric patterns in response
    const scoreMatch = response.match(/(\d+(?:\.\d+)?)/);
    if (scoreMatch) {
      const score = parseFloat(scoreMatch[1])
      // Normalize to 0-1 range
      return Math.max(0, Math.min(1, score > 10 ? score / 100 : score))
    }

    // Fallback: sentiment analysis
    const positiveWords = ['good', 'excellent', 'great', 'positive', 'correct']
    const negativeWords = ['bad', 'poor', 'wrong', 'negative', 'incorrect']

    const lowerResponse = response.toLowerCase()
    const positiveCount = positiveWords.filter(word => lowerResponse.includes(word)).length
    const negativeCount = negativeWords.filter(word => lowerResponse.includes(word)).length

    return Math.max(0.1, 0.5 + (positiveCount - negativeCount) * 0.1)
  }

  /**
   * Select LLM for generation in multi-model setup
   */
  private selectLLMForGeneration(): string {
    if (!this.config.multiLLM.enabled || this.config.multiLLM.models.length === 0) {
      return 'default'
    }

    // Weighted random selection
    const totalWeight = this.config.multiLLM.models.reduce((sum, model) => sum + model.weight, 0)
    let random = Math.random() * totalWeight

    for (const model of this.config.multiLLM.models) {
      random -= model.weight
      if (random <= 0) {
        return `${model.provider}:${model.model}`
      }
    }

    return this.config.multiLLM.models[0].model
  }

  /**
   * Backpropagate rewards through the tree
   */
  private backpropagate(tree: ABMCTSTree, nodeId: string, reward: number): void {
    let currentNode = tree.nodes.get(nodeId)

    while (currentNode) {
      currentNode.visits++
      currentNode.totalReward += reward
      currentNode.averageReward = currentNode.totalReward / currentNode.visits

      // Move to parent
      currentNode = currentNode.parentId ? tree.nodes.get(currentNode.parentId) : undefined
    }
  }

  /**
   * Check if search should terminate
   */
  shouldTerminate(tree: ABMCTSTree): boolean {
    const elapsed = Date.now() - tree.stats.startTime

    return elapsed >= this.config.maxTime ||
           tree.stats.totalSimulations >= this.config.maxSimulations
  }

  /**
   * Get search statistics
   */
  getSearchStats(tree: ABMCTSTree) {
    return {
      ...tree.stats,
      elapsedTime: Date.now() - tree.stats.startTime,
      averageDepth: this.calculateAverageDepth(tree),
      convergenceRate: this.calculateConvergenceRate(tree)
    }
  }

  /**
   * Calculate average depth of explored nodes
   */
  private calculateAverageDepth(tree: ABMCTSTree): number {
    const nodes = Array.from(tree.nodes.values())
    const totalDepth = nodes.reduce((sum, node) => sum + node.state.metadata.depth, 0)
    return totalDepth / nodes.length
  }

  /**
   * Calculate convergence rate of the search
   */
  private calculateConvergenceRate(tree: ABMCTSTree): number {
    const rootNode = tree.nodes.get(tree.rootId)!
    if (rootNode.children.length < 2) return 1.0

    const childRewards = rootNode.children.map(childId => {
      const child = tree.nodes.get(childId)!
      return child.averageReward
    })

    const mean = childRewards.reduce((sum, r) => sum + r, 0) / childRewards.length
    const variance = childRewards.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / childRewards.length

    // Lower variance = higher convergence
    return Math.max(0, 1 - Math.sqrt(variance))
  }
}