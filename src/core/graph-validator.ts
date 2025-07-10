/**
 * Graph Structure Validator and Cleanup Utility
 * Addresses the AI's complaints about poor graph structure
 *
 * @module GraphValidator
 */

import { GraphNode, GraphEdge } from '@/types/graph'

export interface GraphStructureIssues {
  unnamedNodes: string[]
  isolatedNodes: string[]
  weakConnections: string[]
  duplicateContent: Array<{ nodes: string[]; reason: string }>
  missingSemanticLinks: Array<{
    source: string
    target: string
    reason: string
    confidence: number
  }>
}

export interface GraphCleanupSuggestions {
  nodeUpdates: Array<{
    nodeId: string
    suggestedLabel?: string
    suggestedType?: string
    suggestedContent?: string
  }>
  connectionSuggestions: Array<{
    source: string
    target: string
    type: 'semantic' | 'hierarchical' | 'causal'
    reason: string
    confidence: number
  }>
  duplicateRemoval: string[]
}

/**
 * Validates graph structure and identifies common issues
 */
export class GraphValidator {
  /**
   * Analyzes graph structure and returns identified issues
   */
  static analyzeStructure(
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>
  ): GraphStructureIssues {
    const nodeArray = Array.from(nodes.values())
    const edgeArray = Array.from(edges.values())

    return {
      unnamedNodes: this.findUnnamedNodes(nodeArray),
      isolatedNodes: this.findIsolatedNodes(nodeArray, edgeArray),
      weakConnections: this.findWeakConnections(edgeArray),
      duplicateContent: this.findDuplicateContent(nodeArray),
      missingSemanticLinks: this.findMissingSemanticLinks(nodeArray, edges)
    }
  }

  /**
   * Generates cleanup suggestions based on identified issues
   */
  static generateCleanupSuggestions(
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>,
    issues: GraphStructureIssues
  ): GraphCleanupSuggestions {
    const nodeArray = Array.from(nodes.values())

    return {
      nodeUpdates: this.suggestNodeUpdates(nodeArray, issues),
      connectionSuggestions: this.suggestNewConnections(nodeArray, edges),
      duplicateRemoval: issues.duplicateContent.flatMap(dup => dup.nodes.slice(1))
    }
  }

  /**
   * Finds nodes with generic or missing labels
   */
  private static findUnnamedNodes(nodes: GraphNode[]): string[] {
    const genericNames = ['New Node', 'Node', 'Untitled', '', 'brain inspired']
    return nodes
      .filter(node =>
        genericNames.some(generic =>
          node.label.toLowerCase().includes(generic.toLowerCase())
        ) || node.label.trim().length < 3
      )
      .map(node => node.id)
  }

  /**
   * Finds nodes with no connections
   */
  private static findIsolatedNodes(nodes: GraphNode[], edges: GraphEdge[]): string[] {
    const connectedNodes = new Set([
      ...edges.map(e => e.source),
      ...edges.map(e => e.target)
    ])

    return nodes
      .filter(node => !connectedNodes.has(node.id))
      .map(node => node.id)
  }

  /**
   * Finds connections that seem arbitrary or weak
   */
  private static findWeakConnections(edges: GraphEdge[]): string[] {
    return edges
      .filter(edge =>
        !edge.label ||
        edge.weight < 0.3 ||
        edge.type === 'temporal' // Temporal connections often indicate document order, not semantic meaning
      )
      .map(edge => edge.id)
  }

  /**
   * Finds nodes with duplicate or very similar content
   */
  private static findDuplicateContent(nodes: GraphNode[]): Array<{ nodes: string[]; reason: string }> {
    const duplicates: Array<{ nodes: string[]; reason: string }> = []

    // Check for identical labels
    const labelGroups = new Map<string, string[]>()
    nodes.forEach(node => {
      const normalizedLabel = node.label.toLowerCase().trim()
      if (!labelGroups.has(normalizedLabel)) {
        labelGroups.set(normalizedLabel, [])
      }
      labelGroups.get(normalizedLabel)!.push(node.id)
    })

    labelGroups.forEach((nodeIds, label) => {
      if (nodeIds.length > 1) {
        duplicates.push({
          nodes: nodeIds,
          reason: `Duplicate label: "${label}"`
        })
      }
    })

    // Check for very similar content
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i]
        const nodeB = nodes[j]

        if (this.calculateContentSimilarity(nodeA.content, nodeB.content) > 0.8) {
          duplicates.push({
            nodes: [nodeA.id, nodeB.id],
            reason: `Very similar content (${Math.round(this.calculateContentSimilarity(nodeA.content, nodeB.content) * 100)}% match)`
          })
        }
      }
    }

    return duplicates
  }

  /**
   * Identifies missing semantic links between related nodes
   */
  private static findMissingSemanticLinks(
    nodes: GraphNode[],
    edges: Map<string, GraphEdge>
  ): Array<{ source: string; target: string; reason: string; confidence: number }> {
    const suggestions: Array<{ source: string; target: string; reason: string; confidence: number }> = []
    const existingConnections = new Set(
      Array.from(edges.values()).map(e => `${e.source}-${e.target}`)
    )

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i]
        const nodeB = nodes[j]

        // Skip if already connected
        if (existingConnections.has(`${nodeA.id}-${nodeB.id}`) ||
            existingConnections.has(`${nodeB.id}-${nodeA.id}`)) {
          continue
        }

        // Check for shared tags
        const sharedTags = nodeA.metadata.tags.filter(tag =>
          nodeB.metadata.tags.includes(tag)
        )

        if (sharedTags.length > 0) {
          suggestions.push({
            source: nodeA.id,
            target: nodeB.id,
            reason: `Shared tags: ${sharedTags.join(', ')}`,
            confidence: Math.min(sharedTags.length * 0.3, 0.9)
          })
        }

        // Check for content similarity
        const contentSimilarity = this.calculateContentSimilarity(nodeA.content, nodeB.content)
        if (contentSimilarity > 0.4) {
          suggestions.push({
            source: nodeA.id,
            target: nodeB.id,
            reason: `Related content (${Math.round(contentSimilarity * 100)}% similarity)`,
            confidence: contentSimilarity
          })
        }

        // Check for hierarchical relationships (part-whole)
        if (nodeA.label.toLowerCase().includes(nodeB.label.toLowerCase()) ||
            nodeB.label.toLowerCase().includes(nodeA.label.toLowerCase())) {
          suggestions.push({
            source: nodeA.id,
            target: nodeB.id,
            reason: 'Potential hierarchical relationship',
            confidence: 0.7
          })
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 10)
  }

  /**
   * Suggests updates for problematic nodes
   */
  private static suggestNodeUpdates(
    nodes: GraphNode[],
    issues: GraphStructureIssues
  ): Array<{ nodeId: string; suggestedLabel?: string; suggestedType?: string; suggestedContent?: string }> {
    const suggestions: Array<{ nodeId: string; suggestedLabel?: string; suggestedType?: string; suggestedContent?: string }> = []

    // Suggest better labels for unnamed nodes
    issues.unnamedNodes.forEach(nodeId => {
      const node = nodes.find(n => n.id === nodeId)
      if (node && node.content) {
        const words = node.content.split(/\s+/).slice(0, 5)
        const suggestedLabel = words.join(' ').replace(/[^\w\s]/g, '').trim()

        if (suggestedLabel.length > 3) {
          suggestions.push({
            nodeId,
            suggestedLabel: suggestedLabel.length > 50 ?
              suggestedLabel.substring(0, 47) + '...' :
              suggestedLabel
          })
        }
      }
    })

    // Suggest type corrections for document parts
    nodes.forEach(node => {
      if (node.label.includes('.md - Part') && node.type !== 'source') {
        suggestions.push({
          nodeId: node.id,
          suggestedType: 'source'
        })
      }
    })

    return suggestions
  }

  /**
   * Suggests new meaningful connections
   */
  private static suggestNewConnections(
    nodes: GraphNode[],
    edges: Map<string, GraphEdge>
  ): Array<{ source: string; target: string; type: 'semantic' | 'hierarchical' | 'causal'; reason: string; confidence: number }> {
    const missingLinks = this.findMissingSemanticLinks(nodes, edges)

    return missingLinks.map(link => ({
      ...link,
      type: 'semantic' as const
    }))
  }

  /**
   * Calculates content similarity between two strings
   */
  private static calculateContentSimilarity(contentA: string, contentB: string): number {
    if (!contentA || !contentB) return 0

    const wordsA = contentA.toLowerCase().split(/\s+/)
    const wordsB = contentB.toLowerCase().split(/\s+/)

    const setA = new Set(wordsA)
    const setB = new Set(wordsB)

    const intersection = new Set([...setA].filter(word => setB.has(word)))
    const union = new Set([...setA, ...setB])

    return intersection.size / union.size
  }
}

/**
 * Auto-cleanup utility that applies common fixes
 */
export class GraphAutoCleanup {
  /**
   * Applies automatic cleanup to improve graph structure
   */
  static applyAutoCleanup(
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>
  ): {
    updatedNodes: Map<string, GraphNode>
    newEdges: GraphEdge[]
    removedNodes: string[]
    summary: string
  } {
    const issues = GraphValidator.analyzeStructure(nodes, edges)
    const suggestions = GraphValidator.generateCleanupSuggestions(nodes, edges, issues)

    const updatedNodes = new Map(nodes)
    const newEdges: GraphEdge[] = []
    const removedNodes: string[] = []

    // Apply node updates
    suggestions.nodeUpdates.forEach(update => {
      const node = updatedNodes.get(update.nodeId)
      if (node) {
        updatedNodes.set(update.nodeId, {
          ...node,
          label: update.suggestedLabel || node.label,
          type: (update.suggestedType as any) || node.type,
          content: update.suggestedContent || node.content,
          metadata: {
            ...node.metadata,
            modified: new Date()
          }
        })
      }
    })

    // Create high-confidence connections
    suggestions.connectionSuggestions
      .filter(conn => conn.confidence > 0.6)
      .slice(0, 5) // Limit to avoid overwhelming
      .forEach(conn => {
        newEdges.push({
          id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          source: conn.source,
          target: conn.target,
          type: conn.type,
          weight: conn.confidence,
          label: conn.reason,
          metadata: {
            created: new Date(),
            modified: new Date(),
            confidence: conn.confidence,
            aiGenerated: true
          }
        })
      })

    const summary = `Auto-cleanup applied:
    • Updated ${suggestions.nodeUpdates.length} node labels
    • Added ${newEdges.length} semantic connections
    • Identified ${issues.duplicateContent.length} potential duplicates
    • Found ${issues.isolatedNodes.length} isolated nodes`

    return {
      updatedNodes,
      newEdges,
      removedNodes,
      summary
    }
  }
}
