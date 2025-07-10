/**
 * Graph Cleanup Service
 * Provides automated graph structure improvement functionality
 * Following MVP Coding Agency best practices for testability and separation of concerns
 * 
 * @module GraphCleanupService
 */

import { GraphValidator, GraphAutoCleanup } from '@/core/graph-validator'
import { GraphNode, GraphEdge } from '@/types/graph'

export interface CleanupResult {
  success: boolean
  summary: string
  updatedNodes: Map<string, GraphNode>
  newEdges: GraphEdge[]
  removedNodes: string[]
  issues: {
    before: number
    after: number
    improvement: number
  }
}

/**
 * Service class for graph cleanup operations
 * Implements clean separation of UI from core logic as per MVP standards
 */
export class GraphCleanupService {
  /**
   * Analyzes current graph structure and returns human-readable report
   * 
   * @param nodes - Current graph nodes
   * @param edges - Current graph edges
   * @returns Detailed analysis report
   */
  public static analyzeGraph(
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>
  ): string {
    const issues = GraphValidator.analyzeStructure(nodes, edges)
    
    let report = '# Graph Structure Analysis Report\n\n'
    
    // Overview
    report += `## Overview\n`
    report += `- **Total Nodes**: ${nodes.size}\n`
    report += `- **Total Connections**: ${edges.size}\n`
    report += `- **Average Connections per Node**: ${(edges.size * 2 / nodes.size).toFixed(1)}\n\n`
    
    // Issues identified
    report += `## Issues Identified\n\n`
    
    if (issues.unnamedNodes.length > 0) {
      report += `### 🏷️ Unnamed/Generic Nodes (${issues.unnamedNodes.length})\n`
      report += `Nodes with generic labels like "New Node" or very short names need better identification.\n\n`
    }
    
    if (issues.isolatedNodes.length > 0) {
      report += `### 🏝️ Isolated Nodes (${issues.isolatedNodes.length})\n`
      report += `Nodes with no connections to other concepts. These should be connected or removed.\n\n`
    }
    
    if (issues.weakConnections.length > 0) {
      report += `### ⚡ Weak Connections (${issues.weakConnections.length})\n`
      report += `Connections that lack semantic meaning or proper labeling.\n\n`
    }
    
    if (issues.duplicateContent.length > 0) {
      report += `### 📋 Duplicate Content (${issues.duplicateContent.length} groups)\n`
      issues.duplicateContent.forEach(dup => {
        report += `- ${dup.reason}\n`
      })
      report += '\n'
    }
    
    if (issues.missingSemanticLinks.length > 0) {
      report += `### 🔗 Missing Semantic Links (${issues.missingSemanticLinks.length} suggestions)\n`
      report += `Top recommendations:\n`
      issues.missingSemanticLinks.slice(0, 5).forEach(link => {
        report += `- ${link.reason} (${Math.round(link.confidence * 100)}% confidence)\n`
      })
      report += '\n'
    }
    
    // Recommendations
    report += `## 💡 Recommendations\n\n`
    report += `1. **Fix Node Labels**: Rename generic nodes with descriptive labels\n`
    report += `2. **Connect Isolated Nodes**: Link unconnected concepts to the main graph\n`
    report += `3. **Improve Relationships**: Add semantic meaning to temporal connections\n`
    report += `4. **Remove Duplicates**: Merge similar nodes or clarify their differences\n`
    report += `5. **Add Missing Links**: Connect related concepts that should be linked\n\n`
    
    return report
  }

  /**
   * Performs automated cleanup of graph structure
   * 
   * @param nodes - Current graph nodes
   * @param edges - Current graph edges
   * @returns Cleanup results with updated data
   */
  public static performAutoCleanup(
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>
  ): CleanupResult {
    try {
      // Get initial issue count
      const initialIssues = GraphValidator.analyzeStructure(nodes, edges)
      const initialIssueCount = this.countTotalIssues(initialIssues)
      
      // Perform cleanup
      const cleanupResult = GraphAutoCleanup.applyAutoCleanup(nodes, edges)
      
      // Analyze results
      const finalIssues = GraphValidator.analyzeStructure(cleanupResult.updatedNodes, edges)
      const finalIssueCount = this.countTotalIssues(finalIssues)
      
      const improvement = Math.max(0, initialIssueCount - finalIssueCount)
      
      return {
        success: true,
        summary: cleanupResult.summary,
        updatedNodes: cleanupResult.updatedNodes,
        newEdges: cleanupResult.newEdges,
        removedNodes: cleanupResult.removedNodes,
        issues: {
          before: initialIssueCount,
          after: finalIssueCount,
          improvement
        }
      }
    } catch (error) {
      return {
        success: false,
        summary: `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        updatedNodes: nodes,
        newEdges: [],
        removedNodes: [],
        issues: {
          before: 0,
          after: 0,
          improvement: 0
        }
      }
    }
  }

  /**
   * Suggests specific improvements for selected nodes
   * 
   * @param selectedNodeIds - IDs of nodes to analyze
   * @param nodes - All graph nodes
   * @param edges - All graph edges
   * @returns Targeted suggestions
   */
  public static suggestImprovements(
    selectedNodeIds: Set<string>,
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>
  ): Array<{
    nodeId: string
    suggestions: string[]
    priority: 'high' | 'medium' | 'low'
  }> {
    const suggestions: Array<{
      nodeId: string
      suggestions: string[]
      priority: 'high' | 'medium' | 'low'
    }> = []
    
    const issues = GraphValidator.analyzeStructure(nodes, edges)
    const cleanup = GraphValidator.generateCleanupSuggestions(nodes, edges, issues)
    
    selectedNodeIds.forEach(nodeId => {
      const node = nodes.get(nodeId)
      if (!node) return
      
      const nodeSuggestions: string[] = []
      let priority: 'high' | 'medium' | 'low' = 'low'
      
      // Check if node needs label improvement
      if (issues.unnamedNodes.includes(nodeId)) {
        nodeSuggestions.push('Improve node label - current name is too generic')
        priority = 'high'
      }
      
      // Check if node is isolated
      if (issues.isolatedNodes.includes(nodeId)) {
        nodeSuggestions.push('Connect to other nodes - currently isolated')
        priority = 'high'
      }
      
      // Check for potential connections
      const potentialConnections = cleanup.connectionSuggestions
        .filter(conn => conn.source === nodeId || conn.target === nodeId)
        .slice(0, 3)
      
      if (potentialConnections.length > 0) {
        nodeSuggestions.push(
          `Consider connecting to: ${potentialConnections
            .map(conn => {
              const targetId = conn.source === nodeId ? conn.target : conn.source
              const targetNode = nodes.get(targetId)
              return targetNode?.label || 'Unknown'
            })
            .join(', ')}`
        )
        if (priority === 'low') priority = 'medium'
      }
      
      // Check content quality
      if (node.content.length < 20) {
        nodeSuggestions.push('Add more detailed content description')
        if (priority === 'low') priority = 'medium'
      }
      
      // Check tags
      if (node.metadata.tags.length === 0) {
        nodeSuggestions.push('Add relevant tags to improve discoverability')
        if (priority === 'low') priority = 'medium'
      }
      
      if (nodeSuggestions.length > 0) {
        suggestions.push({
          nodeId,
          suggestions: nodeSuggestions,
          priority
        })
      }
    })
    
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Counts total number of issues in the graph
   * 
   * @private
   * @param issues - Issues object from validator
   * @returns Total issue count
   */
  private static countTotalIssues(issues: any): number {
    return issues.unnamedNodes.length +
           issues.isolatedNodes.length +
           issues.weakConnections.length +
           issues.duplicateContent.length +
           Math.min(issues.missingSemanticLinks.length, 10) // Cap at 10 to avoid overwhelming
  }
}
