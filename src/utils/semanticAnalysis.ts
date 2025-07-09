/**
 * Semantic Analysis Utilities for Graph Clustering
 * Provides content-based similarity and clustering functions
 */

import { GraphNode } from '@/types/graph'

export interface SemanticCluster {
  id: string
  label: string
  nodes: GraphNode[]
  keywords: string[]
  center: { x: number; y: number }
  confidence: number
}

// Common stop words to filter out
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'would', 'this', 'these', 'they', 'them', 'their', 'there',
  'where', 'when', 'what', 'who', 'which', 'why', 'how', 'can', 'could',
  'should', 'may', 'might', 'must', 'shall', 'will', 'would'
])

/**
 * Extract meaningful keywords from text content
 */
export const extractKeywords = (text: string, maxKeywords = 5): string[] => {
  if (!text) return []
  
  // Count word frequencies
  const wordCounts: Record<string, number> = {}
  
  text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && 
      !STOP_WORDS.has(word) && 
      !word.match(/^\d+$/) // Filter out pure numbers
    )
    .forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1
    })

  // Return top keywords by frequency
  return Object.entries(wordCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word)
}

/**
 * Calculate semantic similarity between two sets of keywords
 */
export const calculateSemanticSimilarity = (
  keywords1: string[], 
  keywords2: string[]
): number => {
  if (!keywords1.length || !keywords2.length) return 0
  
  const set1 = new Set(keywords1)
  const set2 = new Set(keywords2)
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  
  // Jaccard similarity
  const jaccard = union.size > 0 ? intersection.size / union.size : 0
  
  // Add bonus for exact matches and word stems
  const exactMatches = intersection.size
  const stemMatches = countStemMatches(keywords1, keywords2)
  
  // Weighted similarity score
  return Math.min(1, jaccard * 0.6 + (exactMatches / Math.max(set1.size, set2.size)) * 0.3 + stemMatches * 0.1)
}

/**
 * Simple stemming similarity counter
 */
const countStemMatches = (words1: string[], words2: string[]): number => {
  let matches = 0
  const stems1 = words1.map(word => word.slice(0, -2)) // Simple stemming
  const stems2 = words2.map(word => word.slice(0, -2))
  
  for (const stem1 of stems1) {
    if (stem1.length > 2 && stems2.some(stem2 => stem2 === stem1)) {
      matches++
    }
  }
  
  return matches / Math.max(words1.length, words2.length)
}

/**
 * Analyze content similarity between nodes
 */
export const analyzeNodeSimilarity = (node1: GraphNode, node2: GraphNode): number => {
  const content1 = `${node1.label} ${node1.content || ''}`.trim()
  const content2 = `${node2.label} ${node2.content || ''}`.trim()
  
  const keywords1 = extractKeywords(content1)
  const keywords2 = extractKeywords(content2)
  
  return calculateSemanticSimilarity(keywords1, keywords2)
}

/**
 * Create semantic clusters from nodes
 */
export const createSemanticClusters = (
  nodes: GraphNode[], 
  similarityThreshold = 0.3,
  maxClusters = 10
): SemanticCluster[] => {
  if (nodes.length < 2) return []
  
  const clusters: SemanticCluster[] = []
  const nodeKeywords = new Map<string, string[]>()
  
  // Extract keywords for all nodes
  nodes.forEach(node => {
    const content = `${node.label} ${node.content || ''}`.trim()
    const keywords = extractKeywords(content)
    nodeKeywords.set(node.id, keywords)
  })
  
  const unassignedNodes = new Set(nodes.map(n => n.id))
  
  // Greedy clustering algorithm
  while (unassignedNodes.size > 0 && clusters.length < maxClusters) {
    const seedNodeId = unassignedNodes.values().next().value
    const seedNode = nodes.find(n => n.id === seedNodeId)!
    const seedKeywords = nodeKeywords.get(seedNodeId)
    
    if (!seedKeywords) continue
    
    const clusterNodes = [seedNode]
    unassignedNodes.delete(seedNodeId)
    
    // Find similar nodes
    for (const nodeId of unassignedNodes) {
      const nodeKeywords_i = nodeKeywords.get(nodeId)
      if (!nodeKeywords_i) continue
      
      const similarity = calculateSemanticSimilarity(seedKeywords!, nodeKeywords_i)
      
      if (similarity >= similarityThreshold) {
        const node = nodes.find(n => n.id === nodeId)!
        clusterNodes.push(node)
        unassignedNodes.delete(nodeId)
      }
    }
    
    // Create cluster if it has enough nodes
    if (clusterNodes.length >= 1) { // Allow single-node clusters for now
      const clusterKeywords = extractClusterKeywords(clusterNodes, nodeKeywords)
      const clusterLabel = generateClusterLabel(clusterKeywords)
      
      clusters.push({
        id: `cluster-${clusters.length}`,
        label: clusterLabel,
        nodes: clusterNodes,
        keywords: clusterKeywords,
        center: calculateClusterCenter(clusterNodes),
        confidence: Math.min(clusterNodes.length / 5, 1) // Confidence based on cluster size
      })
    }
  }
  
  return clusters
}

/**
 * Extract representative keywords for a cluster
 */
const extractClusterKeywords = (
  nodes: GraphNode[], 
  nodeKeywords: Map<string, string[]>
): string[] => {
  const keywordFreq: Record<string, number> = {}
  
  nodes.forEach(node => {
    const keywords = nodeKeywords.get(node.id) || []
    keywords.forEach(keyword => {
      keywordFreq[keyword] = (keywordFreq[keyword] || 0) + 1
    })
  })
  
  return Object.entries(keywordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([keyword]) => keyword)
}

/**
 * Generate a meaningful label for a cluster
 */
const generateClusterLabel = (keywords: string[]): string => {
  if (keywords.length === 0) return 'Misc'
  if (keywords.length === 1) return keywords[0]
  if (keywords.length === 2) return keywords.join(' & ')
  return `${keywords[0]} & ${keywords.length - 1} more`
}

/**
 * Calculate the geometric center of nodes in a cluster
 */
const calculateClusterCenter = (nodes: GraphNode[]): { x: number; y: number } => {
  if (nodes.length === 0) return { x: 0, y: 0 }
  
  const totalX = nodes.reduce((sum, node) => sum + (node.x || node.position.x), 0)
  const totalY = nodes.reduce((sum, node) => sum + (node.y || node.position.y), 0)
  
  return {
    x: totalX / nodes.length,
    y: totalY / nodes.length
  }
}

/**
 * Find optimal positions for cluster centers
 */
export const calculateOptimalClusterPositions = (
  clusters: SemanticCluster[],
  canvasWidth: number,
  canvasHeight: number
): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>()
  
  if (clusters.length === 0) return positions
  
  if (clusters.length === 1) {
    positions.set(clusters[0].id, { x: canvasWidth / 2, y: canvasHeight / 2 })
    return positions
  }
  
  // Arrange clusters in a circle or grid pattern
  const useCircular = clusters.length <= 8
  
  if (useCircular) {
    const radius = Math.min(canvasWidth, canvasHeight) / 3
    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2
    
    clusters.forEach((cluster, index) => {
      const angle = (index / clusters.length) * 2 * Math.PI
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      positions.set(cluster.id, { x, y })
    })
  } else {
    // Grid layout for many clusters
    const cols = Math.ceil(Math.sqrt(clusters.length))
    const rows = Math.ceil(clusters.length / cols)
    const cellWidth = canvasWidth / (cols + 1)
    const cellHeight = canvasHeight / (rows + 1)
    
    clusters.forEach((cluster, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      const x = (col + 1) * cellWidth
      const y = (row + 1) * cellHeight
      positions.set(cluster.id, { x, y })
    })
  }
  
  return positions
}

/**
 * Suggest connections between nodes based on semantic similarity
 */
export const suggestSemanticConnections = (
  nodes: GraphNode[],
  existingEdges: Set<string>,
  threshold = 0.4,
  maxSuggestions = 10
): Array<{ source: string; target: string; similarity: number; reason: string }> => {
  const suggestions: Array<{ source: string; target: string; similarity: number; reason: string }> = []
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i]
      const node2 = nodes[j]
      
      // Skip if connection already exists
      const edgeKey = `${node1.id}-${node2.id}`
      const reverseEdgeKey = `${node2.id}-${node1.id}`
      if (existingEdges.has(edgeKey) || existingEdges.has(reverseEdgeKey)) continue
      
      const similarity = analyzeNodeSimilarity(node1, node2)
      
      if (similarity >= threshold) {
        const keywords1 = extractKeywords(`${node1.label} ${node1.content || ''}`)
        const keywords2 = extractKeywords(`${node2.label} ${node2.content || ''}`)
        const sharedKeywords = keywords1.filter(k => keywords2.includes(k))
        
        suggestions.push({
          source: node1.id,
          target: node2.id,
          similarity,
          reason: sharedKeywords.length > 0 
            ? `Shared concepts: ${sharedKeywords.slice(0, 3).join(', ')}`
            : 'Semantic similarity detected'
        })
      }
    }
  }
  
  return suggestions
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxSuggestions)
}

export default {
  extractKeywords,
  calculateSemanticSimilarity,
  analyzeNodeSimilarity,
  createSemanticClusters,
  calculateOptimalClusterPositions,
  suggestSemanticConnections
}