/**
 * Enhanced type definitions for Cognitive Graph Studio with AI capabilities
 *
 * Implements the "graph database with AI capabilities" concept from project blueprint:
 * - Nodes with "vast info" capability
 * - AI agent metadata and processing history
 * - Vector embeddings for semantic search
 * - Enhanced relationship modeling
 *
 * @module EnhancedGraph
 */

import { GraphNode, GraphEdge } from './graph'

/**
 * Rich content structure for nodes containing "vast info"
 * Enables semantic search and AI processing capabilities
 */
export interface RichContent {
  /** Main content in Markdown format */
  markdown: string
  /** Vector embeddings for semantic search */
  embeddings?: number[]
  /** AI-generated summary of the content */
  summary?: string
  /** Extracted key terms for indexing */
  keyTerms: string[]
  /** Related concepts discovered by AI agents */
  relatedConcepts: string[]
  /** External sources and references */
  sources: ContentSource[]
  /** Media attachments (images, documents, etc.) */
  attachments: MediaAttachment[]
}

/**
 * Content source information for traceability
 */
export interface ContentSource {
  id: string
  type: 'web' | 'document' | 'api' | 'user' | 'ai-generated'
  url?: string
  title: string
  retrievedAt: Date
  confidence: number
}

/**
 * Media attachment for rich content
 */
export interface MediaAttachment {
  id: string
  type: 'image' | 'document' | 'audio' | 'video' | 'link'
  filename: string
  mimeType: string
  size: number
  url?: string
  thumbnail?: string
}

/**
 * AI agent action record for tracking processing history
 */
export interface AIAgentAction {
  id: string
  agentType: 'discovery' | 'summarization' | 'linking' | 'workflow' | 'critique'
  action: string
  timestamp: Date
  input: any
  output: any
  confidence: number
  processingTime: number
  model?: string
}

/**
 * AI-related metadata for nodes processed by agents
 */
export interface AIMetadata {
  /** Source of discovery (search engine, document, etc.) */
  discoverySource?: string
  /** Confidence score from AI processing (0-1) */
  confidenceScore: number
  /** Last time this node was processed by AI */
  lastProcessed: Date
  /** History of AI agent actions on this node */
  agentHistory: AIAgentAction[]
  /** Suggested improvements from critique agents */
  suggestions: string[]
  /** Processing flags and status */
  flags: {
    needsReview: boolean
    needsUpdate: boolean
    isStale: boolean
    hasErrors: boolean
  }
}

/**
 * Enhanced graph node with "vast info" capability
 * Extends base GraphNode with rich content and AI capabilities
 */
export interface EnhancedGraphNode extends Omit<GraphNode, 'content'> {
  /** Rich content with embeddings and AI processing */
  richContent: RichContent
  /** AI processing metadata and history */
  aiMetadata: AIMetadata
  /** 3D spatial position for enhanced visualization */
  position3D: {
    x: number
    y: number
    z: number
  }
  /** Semantic similarity scores to other nodes */
  similarities: Map<string, number>
  /** Node clustering information */
  cluster?: {
    id: string
    label: string
    center: boolean
  }
}

/**
 * Enhanced edge with semantic relationship modeling
 */
export interface EnhancedGraphEdge extends GraphEdge {
  /** Semantic relationship details */
  semantics: {
    strength: number
    bidirectional: boolean
    context: string
    keywords: string[]
  }
  /** Spatial visualization properties */
  visual: {
    curvature: number
    opacity: number
    animated: boolean
    color: string
  }
  /** AI-discovered relationship metadata */
  discovery: {
    discoveredBy: 'user' | 'ai'
    agentId?: string
    confidence: number
    reasoning: string
  }
}

/**
 * Graph cluster with AI-powered grouping
 */
export interface EnhancedGraphCluster {
  id: string
  label: string
  description: string
  nodeIds: string[]
  centroid: {
    x: number
    y: number
    z: number
  }
  /** Cluster properties */
  properties: {
    coherence: number
    density: number
    color: string
    size: number
  }
  /** AI clustering metadata */
  aiGenerated: {
    algorithm: string
    confidence: number
    createdAt: Date
    reasoning: string
  }
}

/**
 * Search context for semantic queries
 */
export interface SemanticSearchContext {
  query: string
  filters: {
    nodeTypes?: string[]
    dateRange?: {
      start: Date
      end: Date
    }
    tags?: string[]
    confidence?: {
      min: number
      max: number
    }
  }
  embedding?: number[]
  k: number
}

/**
 * Search result with relevance scoring
 */
export interface SemanticSearchResult {
  node: EnhancedGraphNode
  score: number
  reasoning: string
  highlights: {
    field: string
    snippet: string
    score: number
  }[]
}

/**
 * Agent execution context for AI operations
 */
export interface AgentContext {
  targetNodeId?: string
  targetEdgeId?: string
  query?: string
  parameters: Record<string, any>
  user: {
    id: string
    preferences: Record<string, any>
  }
  environment: {
    timestamp: Date
    sessionId: string
    graphState: {
      nodeCount: number
      edgeCount: number
      lastModified: Date
    }
  }
}

/**
 * Result from AI agent execution
 */
export interface AgentResult {
  success: boolean
  data?: any
  error?: string
  metadata: {
    processingTime: number
    confidence: number
    model?: string
    tokens?: {
      input: number
      output: number
    }
  }
  actions: {
    nodesCreated?: string[]
    nodesModified?: string[]
    edgesCreated?: string[]
    edgesModified?: string[]
    suggestions?: string[]
  }
}

/**
 * TreeQuest reasoning context for enhanced decision making
 */
export interface TreeQuestContext {
  problemStatement: string
  currentNode: string
  availableActions: string[]
  searchDepth: number
  timeLimit: number
  constraints: Record<string, any>
}

/**
 * TreeQuest reasoning result
 */
export interface TreeQuestResult {
  bestAction: string
  confidence: number
  reasoning: string
  alternativeActions: {
    action: string
    score: number
    reasoning: string
  }[]
  searchStats: {
    nodesExplored: number
    depth: number
    timeElapsed: number
  }
}

/**
 * AI Agent interface for autonomous graph processing
 *
 * Base interface for AI agents that can traverse and process
 * information within the cognitive graph.
 */
export interface AIAgent {
  /** Unique agent identifier */
  id: string
  /** Agent type classification */
  type: 'discovery' | 'summarization' | 'linking' | 'workflow' | 'critique'

  /**
   * Execute agent operation with given context
   * @param context - Execution context with parameters and state
   * @returns Promise resolving to agent execution result
   */
  execute(context: AgentContext): Promise<AgentResult>
}
