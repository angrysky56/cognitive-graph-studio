/**
 * Enhanced Document Processor with Semantic Entity Extraction
 * 
 * Replaces basic chunking with intelligent entity recognition and 
 * relationship extraction, inspired by InfraNodus text-to-network approach.
 * This addresses the issue of meaningless node names like "brain inspired 1".
 * 
 * @module EnhancedDocumentProcessor
 */

import nlp from 'compromise'
import { EnhancedGraphNode, EnhancedGraphEdge } from '@/types/enhanced-graph'
import { v4 as uuidv4 } from 'uuid'

// Configure compromise with additional plugins for better entity recognition
nlp.plugin({
  words: {
    ai: 'Noun',
    artificial: 'Adjective',
    intelligence: 'Noun',
    machine: 'Noun',
    learning: 'Noun',
    neural: 'Adjective',
    network: 'Noun',
    algorithm: 'Noun',
    data: 'Noun',
    science: 'Noun'
  },
  tags: {
    TechTerm: {
      isA: 'Noun'
    }
  }
})

export interface ExtractedEntity {
  text: string
  type: 'person' | 'organization' | 'location' | 'concept' | 'topic' | 'technology'
  importance: number
  context: string
  mentions: number
  sentiments?: 'positive' | 'neutral' | 'negative'
}

export interface ExtractedRelationship {
  source: string
  target: string
  type: 'semantic' | 'causal' | 'temporal' | 'hierarchical'
  strength: number
  context: string
}

export interface ProcessingResult {
  nodes: EnhancedGraphNode[]
  edges: EnhancedGraphEdge[]
  summary: string
  topics: string[]
  keyPhrases: string[]
}

export interface ProcessingOptions {
  minEntityImportance?: number
  maxNodes?: number
  includePhrases?: boolean
  extractRelationships?: boolean
  language?: 'en' | 'fr' | 'de' | 'es'
}

/**
 * Enhanced document processor with NLP capabilities
 */
export class EnhancedDocumentProcessor {
  private stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
  ])

  /**
   * Process document text into semantic nodes and relationships
   */
  async processDocument(
    text: string, 
    title?: string, 
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const {
      minEntityImportance = 0.3,
      maxNodes = 50,
      includePhrases = true,
      extractRelationships = true
    } = options

    // Clean and normalize text
    const cleanedText = this.cleanText(text)
    
    // Extract entities using NLP
    const entities = this.extractEntities(cleanedText)
    
    // Filter and rank entities
    const importantEntities = entities
      .filter(entity => entity.importance >= minEntityImportance)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, maxNodes)

    // Create nodes from entities
    const nodes = this.createNodesFromEntities(importantEntities, title || 'Document')

    // Extract relationships if requested
    let edges: EnhancedGraphEdge[] = []
    if (extractRelationships) {
      const relationships = this.extractRelationships(cleanedText, importantEntities)
      edges = this.createEdgesFromRelationships(relationships, nodes)
    }

    // Generate summary and metadata
    const summary = this.generateSummary(cleanedText)
    const topics = this.extractTopics(cleanedText)
    const keyPhrases = this.extractKeyPhrases(cleanedText)

    return {
      nodes,
      edges,
      summary,
      topics,
      keyPhrases
    }
  }

  /**
   * Process text in InfraNodus style: words as nodes, co-occurrences as edges
   */
  async processTextAsWordNetwork(
    text: string,
    windowSize: number = 5
  ): Promise<ProcessingResult> {
    const doc = nlp(text)
    
    // Extract significant words (nouns, adjectives, verbs)
    const words = doc.match('#Noun|#Adjective|#Verb')
      .out('array')
      .map(word => word.toLowerCase())
      .filter(word => word.length > 2 && !this.stopWords.has(word))

    // Count word frequencies
    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Create nodes from words (minimum frequency threshold)
    const minFrequency = Math.max(1, Math.floor(words.length * 0.01))
    const significantWords = Object.entries(wordCounts)
      .filter(([, count]) => count >= minFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50)

    const nodes: EnhancedGraphNode[] = significantWords.map(([word, count]) => ({
      id: uuidv4(),
      label: word,
      type: 'concept',
      position: { x: Math.random() * 800, y: Math.random() * 600 },
      metadata: {
        created: new Date(),
        modified: new Date(),
        tags: ['word', 'frequency'],
        size: Math.log(count + 1) * 10
      },
      connections: [],
      aiGenerated: false,
      richContent: {
        markdown: `Mentioned ${count} times in the text`,
        keyTerms: [word],
        relatedConcepts: [],
        sources: [],
        attachments: []
      },
      aiMetadata: {
        confidenceScore: Math.min(1, count / 10),
        lastProcessed: new Date(),
        agentHistory: [],
        suggestions: [],
        flags: { needsReview: false, needsUpdate: false, isStale: false, hasErrors: false }
      },
      position3D: { x: 0, y: 0, z: 0 },
      similarities: new Map()
    }))

    // Create edges from co-occurrences
    const edges = this.createCooccurrenceEdges(words, nodes, windowSize)

    return {
      nodes,
      edges,
      summary: `Word network with ${nodes.length} concepts and ${edges.length} co-occurrence relationships`,
      topics: this.extractTopics(text),
      keyPhrases: significantWords.slice(0, 10).map(([word]) => word)
    }
  }

  /**
   * Clean and normalize text for processing
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,;:!?-]/g, '')
      .trim()
  }

  /**
   * Extract entities using compromise NLP
   */
  private extractEntities(text: string): ExtractedEntity[] {
    const doc = nlp(text)
    const entities: ExtractedEntity[] = []

    // Extract people
    const people = doc.people().out('array')
    people.forEach(person => {
      entities.push({
        text: person,
        type: 'person',
        importance: this.calculateImportance(person, text),
        context: this.getContext(person, text),
        mentions: this.countMentions(person, text)
      })
    })

    // Extract organizations
    const orgs = doc.organizations().out('array')
    orgs.forEach(org => {
      entities.push({
        text: org,
        type: 'organization',
        importance: this.calculateImportance(org, text),
        context: this.getContext(org, text),
        mentions: this.countMentions(org, text)
      })
    })

    // Extract places
    const places = doc.places().out('array')
    places.forEach(place => {
      entities.push({
        text: place,
        type: 'location',
        importance: this.calculateImportance(place, text),
        context: this.getContext(place, text),
        mentions: this.countMentions(place, text)
      })
    })

    // Extract concepts (significant nouns and noun phrases)
    const concepts = doc.match('#Noun+ #Noun*')
      .concat(doc.match('#Adjective+ #Noun+'))
      .out('array')
      .filter(concept => concept.length > 2 && !this.stopWords.has(concept.toLowerCase()))

    concepts.forEach(concept => {
      entities.push({
        text: concept,
        type: this.classifyEntityType(concept),
        importance: this.calculateImportance(concept, text),
        context: this.getContext(concept, text),
        mentions: this.countMentions(concept, text)
      })
    })

    // Deduplicate and merge similar entities
    return this.deduplicateEntities(entities)
  }

  /**
   * Calculate importance score for an entity
   */
  private calculateImportance(entity: string, text: string): number {
    const mentions = this.countMentions(entity, text)
    const length = entity.length
    const position = text.toLowerCase().indexOf(entity.toLowerCase())
    const textLength = text.length

    // Factors: frequency, length, position (earlier = more important)
    const frequencyScore = Math.log(mentions + 1) / 10
    const lengthScore = Math.min(length / 20, 1)
    const positionScore = 1 - (position / textLength)

    return (frequencyScore + lengthScore + positionScore) / 3
  }

  /**
   * Count mentions of entity in text
   */
  private countMentions(entity: string, text: string): number {
    const regex = new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    return (text.match(regex) || []).length
  }

  /**
   * Get context around entity mentions
   */
  private getContext(entity: string, text: string, windowSize: number = 50): string {
    const index = text.toLowerCase().indexOf(entity.toLowerCase())
    if (index === -1) return ''

    const start = Math.max(0, index - windowSize)
    const end = Math.min(text.length, index + entity.length + windowSize)
    
    return text.slice(start, end).trim()
  }

  /**
   * Classify entity type based on content
   */
  private classifyEntityType(entity: string): ExtractedEntity['type'] {
    const lowerEntity = entity.toLowerCase()
    
    // Technology terms
    if (lowerEntity.includes('ai') || lowerEntity.includes('artificial') || 
        lowerEntity.includes('machine learning') || lowerEntity.includes('neural') ||
        lowerEntity.includes('algorithm') || lowerEntity.includes('data')) {
      return 'technology'
    }
    
    // Abstract concepts
    if (lowerEntity.includes('concept') || lowerEntity.includes('theory') ||
        lowerEntity.includes('principle') || lowerEntity.includes('approach')) {
      return 'concept'
    }
    
    return 'topic'
  }

  /**
   * Deduplicate and merge similar entities
   */
  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const entityMap = new Map<string, ExtractedEntity>()
    
    entities.forEach(entity => {
      const key = entity.text.toLowerCase().trim()
      const existing = entityMap.get(key)
      
      if (existing) {
        // Merge with existing entity
        existing.mentions += entity.mentions
        existing.importance = Math.max(existing.importance, entity.importance)
        if (entity.context.length > existing.context.length) {
          existing.context = entity.context
        }
      } else {
        entityMap.set(key, { ...entity })
      }
    })
    
    return Array.from(entityMap.values())
  }

  /**
   * Extract relationships between entities
   */
  private extractRelationships(text: string, entities: ExtractedEntity[]): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = []
    const sentences = nlp(text).sentences().out('array')
    
    sentences.forEach(sentence => {
      const entitiesInSentence = entities.filter(entity =>
        sentence.toLowerCase().includes(entity.text.toLowerCase())
      )
      
      // Create relationships between entities in the same sentence
      for (let i = 0; i < entitiesInSentence.length; i++) {
        for (let j = i + 1; j < entitiesInSentence.length; j++) {
          const source = entitiesInSentence[i]
          const target = entitiesInSentence[j]
          
          relationships.push({
            source: source.text,
            target: target.text,
            type: this.inferRelationshipType(sentence, source.text, target.text),
            strength: this.calculateRelationshipStrength(sentence, source.text, target.text),
            context: sentence
          })
        }
      }
    })
    
    return this.aggregateRelationships(relationships)
  }

  /**
   * Infer relationship type from sentence context
   */
  private inferRelationshipType(sentence: string, source: string, target: string): ExtractedRelationship['type'] {
    const lowerSentence = sentence.toLowerCase()
    
    // Causal relationships
    if (lowerSentence.includes('causes') || lowerSentence.includes('leads to') ||
        lowerSentence.includes('results in') || lowerSentence.includes('because')) {
      return 'causal'
    }
    
    // Temporal relationships
    if (lowerSentence.includes('before') || lowerSentence.includes('after') ||
        lowerSentence.includes('then') || lowerSentence.includes('next')) {
      return 'temporal'
    }
    
    // Hierarchical relationships
    if (lowerSentence.includes('part of') || lowerSentence.includes('includes') ||
        lowerSentence.includes('contains') || lowerSentence.includes('consists of')) {
      return 'hierarchical'
    }
    
    return 'semantic'
  }

  /**
   * Calculate relationship strength based on context
   */
  private calculateRelationshipStrength(sentence: string, source: string, target: string): number {
    const sourceIndex = sentence.toLowerCase().indexOf(source.toLowerCase())
    const targetIndex = sentence.toLowerCase().indexOf(target.toLowerCase())
    
    if (sourceIndex === -1 || targetIndex === -1) return 0.1
    
    const distance = Math.abs(sourceIndex - targetIndex)
    const maxDistance = sentence.length
    
    // Closer entities have stronger relationships
    return Math.max(0.1, 1 - (distance / maxDistance))
  }

  /**
   * Aggregate duplicate relationships
   */
  private aggregateRelationships(relationships: ExtractedRelationship[]): ExtractedRelationship[] {
    const relationshipMap = new Map<string, ExtractedRelationship>()
    
    relationships.forEach(rel => {
      const key = `${rel.source.toLowerCase()}-${rel.target.toLowerCase()}`
      const reverseKey = `${rel.target.toLowerCase()}-${rel.source.toLowerCase()}`
      
      const existing = relationshipMap.get(key) || relationshipMap.get(reverseKey)
      
      if (existing) {
        existing.strength = Math.max(existing.strength, rel.strength)
        if (rel.context.length > existing.context.length) {
          existing.context = rel.context
        }
      } else {
        relationshipMap.set(key, { ...rel })
      }
    })
    
    return Array.from(relationshipMap.values())
      .filter(rel => rel.strength > 0.2) // Filter weak relationships
  }

  /**
   * Create graph nodes from extracted entities
   */
  private createNodesFromEntities(entities: ExtractedEntity[], sourceTitle: string): EnhancedGraphNode[] {
    return entities.map(entity => ({
      id: uuidv4(),
      label: entity.text,
      type: entity.type,
      position: { 
        x: Math.random() * 800, 
        y: Math.random() * 600 
      },
      metadata: {
        created: new Date(),
        modified: new Date(),
        tags: [entity.type, 'extracted'],
        size: Math.max(10, entity.importance * 50)
      },
      connections: [],
      aiGenerated: false,
      richContent: {
        markdown: entity.context,
        keyTerms: [],
        relatedConcepts: [],
        sources: [],
        attachments: []
      },
      aiMetadata: {
        confidenceScore: entity.importance,
        lastProcessed: new Date(),
        agentHistory: [],
        suggestions: [],
        flags: { needsReview: false, needsUpdate: false, isStale: false, hasErrors: false }
      },
      position3D: { x: 0, y: 0, z: 0 },
      similarities: new Map()
    }))
  }

  /**
   * Create graph edges from extracted relationships
   */
  private createEdgesFromRelationships(relationships: ExtractedRelationship[], nodes: EnhancedGraphNode[]): EnhancedGraphEdge[] {
    const nodeMap = new Map(nodes.map(node => [node.label.toLowerCase(), node.id]))
    
    return relationships
      .map(rel => {
        const sourceId = nodeMap.get(rel.source.toLowerCase())
        const targetId = nodeMap.get(rel.target.toLowerCase())
        
        if (!sourceId || !targetId) return null
        
        return {
          id: uuidv4(),
          source: sourceId,
          target: targetId,
          type: rel.type,
          weight: rel.strength,
          label: rel.context.slice(0, 50) + '...',
          metadata: {
            created: new Date(),
            confidence: rel.strength,
            aiGenerated: false
          },
          semantics: {
            strength: rel.strength,
            bidirectional: false,
            context: rel.context,
            keywords: []
          },
          visual: {
            curvature: 0.1,
            opacity: 0.7,
            animated: false,
            color: '#aaaaaa'
          },
          discovery: {
            discoveredBy: 'ai',
            confidence: rel.strength,
            reasoning: 'Extracted from document'
          }
        }
      })
      .filter((edge): edge is EnhancedGraphEdge => edge !== null)
  }

  /**
   * Create co-occurrence edges for word networks
   */
  private createCooccurrenceEdges(words: string[], nodes: EnhancedGraphNode[], windowSize: number): EnhancedGraphEdge[] {
    const edges: EnhancedGraphEdge[] = []
    const nodeMap = new Map(nodes.map(node => [node.label, node.id]))
    const cooccurrences = new Map<string, number>()
    
    // Count co-occurrences within sliding window
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j < Math.min(i + windowSize, words.length); j++) {
        const word1 = words[i]
        const word2 = words[j]
        
        if (word1 !== word2 && nodeMap.has(word1) && nodeMap.has(word2)) {
          const key = [word1, word2].sort().join('-')
          cooccurrences.set(key, (cooccurrences.get(key) || 0) + 1)
        }
      }
    }
    
    // Create edges from co-occurrences
    cooccurrences.forEach((count, key) => {
      const [word1, word2] = key.split('-')
      const sourceId = nodeMap.get(word1)
      const targetId = nodeMap.get(word2)
      
      if (sourceId && targetId && count > 1) {
        edges.push({
          id: uuidv4(),
          source: sourceId,
          target: targetId,
          type: 'semantic',
          weight: Math.log(count + 1) / 10,
          label: 'co-occurs with',
          metadata: {
            created: new Date(),
            modified: new Date(),
            confidence: count / 10,
            aiGenerated: false
          },
          semantics: {
            strength: Math.log(count + 1) / 10,
            bidirectional: true,
            context: `Co-occurrence within ${windowSize} words`,
            keywords: [word1, word2]
          },
          visual: {
            curvature: 0.1,
            opacity: 0.7,
            animated: false,
            color: '#aaaaaa'
          },
          discovery: {
            discoveredBy: 'ai',
            confidence: count / 10,
            reasoning: 'Co-occurrence detected'
          }
        })
      }
    })
    
    return edges
  }

  /**
   * Generate summary of the text
   */
  private generateSummary(text: string): string {
    const doc = nlp(text)
    const sentences = doc.sentences().out('array')
    
    if (sentences.length <= 3) {
      return text
    }
    
    // Simple extractive summarization: take first and last sentences
    const summary = [sentences[0], sentences[sentences.length - 1]].join(' ')
    return summary.length > 300 ? summary.slice(0, 300) + '...' : summary
  }

  /**
   * Extract main topics from text
   */
  private extractTopics(text: string): string[] {
    const doc = nlp(text)
    
    // Extract noun phrases as potential topics
    const topics = doc.match('#Noun+ #Noun*')
      .concat(doc.match('#Adjective+ #Noun+'))
      .out('array')
      .filter(topic => topic.length > 2)
      .map(topic => topic.toLowerCase())
      .filter(topic => !this.stopWords.has(topic))
    
    // Count frequencies and return top topics
    const topicCounts = topics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([topic]) => topic)
  }

  /**
   * Extract key phrases from text
   */
  private extractKeyPhrases(text: string): string[] {
    const doc = nlp(text)
    
    // Extract significant phrases
    const phrases = doc.match('#Adjective* #Noun+')
      .concat(doc.match('#Verb #Noun+'))
      .out('array')
      .filter(phrase => phrase.length > 3)
      .map(phrase => phrase.toLowerCase())
    
    // Return unique phrases
    return [...new Set(phrases)].slice(0, 15)
  }
}

// Export singleton instance
export const enhancedDocumentProcessor = new EnhancedDocumentProcessor()
