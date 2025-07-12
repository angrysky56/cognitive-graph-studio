/**
 * AI service integration types for Cognitive Graph Studio
 * Supports Gemini API, LM Studio, and Ollama
 */

export type LLMProvider = 'gemini' | 'openai' | 'anthropic' | 'local-ollama' | 'local-lm-studio';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

// Types for AIServiceManager compatibility
export type AIProvider = {
  name: string;
  displayName: string;
  status: 'available' | 'loading' | 'error';
  config: {
    apiKey?: string;
    baseUrl?: string;
    model: string;
    [key: string]: any;
  };
};

export interface AIRequest {
  prompt: string;
  context?: string;
  temperature?: number;
  maxTokens?: number;
  format?: 'text' | 'json';
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: {
    responseTime: number;
    timestamp: Date;
  };
}

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  context?: string[];
  temperature?: number;
  maxTokens?: number;
  format?: 'text' | 'json';
}

export interface LLMResponse {
  content: string;
  metadata: {
    model: string;
    provider: LLMProvider;
    tokens: {
      input: number;
      output: number;
      total: number;
    };
    latency: number;
    confidence?: number;
  };
  error?: string;
}

export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
  model: string;
  tokens: number;
}

export interface IAIService {
  generateText(request: LLMRequest, config?: Partial<LLMConfig>): Promise<LLMResponse>;
  generateEmbedding(request: EmbeddingRequest, config?: Partial<LLMConfig>): Promise<EmbeddingResponse>;
  testConnection(provider: LLMProvider): Promise<ConnectionTestResult>;
  getAvailableModels(provider: LLMProvider): Promise<string[]>;
  calculateSimilarity(text1: string, text2: string): Promise<number>;
}

export interface ConnectionTestResult {
  success: boolean;
  latency: number;
  error?: string;
  models?: string[];
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
