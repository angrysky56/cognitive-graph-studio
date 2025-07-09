/**
 * AI Service Integration for Cognitive Graph Studio
 * Supports Gemini API, LM Studio, and Ollama - all free services
 */

import { AIProvider, AIRequest, AIResponse } from '@/types/ai'

class AIServiceManager {
  private providers: Map<string, AIProvider> = new Map()
  private activeProvider: string = 'gemini'

  constructor() {
    this.initializeProviders()
  }

  private initializeProviders(): void {
    // Load configuration from environment variables
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY
    const lmstudioBaseUrl = import.meta.env.VITE_LMSTUDIO_BASE_URL || 'http://localhost:1234'
    const lmstudioModel = import.meta.env.VITE_LMSTUDIO_MODEL || 'local-model'
    const ollamaBaseUrl = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434'
    const ollamaModel = import.meta.env.VITE_OLLAMA_MODEL || 'qwen3:latest'

    // Gemini API (free tier)
    this.providers.set('gemini', {
      name: 'gemini',
      displayName: 'Google Gemini',
      status: geminiApiKey ? 'available' : 'error',
      config: {
        apiKey: geminiApiKey || '',
        model: 'gemini-2.0-flash-exp',
        baseUrl: 'https://generativelanguage.googleapis.com'
      }
    })

    // LM Studio (local)
    this.providers.set('lmstudio', {
      name: 'lmstudio',
      displayName: 'LM Studio',
      status: 'available',
      config: {
        baseUrl: lmstudioBaseUrl,
        model: lmstudioModel
      }
    })

    // Ollama (local)
    this.providers.set('ollama', {
      name: 'ollama',
      displayName: 'Ollama',
      status: 'available',
      config: {
        baseUrl: ollamaBaseUrl,
        model: ollamaModel
      }
    })

    console.log('AI Service initialized with environment config:', {
      geminiConfigured: !!geminiApiKey,
      lmstudioUrl: lmstudioBaseUrl,
      ollamaUrl: ollamaBaseUrl
    })
  }

  async testProvider(providerName: string): Promise<boolean> {
    const provider = this.providers.get(providerName)
    if (!provider) return false

    try {
      switch (providerName) {
        case 'gemini':
          return await this.testGemini(provider)
        case 'lmstudio':
          return await this.testLMStudio(provider)
        case 'ollama':
          return await this.testOllama(provider)
        default:
          return false
      }
    } catch (error) {
      console.error(`Error testing ${providerName}:`, error)
      provider.status = 'error'
      return false
    }
  }

  private async testGemini(provider: AIProvider): Promise<boolean> {
    if (!provider.config.apiKey) {
      provider.status = 'error'
      return false
    }

    const response = await fetch(`${provider.config.baseUrl}/v1beta/models`, {
      headers: {
        'X-Goog-Api-Key': provider.config.apiKey
      }
    })

    provider.status = response.ok ? 'available' : 'error'
    return response.ok
  }

  private async testLMStudio(provider: AIProvider): Promise<boolean> {
    try {
      const response = await fetch(`${provider.config.baseUrl}/v1/models`)
      provider.status = response.ok ? 'available' : 'error'
      return response.ok
    } catch {
      provider.status = 'error'
      return false
    }
  }

  private async testOllama(provider: AIProvider): Promise<boolean> {
    try {
      const response = await fetch(`${provider.config.baseUrl}/api/tags`)
      provider.status = response.ok ? 'available' : 'error'
      return response.ok
    } catch {
      provider.status = 'error'
      return false
    }
  }

  async generateContent(request: AIRequest): Promise<AIResponse> {
    const provider = this.providers.get(this.activeProvider)
    if (!provider || provider.status !== 'available') {
      throw new Error(`Provider ${this.activeProvider} not available`)
    }

    const startTime = Date.now()

    try {
      let response: AIResponse

      switch (this.activeProvider) {
        case 'gemini':
          response = await this.callGemini(provider, request)
          break
        case 'lmstudio':
          response = await this.callLMStudio(provider, request)
          break
        case 'ollama':
          response = await this.callOllama(provider, request)
          break
        default:
          throw new Error(`Unknown provider: ${this.activeProvider}`)
      }

      response.metadata.responseTime = Date.now() - startTime
      response.metadata.timestamp = new Date()
      return response

    } catch (error) {
      throw new Error(`AI generation failed: ${(error as Error).message}`)
    }
  }

  private async callGemini(provider: AIProvider, request: AIRequest): Promise<AIResponse> {
    const response = await fetch(`${provider.config.baseUrl}/v1beta/models/${provider.config.model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': provider.config.apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: request.context ? `${request.context}\n\n${request.prompt}` : request.prompt
          }]
        }],
        generationConfig: {
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.maxTokens || 1000
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      content: data.candidates[0]?.content?.parts[0]?.text || '',
      provider: 'gemini',
      model: provider.config.model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      },
      metadata: {
        responseTime: 0,
        timestamp: new Date()
      }
    }
  }

  private async callLMStudio(provider: AIProvider, request: AIRequest): Promise<AIResponse> {
    const response = await fetch(`${provider.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.config.model,
        messages: [
          { role: 'system', content: request.context || 'You are a helpful assistant.' },
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 1000
      })
    })

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'lmstudio',
      model: provider.config.model,
      usage: data.usage,
      metadata: {
        responseTime: 0,
        timestamp: new Date()
      }
    }
  }

  private async callOllama(provider: AIProvider, request: AIRequest): Promise<AIResponse> {
    const response = await fetch(`${provider.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.config.model,
        prompt: request.context ? `${request.context}\n\n${request.prompt}` : request.prompt,
        stream: false,
        options: {
          temperature: request.temperature || 0.7,
          num_predict: request.maxTokens || 1000
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      content: data.response || '',
      provider: 'ollama',
      model: provider.config.model,
      metadata: {
        responseTime: 0,
        timestamp: new Date()
      }
    }
  }

  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name)
  }

  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values())
  }

  setActiveProvider(name: string): void {
    if (this.providers.has(name)) {
      this.activeProvider = name
    }
  }

  getActiveProvider(): string {
    return this.activeProvider
  }

  updateProviderConfig(name: string, config: Partial<AIProvider['config']>): void {
    const provider = this.providers.get(name)
    if (provider) {
      provider.config = { ...provider.config, ...config }
    }
  }
}

export const aiService = new AIServiceManager()
export default aiService
