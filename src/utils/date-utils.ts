/**
 * Quick Fix for Date Object Issues
 * 
 * Ensures dates are properly handled in graph serialization
 */

import { GraphNode } from '@/types/graph'

/**
 * Safe date conversion utility
 */
export function safeToISOString(date: any): string {
  try {
    if (date instanceof Date) {
      return date.toISOString()
    }
    if (typeof date === 'string') {
      return new Date(date).toISOString()
    }
    if (typeof date === 'number') {
      return new Date(date).toISOString()
    }
    // Fallback to current date
    return new Date().toISOString()
  } catch (error) {
    console.warn('Date conversion failed, using current date:', error)
    return new Date().toISOString()
  }
}

/**
 * Safe node data extraction for AI
 */
export function extractNodeData(node: GraphNode, connectionCounts: Record<string, number>) {
  return {
    id: node.id,
    label: node.label,
    type: node.type,
    content: node.content.slice(0, 200) + (node.content.length > 200 ? '...' : ''),
    tags: Array.isArray(node.metadata?.tags) ? node.metadata.tags : [],
    connections: connectionCounts[node.id] || 0,
    created: safeToISOString(node.metadata?.created)
  }
}
