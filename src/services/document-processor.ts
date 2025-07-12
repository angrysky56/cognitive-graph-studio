/**
 * Document Processing Service
 * Advanced file parsing and AI-powered content extraction
 */

import * as pdfjsLib from 'pdfjs-dist'
import { EnhancedGraphNode } from '@/types/enhanced-graph'
import { serviceManager } from './service-manager'

export interface DocumentChunk {
  id: string
  content: string
  metadata: {
    source: string
    chunkIndex: number
    wordCount: number
    type: 'paragraph' | 'section' | 'row' | 'item'
    confidence: number
  }
}

export interface ProcessingResult {
  chunks: DocumentChunk[]
  summary: string
  extractedEntities: string[]
  suggestedTags: string[]
  nodeType: 'source' | 'concept' | 'idea'
}

export interface ProcessingOptions {
  maxChunkWords: number
  minChunkWords: number
  useAIEnhancement: boolean
  extractEntities: boolean
  createRelationships: boolean
  language: string
}

class DocumentProcessingService {
  private readonly defaultOptions: ProcessingOptions = {
    maxChunkWords: 1000,
    minChunkWords: 50,
    useAIEnhancement: true,
    extractEntities: true,
    createRelationships: true,
    language: 'en'
  }

  /**
   * Process a file and extract structured content
   */
  async processFile(
    file: File, 
    options: Partial<ProcessingOptions> = {}
  ): Promise<ProcessingResult> {
    const opts = { ...this.defaultOptions, ...options }
    
    try {
      // Read file content based on type
      const content = await this.readFileContent(file)
      
      // Parse content into chunks
      const chunks = await this.parseContent(content, file.name, opts)
      
      // Enhance with AI if enabled
      if (opts.useAIEnhancement) {
        return await this.enhanceWithAI(chunks, file.name, opts)
      }
      
      return {
        chunks,
        summary: `Processed ${chunks.length} chunks from ${file.name}`,
        extractedEntities: [],
        suggestedTags: [this.getFileExtension(file.name)],
        nodeType: 'source'
      }
    } catch (error) {
      throw new Error(`Failed to process ${file.name}: ${error}`)
    }
  }

  /**
   * Read file content based on type
   */
  private async readFileContent(file: File): Promise<string> {
    const extension = this.getFileExtension(file.name)
    
    switch (extension) {
      case 'txt':
      case 'md':
      case 'json':
        return this.readTextFile(file)
        
      case 'csv':
        return this.readTextFile(file)
        
      case 'pdf':
        return this.readPDFFile(file)
        
      case 'docx':
        return this.readDocxFile(file)
        
      default:
        // Try to read as text
        return this.readTextFile(file)
    }
  }

  /**
   * Read text-based files
   */
  private async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file, 'utf-8')
    })
  }

  /**
   * Read PDF files using pdf.js
   */
  private async readPDFFile(file: File): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer
        try {
          const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
          let fullText = ''
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n'
          }
          resolve(fullText)
        } catch (error) {
          reject(new Error(`Failed to parse PDF: ${error}`))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read PDF file'))
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * Read DOCX files (placeholder - would need mammoth.js or similar)
   */
  private async readDocxFile(file: File): Promise<string> {
    // TODO: Implement DOCX reading with mammoth.js
    return `DOCX file "${file.name}" - DOCX processing not yet implemented.
            File size: ${(file.size / 1024).toFixed(1)} KB.
            This would typically extract text content from the Word document.`
  }

  /**
   * Parse content into meaningful chunks
   */
  private async parseContent(
    content: string, 
    filename: string, 
    options: ProcessingOptions
  ): Promise<DocumentChunk[]> {
    const extension = this.getFileExtension(filename)
    
    switch (extension) {
      case 'csv':
        return this.parseCSV(content, filename, options)
        
      case 'json':
        return this.parseJSON(content, filename, options)
        
      case 'md':
        return this.parseMarkdown(content, filename, options)
        
      default:
        return this.parseText(content, filename, options)
    }
  }

  /**
   * Parse CSV content into chunks
   */
  private async parseCSV(
    content: string, 
    filename: string, 
    _options: ProcessingOptions
  ): Promise<DocumentChunk[]> {
    const lines = content.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row')
    }

    const headers = this.parseCSVLine(lines[0])
    const chunks: DocumentChunk[] = []

    // Create a chunk for the headers (schema)
    chunks.push({
      id: crypto.randomUUID(),
      content: `CSV Schema for ${filename}:\n${headers.map(h => `- ${h}`).join('\n')}`,
      metadata: {
        source: filename,
        chunkIndex: 0,
        wordCount: headers.length,
        type: 'section',
        confidence: 1.0
      }
    })

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i])
      
      if (values.length >= headers.length) {
        const rowData = headers.map((header, idx) => 
          `${header}: ${values[idx] || 'N/A'}`
        ).join('\n')

        chunks.push({
          id: crypto.randomUUID(),
          content: `Row ${i}:\n${rowData}`,
          metadata: {
            source: filename,
            chunkIndex: i,
            wordCount: this.countWords(rowData),
            type: 'row',
            confidence: 0.9
          }
        })
      }
    }

    return chunks
  }

  /**
   * Parse JSON content into chunks
   */
  private async parseJSON(
    content: string, 
    filename: string, 
    options: ProcessingOptions
  ): Promise<DocumentChunk[]> {
    try {
      const data = JSON.parse(content)
      const chunks: DocumentChunk[] = []
      let chunkIndex = 0

      const processValue = (obj: any, path = '', depth = 0): void => {
        if (depth > 10) return // Prevent infinite recursion

        if (Array.isArray(obj)) {
          obj.forEach((item, idx) => {
            processValue(item, `${path}[${idx}]`, depth + 1)
          })
        } else if (typeof obj === 'object' && obj !== null) {
          Object.entries(obj).forEach(([key, value]) => {
            const newPath = path ? `${path}.${key}` : key
            
            if (typeof value === 'object') {
              processValue(value, newPath, depth + 1)
            } else {
              const content = `${newPath}: ${String(value)}`
              const wordCount = this.countWords(content)
              
              if (wordCount >= options.minChunkWords) {
                chunks.push({
                  id: crypto.randomUUID(),
                  content,
                  metadata: {
                    source: filename,
                    chunkIndex: chunkIndex++,
                    wordCount,
                    type: 'item',
                    confidence: 0.8
                  }
                })
              }
            }
          })
        }
      }

      processValue(data)
      return chunks
    } catch (error) {
      // If JSON parsing fails, fall back to text parsing
      return this.parseText(content, filename, options)
    }
  }

  /**
   * Parse Markdown content into chunks
   */
  private async parseMarkdown(
    content: string, 
    filename: string, 
    options: ProcessingOptions
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = []
    let chunkIndex = 0

    // Split by headers
    const sections = content.split(/^#{1,6}\s+/m).filter(section => section.trim())
    
    for (const section of sections) {
      const lines = section.split('\n')
      const title = lines[0]?.trim()
      const body = lines.slice(1).join('\n').trim()
      
      if (body) {
        const fullContent = title ? `# ${title}\n\n${body}` : body
        const wordCount = this.countWords(fullContent)
        
        if (wordCount >= options.minChunkWords) {
          chunks.push({
            id: crypto.randomUUID(),
            content: fullContent,
            metadata: {
              source: filename,
              chunkIndex: chunkIndex++,
              wordCount,
              type: 'section',
              confidence: 0.9
            }
          })
        }
      }
    }

    // If no sections found, fall back to paragraph parsing
    if (chunks.length === 0) {
      return this.parseText(content, filename, options)
    }

    return chunks
  }

  /**
   * Parse plain text into chunks
   */
  private async parseText(
    content: string, 
    filename: string, 
    options: ProcessingOptions
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = []
    let chunkIndex = 0

    // Split by double newlines (paragraphs)
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim())
    
    let currentChunk = ''
    let currentWordCount = 0

    for (const paragraph of paragraphs) {
      const paragraphWords = this.countWords(paragraph)
      
      // If adding this paragraph would exceed max words, finalize current chunk
      if (currentWordCount + paragraphWords > options.maxChunkWords && currentChunk) {
        if (currentWordCount >= options.minChunkWords) {
          chunks.push({
            id: crypto.randomUUID(),
            content: currentChunk.trim(),
            metadata: {
              source: filename,
              chunkIndex: chunkIndex++,
              wordCount: currentWordCount,
              type: 'paragraph',
              confidence: 0.8
            }
          })
        }
        
        currentChunk = paragraph
        currentWordCount = paragraphWords
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph
        currentWordCount += paragraphWords
      }
    }

    // Add the final chunk
    if (currentChunk.trim() && currentWordCount >= options.minChunkWords) {
      chunks.push({
        id: crypto.randomUUID(),
        content: currentChunk.trim(),
        metadata: {
          source: filename,
          chunkIndex: chunkIndex++,
          wordCount: currentWordCount,
          type: 'paragraph',
          confidence: 0.8
        }
      })
    }

    return chunks
  }

  /**
   * Enhance chunks with AI analysis
   */
  private async enhanceWithAI(
    chunks: DocumentChunk[], 
    filename: string, 
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    try {
      // Generate overall summary
      const sampleContent = chunks.slice(0, 3).map(c => c.content).join('\n\n')
      const summaryPrompt = `Summarize this document content in 2-3 sentences: "${sampleContent}"`
      
      const summaryResponse = await serviceManager.generateAIContent(summaryPrompt)
      const summary = summaryResponse.content || `Document with ${chunks.length} chunks`

      // Extract entities if enabled
      let extractedEntities: string[] = []
      if (options.extractEntities) {
        const entityPrompt = `Extract key entities (people, places, concepts) from: "${sampleContent}"`
        const entityResponse = await serviceManager.generateAIContent(entityPrompt)
        
        if (entityResponse.content) {
          extractedEntities = entityResponse.content
            .split(/[,\n]/)
            .map((e: string) => e.trim())
            .filter((e: string) => e.length > 2)
            .slice(0, 10)
        }
      }

      // Generate suggested tags
      const tagPrompt = `Generate 3-5 relevant tags for this document: "${sampleContent}"`
      const tagResponse = await serviceManager.generateAIContent(tagPrompt)
      
      const suggestedTags = tagResponse.content
        ? tagResponse.content.split(/[,\n]/).map((t: string) => t.trim()).filter((t: string) => t.length > 0).slice(0, 5)
        : [this.getFileExtension(filename)]

      // Determine node type based on content
      const nodeType = this.determineNodeType(summary, filename)

      return {
        chunks,
        summary,
        extractedEntities,
        suggestedTags,
        nodeType
      }
    } catch (error) {
      console.warn('AI enhancement failed, using basic processing:', error)
      
      return {
        chunks,
        summary: `Processed ${chunks.length} chunks from ${filename}`,
        extractedEntities: [],
        suggestedTags: [this.getFileExtension(filename)],
        nodeType: 'source'
      }
    }
  }

  /**
   * Utility: Parse CSV line handling quotes and commas
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  /**
   * Utility: Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  /**
   * Utility: Get file extension
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || 'unknown'
  }

  /**
   * Utility: Determine appropriate node type
   */
  private determineNodeType(summary: string, filename: string): 'source' | 'concept' | 'idea' {
    const lowerSummary = summary.toLowerCase()
    const extension = this.getFileExtension(filename)
    
    if (extension === 'csv' || lowerSummary.includes('data') || lowerSummary.includes('table')) {
      return 'source'
    }
    
    if (lowerSummary.includes('concept') || lowerSummary.includes('definition') || lowerSummary.includes('theory')) {
      return 'concept'
    }
    
    if (lowerSummary.includes('idea') || lowerSummary.includes('proposal') || lowerSummary.includes('suggestion')) {
      return 'idea'
    }
    
    return 'source' // Default
  }
}

// Export singleton instance
export const documentProcessor = new DocumentProcessingService()
export default documentProcessor
