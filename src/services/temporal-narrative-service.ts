/**
 * Temporal Narrative Service - Knowledge-Narrative-Graph Implementation
 * 
 * Based on the Random Tree Model for organizing information into temporal hierarchies
 * where information is stored and compressed across time scales (minute → hour → day → week → month → year)
 * 
 * Key Concepts:
 * - Recent events stored with full detail (minute/hour resolution)
 * - Older events get compressed into narrative summaries  
 * - What persists between time boundaries becomes the ongoing narrative
 * - "Books" are clusters of related tagged graphs organized by time
 * - Library shelves organize books by topics and temporal relevance
 * 
 * @module TemporalNarrativeService
 */

import { EnhancedGraphNode, EnhancedGraphEdge } from '../types/enhanced-graph'
import { SavedGraph } from './graph-persistence-service'
import { AIService } from './ai-service'

/**
 * Temporal scales for hierarchical organization
 */
export type TemporalScale = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

/**
 * A temporal narrative book containing related graphs organized by time
 */
export interface TemporalBook {
  id: string
  title: string
  description: string
  tags: string[]
  
  // Temporal organization
  timeScale: TemporalScale
  startTime: Date
  endTime: Date
  
  // Narrative structure (RTM-inspired)
  compressionRatio: number // How much detail vs. summary
  narrativeDepth: number   // Levels of temporal hierarchy
  
  // Content organization
  graphs: TemporalGraphEntry[]
  persistentThemes: string[] // What carries across time boundaries
  
  // Metadata
  created: Date
  modified: Date
  author?: string
  version: string
}

/**
 * A graph entry within a temporal book
 */
export interface TemporalGraphEntry {
  graphId: string
  timestamp: Date
  timeScale: TemporalScale
  
  // Narrative properties
  relevanceScore: number   // How relevant this remains over time
  compressionLevel: number // How much this has been summarized
  persistentElements: string[] // Concepts that persist to next time scale
  
  // Content summary for quick access
  title: string
  summary: string
  keyNodes: string[] // Most important node IDs
  
  // Relationships
  relatedEntries: string[] // Other graph entries this connects to
  temporalParent?: string  // Higher-level time scale this belongs to
  temporalChildren: string[] // Lower-level entries this summarizes
}

/**
 * A library shelf organizing related temporal books
 */
export interface LibraryShelf {
  id: string
  name: string
  description: string
  tags: string[]
  
  // Organization
  books: string[] // Book IDs on this shelf
  category: 'active' | 'recent' | 'archived' | 'reference'
  
  // Temporal scope
  timeSpan: {
    start: Date
    end: Date
    primaryScale: TemporalScale
  }
  
  // Metadata
  created: Date
  lastAccessed: Date
}

/**
 * Narrative continuity rules for determining what persists across time boundaries
 */
export interface NarrativeContinuityRules {
  // Relevance decay factors by time scale
  decayFactors: Record<TemporalScale, number>
  
  // Minimum relevance to persist to next time scale
  persistenceThresholds: Record<TemporalScale, number>
  
  // Node types that are more likely to persist
  persistentNodeTypes: string[]
  
  // Tags that indicate ongoing narratives
  narrativeTags: string[]
  
  // Connection strength required for cross-temporal links
  connectionThreshold: number
}

/**
 * Configuration for temporal narrative organization
 */
export interface TemporalNarrativeConfig {
  // RTM-inspired parameters
  maxBranchingFactor: number // K parameter - max children per temporal node
  maxNarrativeDepth: number  // D parameter - max temporal hierarchy depth
  
  // Compression settings
  compressionTargets: Record<TemporalScale, number> // Target compression ratio per scale
  
  // Persistence rules
  continuityRules: NarrativeContinuityRules
  
  // Library organization
  maxBooksPerShelf: number
  autoArchiveThreshold: number // Days before moving to archive
}

/**
 * Service for managing temporal narratives and knowledge books
 */
export class TemporalNarrativeService {
  private config: TemporalNarrativeConfig
  private books: Map<string, TemporalBook> = new Map()
  private shelves: Map<string, LibraryShelf> = new Map()
  private aiService: AIService | null = null
  private autoSaveInterval: NodeJS.Timeout | null = null
  private readonly STORAGE_KEY = 'temporal-narrative-library'
  
  constructor(config: TemporalNarrativeConfig, aiService?: AIService) {
    this.config = config
    this.aiService = aiService || null
    this.initializeLibrary()
    this.loadFromStorage()
    this.startAutoSave()
  }

  /**
   * Update the AI service (when settings change)
   */
  setAIService(aiService: AIService) {
    this.aiService = aiService
    console.log('📚 Temporal Library: AI service updated to use configured provider')
  }

  /**
   * Start automatic saving every 30 seconds
   */
  private startAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      this.saveToStorage()
    }, 30000) // Auto-save every 30 seconds
  }

  /**
   * Stop auto-save (cleanup)
   */
  destroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = null
    }
    this.saveToStorage() // Final save
  }

  /**
   * Save library state to localStorage (data safety)
   */
  private saveToStorage() {
    try {
      const libraryData = {
        books: Array.from(this.books.entries()),
        shelves: Array.from(this.shelves.entries()),
        lastSaved: new Date().toISOString(),
        version: '1.0'
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(libraryData))
      console.log('📚 Temporal Library: Auto-saved to storage')
    } catch (error) {
      console.error('📚 Temporal Library: Failed to save to storage:', error)
    }
  }

  /**
   * Load library state from localStorage
   */
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return

      const libraryData = JSON.parse(stored)
      
      // Restore books
      this.books = new Map(libraryData.books || [])
      
      // Restore shelves (but keep defaults if none saved)
      if (libraryData.shelves && libraryData.shelves.length > 0) {
        this.shelves = new Map(libraryData.shelves)
      }
      
      console.log(`📚 Temporal Library: Loaded ${this.books.size} books and ${this.shelves.size} shelves from storage`)
    } catch (error) {
      console.error('📚 Temporal Library: Failed to load from storage:', error)
    }
  }

  /**
   * Initialize the library with default shelves
   */
  private initializeLibrary() {
    // Active shelf for current ongoing narratives
    this.createShelf({
      name: "Active Narratives",
      description: "Currently developing stories and ongoing themes",
      category: "active",
      tags: ["current", "developing", "active"],
      timeSpan: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last week
        end: new Date(),
        primaryScale: "day"
      }
    })

    // Recent shelf for this week's completed narratives
    this.createShelf({
      name: "Recent Stories", 
      description: "Recently completed narratives from this week",
      category: "recent",
      tags: ["recent", "completed", "week"],
      timeSpan: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last month
        end: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Week ago
        primaryScale: "week"
      }
    })

    // Reference shelf for important persistent themes
    this.createShelf({
      name: "Reference Themes",
      description: "Persistent themes and concepts that span long periods", 
      category: "reference",
      tags: ["reference", "persistent", "themes"],
      timeSpan: {
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
        end: new Date(),
        primaryScale: "month"
      }
    })
  }

  /**
   * Create a new temporal book from a saved graph
   */
  async createBookFromGraph(graph: SavedGraph, timeScale: TemporalScale = 'day'): Promise<TemporalBook> {
    const bookId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const book: TemporalBook = {
      id: bookId,
      title: graph.metadata.title,
      description: graph.metadata.description,
      tags: graph.metadata.tags,
      
      timeScale,
      startTime: graph.metadata.created,
      endTime: graph.metadata.modified,
      
      compressionRatio: this.calculateCompressionRatio(graph, timeScale),
      narrativeDepth: this.calculateNarrativeDepth(timeScale),
      
      graphs: [],
      persistentThemes: await this.extractPersistentThemes(graph),
      
      created: new Date(),
      modified: new Date(),
      version: "1.0"
    }

    // Create initial temporal graph entry
    const entry: TemporalGraphEntry = {
      graphId: graph.metadata.id,
      timestamp: new Date(),
      timeScale,
      
      relevanceScore: 1.0, // New entries start with max relevance
      compressionLevel: 0, // No compression yet
      persistentElements: book.persistentThemes,
      
      title: graph.metadata.title,
      summary: graph.metadata.description,
      keyNodes: this.extractKeyNodes(graph),
      
      relatedEntries: [],
      temporalChildren: []
    }

    book.graphs.push(entry)
    this.books.set(bookId, book)
    
    // Add to appropriate shelf
    await this.addBookToShelf(book)
    
    return book
  }

  /**
   * Add a book to the most appropriate library shelf
   */
  private async addBookToShelf(book: TemporalBook): Promise<void> {
    const now = new Date()
    const bookAge = now.getTime() - book.created.getTime()
    const dayInMs = 24 * 60 * 60 * 1000
    
    let targetShelfCategory: LibraryShelf['category']
    
    if (bookAge < dayInMs) {
      targetShelfCategory = 'active'
    } else if (bookAge < 7 * dayInMs) {
      targetShelfCategory = 'recent'
    } else if (book.persistentThemes.length > 2) {
      targetShelfCategory = 'reference'
    } else {
      targetShelfCategory = 'archived'
    }
    
    // Find shelf of target category
    const targetShelf = Array.from(this.shelves.values())
      .find(shelf => shelf.category === targetShelfCategory)
    
    if (targetShelf) {
      targetShelf.books.push(book.id)
      targetShelf.lastAccessed = now
    }
  }

  /**
   * Extract persistent themes using the configured AI service
   */
  private async extractPersistentThemes(graph: SavedGraph): Promise<string[]> {
    const themes: string[] = []
    
    // Always include recurring tags (baseline approach)
    const tagCounts = new Map<string, number>()
    graph.metadata.tags.forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    })
    
    // Tags that appear frequently are likely persistent
    for (const [tag, count] of tagCounts) {
      if (count >= 2 || this.config.continuityRules.narrativeTags.includes(tag)) {
        themes.push(tag)
      }
    }
    
    // Use AI to identify persistent themes if service is available
    if (this.aiService && graph.nodes.size > 0) {
      try {
        // Create content summary for AI analysis
        const nodeContents = Array.from(graph.nodes.values())
          .slice(0, 5) // Limit to prevent token overload
          .map(node => `${node.label}: ${node.richContent?.markdown || ''}`)
          .join('\n')
        
        const prompt = `Analyze this knowledge graph content and identify 3-5 persistent themes that would likely continue to be relevant over time:

${nodeContents}

Tags: ${graph.metadata.tags.join(', ')}

Return only the key themes, one per line, that represent ongoing concepts rather than temporary events.`

        const response = await this.aiService.generateText({
          prompt,
          maxTokens: 200,
          temperature: 0.3 // Lower temperature for more consistent theme extraction
        })
        
        if (response.content) {
          const aiThemes = response.content
            .split('\n')
            .map(line => line.trim().replace(/^[-*•]\s*/, '')) // Remove bullet points
            .filter(theme => theme.length > 2 && theme.length < 50)
            .slice(0, 5)
          
          themes.push(...aiThemes)
          console.log('📚 AI extracted themes:', aiThemes)
        }
      } catch (error) {
        console.warn('📚 AI theme extraction failed, using fallback:', error)
      }
    }
    
    // Look for highly connected nodes (structural persistence indicators)
    const nodeConnections = new Map<string, number>()
    for (const edge of graph.edges.values()) {
      nodeConnections.set(edge.source, (nodeConnections.get(edge.source) || 0) + 1)
      nodeConnections.set(edge.target, (nodeConnections.get(edge.target) || 0) + 1)
    }
    
    // Add labels of highly connected nodes as themes
    const sortedConnections = Array.from(nodeConnections.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3) // Top 3 most connected
    
    for (const [nodeId] of sortedConnections) {
      const node = graph.nodes.get(nodeId)
      if (node && node.label.length > 2) {
        themes.push(node.label)
      }
    }
    
    return [...new Set(themes)].slice(0, 8) // Remove duplicates, limit to 8 themes
  }

  /**
   * Extract key nodes that should be prominently featured in summaries
   */
  private extractKeyNodes(graph: SavedGraph): string[] {
    // For now, return nodes with highest connection counts
    const nodeConnections = new Map<string, number>()
    
    for (const edge of graph.edges.values()) {
      nodeConnections.set(edge.source, (nodeConnections.get(edge.source) || 0) + 1)
      nodeConnections.set(edge.target, (nodeConnections.get(edge.target) || 0) + 1)
    }
    
    return Array.from(nodeConnections.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5) // Top 5 most connected nodes
      .map(([nodeId]) => nodeId)
  }

  /**
   * Calculate compression ratio based on RTM principles
   */
  private calculateCompressionRatio(graph: SavedGraph, timeScale: TemporalScale): number {
    const targetCompression = this.config.compressionTargets[timeScale]
    const nodeCount = graph.nodes.size
    
    // More nodes = higher compression needed
    const baseCompression = Math.min(nodeCount / 10, targetCompression)
    
    return baseCompression
  }

  /**
   * Calculate narrative depth based on temporal scale
   */
  private calculateNarrativeDepth(timeScale: TemporalScale): number {
    const depthMap: Record<TemporalScale, number> = {
      'minute': 1,
      'hour': 2, 
      'day': 3,
      'week': 4,
      'month': 5,
      'year': 6
    }
    
    return Math.min(depthMap[timeScale], this.config.maxNarrativeDepth)
  }

  /**
   * Create a new library shelf
   */
  createShelf(params: {
    name: string
    description: string
    category: LibraryShelf['category']
    tags: string[]
    timeSpan: LibraryShelf['timeSpan']
  }): LibraryShelf {
    const shelfId = `shelf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const shelf: LibraryShelf = {
      id: shelfId,
      ...params,
      books: [],
      created: new Date(),
      lastAccessed: new Date()
    }
    
    this.shelves.set(shelfId, shelf)
    return shelf
  }

  /**
   * Get all library shelves for display
   */
  getLibraryShelves(): LibraryShelf[] {
    return Array.from(this.shelves.values())
      .sort((a, b) => {
        // Sort by category priority, then by last accessed
        const categoryOrder = { 'active': 0, 'recent': 1, 'reference': 2, 'archived': 3 }
        const aPriority = categoryOrder[a.category]
        const bPriority = categoryOrder[b.category]
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority
        }
        
        return b.lastAccessed.getTime() - a.lastAccessed.getTime()
      })
  }

  /**
   * Get books on a specific shelf
   */
  getBooksOnShelf(shelfId: string): TemporalBook[] {
    const shelf = this.shelves.get(shelfId)
    if (!shelf) return []
    
    return shelf.books
      .map(bookId => this.books.get(bookId))
      .filter((book): book is TemporalBook => book !== undefined)
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
  }

  /**
   * Search for books across all shelves
   */
  searchBooks(query: string, tags?: string[]): TemporalBook[] {
    const queryLower = query.toLowerCase()
    
    return Array.from(this.books.values())
      .filter(book => {
        // Text search
        const matchesText = 
          book.title.toLowerCase().includes(queryLower) ||
          book.description.toLowerCase().includes(queryLower) ||
          book.persistentThemes.some(theme => theme.toLowerCase().includes(queryLower))
        
        // Tag filter
        const matchesTags = !tags || tags.length === 0 || 
          tags.some(tag => book.tags.includes(tag))
        
        return matchesText && matchesTags
      })
      .sort((a, b) => {
        // Prioritize recent and more relevant books
        const aScore = a.graphs.reduce((sum, entry) => sum + entry.relevanceScore, 0)
        const bScore = b.graphs.reduce((sum, entry) => sum + entry.relevanceScore, 0)
        
        return bScore - aScore
      })
  }

  /**
   * Get temporal book by ID
   */
  getBook(bookId: string): TemporalBook | undefined {
    return this.books.get(bookId)
  }

  /**
   * Safely delete a book without wrecking the memory system
   */
  async deleteBook(bookId: string, options: { 
    preserveThemes?: boolean
    moveToArchive?: boolean 
  } = {}): Promise<boolean> {
    const book = this.books.get(bookId)
    if (!book) {
      console.warn('📚 Cannot delete book: not found')
      return false
    }

    const { preserveThemes = true, moveToArchive = true } = options

    try {
      // Preserve persistent themes before deletion if requested
      if (preserveThemes && book.persistentThemes.length > 0) {
        // Find or create a "Reference Themes" book to store the themes
        let referenceBook = Array.from(this.books.values())
          .find(b => b.title === 'Reference Themes' || b.tags.includes('reference'))

        if (!referenceBook && moveToArchive) {
          // Create a reference book to preserve the themes
          referenceBook = {
            id: `ref_${Date.now()}`,
            title: 'Reference Themes',
            description: `Preserved themes from deleted books including "${book.title}"`,
            tags: ['reference', 'preserved', 'themes'],
            timeScale: 'year' as const,
            startTime: book.startTime,
            endTime: new Date(),
            compressionRatio: 16.0, // High compression for reference
            narrativeDepth: 1,
            graphs: [],
            persistentThemes: [...book.persistentThemes],
            created: new Date(),
            modified: new Date(),
            version: '1.0'
          }
          
          this.books.set(referenceBook.id, referenceBook)
          console.log('📚 Created reference book to preserve themes:', book.persistentThemes)
        } else if (referenceBook) {
          // Add themes to existing reference book
          const newThemes = book.persistentThemes.filter(theme => 
            !referenceBook!.persistentThemes.includes(theme)
          )
          referenceBook.persistentThemes.push(...newThemes)
          referenceBook.modified = new Date()
          console.log('📚 Preserved themes in reference book:', newThemes)
        }
      }

      // Remove book from all shelves
      for (const shelf of this.shelves.values()) {
        const bookIndex = shelf.books.indexOf(bookId)
        if (bookIndex >= 0) {
          shelf.books.splice(bookIndex, 1)
          console.log(`📚 Removed book from shelf: ${shelf.name}`)
        }
      }

      // Remove the book itself
      this.books.delete(bookId)
      
      // Trigger save
      this.saveToStorage()
      
      console.log(`📚 Successfully deleted book: ${book.title}`)
      return true

    } catch (error) {
      console.error('📚 Failed to safely delete book:', error)
      return false
    }
  }

  /**
   * Get library statistics for monitoring memory health
   */
  getLibraryStats() {
    const totalBooks = this.books.size
    const totalGraphs = Array.from(this.books.values())
      .reduce((sum, book) => sum + book.graphs.length, 0)
    
    const booksByTimeScale: Record<TemporalScale, number> = {
      'minute': 0, 'hour': 0, 'day': 0, 'week': 0, 'month': 0, 'year': 0
    }
    
    for (const book of this.books.values()) {
      booksByTimeScale[book.timeScale]++
    }
    
    return {
      totalBooks,
      totalGraphs,
      booksByTimeScale,
      shelves: this.shelves.size,
      storageKey: this.STORAGE_KEY,
      lastAutoSave: new Date().toISOString()
    }
  }

  /**
   * Update book when its underlying graph changes
   */
  async updateBook(bookId: string, updatedGraph: SavedGraph): Promise<void> {
    const book = this.books.get(bookId)
    if (!book) return
    
    // Update book metadata
    book.title = updatedGraph.metadata.title
    book.description = updatedGraph.metadata.description
    book.tags = updatedGraph.metadata.tags
    book.modified = new Date()
    
    // Update persistent themes
    book.persistentThemes = await this.extractPersistentThemes(updatedGraph)
    
    // Update the graph entry
    const entryIndex = book.graphs.findIndex(entry => entry.graphId === updatedGraph.metadata.id)
    if (entryIndex >= 0) {
      book.graphs[entryIndex].title = updatedGraph.metadata.title
      book.graphs[entryIndex].summary = updatedGraph.metadata.description
      book.graphs[entryIndex].keyNodes = this.extractKeyNodes(updatedGraph)
      book.graphs[entryIndex].persistentElements = book.persistentThemes
    }
  }
}

/**
 * Default configuration for temporal narratives
 */
export const defaultTemporalNarrativeConfig: TemporalNarrativeConfig = {
  maxBranchingFactor: 4, // RTM K parameter
  maxNarrativeDepth: 6,  // RTM D parameter
  
  compressionTargets: {
    'minute': 1.0,  // No compression for very recent
    'hour': 1.2,    // Slight compression
    'day': 2.0,     // Moderate compression
    'week': 4.0,    // Significant compression
    'month': 8.0,   // High compression
    'year': 16.0    // Maximum compression
  },
  
  continuityRules: {
    decayFactors: {
      'minute': 0.95,
      'hour': 0.9,
      'day': 0.8,
      'week': 0.6,
      'month': 0.4,
      'year': 0.2
    },
    
    persistenceThresholds: {
      'minute': 0.9,
      'hour': 0.8,
      'day': 0.6,
      'week': 0.4,
      'month': 0.3,
      'year': 0.2
    },
    
    persistentNodeTypes: ['theme', 'concept', 'person', 'location'],
    narrativeTags: ['ongoing', 'project', 'research', 'relationship'],
    connectionThreshold: 0.5
  },
  
  maxBooksPerShelf: 20,
  autoArchiveThreshold: 30 // Days
}
