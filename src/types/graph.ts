/**
 * Core type definitions for Cognitive Graph Studio
 */

export interface GraphNode {
  id: string
  label: string
  content: string
  type: 'concept' | 'idea' | 'source' | 'cluster'
  position: { x: number; y: number }
  metadata: {
    created: Date
    modified: Date
    author?: string
    tags: string[]
    color?: string
    size?: number
    graphId?: string // ID of the graph this node belongs to
    // IdeaNode specific properties
    confidence?: number // 0-1 confidence score
    priority?: 'low' | 'medium' | 'high'
    favorite?: boolean
    status?: 'draft' | 'active' | 'reviewed'
    // SourceNode specific properties
    sourceType?: string // e.g., 'paper', 'article', 'book'
    url?: string // external link
    published?: Date
    // Additional AI-related metadata
    aiConfidence?: number
    processingResults?: {
      summary?: string
      embeddings?: number[]
      actionsTaken?: string[]
    }
    clusterId?: string
  }

  /**
   * D3.js simulation properties for force-directed layout and positioning.
   * These are used internally by D3 for node positioning, velocity, and fixed coordinates.
   */
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
  vx?: number
  vy?: number
  index?: number
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: 'semantic' | 'causal' | 'temporal' | 'hierarchical'
  weight: number
  label?: string
  metadata: {
    created: Date
    modified: Date
    confidence?: number // 0-1 confidence score
    aiGenerated?: boolean
    bidirectional?: boolean
    hierarchy?: 'parent' | 'child' | 'sibling'
    depth?: number // hierarchical depth level
  }
}

export interface GraphCluster {
  id: string
  label: string
  nodeIds: string[]
  center: { x: number; y: number }
  color: string
  confidence: number
}
