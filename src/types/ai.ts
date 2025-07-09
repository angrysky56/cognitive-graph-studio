/**
 * AI service integration types for Cognitive Graph Studio
 * Supports Gemini API, LM Studio, and Ollama
 */

export interface AIProvider {
  name: 'gemini' | 'lmstudio' | 'ollama'
  displayName: string
  status: 'available' | 'error' | 'loading'
  config: Record<string, any>
}

export interface AIRequest {
  prompt: string
  context?: string
  temperature?: number
  maxTokens?: number
  model?: string
}

export interface AIResponse {
  content: string
  provider: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  metadata: {
    responseTime: number
    timestamp: Date
    error?: string
  }
}

export interface TreeSearchNode {
  id: string
  state: any
  score: number
  visits: number
  parent?: string
  children: string[]
  isExpanded: boolean
  depth: number
}

export interface SearchStrategy {
  type: 'abmcts-a' | 'abmcts-m' | 'standard-mcts'
  maxIterations: number
  explorationConstant: number
  maxDepth: number
}
