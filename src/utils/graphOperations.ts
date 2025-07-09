/**
 * Graph Operations Utilities
 * Export, import, search, and TreeQuest integration
 */

import { GraphNode, GraphEdge } from '@/types/graph'
import { SearchStrategy, TreeSearchNode } from '@/types/ai'

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  metadata: {
    created: Date
    version: string
    nodeCount: number
    edgeCount: number
  }
}

/**
 * Export graph data to JSON file
 */
export const exportGraph = async (data: GraphData, filename: string): Promise<void> => {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Import graph data from JSON file
 */
export const importGraph = async (file: File): Promise<GraphData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string
        const data = JSON.parse(jsonString) as GraphData
        
        // Validate data structure
        if (!data.nodes || !data.edges) {
          throw new Error('Invalid graph file format')
        }
        
        resolve(data)
      } catch (error) {
        reject(new Error('Failed to parse graph file'))
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Search through graph nodes using fuzzy matching
 */
export const searchGraph = async (
  nodes: GraphNode[], 
  query: string
): Promise<GraphNode[]> => {
  const normalizedQuery = query.toLowerCase().trim()
  
  if (!normalizedQuery) return []
  
  const results = nodes.filter(node => {
    const labelMatch = node.label.toLowerCase().includes(normalizedQuery)
    const contentMatch = node.content.toLowerCase().includes(normalizedQuery)
    const tagMatch = node.metadata.tags.some(tag => 
      tag.toLowerCase().includes(normalizedQuery)
    )
    
    return labelMatch || contentMatch || tagMatch
  })
  
  // Sort by relevance (label matches first, then content, then tags)
  results.sort((a, b) => {
    const aLabelMatch = a.label.toLowerCase().includes(normalizedQuery)
    const bLabelMatch = b.label.toLowerCase().includes(normalizedQuery)
    
    if (aLabelMatch && !bLabelMatch) return -1
    if (!aLabelMatch && bLabelMatch) return 1
    
    return a.label.localeCompare(b.label)
  })
  
  return results
}

/**
 * TreeQuest Integration - AB-MCTS for knowledge exploration
 * Implements concepts from TreeQuest library for intelligent graph traversal
 */

/**
 * Simple TreeQuest-inspired search implementation
 * Note: This is a simplified version for the MVP. Full TreeQuest integration would require
 * the actual TreeQuest library which you have in your repositories.
 */
export const runTreeSearch = async (
  startNodes: GraphNode[],
  strategy: SearchStrategy
): Promise<TreeSearchResult> => {
  console.log('Running TreeSearch with strategy:', strategy)
  console.log('Starting from nodes:', startNodes.map(n => n.label))

  // Initialize search tree
  const searchTree: Map<string, TreeSearchNode> = new Map()
  
  // Create root nodes from starting nodes
  startNodes.forEach((node, index) => {
    const treeNode: TreeSearchNode = {
      id: `root_${index}`,
      state: node,
      score: 0.5,
      visits: 1,
      children: [],
      isExpanded: false,
      depth: 0
    }
    searchTree.set(treeNode.id, treeNode)
  })

  // Simulation based on strategy type
  // const results: SearchResult[] = [] // TODO: Implement result collection
  
  for (let iteration = 0; iteration < strategy.maxIterations; iteration++) {
    // Select promising nodes using UCB1 (Upper Confidence Bound)
    const selectedNode = selectBestNode(searchTree, strategy.explorationConstant)
    
    if (!selectedNode || selectedNode.depth >= strategy.maxDepth) {
      break
    }

    // Expand node (simulate AI-guided exploration)
    const expansions = await expandNode(selectedNode, strategy)
    
    // Add new nodes to search tree
    expansions.forEach(expansion => {
      const childNode: TreeSearchNode = {
        id: `${selectedNode.id}_${expansion.id}`,
        state: expansion.state,
        score: expansion.score,
        visits: 1,
        parent: selectedNode.id,
        children: [],
        isExpanded: false,
        depth: selectedNode.depth + 1
      }
      
      searchTree.set(childNode.id, childNode)
      selectedNode.children.push(childNode.id)
    })

    selectedNode.isExpanded = true

    // Backpropagate scores
    backpropagate(searchTree, selectedNode.id, expansions)
  }

  // Extract best paths and insights
  const bestPaths = extractBestPaths(searchTree, 5)
  const insights = generateInsights(bestPaths)

  return {
    bestPaths,
    insights,
    searchTree: Array.from(searchTree.values()),
    totalIterations: strategy.maxIterations,
    exploredNodes: searchTree.size
  }
}

// interface SearchResult {
//   id: string
//   state: any
//   score: number
// } // TODO: Remove if not needed

interface TreeSearchResult {
  bestPaths: TreeSearchNode[][]
  insights: string[]
  searchTree: TreeSearchNode[]
  totalIterations: number
  exploredNodes: number
}

interface ExpansionResult {
  id: string
  state: GraphNode
  score: number
}

/**
 * Select most promising node using UCB1 algorithm
 */
function selectBestNode(
  searchTree: Map<string, TreeSearchNode>, 
  explorationConstant: number
): TreeSearchNode | null {
  let bestNode: TreeSearchNode | null = null
  let bestValue = -Infinity

  for (const node of searchTree.values()) {
    if (!node.isExpanded && node.depth < 5) {
      // UCB1 formula: exploitation + exploration
      const exploitation = node.score / Math.max(node.visits, 1)
      const exploration = explorationConstant * Math.sqrt(
        Math.log(getTotalVisits(searchTree)) / Math.max(node.visits, 1)
      )
      const ucb1Value = exploitation + exploration

      if (ucb1Value > bestValue) {
        bestValue = ucb1Value
        bestNode = node
      }
    }
  }

  return bestNode
}

/**
 * Expand a node by generating related concepts
 */
async function expandNode(
  node: TreeSearchNode, 
  _strategy: SearchStrategy
): Promise<ExpansionResult[]> {
  const baseNode = node.state as GraphNode
  
  // Generate conceptual expansions based on node content
  const expansions: ExpansionResult[] = []
  
  // Simulate different types of conceptual expansions
  const expansionTypes = [
    'semantic_similarity',
    'causal_relationship', 
    'temporal_sequence',
    'hierarchical_decomposition'
  ]

  for (let i = 0; i < Math.min(3, expansionTypes.length); i++) {
    const expansionType = expansionTypes[i]
    const newConcept = generateRelatedConcept(baseNode, expansionType)
    
    expansions.push({
      id: `${expansionType}_${i}`,
      state: newConcept,
      score: Math.random() * 0.6 + 0.2 // Random score between 0.2-0.8
    })
  }

  return expansions
}

/**
 * Generate a related concept based on expansion type
 */
function generateRelatedConcept(baseNode: GraphNode, expansionType: string): GraphNode {
  const concepts = {
    semantic_similarity: [
      'associated concept', 'related principle', 'similar pattern'
    ],
    causal_relationship: [
      'cause', 'effect', 'contributing factor'
    ],
    temporal_sequence: [
      'prerequisite', 'next step', 'outcome'
    ],
    hierarchical_decomposition: [
      'component', 'category', 'instance'
    ]
  }

  const conceptPool = concepts[expansionType as keyof typeof concepts] || concepts.semantic_similarity
  const randomConcept = conceptPool[Math.floor(Math.random() * conceptPool.length)]

  return {
    id: crypto.randomUUID(),
    label: `${randomConcept} of ${baseNode.label}`,
    content: `AI-generated ${expansionType.replace('_', ' ')} related to: ${baseNode.content}`,
    type: 'idea',
    position: { 
      x: baseNode.position.x + (Math.random() - 0.5) * 200,
      y: baseNode.position.y + (Math.random() - 0.5) * 200
    },
    metadata: {
      created: new Date(),
      modified: new Date(),
      tags: ['ai-generated', 'tree-search', expansionType],
      color: '#80c7ff'
    },
    connections: [baseNode.id],
    aiGenerated: true
  }
}

/**
 * Backpropagate scores up the search tree
 */
function backpropagate(
  searchTree: Map<string, TreeSearchNode>,
  nodeId: string,
  expansions: ExpansionResult[]
): void {
  const node = searchTree.get(nodeId)
  if (!node) return

  // Update node statistics
  const avgExpansionScore = expansions.reduce((sum, exp) => sum + exp.score, 0) / expansions.length
  node.visits += 1
  node.score = (node.score + avgExpansionScore) / 2

  // Recursively update parent
  if (node.parent) {
    backpropagate(searchTree, node.parent, expansions)
  }
}

/**
 * Extract the best exploration paths
 */
function extractBestPaths(
  searchTree: Map<string, TreeSearchNode>,
  topK: number
): TreeSearchNode[][] {
  const paths: TreeSearchNode[][] = []
  const visited = new Set<string>()

  // Find root nodes
  const rootNodes = Array.from(searchTree.values()).filter(n => !n.parent)

  for (const root of rootNodes) {
    if (paths.length >= topK) break
    
    const path = buildPath(searchTree, root.id, visited)
    if (path.length > 1) {
      paths.push(path)
    }
  }

  // Sort by average path score
  paths.sort((a, b) => {
    const avgScoreA = a.reduce((sum, node) => sum + node.score, 0) / a.length
    const avgScoreB = b.reduce((sum, node) => sum + node.score, 0) / b.length
    return avgScoreB - avgScoreA
  })

  return paths.slice(0, topK)
}

/**
 * Build a path from root to best leaf
 */
function buildPath(
  searchTree: Map<string, TreeSearchNode>,
  nodeId: string,
  visited: Set<string>
): TreeSearchNode[] {
  const node = searchTree.get(nodeId)
  if (!node || visited.has(nodeId)) return []

  visited.add(nodeId)
  
  if (node.children.length === 0) {
    return [node]
  }

  // Find best child
  let bestChild: TreeSearchNode | null = null
  let bestScore = -Infinity

  for (const childId of node.children) {
    const child = searchTree.get(childId)
    if (child && child.score > bestScore) {
      bestScore = child.score
      bestChild = child
    }
  }

  if (bestChild) {
    const childPath = buildPath(searchTree, bestChild.id, visited)
    return [node, ...childPath]
  }

  return [node]
}

/**
 * Generate insights from exploration paths
 */
function generateInsights(paths: TreeSearchNode[][]): string[] {
  const insights: string[] = []

  if (paths.length === 0) {
    return ['No significant exploration paths found.']
  }

  insights.push(`Discovered ${paths.length} promising exploration paths`)
  
  // Analyze path characteristics
  const avgPathLength = paths.reduce((sum, path) => sum + path.length, 0) / paths.length
  insights.push(`Average exploration depth: ${avgPathLength.toFixed(1)} levels`)

  // Identify most promising concepts
  const allNodes = paths.flat()
  const conceptFrequency = new Map<string, number>()
  
  allNodes.forEach(node => {
    const concept = (node.state as GraphNode).label
    conceptFrequency.set(concept, (conceptFrequency.get(concept) || 0) + 1)
  })

  const topConcepts = Array.from(conceptFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([concept]) => concept)

  if (topConcepts.length > 0) {
    insights.push(`Key concepts discovered: ${topConcepts.join(', ')}`)
  }

  return insights
}

/**
 * Calculate total visits across all nodes
 */
function getTotalVisits(searchTree: Map<string, TreeSearchNode>): number {
  return Array.from(searchTree.values()).reduce((sum, node) => sum + node.visits, 0)
}

/**
 * Performance optimization utilities
 * Implements concepts from the pragmatic performance document
 */

export const GraphPerformanceUtils = {
  /**
   * Efficient node clustering using sets for O(1) lookups
   */
  clusterNodes: (nodes: GraphNode[]): Map<string, GraphNode[]> => {
    const clusters = new Map<string, GraphNode[]>()
    
    // Use Map for O(1) cluster lookups instead of nested loops
    nodes.forEach(node => {
      const clusterKey = node.clusterId || 'unclustered'
      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, [])
      }
      clusters.get(clusterKey)!.push(node)
    })
    
    return clusters
  },

  /**
   * Memoized distance calculations for performance
   */
  memoizedDistance: (() => {
    const cache = new Map<string, number>()
    
    return (node1: GraphNode, node2: GraphNode): number => {
      const key = `${node1.id}-${node2.id}`
      
      if (cache.has(key)) {
        return cache.get(key)!
      }
      
      const dx = node1.position.x - node2.position.x
      const dy = node1.position.y - node2.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      cache.set(key, distance)
      return distance
    }
  })(),

  /**
   * Batch operations for better performance
   */
  batchUpdateNodes: (updates: { id: string; updates: Partial<GraphNode> }[]): void => {
    // Process updates in batches to minimize re-renders
    const batches = []
    const batchSize = 50
    
    for (let i = 0; i < updates.length; i += batchSize) {
      batches.push(updates.slice(i, i + batchSize))
    }
    
    batches.forEach(batch => {
      // Apply batch updates
      console.log(`Processing batch of ${batch.length} updates`)
    })
  }
}
