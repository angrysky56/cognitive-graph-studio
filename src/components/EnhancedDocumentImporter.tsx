/**
 * Enhanced Document Importer with Intelligent AI Processing
 *
 * Transforms raw documents and text into meaningful graph structures
 * using AI-powered semantic analysis rather than simple chunking.
 *
 * @module EnhancedDocumentImporter
 */

import React, { useState, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  LinearProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Paper,
} from '@mui/material'
import {
  CloudUpload,
  Psychology,
  Link,
  Lightbulb,
  ExpandMore,
  Settings,
  AddCircleOutline,
  AutoFixHigh,
} from '@mui/icons-material'
import { useDropzone } from 'react-dropzone'
// import pdfParse from 'pdf-parse' // Commented out - Node.js only, causes browser errors
import * as pdfjsLib from 'pdfjs-dist'

// Set up PDF.js worker - use a reliable CDN that doesn't have CORS issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
import { IntelligentGraphProcessor } from '../services/intelligent-graph-processor'
import { AIService } from '../services/ai-service'
import { AISemanticProcessor } from '../utils/semanticAnalysis'
import { EnhancedGraphNode, EnhancedGraphEdge } from '../types/enhanced-graph'
import useEnhancedGraphStore from '../stores/enhancedGraphStore'

interface ProcessingResult {
  nodes: Partial<EnhancedGraphNode>[]
  edges: Partial<EnhancedGraphEdge>[]
  insights: string[]
  confidence: number
  processingTime: number
  metadata: any
}

interface ProcessingPreview {
  originalText: string
  extractedConcepts: Array<{
    label: string
    content: string
    type: string
    confidence: number
  }>
  relationships: Array<{
    source: string
    target: string
    label: string
    strength: number
  }>
  insights: string[]
}

const EnhancedDocumentImporter: React.FC = () => {
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingResults, setProcessingResults] = useState<ProcessingResult | null>(null)
  const [preview, setPreview] = useState<ProcessingPreview | null>(null)
  const [processingConfig, setProcessingConfig] = useState({
    maxNodes: 50,
    extractRelationships: true,
    generateInsights: true,
    confidenceThreshold: 0.7,
    processingMode: 'smart' as 'smart' | 'detailed' | 'fast'
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [currentStep, setCurrentStep] = useState<'input' | 'preview' | 'results'>('input')

  const { createNode, createEdge } = useEnhancedGraphStore()

  // Initialize AI services and processors
  const aiService = new AIService([{
    provider: 'gemini',
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
    model: 'gemini-1.5-flash'
  }])

  const processor = new IntelligentGraphProcessor(
    aiService,
    {
      maxNodesPerInput: processingConfig.maxNodes,
      extractRelationships: processingConfig.extractRelationships,
      generateInsights: processingConfig.generateInsights,
      confidenceThreshold: processingConfig.confidenceThreshold
    }
  )

  // Initialize your enhanced semantic processor for pre-analysis
  const semanticProcessor = new AISemanticProcessor(aiService)

  /**
   * Handle file upload and text extraction
   */
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setSelectedFile(file)

    try {
      const text = await extractTextFromFile(file)
      setInputText(text)
      console.log(`📄 Extracted ${text.length} characters from ${file.name}`)
    } catch (error) {
      console.error('Failed to extract text from file:', error)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1
  })

  /**
   * Extract text from uploaded file
   */
  async function extractTextFromFile(file: File): Promise<string> {
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      return await file.text()
    }

    if (file.type === 'application/pdf') {
      try {
        console.log('📄 Starting PDF processing...', file.name)
        const arrayBuffer = await file.arrayBuffer()
        console.log('✅ PDF file loaded, size:', arrayBuffer.byteLength)

        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
        console.log('✅ PDF parsed, pages:', pdf.numPages)

        let fullText = ''

        // Extract text from each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          console.log(`📖 Processing page ${pageNum}/${pdf.numPages}`)
          const page = await pdf.getPage(pageNum)
          const textContent = await page.getTextContent()
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
          fullText += pageText + '\n'
        }

        console.log('✅ PDF text extraction complete, length:', fullText.length)
        return fullText.trim()
      } catch (error) {
        console.error('❌ Failed to parse PDF:', error)
        throw new Error(`Failed to extract text from PDF: ${error}`)
      }
    }

    // For other file types, you'd integrate with actual file parsing libraries
    console.warn('File parsing not implemented for', file.type)
    return `Content from ${file.name} (${file.type}) - actual parsing would happen here`
  }

  /**
   * Process input text with enhanced AI semantic analysis followed by intelligent processing
   */
  const handleIntelligentProcessing = async () => {
    if (!inputText.trim()) return

    setIsProcessing(true)
    setCurrentStep('preview')

    try {
      console.log('🧠 Starting enhanced semantic analysis...')

      // Step 1: Use your improved semantic processor for holistic analysis
      const semanticResult = await semanticProcessor.processRawContent(inputText, {
        maxNodes: processingConfig.maxNodes,
        includeInsights: true,
        extractResources: true,
        identifyProcesses: true
      })

      console.log('✅ Semantic analysis complete:', {
        nodes: semanticResult.nodes.length,
        connections: semanticResult.connections.length,
        insights: semanticResult.insights.length
      })

      // Step 2: Use the original processor for enhanced graph creation
      const result = await processor.processInput({
        content: inputText,
        source: selectedFile?.name || 'manual-input',
        type: selectedFile ? 'document' : 'text',
        metadata: {
          fileName: selectedFile?.name,
          fileSize: selectedFile?.size,
          processingMode: processingConfig.processingMode,
          timestamp: new Date().toISOString(),
          semanticAnalysis: {
            overallAnalysis: semanticResult.overallAnalysis,
            insights: semanticResult.insights,
            nodeCount: semanticResult.nodes.length,
            connectionCount: semanticResult.connections.length
          }
        }
      })

      // Enhance the result with semantic analysis data
      const enhancedResult = {
        ...result,
        semanticInsights: semanticResult.insights,
        semanticConnections: semanticResult.connections,
        overallAnalysis: semanticResult.overallAnalysis
      }

      setProcessingResults(enhancedResult)

      // Create enhanced preview data combining both analyses
      setPreview({
        originalText: inputText,
        extractedConcepts: [
          // Include semantic analysis concepts
          ...semanticResult.nodes.map(node => ({
            label: node.title,
            content: node.content,
            type: node.type,
            confidence: node.metadata.confidence,
            source: 'semantic-analysis'
          })),
          // Include traditional processor concepts
          ...result.nodes.map(node => ({
            label: node.label || 'Unnamed',
            content: node.richContent?.markdown || '',
            type: node.type || 'concept',
            confidence: node.metadata?.confidence || 0,
            source: 'graph-processor'
          }))
        ],
        relationships: [
          // Include semantic relationships
          ...semanticResult.connections.map(conn => ({
            source: conn.sourceId,
            target: conn.targetId,
            label: conn.label,
            strength: conn.strength / 10, // Normalize to 0-1
            reasoning: conn.reasoning,
            type: 'semantic'
          })),
          // Include traditional relationships
          ...result.edges.map(edge => ({
            source: edge.source || '',
            target: edge.target || '',
            label: edge.label || 'related to',
            strength: edge.weight || 0,
            type: 'traditional'
          }))
        ],
        insights: [
          `Semantic Analysis: Found ${semanticResult.nodes.length} intelligent concepts`,
          `Traditional Processing: Identified ${result.nodes.length} standard concepts`,
          `Total Relationships: ${semanticResult.connections.length + result.edges.length} connections discovered`,
          `Overall Analysis: ${semanticResult.overallAnalysis}`,
          `Processing Quality: Enhanced dual-processor analysis completed`,
          ...result.insights,
          ...semanticResult.insights
        ]
      })

      console.log(`✅ Processing complete: ${result.nodes.length} nodes, ${result.edges.length} edges`)

    } catch (error) {
      console.error('❌ Processing failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Add processed results to the graph
   */
  const addToGraph = async () => {
    if (!processingResults) return

    try {
      console.log('📊 Adding processed results to graph...')

      // Create nodes first
      const nodePromises = processingResults.nodes.map(async (nodeData) => {
        await createNode(nodeData)
      })

      await Promise.all(nodePromises)

      // Then create edges
      const edgePromises = processingResults.edges.map(async (edgeData) => {
        await createEdge(edgeData)
      })

      await Promise.all(edgePromises)

      setCurrentStep('results')
      console.log('✅ Successfully added to graph!')

    } catch (error) {
      console.error('❌ Failed to add to graph:', error)
    }
  }

  /**
   * Reset to start over
   */
  const resetImporter = () => {
    setInputText('')
    setSelectedFile(null)
    setProcessingResults(null)
    setPreview(null)
    setCurrentStep('input')
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoFixHigh color="primary" />
          Intelligent Document Processor
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Transform documents and text into meaningful knowledge graph structures using AI analysis
        </Typography>

        {/* Step 1: Input */}
        {currentStep === 'input' && (
          <>
            {/* File Upload Area */}
            <Paper
              {...getRootProps()}
              sx={{
                p: 3,
                mb: 3,
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'divider',
                backgroundColor: isDragActive ? 'action.hover' : 'background.default',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop file here' : 'Drop files or click to upload'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supports: PDF, Word, Markdown, Text files
              </Typography>
              {selectedFile && (
                <Chip
                  label={`${selectedFile.name} (${Math.round(selectedFile.size / 1024)}KB)`}
                  color="primary"
                  sx={{ mt: 2 }}
                />
              )}
            </Paper>

            {/* Debug Info - Remove this later */}
            {selectedFile && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Debug:</strong> File: {selectedFile.name} |
                  Text extracted: {inputText.length} chars |
                  Button enabled: {inputText.trim() ? 'YES' : 'NO'}
                </Typography>
              </Alert>
            )}

            {/* Manual Text Input */}
            <Typography variant="subtitle2" gutterBottom>
              Or paste text directly:
            </Typography>
            <TextField
              multiline
              rows={8}
              fullWidth
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your content here for intelligent analysis..."
              variant="outlined"
              sx={{ mb: 3 }}
            />

            {/* Processing Configuration */}
            <Accordion sx={{ mb: 3 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Settings sx={{ mr: 1 }} />
                <Typography>Processing Settings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl size="small">
                    <InputLabel>Processing Mode</InputLabel>
                    <Select
                      value={processingConfig.processingMode}
                      onChange={(e) => setProcessingConfig(prev => ({
                        ...prev,
                        processingMode: e.target.value as any
                      }))}
                    >
                      <MenuItem value="fast">Fast - Quick concept extraction</MenuItem>
                      <MenuItem value="smart">Smart - Balanced analysis (recommended)</MenuItem>
                      <MenuItem value="detailed">Detailed - Deep semantic analysis</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    size="small"
                    type="number"
                    label="Max Concepts"
                    value={processingConfig.maxNodes}
                    onChange={(e) => setProcessingConfig(prev => ({
                      ...prev,
                      maxNodes: parseInt(e.target.value) || 50
                    }))}
                    inputProps={{ min: 3, max: 500 }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={processingConfig.extractRelationships}
                        onChange={(e) => setProcessingConfig(prev => ({
                          ...prev,
                          extractRelationships: e.target.checked
                        }))}
                      />
                    }
                    label="Extract Relationships"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={processingConfig.generateInsights}
                        onChange={(e) => setProcessingConfig(prev => ({
                          ...prev,
                          generateInsights: e.target.checked
                        }))}
                      />
                    }
                    label="Generate Insights"
                  />
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Process Button */}
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleIntelligentProcessing}
              disabled={!inputText.trim() || isProcessing}
              startIcon={isProcessing ? <LinearProgress /> : <Psychology />}
              sx={{ mb: 2 }}
            >
              {isProcessing ? 'Processing with AI...' : 'Analyze & Process Content'}
            </Button>
          </>
        )}

        {/* Step 2: Preview */}
        {currentStep === 'preview' && preview && (
          <>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                AI Analysis Complete!
              </Typography>
              Found {preview.extractedConcepts.length} concepts and {preview.relationships.length} relationships.
              Review the results below before adding to your graph.
            </Alert>

            {/* Extracted Concepts */}
            <Accordion defaultExpanded sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Psychology sx={{ mr: 1 }} />
                <Typography>Extracted Concepts ({preview.extractedConcepts.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {preview.extractedConcepts.map((concept, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Chip
                          label={concept.type}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2">{concept.label}</Typography>
                            <Chip
                              label={`${Math.round(concept.confidence * 100)}%`}
                              size="small"
                              color={concept.confidence > 0.8 ? 'success' : 'warning'}
                            />
                          </Box>
                        }
                        secondary={concept.content}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>

            {/* Relationships */}
            {preview.relationships.length > 0 && (
              <Accordion sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Link sx={{ mr: 1 }} />
                  <Typography>Relationships ({preview.relationships.length})</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    {preview.relationships.map((rel, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={`${rel.source} → ${rel.target}`}
                          secondary={`${rel.label} (strength: ${Math.round(rel.strength * 100)}%)`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* AI Insights */}
            {preview.insights.length > 0 && (
              <Accordion sx={{ mb: 3 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Lightbulb sx={{ mr: 1 }} />
                  <Typography>AI Insights ({preview.insights.length})</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    {preview.insights.map((insight, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Lightbulb color="warning" />
                        </ListItemIcon>
                        <ListItemText primary={insight} />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={addToGraph}
                startIcon={<AddCircleOutline />}
                fullWidth
              >
                Add to Graph
              </Button>
              <Button
                variant="outlined"
                onClick={resetImporter}
                fullWidth
              >
                Start Over
              </Button>
            </Box>
          </>
        )}

        {/* Step 3: Results */}
        {currentStep === 'results' && (
          <>
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Successfully Added to Graph!
              </Typography>
              {processingResults && (
                <Typography variant="body2">
                  Created {processingResults.nodes.length} nodes and {processingResults.edges.length} edges
                  in {processingResults.processingTime}ms with {Math.round(processingResults.confidence * 100)}% confidence.
                </Typography>
              )}
            </Alert>

            <Button
              variant="contained"
              fullWidth
              onClick={resetImporter}
              startIcon={<AddCircleOutline />}
            >
              Process Another Document
            </Button>
          </>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="body2" align="center" sx={{ mt: 1 }}>
              AI is analyzing your content...
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default EnhancedDocumentImporter
