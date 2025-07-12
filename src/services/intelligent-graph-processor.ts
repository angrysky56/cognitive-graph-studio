/**
 * Intelligent Graph Processor
 *
 * AI-powered service that transforms raw data into meaningful, coherent graph structures.
 * Instead of creating random chunks, this analyzes content semantically and creates
 * valuable nodes, relationships, and insights that enhance the knowledge graph.
 *
 * @module IntelligentGraphProcessor
 */

import { EnhancedGraphNode, EnhancedGraphEdge, EnhancedGraphCluster } from '../types/enhanced-graph'
import { AIService } from './ai-service'
import { v4 as uuidv4 } from 'uuid'

/**
 * Configuration for intelligent processing
 */
interface ProcessingConfig {
  maxNodesPerInput: number
  minContentLength: number
  extractRelationships: boolean
  identifyKeyTerms: boolean
  generateInsights: boolean
  clusterSimilarConcepts: boolean
  confidenceThreshold: number
}

/**
 * Raw input data structure
 */
interface RawInput {
  content: string
  source?: string
  metadata?: Record<string, any>
  type?: 'text' | 'document' | 'url' | 'conversation'
}

/**
 * Extracted concept from analysis
 */
interface ExtractedConcept {
  label: string
  content: string
  type: 'concept' | 'entity' | 'topic' | 'insight' | 'process' | 'tool' | 'framework'
  importance: number
  keyTerms: string[]
  relatedConcepts: string[]
  confidence: number
  reasoning: string
}

/**
 * Identified relationship between concepts
 */
interface ExtractedRelationship {
  source: string
  target: string
  relationshipType: string
  label: string
  strength: number
  reasoning: string
  bidirectional: boolean
}

/**
 * Processing result containing structured graph data
 */
interface ProcessingResult {
  nodes: Partial<EnhancedGraphNode>[]
  edges: Partial<EnhancedGraphEdge>[]
  clusters: Partial<EnhancedGraphCluster>[]
  insights: string[]
  confidence: number
  processingTime: number
  metadata: {
    originalLength: number
    conceptsExtracted: number
    relationshipsFound: number
    processingMethod: string
    llmModel: string
  }
}

/**
 * Intelligent Graph Processor Service
 *
 * Transforms raw content into meaningful graph structures using AI analysis
 */
export class IntelligentGraphProcessor {
  private llmService: AIService
  private config: ProcessingConfig

  constructor(llmService: AIService, config: Partial<ProcessingConfig> = {}) {
    this.llmService = llmService
    this.config = {
      maxNodesPerInput: 10,
      minContentLength: 50,
      extractRelationships: true,
      identifyKeyTerms: true,
      generateInsights: true,
      clusterSimilarConcepts: true,
      confidenceThreshold: 0.7,
      ...config
    }
  }

  /**
   * Main processing method - transforms raw input into graph structures
   */
  async processInput(input: RawInput): Promise<ProcessingResult> {
    const startTime = Date.now()

    try {
      console.log('🧠 Starting intelligent graph processing...')

      // Step 1: Analyze content and extract concepts
      const concepts = await this.extractConcepts(input)
      console.log(`📊 Extracted ${concepts.length} concepts`)

      // Step 2: Identify relationships between concepts
      const relationships = this.config.extractRelationships
        ? await this.extractRelationships(concepts, input.content)
        : []
      console.log(`🔗 Found ${relationships.length} relationships`)

      // Step 3: Generate insights about the content
      const insights = this.config.generateInsights
        ? await this.generateInsights(concepts, input.content)
        : []
      console.log(`💡 Generated ${insights.length} insights`)

      // Step 4: Create structured nodes
      const nodes = await this.createNodes(concepts, input)

      // Step 5: Create edges from relationships
      const edges = this.createEdges(relationships)

      // Step 6: Identify potential clusters
      const clusters = this.config.clusterSimilarConcepts
        ? await this.identifyClusters(concepts)
        : []

      const processingTime = Date.now() - startTime
      const avgConfidence = concepts.reduce((sum, c) => sum + c.confidence, 0) / concepts.length

      return {
        nodes,
        edges,
        clusters,
        insights,
        confidence: avgConfidence,
        processingTime,
        metadata: {
          originalLength: input.content.length,
          conceptsExtracted: concepts.length,
          relationshipsFound: relationships.length,
          processingMethod: 'intelligent-ai-analysis',
          llmModel: 'ai-service'
        }
      }

    } catch (error) {
      console.error('❌ Processing failed:', error)
      throw new Error(`Intelligent processing failed: ${error}`)
    }
  }

  /**
   * Extract meaningful concepts from raw content using AI analysis
   */
  private async extractConcepts(input: RawInput): Promise<ExtractedConcept[]> {
    const prompt = `Analyze the following content and extract the most important concepts, entities, and ideas.
Focus on concepts that would be valuable in a knowledge graph.

Content: """
${input.content}
"""

For each concept, provide:
1. A clear, concise label (2-5 words)
2. A meaningful description (1-2 sentences)
3. The concept type (concept/entity/topic/insight/process/tool/framework)
4. Importance score (0-1)
5. Key terms associated with it
6. Related concepts mentioned
7. Confidence in this extraction (0-1)
8. Brief reasoning for why this is significant

Return as JSON array with this structure:
[{
  "label": "string",
  "content": "string",
  "type": "concept|entity|topic|insight|process|tool|framework",
  "importance": 0.8,
  "keyTerms": ["term1", "term2"],
  "relatedConcepts": ["concept1", "concept2"],
  "confidence": 0.9,
  "reasoning": "explanation"
}]

Extract ${this.config.maxNodesPerInput} most valuable concepts maximum.
Only include concepts with confidence >= ${this.config.confidenceThreshold}.`

    try {
      const response = await this.llmService.generateText({
        prompt,
        maxTokens: 8164,
        temperature: 0.3
      })

      const concepts = JSON.parse(response.content) as ExtractedConcept[]
      return concepts.filter(c => c.confidence >= this.config.confidenceThreshold)

    } catch (error) {
      console.error('Failed to extract concepts:', error)
      // Fallback to simple extraction
      return this.fallbackConceptExtraction(input.content)
    }
  }

  /**
   * Identify relationships between extracted concepts
   */
  private async extractRelationships(
    concepts: ExtractedConcept[],
    originalContent: string
  ): Promise<ExtractedRelationship[]> {
    if (concepts.length < 2) return []

    const conceptLabels = concepts.map(c => c.label).join(', ')

    const prompt = `Given these concepts extracted from content: ${conceptLabels}

And the original content for context:
"""
${originalContent}
"""

Identify meaningful relationships between these concepts. Focus on:
- Causal relationships (A causes B)
- Hierarchical relationships (A is part of B)
- Semantic relationships (A relates to B)
- Temporal relationships (A comes before B)
- Functional relationships (A enables B)

Return as JSON array:
[{
  "source": "concept label",
  "target": "concept label",
  "relationshipType": "causal|hierarchical|semantic|temporal|functional",
  "label": "relationship description",
  "strength": 0.8,
  "reasoning": "why this relationship exists",
  "bidirectional": false
}]

Only include relationships with strength >= 0.6.`

    try {
      const response = await this.llmService.generateText({
        prompt,
        maxTokens: 8164,
        temperature: 0.2
      })

      return JSON.parse(response.content) as ExtractedRelationship[]

    } catch (error) {
      console.error('Failed to extract relationships:', error)
      return []
    }
  }

  /**
   * Generate insights about the content and concepts
   */
  private async generateInsights(
    concepts: ExtractedConcept[],
    content: string
  ): Promise<string[]> {
    const conceptSummary = concepts.map(c => `${c.label}: ${c.content}`).join('\n')

    const prompt = `Based on this content analysis:

Concepts found:
${conceptSummary}

Original content length: ${content.length} characters

Generate 3-5 key insights about:
1. What this content represents in terms of knowledge
2. How these concepts relate to broader domains
3. What might be missing or worth exploring further
4. The significance of this information

Return as JSON array of insight strings:
["insight 1", "insight 2", "insight 3"]`

    try {
      const response = await this.llmService.generateText({
        prompt,
        maxTokens: 8164,
        temperature: 0.4
      })

      return JSON.parse(response.content) as string[]

    } catch (error) {
      console.error('Failed to generate insights:', error)
      return [`Analysis of ${concepts.length} concepts from ${content.length} character input`]
    }
  }

  /**
   * Create structured graph nodes from extracted concepts
   */
  private async createNodes(
    concepts: ExtractedConcept[],
    input: RawInput
  ): Promise<Partial<EnhancedGraphNode>[]> {
    return concepts.map((concept, index) => ({
      id: uuidv4(),
      label: concept.label,
      type: this.mapConceptTypeToNodeType(concept.type),
      richContent: {
        markdown: concept.content,
        keyTerms: concept.keyTerms,
        relatedConcepts: concept.relatedConcepts,
        sources: input.source
          ? [{
              id: `${(input.type || 'document')}-${Date.now()}`,
              type: this.mapInputTypeToContentSourceType(input.type),
              value: input.source,
              title: input.source,
              retrievedAt: new Date(),
              confidence: 1
            }]
          : [],
        attachments: []
      },
      metadata: {
        created: new Date(),
        modified: new Date(),
        tags: concept.keyTerms,
        confidence: concept.confidence,
        importance: concept.importance,
        sourceType: input.type || 'text',
        processingMethod: 'intelligent-ai-extraction',
        reasoning: concept.reasoning,
        ...input.metadata
      },
      aiMetadata: {
        discoverySource: 'ai-generated',
        confidenceScore: concept.confidence,
        lastProcessed: new Date(),
        agentHistory: [{
          id: `${index}-${Date.now()}`,
          agentType: 'discovery',
          action: 'extract-concept',
          timestamp: new Date(),
          confidence: concept.confidence,
          reasoning: concept.reasoning,
          input: concept.content,
          output: concept.label,
          processingTime: 0
        }],
        suggestions: [],
        flags: {
          needsReview: concept.confidence < 0.8,
          needsUpdate: false,
          isStale: false,
          hasErrors: false
        }
      },
      position: this.calculateNodePosition(index, concepts.length),
      position3D: { x: 0, y: 0, z: 0 },
      similarities: new Map(),
      connections: []
    }))
  }

  /**
   * Create graph edges from extracted relationships
   */
  private createEdges(relationships: ExtractedRelationship[]): Partial<EnhancedGraphEdge>[] {
    return relationships.map(rel => ({
      source: this.sanitizeNodeId(rel.source),
      target: this.sanitizeNodeId(rel.target),
      type: 'semantic',
      label: rel.label,
      weight: rel.strength,
      metadata: {
        created: new Date(),
        modified: new Date(),
        confidence: rel.strength,
        relationshipType: rel.relationshipType,
        reasoning: rel.reasoning
      },
      semantics: {
        strength: rel.strength,
        bidirectional: rel.bidirectional,
        context: rel.reasoning,
        keywords: []
      },
      visual: {
        curvature: 0.1,
        opacity: Math.max(0.3, rel.strength),
        animated: rel.strength > 0.8,
        color: this.getRelationshipColor(rel.relationshipType)
      },
      discovery: {
        discoveredBy: 'ai',
        confidence: rel.strength,
        reasoning: rel.reasoning
      }
    }))
  }

  /**
   * Identify potential clusters of related concepts
   */
  private async identifyClusters(concepts: ExtractedConcept[]): Promise<Partial<EnhancedGraphCluster>[]> {
    if (concepts.length < 3) return []

    // Simple clustering based on shared key terms and concept types
    const clusters: Map<string, ExtractedConcept[]> = new Map()

    concepts.forEach(concept => {
      const clusterKey = concept.type
      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, [])
      }
      clusters.get(clusterKey)!.push(concept)
    })

    return Array.from(clusters.entries())
      .filter(([_, concepts]) => concepts.length >= 2)
      .map(([type, conceptsInCluster]) => ({
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} Cluster`,
        nodeIds: conceptsInCluster.map(c => this.sanitizeNodeId(c.label)),
        metadata: {
          created: new Date(),
          clusterType: type,
          conceptCount: conceptsInCluster.length
        },
        statistics: {
          nodeCount: conceptsInCluster.length,
          avgConfidence: conceptsInCluster.reduce((sum, c) => sum + c.confidence, 0) / conceptsInCluster.length,
          density: 0.5
        }
      }))
  }

  /**
   * Fallback concept extraction for when AI fails
   */
  private fallbackConceptExtraction(content: string): ExtractedConcept[] {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20)
    const maxConcepts = Math.min(this.config.maxNodesPerInput, sentences.length)

    return sentences.slice(0, maxConcepts).map((sentence, index) => ({
      label: `Concept ${index + 1}`,
      content: sentence.trim(),
      type: 'concept' as const,
      importance: 0.5,
      keyTerms: this.extractKeyWords(sentence),
      relatedConcepts: [],
      confidence: 0.6,
      reasoning: 'Fallback extraction from sentence'
    }))
  }

  /**
   * Extract key words from text (simple implementation)
   */
  private extractKeyWords(text: string): string[] {
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || []
    const stopWords = new Set(['that', 'this', 'with', 'from', 'they', 'been', 'have', 'were', 'said', 'each'])
    return [...new Set(words.filter(word => !stopWords.has(word)))].slice(0, 5)
  }

  /**
   * Calculate node position for visualization
   */
  private calculateNodePosition(index: number, total: number): { x: number; y: number } {
    const radius = Math.max(200, total * 30)
    const angle = (index / total) * 2 * Math.PI
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    }
  }

  /**
   * Sanitize node labels for use as IDs
   */
  private sanitizeNodeId(label: string): string {
    return label.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim()
  }

  /**
   * Get color for relationship type
   */
  private getRelationshipColor(type: string): string {
    const colors = {
      causal: '#ff6b6b',
      hierarchical: '#4ecdc4',
      semantic: '#45b7d1',
      temporal: '#96ceb4',
      functional: '#ffeaa7'
    }
    return colors[type as keyof typeof colors] || '#95a5a6'
  }

  /**
   * Map RawInput.type to ContentSource['type']
   */
  private mapInputTypeToContentSourceType(type?: string): 'document' | 'web' | 'api' | 'user' | 'ai-generated' {
    switch (type) {
      case 'document':
        return 'document'
      case 'url':
        return 'web'
      case 'conversation':
        return 'user'
      case 'text':
        return 'document'
      default:
        return 'document'
    }
  }

  /**
   * Map ExtractedConcept type to valid GraphNode type
   */
  private mapConceptTypeToNodeType(conceptType: string): 'concept' | 'idea' | 'source' | 'cluster' {
    switch (conceptType) {
      case 'entity':
      case 'topic':
      case 'concept':
        return 'concept'
      case 'insight':
      case 'idea':
        return 'idea'
      case 'process':
      case 'tool':
      case 'framework':
        return 'source'
      default:
        return 'concept'
    }
  }
}

export default IntelligentGraphProcessor
