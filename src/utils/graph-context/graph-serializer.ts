/**
 * Graph Context Serializer for AI Consumption - Fixed Version
 *
 * Converts the current graph state into a format that AI can understand
 * and reason about. Fixed date handling issues.
 *
 * @module GraphSerializer
 */

import { EnhancedGraphNode, EnhancedGraphEdge, EnhancedGraphCluster } from '@/types/enhanced-graph'
import { extractNodeData } from '@/utils/date-utils'

export interface GraphContext {
  summary: {
    nodeCount: number
    edgeCount: number
    clusterCount: number
    dominantTypes: string[]
    recentActivity: string[]
  }
  nodes: {
    id: string
    label: string
    type: string
    content: string
    tags: string[]
    connections: number
    created: string
  }[]
  relationships: {
    source: string
    target: string
    type: string
    weight: number
    label?: string
  }[]
  clusters: {
    id: string
    label: string
    nodeCount: number
    centerConcepts: string[]
  }[]
  semanticStructure: {
    centralConcepts: string[]
    isolatedNodes: string[]
    stronglyConnected: string[][]
    topicAreas: string[]
  }
}

export interface GraphAnalytics {
  density: number
  averageConnections: number
  mostConnectedNodes: string[]
  leastConnectedNodes: string[]
  possibleGaps: string[]
  suggestedConnections: Array<{
    source: string
    target: string
    reason: string
    confidence: number
  }>
}

/**
 * Serializes graph state into AI-consumable format
 */
export class GraphSerializer {
  /**
   * Create a comprehensive context for AI consumption
   */
  static createContext(
    nodes: Map<string, EnhancedGraphNode>,
    edges: Map<string, EnhancedGraphEdge>,
    clusters: Map<string, EnhancedGraphCluster>
  ): GraphContext {
    const nodeArray = Array.from(nodes.values())
    const edgeArray = Array.from(edges.values())
    const clusterArray = Array.from(clusters.values())

    // Calculate node connection counts
    const connectionCounts = this.calculateConnectionCounts(edgeArray)

    // Identify dominant types
    const typeCounts = nodeArray.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const dominantTypes = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type)

    // Get recent activity (safe date handling)
    const recentActivity = nodeArray
      .sort((a, b) => {
        try {
          const dateA = new Date(a.metadata?.modified || a.metadata?.created || Date.now())
          const dateB = new Date(b.metadata?.modified || b.metadata?.created || Date.now())
          return dateB.getTime() - dateA.getTime()
        } catch {
          return 0
        }
      })
      .slice(0, 5)
      .map(node => `${node.label} (${node.type})`)

    return {
      summary: {
        nodeCount: nodeArray.length,
        edgeCount: edgeArray.length,
        clusterCount: clusterArray.length,
        dominantTypes,
        recentActivity
      },
      nodes: nodeArray.map(node => extractNodeData(node, connectionCounts)),
      relationships: edgeArray.map(edge => ({
        source: edge.source,
        target: edge.target,
        type: edge.type,
        weight: edge.weight,
        label: edge.label
      })),
      clusters: clusterArray.map(cluster => ({
        id: cluster.id,
        label: cluster.label,
        nodeCount: cluster.nodeIds.length,
        centerConcepts: cluster.nodeIds
          .slice(0, 3)
          .map(id => nodes.get(id)?.label || 'Unknown')
          .filter(Boolean)
      })),
      semanticStructure: this.analyzeSemanticStructure(nodeArray, edgeArray, connectionCounts)
    }
  }

  /**
   * Create a text summary for AI consumption
   */
  static createTextSummary(context: GraphContext): string {
    const { summary, nodes, relationships, clusters } = context

    let textSummary = `# Current Knowledge Graph Analysis\n\n`

    textSummary += `## Overview\n`
    textSummary += `- **Nodes**: ${summary.nodeCount} concepts\n`
    textSummary += `- **Connections**: ${summary.edgeCount} relationships\n`
    textSummary += `- **Clusters**: ${summary.clusterCount} topic groups\n`
    textSummary += `- **Dominant Types**: ${summary.dominantTypes.join(', ')}\n\n`

    if (summary.recentActivity.length > 0) {
      textSummary += `## Recent Activity\n`
      summary.recentActivity.forEach(activity => {
        textSummary += `- ${activity}\n`
      })
      textSummary += `\n`
    }

    textSummary += `## Key Concepts\n`
    const topNodes = nodes
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 10)

    topNodes.forEach(node => {
      textSummary += `- **${node.label}** (${node.type}, ${node.connections} connections)\n`
      if (node.tags.length > 0) {
        textSummary += `  Tags: ${node.tags.join(', ')}\n`
      }
    })

    if (clusters.length > 0) {
      textSummary += `\n## Topic Clusters\n`
      clusters.forEach(cluster => {
        textSummary += `- **${cluster.label}**: ${cluster.nodeCount} concepts (${cluster.centerConcepts.join(', ')})\n`
      })
    }

    textSummary += `\n## Relationship Types\n`
    const relationshipTypes = relationships.reduce((acc, rel) => {
      acc[rel.type] = (acc[rel.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    Object.entries(relationshipTypes).forEach(([type, count]) => {
      textSummary += `- ${type}: ${count} connections\n`
    })

    return textSummary
  }

  /**
   * Calculate connection counts for each node
   */
  private static calculateConnectionCounts(
    edges: EnhancedGraphEdge[]
  ): Record<string, number> {
    const counts: Record<string, number> = {}

    edges.forEach(edge => {
      counts[edge.source] = (counts[edge.source] || 0) + 1
      counts[edge.target] = (counts[edge.target] || 0) + 1
    })

    return counts
  }

  /**
   * Analyze semantic structure of the graph
   */
  private static analyzeSemanticStructure(
    nodes: EnhancedGraphNode[],
    edges: EnhancedGraphEdge[],
    connectionCounts: Record<string, number>
  ) {
    // Find central concepts (highly connected nodes)
    const centralConcepts = Object.entries(connectionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([nodeId]) => nodes.find(n => n.id === nodeId)?.label || 'Unknown')
      .filter(Boolean)

    // Find isolated nodes (no connections)
    const isolatedNodes = nodes
      .filter(node => (connectionCounts[node.id] || 0) === 0)
      .map(node => node.label)

    // Find strongly connected components (simplified)
    const stronglyConnected = this.findStronglyConnectedGroups(nodes, edges)

    // Extract topic areas from node types and tags
    const topicAreas = [...new Set([
      ...nodes.map(node => node.type),
      ...nodes.flatMap(node => node.metadata?.tags || [])
    ])].filter(Boolean)

    return {
      centralConcepts,
      isolatedNodes,
      stronglyConnected,
      topicAreas
    }
  }

  /**
   * Simple algorithm to find strongly connected groups
   */
  private static findStronglyConnectedGroups(
    nodes: EnhancedGraphNode[],
    edges: EnhancedGraphEdge[]
  ): string[][] {
    // Simplified grouping based on direct connections
    const groups: string[][] = []
    const visited = new Set<string>()

    nodes.forEach(node => {
      if (visited.has(node.id)) return

      const group = [node.label]
      visited.add(node.id)

      // Find directly connected nodes
      edges.forEach(edge => {
        if (edge.source === node.id && !visited.has(edge.target)) {
          const targetNode = nodes.find(n => n.id === edge.target)
          if (targetNode) {
            group.push(targetNode.label)
            visited.add(edge.target)
          }
        }
        if (edge.target === node.id && !visited.has(edge.source)) {
          const sourceNode = nodes.find(n => n.id === edge.source)
          if (sourceNode) {
            group.push(sourceNode.label)
            visited.add(edge.source)
          }
        }
      })

      if (group.length > 1) {
        groups.push(group)
      }
    })

    return groups
  }

  /**
   * Generate analytics about the graph
   */
  static generateAnalytics(
    nodes: Map<string, EnhancedGraphNode>,
    edges: Map<string, EnhancedGraphEdge>
  ): GraphAnalytics {
    const nodeArray = Array.from(nodes.values())
    const edgeArray = Array.from(edges.values())
    const connectionCounts = this.calculateConnectionCounts(edgeArray)

    const totalPossibleEdges = nodeArray.length * (nodeArray.length - 1) / 2
    const density = edgeArray.length / (totalPossibleEdges || 1)

    const connections = Object.values(connectionCounts)
    const averageConnections = connections.reduce((sum, count) => sum + count, 0) / connections.length || 0

    const sortedByConnections = Object.entries(connectionCounts)
      .sort(([,a], [,b]) => b - a)

    const mostConnectedNodes = sortedByConnections
      .slice(0, 5)
      .map(([nodeId]) => nodes.get(nodeId)?.label || 'Unknown')

    const leastConnectedNodes = sortedByConnections
      .slice(-5)
      .map(([nodeId]) => nodes.get(nodeId)?.label || 'Unknown')

    // Identify possible gaps (nodes that should be connected)
    const possibleGaps = this.identifyPossibleGaps(nodeArray, edgeArray)

    return {
      density,
      averageConnections,
      mostConnectedNodes,
      leastConnectedNodes,
      possibleGaps,
      suggestedConnections: []
    }
  }

  /**
   * Identify potential gaps in the graph
   */
  private static identifyPossibleGaps(nodes: EnhancedGraphNode[], edges: EnhancedGraphEdge[]): string[] {
    const gaps: string[] = []

    // Find nodes with similar tags but no direct connection
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i]
        const nodeB = nodes[j]

        // Check if they share tags
        const sharedTags = nodeA.metadata.tags.filter(tag =>
          nodeB.metadata.tags.includes(tag)
        )

        // Check if they're connected
        const isConnected = edges.some(edge =>
          (edge.source === nodeA.id && edge.target === nodeB.id) ||
          (edge.source === nodeB.id && edge.target === nodeA.id)
        )

        if (sharedTags.length > 0 && !isConnected) {
          gaps.push(`${nodeA.label} ↔ ${nodeB.label} (shared: ${sharedTags.join(', ')})`)
        }
      }
    }

    return gaps.slice(0, 10) // Limit to top 10 gaps
  }
}
