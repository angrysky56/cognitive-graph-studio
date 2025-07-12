/**
 * Graph-Aware AI Service Extension
 *
 * Extends the base AI service with graph context awareness,
 * solving the critical issue where AI couldn't read existing graph state.
 *
 * @module GraphAwareAIService
 */

import { AIService, LLMRequest, LLMResponse, LLMConfig } from './ai-service'
import { EnhancedGraphNode, EnhancedGraphEdge, EnhancedGraphCluster } from '@/types/enhanced-graph'
import { GraphSerializer, GraphContext, GraphAnalytics } from '@/utils/graph-context'

export interface GraphAwareRequest extends LLMRequest {
  includeGraphContext?: boolean
  focusNodes?: string[]
  analysisType?: 'overview' | 'detailed' | 'connections' | 'gaps'
}

export interface GraphAnalysisResult {
  response: LLMResponse
  graphContext: GraphContext
  analytics: GraphAnalytics
  suggestions: {
    newNodes: Array<{
      label: string
      type: string
      content: string
      reasoning: string
    }>
    newConnections: Array<{
      source: string
      target: string
      type: string
      reasoning: string
    }>
    improvements: string[]
  }
}

/**
 * Enhanced AI service with graph context awareness
 */
export class GraphAwareAIService extends AIService {
  private currentGraph: {
    nodes: Map<string, EnhancedGraphNode>
    edges: Map<string, EnhancedGraphEdge>
    clusters: Map<string, EnhancedGraphCluster>
  } | null = null

  /**
   * Update the current graph context for AI analysis
   */
  updateGraphContext(
    nodes: Map<string, EnhancedGraphNode>,
    edges: Map<string, EnhancedGraphEdge>,
    clusters: Map<string, EnhancedGraphCluster>
  ): void {
    this.currentGraph = { nodes, edges, clusters }
  }

  /**
   * Generate text with optional graph context
   */
  async generateTextWithContext(request: GraphAwareRequest, config?: Partial<LLMConfig>): Promise<LLMResponse> {
    let enhancedPrompt = request.prompt

    if (request.includeGraphContext && this.currentGraph) {
      const graphContext = GraphSerializer.createContext(
        this.currentGraph.nodes,
        this.currentGraph.edges,
        this.currentGraph.clusters
      )

      const contextSummary = GraphSerializer.createTextSummary(graphContext)

      enhancedPrompt = `# Current Knowledge Graph Context\n\n${contextSummary}\n\n# User Request\n\n${request.prompt}\n\nPlease consider the current knowledge graph when responding. Reference existing nodes and connections where relevant, and suggest how new information could connect to what's already known.`
    }

    if (request.focusNodes && request.focusNodes.length > 0 && this.currentGraph) {
      const focusNodesInfo = request.focusNodes
        .map(nodeId => this.currentGraph!.nodes.get(nodeId))
        .filter(Boolean)
        .map(node => `- **${node!.label}** (${node!.type}): ${node!.richContent.markdown.slice(0, 100)}...`)
        .join('\n')

      enhancedPrompt += `\n\n# Focus Nodes\nPay special attention to these existing concepts:\n${focusNodesInfo}`
    }

    const enhancedRequest: LLMRequest = {
      ...request,
      prompt: enhancedPrompt
    }

    return this.generateText(enhancedRequest, config)
  }

  /**
   * Analyze the current graph and provide insights
   */
  async analyzeGraph(analysisType: GraphAwareRequest['analysisType'] = 'overview'): Promise<GraphAnalysisResult> {
    if (!this.currentGraph) {
      throw new Error('No graph context available. Call updateGraphContext first.')
    }

    const graphContext = GraphSerializer.createContext(
      this.currentGraph.nodes,
      this.currentGraph.edges,
      this.currentGraph.clusters
    )

    const analytics = GraphSerializer.generateAnalytics(
      this.currentGraph.nodes,
      this.currentGraph.edges
    )

    const analysisPrompt = this.createAnalysisPrompt(graphContext, analytics, analysisType)

    const response = await this.generateText({
      prompt: analysisPrompt,
      systemPrompt: "You are an expert knowledge graph analyst. Provide insights based on network structure, identify patterns, gaps, and opportunities for expansion. Be specific and actionable.",
      maxTokens: 8164
    })

    // Parse suggestions from the AI response
    const suggestions = this.parseSuggestions(response.content)

    return {
      response,
      graphContext,
      analytics,
      suggestions
    }
  }

  /**
   * Suggest new connections based on semantic similarity and graph structure
   */
  async suggestConnections(sourceNodeId?: string): Promise<Array<{
    source: string
    target: string
    type: string
    confidence: number
    reasoning: string
  }>> {
    if (!this.currentGraph) {
      throw new Error('No graph context available')
    }

    const nodes = Array.from(this.currentGraph.nodes.values())
    const edges = Array.from(this.currentGraph.edges.values())
    const suggestions: Array<{
      source: string
      target: string
      type: string
      confidence: number
      reasoning: string
    }> = []

    // Focus on a specific node or analyze all nodes
    const nodesToAnalyze = sourceNodeId
      ? [this.currentGraph.nodes.get(sourceNodeId)].filter(Boolean)
      : nodes

    for (const sourceNode of nodesToAnalyze) {
      if (!sourceNode) continue

      // Find unconnected nodes
      const connectedNodeIds = new Set([
        ...edges.filter(e => e.source === sourceNode.id).map(e => e.target),
        ...edges.filter(e => e.target === sourceNode.id).map(e => e.source)
      ])

      const unconnectedNodes = nodes.filter(node =>
        node.id !== sourceNode.id && !connectedNodeIds.has(node.id)
      )

      // Analyze potential connections
      for (const targetNode of unconnectedNodes) {
        const similarity = await this.calculateSimilarity(
          `${sourceNode.label} ${sourceNode.richContent.markdown} ${sourceNode.metadata.tags.join(' ')}`,
          `${targetNode.label} ${targetNode.richContent.markdown} ${targetNode.metadata.tags.join(' ')}`
        )

        if (similarity > 0.3) { // Threshold for suggesting connections
          const connectionType = this.inferConnectionType(sourceNode, targetNode)

          suggestions.push({
            source: sourceNode.id,
            target: targetNode.id,
            type: connectionType,
            confidence: similarity,
            reasoning: `High semantic similarity (${(similarity * 100).toFixed(1)}%) between "${sourceNode.label}" and "${targetNode.label}"`
          })
        }
      }
    }

    // Sort by confidence and return top suggestions
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10)
  }

  /**
   * Process uploaded text and suggest new nodes/connections
   */
  async processTextForGraph(text: string): Promise<{
    suggestedNodes: Array<{
      label: string
      type: string
      content: string
      reasoning: string
    }>
    suggestedConnections: Array<{
      source: string
      target: string
      type: string
      reasoning: string
    }>
  }> {
    const extractionPrompt = `\nAnalyze the following text and extract key concepts that could become nodes in a knowledge graph:\n\n"${text}"\n\nPlease identify:\n1. Key entities (people, organizations, places, concepts)\n2. Main topics and themes\n3. Relationships between these entities\n\nFormat your response as JSON with this structure:\n{\n  "entities": [\n    {\n      "label": "Entity Name",\n      "type": "person|organization|location|concept|topic",\n      "description": "Brief description",\n      "importance": "high|medium|low"\n    }\n  ],\n  "relationships": [\n    {\n      "source": "Entity 1",\n      "target": "Entity 2",\n      "type": "semantic|causal|temporal|hierarchical",\n      "description": "Relationship description"\n    }\n  ]\n}\n`

    const response = await this.generateText({
      prompt: extractionPrompt,
      format: 'json',
      maxTokens: 8164
    })

    try {
      const parsed = JSON.parse(response.content)

      const suggestedNodes = parsed.entities?.map((entity: any) => ({
        label: entity.label,
        type: entity.type,
        content: entity.description || '',
        reasoning: `Extracted from text analysis as ${entity.importance} importance ${entity.type}`
      })) || []

      const suggestedConnections = parsed.relationships?.map((rel: any) => ({
        source: rel.source,
        target: rel.target,
        type: rel.type,
        reasoning: rel.description || 'Inferred from text analysis'
      })) || []

      return { suggestedNodes, suggestedConnections }
    } catch (error) {
      console.error('Failed to parse AI response for text processing:', error)
      return { suggestedNodes: [], suggestedConnections: [] }
    }
  }

  /**
   * Find relevant nodes for a given query
   */
  async findRelevantNodes(query: string, maxResults: number = 5): Promise<Array<{
    node: EnhancedGraphNode
    relevanceScore: number
    reasoning: string
  }>> {
    if (!this.currentGraph) {
      return []
    }

    const nodes = Array.from(this.currentGraph.nodes.values())
    const results: Array<{
      node: EnhancedGraphNode
      relevanceScore: number
      reasoning: string
    }> = []

    for (const node of nodes) {
      const nodeText = `${node.label} ${node.richContent.markdown} ${node.metadata.tags.join(' ')}`
      const similarity = await this.calculateSimilarity(query, nodeText)

      if (similarity > 0.2) {
        results.push({
          node,
          relevanceScore: similarity,
          reasoning: `Semantic similarity: ${(similarity * 100).toFixed(1)}%`
        })
      }
    }

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults)
  }

  /**
   * Create analysis prompt based on graph context and analytics
   */
  private createAnalysisPrompt(
    context: GraphContext,
    analytics: GraphAnalytics,
    analysisType: string
  ): string {
    const contextSummary = GraphSerializer.createTextSummary(context)

    let prompt = `${contextSummary}\n\n# Graph Analytics\n`
    prompt += `- **Density**: ${(analytics.density * 100).toFixed(2)}% (how well connected the graph is)\n`
    prompt += `- **Average Connections**: ${analytics.averageConnections.toFixed(1)} per node\n`
    prompt += `- **Most Connected**: ${analytics.mostConnectedNodes.slice(0, 3).join(', ')}\n`
    prompt += `- **Least Connected**: ${analytics.leastConnectedNodes.slice(0, 3).join(', ')}\n`

    switch (analysisType) {
      case 'detailed':
        prompt += `\n\n# Analysis Request\nProvide a detailed analysis of this knowledge graph including:\n1. Structural strengths and weaknesses\n2. Knowledge gaps and missing connections\n3. Opportunities for expansion\n4. Specific recommendations for improvement\n5. Potential research directions based on the current structure`
        break

      case 'connections':
        prompt += `\n\n# Analysis Request\nFocus on the connection patterns in this graph:\n1. Which nodes should be connected but aren't?\n2. What connection types are missing?\n3. Are there any over-connected hub nodes?\n4. What would improve the graph's connectivity?`
        break

      case 'gaps':
        prompt += `\n\n# Analysis Request\nIdentify knowledge gaps and missing areas:\n1. What topics are underrepresented?\n2. What connections are obviously missing?\n3. What new areas should be explored?\n4. What would make this knowledge graph more complete?`
        break

      default: // overview
        prompt += `\n\n# Analysis Request\nProvide an overview analysis of this knowledge graph focusing on:\n1. Main themes and topics\n2. Overall structure quality\n3. Top 3 strengths\n4. Top 3 areas for improvement`
    }

    return prompt
  }

  /**
   * Parse suggestions from AI response
   */
  private parseSuggestions(aiResponse: string): {
    newNodes: Array<{
      label: string
      type: string
      content: string
      reasoning: string
    }>
    newConnections: Array<{
      source: string
      target: string
      type: string
      reasoning: string
    }>
    improvements: string[]
  } {
    // Simple extraction - could be enhanced with more sophisticated parsing
    const improvements = aiResponse
      .split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
      .map(line => line.replace(/^[-•]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 5)

    return {
      newNodes: [],
      newConnections: [],
      improvements
    }
  }

  /**
   * Infer connection type between two nodes
   */
  private inferConnectionType(node1: EnhancedGraphNode, node2: EnhancedGraphNode): string {
    // Simple heuristics - could be enhanced with ML
    if (node1.type === 'concept' && node2.type === 'concept') {
      return 'semantic'
    }
    if (node1.type === 'source' || node2.type === 'source') {
      return 'hierarchical'
    }
    return 'semantic'
  }
}

// Export singleton instance
export const graphAwareAI = new GraphAwareAIService([])
