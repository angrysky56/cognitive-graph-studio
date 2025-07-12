/**
 * AI-Powered Semantic Analysis for Intelligent Graph Processing
 *
 * Leverages AI to understand content deeply and create meaningful, interconnected nodes
 * rather than simple keyword-based clustering. Pre-processes raw data holistically
 * before intelligently chunking into coherent, valuable graph nodes.
 */

import { GraphNode } from '../types/graph'
import { AIService, LLMRequest } from '../services/ai-service'

export interface SemanticCluster {
  id: string
  label: string
  nodes: GraphNode[]
  keywords: string[]
  center: { x: number; y: number }
  confidence: number
  aiInsights?: string
  conceptualTheme?: string
}

export interface IntelligentNodeChunk {
  id: string
  title: string
  content: string
  type: 'concept' | 'entity' | 'process' | 'insight' | 'framework' | 'resource'
  importance: number
  keyTerms: string[]
  relatedConcepts: string[]
  connections: Array<{
    targetId: string
    relationshipType: string
    strength: number
    reasoning: string
  }>
  metadata: {
    confidence: number
    aiSummary: string
    suggestedTags: string[]
    sourceReferences: string[]
  }
}

export interface ProcessingResult {
  nodes: IntelligentNodeChunk[]
  connections: Array<{
    sourceId: string
    targetId: string
    type: string
    label: string
    strength: number
    reasoning: string
  }>
  clusters: SemanticCluster[]
  insights: string[]
  overallAnalysis: string
}

/**
 * AI-powered content analysis and intelligent node creation
 */
export class AISemanticProcessor {
  private aiService: AIService

  constructor(aiService: AIService) {
    this.aiService = aiService
  }

  /**
   * Process raw content into intelligent graph structures
   * Step 1: Holistic analysis of all content
   * Step 2: Identify key concepts and their relationships
   * Step 3: Create meaningful nodes with proper connections
   */
  async processRawContent(
    rawContent: string | string[],
    options: {
      maxNodes?: number
      includeInsights?: boolean
      extractResources?: boolean
      identifyProcesses?: boolean
    } = {}
  ): Promise<ProcessingResult> {
    const content = Array.isArray(rawContent) ? rawContent.join('\n\n') : rawContent

    // Step 1: Holistic Content Analysis
    const overallAnalysis = await this.performHolisticAnalysis(content)

    // Step 2: Extract Intelligent Concept Chunks
    const conceptChunks = await this.extractIntelligentConcepts(content, overallAnalysis, options)

    // Step 3: Identify Relationships Between Concepts
    const relationships = await this.identifyConceptRelationships(conceptChunks, content)

    // Step 4: Generate Insights and Clusters
    const insights = await this.generateContentInsights(conceptChunks, relationships)
    const clusters = await this.createIntelligentClusters(conceptChunks, relationships)

    return {
      nodes: conceptChunks,
      connections: relationships,
      clusters,
      insights,
      overallAnalysis
    }
  }

  /**
   * Perform holistic analysis of entire content before chunking
   */
  private async performHolisticAnalysis(content: string): Promise<string> {
    const analysisPrompt = `
Analyze this content holistically to understand its overall structure, themes, and key concepts:

CONTENT:
${content}

Provide a comprehensive analysis including:
1. Main themes and topics
2. Key entities, concepts, and processes mentioned
3. Hierarchical structure of information
4. Recurring patterns and connections
5. Important resources, links, or references
6. Potential areas for creating meaningful knowledge nodes

Focus on understanding how information relates and connects rather than just listing topics.
`

    try {
      const request: LLMRequest = {
        prompt: analysisPrompt,
        systemPrompt: 'You are an expert knowledge architect who understands how to structure information into meaningful, interconnected knowledge graphs.',
        temperature: 0.3,
        maxTokens: 8164
      }

      const response = await this.aiService.generateText(request)
      return response.content
    } catch (error) {
      console.warn('AI analysis failed, using fallback:', error)
      return 'Analysis unavailable - processing with basic extraction'
    }
  }

  /**
   * Extract intelligent concept chunks based on holistic understanding
   */
  private async extractIntelligentConcepts(
    content: string,
    holisticAnalysis: string,
    options: any
  ): Promise<IntelligentNodeChunk[]> {
    const extractionPrompt = `
Based on this holistic analysis:
${holisticAnalysis}

Extract meaningful concept chunks from this content that would make valuable knowledge graph nodes:

CONTENT:
${content}

Create 3-8 intelligent nodes that are:
1. Conceptually coherent and self-contained
2. Rich in information and context
3. Clearly distinct from each other
4. Connected to other concepts in meaningful ways
5. Valuable as standalone knowledge units

For each concept, provide:
- Meaningful title (not just "Concept 1")
- Rich, informative content summary
- Type (concept/entity/process/insight/framework/resource)
- Importance score (1-10)
- Key terms that define this concept
- Related concepts it connects to
- Reasoning for why this is a valuable node

Return as JSON array with this structure:
[{
  "title": "string",
  "content": "string",
  "type": "concept|entity|process|insight|framework|resource",
  "importance": number,
  "keyTerms": ["string"],
  "relatedConcepts": ["string"],
  "reasoning": "string"
}]
`

    try {
      const request: LLMRequest = {
        prompt: extractionPrompt,
        systemPrompt: 'You are an expert at creating valuable, interconnected knowledge nodes. Focus on quality over quantity - each node should be a meaningful unit of knowledge.',
        temperature: 0.2,
        maxTokens: 8164,
        format: 'json'
      }

      const response = await this.aiService.generateText(request)
      const conceptsData = JSON.parse(response.content)

      return conceptsData.map((concept: any, index: number) => ({
        id: `intelligent-node-${Date.now()}-${index}`,
        title: concept.title || `Concept ${index + 1}`,
        content: concept.content || '',
        type: concept.type || 'concept',
        importance: concept.importance || 5,
        keyTerms: concept.keyTerms || [],
        relatedConcepts: concept.relatedConcepts || [],
        connections: [], // Will be populated in relationship step
        metadata: {
          confidence: 0.8,
          aiSummary: concept.reasoning || '',
          suggestedTags: concept.keyTerms || [],
          sourceReferences: []
        }
      }))
    } catch (error) {
      console.warn('AI concept extraction failed, using fallback:', error)
      return this.fallbackConceptExtraction(content)
    }
  }

  /**
   * Identify meaningful relationships between extracted concepts
   */
  private async identifyConceptRelationships(
    concepts: IntelligentNodeChunk[],
    originalContent: string
  ): Promise<Array<{
    sourceId: string
    targetId: string
    type: string
    label: string
    strength: number
    reasoning: string
  }>> {
    if (concepts.length < 2) return []

    const relationshipPrompt = `
Given these extracted concepts from content analysis:
${concepts.map(c => `- ${c.title}: ${c.content.substring(0, 200)}...`).join('\n')}

ORIGINAL CONTENT CONTEXT:
${originalContent.substring(0, 1500)}...

Identify meaningful relationships between these concepts. Focus on:
1. How concepts build upon each other
2. Which concepts are prerequisites for others
3. Which concepts share common themes or domains
4. Which concepts represent different aspects of the same topic
5. How concepts might be used together in practice

Return relationships as JSON array:
[{
  "sourceConcept": "exact title of source concept",
  "targetConcept": "exact title of target concept",
  "relationshipType": "builds-upon|prerequisite|related-to|part-of|enables|conflicts-with|example-of",
  "label": "descriptive relationship label",
  "strength": number (1-10),
  "reasoning": "why this relationship exists"
}]

Only include relationships that add real value to understanding the knowledge domain.
`

    try {
      const request: LLMRequest = {
        prompt: relationshipPrompt,
        systemPrompt: 'You are an expert at identifying meaningful connections between concepts in knowledge graphs. Focus on relationships that enhance understanding and navigation.',
        temperature: 0.2,
        maxTokens: 8164,
        format: 'json'
      }

      const response = await this.aiService.generateText(request)
      const relationshipsData = JSON.parse(response.content)

      // Map concept titles to IDs
      const titleToId = new Map<string, string>()
      concepts.forEach(concept => {
        titleToId.set(concept.title, concept.id)
      })

      return relationshipsData
        .map((rel: any) => {
          const sourceId = titleToId.get(rel.sourceConcept)
          const targetId = titleToId.get(rel.targetConcept)

          if (!sourceId || !targetId) return null

          return {
            sourceId,
            targetId,
            type: rel.relationshipType || 'related-to',
            label: rel.label || 'related to',
            strength: rel.strength || 5,
            reasoning: rel.reasoning || ''
          }
        })
        .filter(Boolean)
    } catch (error) {
      console.warn('AI relationship extraction failed:', error)
      return []
    }
  }

  /**
   * Generate insights about the content and concept structure
   */
  private async generateContentInsights(
    concepts: IntelligentNodeChunk[],
    relationships: any[]
  ): Promise<string[]> {
    const insightPrompt = `
Based on these extracted concepts and their relationships:

CONCEPTS:
${concepts.map(c => `- ${c.title} (${c.type}): ${c.content.substring(0, 100)}...`).join('\n')}

RELATIONSHIPS:
${relationships.map(r => `- ${r.label} (${r.type})`).join('\n')}

Generate 3-5 key insights about:
1. Patterns in the knowledge structure
2. Key themes or domains represented
3. Missing connections that might be valuable
4. Opportunities for further exploration
5. How this knowledge could be applied or extended

Return as simple string array focusing on actionable insights.
`

    try {
      const request: LLMRequest = {
        prompt: insightPrompt,
        systemPrompt: 'You are an expert knowledge analyst who identifies valuable patterns and opportunities in knowledge structures.',
        temperature: 0.4,
        maxTokens: 8164
      }

      const response = await this.aiService.generateText(request)
      return response.content.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .slice(0, 5)
    } catch (error) {
      console.warn('AI insight generation failed:', error)
      return ['Knowledge structure successfully analyzed and organized']
    }
  }

  /**
   * Create intelligent clusters based on conceptual themes
   */
  private async createIntelligentClusters(
    concepts: IntelligentNodeChunk[],
    relationships: any[]
  ): Promise<SemanticCluster[]> {
    if (concepts.length < 3) return []

    // Group concepts by type and relationships
    const clusters: SemanticCluster[] = []
    const processed = new Set<string>()

    for (const concept of concepts) {
      if (processed.has(concept.id)) continue

      // Find related concepts
      const relatedIds = new Set<string>()
      relationships.forEach(rel => {
        if (rel.sourceId === concept.id) relatedIds.add(rel.targetId)
        if (rel.targetId === concept.id) relatedIds.add(rel.sourceId)
      })

      const clusterConcepts = [concept, ...concepts.filter(c => relatedIds.has(c.id))]
      clusterConcepts.forEach(c => processed.add(c.id))

      if (clusterConcepts.length >= 1) {
        clusters.push({
          id: `ai-cluster-${clusters.length}`,
          label: this.generateClusterLabel(clusterConcepts),
          nodes: clusterConcepts.map(c => this.convertToGraphNode(c)),
          keywords: Array.from(new Set(clusterConcepts.flatMap(c => c.keyTerms))),
          center: { x: 0, y: 0 }, // Will be calculated by layout
          confidence: Math.min(clusterConcepts.length / 3, 1),
          conceptualTheme: clusterConcepts[0].type,
          aiInsights: `Cluster of ${clusterConcepts.length} related ${concept.type}s`
        })
      }
    }

    return clusters
  }

  /**
   * Convert intelligent node chunk to GraphNode format
   */
  private convertToGraphNode(chunk: IntelligentNodeChunk): GraphNode {
    return {
      id: chunk.id,
      label: chunk.title,
      content: chunk.content,
      type: chunk.type as any,
      position: { x: 0, y: 0 },
      metadata: {
        created: new Date(),
        modified: new Date(),
        tags: chunk.metadata.suggestedTags,
        confidence: chunk.importance / 10,
        aiConfidence: chunk.metadata.confidence,
        processingResults: {
          summary: chunk.metadata.aiSummary,
          actionsTaken: ['ai-processed', 'intelligent-chunking']
        }
      }
    }
  }

  /**
   * Generate meaningful cluster label
   */
  private generateClusterLabel(concepts: IntelligentNodeChunk[]): string {
    if (concepts.length === 1) return concepts[0].title

    const types = Array.from(new Set(concepts.map(c => c.type)))
    const dominantType = types[0]

    if (types.length === 1) {
      return `${dominantType.charAt(0).toUpperCase() + dominantType.slice(1)}s (${concepts.length})`
    }

    return `Mixed Concepts (${concepts.length})`
  }

  /**
   * Fallback extraction when AI processing fails
   */
  private fallbackConceptExtraction(content: string): IntelligentNodeChunk[] {
    const chunks = content.split(/\n\s*\n/).filter(chunk => chunk.trim().length > 50)

    return chunks.slice(0, 5).map((chunk, index) => ({
      id: `fallback-node-${Date.now()}-${index}`,
      title: `Content Section ${index + 1}`,
      content: chunk.trim(),
      type: 'concept' as const,
      importance: 5,
      keyTerms: [],
      relatedConcepts: [],
      connections: [],
      metadata: {
        confidence: 0.5,
        aiSummary: 'Fallback extraction used',
        suggestedTags: [],
        sourceReferences: []
      }
    }))
  }
}

/**
 * Legacy functions for backward compatibility - now use AI processing
 */
export const extractKeywords = (text: string, maxKeywords = 5): string[] => {
  console.warn('extractKeywords is deprecated - use AISemanticProcessor for intelligent analysis')
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, maxKeywords)
}

export const analyzeNodeSimilarity = (node1: GraphNode, node2: GraphNode): number => {
  console.warn('analyzeNodeSimilarity is deprecated - use AI relationship analysis')
  return 0.5 // Placeholder
}

export const createSemanticClusters = (
  _nodes: GraphNode[],
  _similarityThreshold = 0.3,
  _maxClusters = 10
): SemanticCluster[] => {
  console.warn('createSemanticClusters is deprecated - use AISemanticProcessor.processRawContent')
  return []
}

export const calculateOptimalClusterPositions = (
  clusters: SemanticCluster[],
  canvasWidth: number,
  canvasHeight: number
): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>()

  if (clusters.length === 0) return positions

  if (clusters.length === 1) {
    positions.set(clusters[0].id, { x: canvasWidth / 2, y: canvasHeight / 2 })
    return positions
  }

  // Arrange clusters in a circle or grid pattern
  const useCircular = clusters.length <= 8

  if (useCircular) {
    const radius = Math.min(canvasWidth, canvasHeight) / 3
    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2

    clusters.forEach((cluster, index) => {
      const angle = (index / clusters.length) * 2 * Math.PI
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      positions.set(cluster.id, { x, y })
    })
  } else {
    // Grid layout for many clusters
    const cols = Math.ceil(Math.sqrt(clusters.length))
    const rows = Math.ceil(clusters.length / cols)
    const cellWidth = canvasWidth / (cols + 1)
    const cellHeight = canvasHeight / (rows + 1)

    clusters.forEach((cluster, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      const x = (col + 1) * cellWidth
      const y = (row + 1) * cellHeight
      positions.set(cluster.id, { x, y })
    })
  }

  return positions
}

export const suggestSemanticConnections = (
  _nodes: GraphNode[],
  _existingEdges: Set<string>,
  _threshold = 0.4,
  _maxSuggestions = 10
): Array<{ source: string; target: string; similarity: number; reason: string }> => {
  console.warn('suggestSemanticConnections is deprecated - use AI relationship analysis')
  return []
}

// Export the new AI processor as default
export { AISemanticProcessor as default }