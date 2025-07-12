/**
 * Enhanced Document Importer with Semantic Processing
 * 
 * Replaces the basic chunking approach with intelligent entity extraction
 * and relationship discovery. This solves the "brain inspired 1" problem
 * by creating meaningful, semantic node names.
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
  LinearProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
  Switch,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Paper
} from '@mui/material'
import {
  CloudUpload as CloudUploadIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material'
import { useDropzone } from 'react-dropzone'
import { EnhancedGraphNode, EnhancedGraphEdge } from '@/types/enhanced-graph'
import { enhancedDocumentProcessor, ProcessingOptions, ProcessingResult } from '@/services/enhanced-document-processor'

interface EnhancedDocumentImporterProps {
  onNodesCreated?: (nodes: EnhancedGraphNode[]) => void
  onEdgesCreated?: (edges: EnhancedGraphEdge[]) => void
  onImportComplete?: (result: ProcessingResult) => void
}

interface ProcessingState {
  isProcessing: boolean
  progress: number
  stage: string
  result?: ProcessingResult
  error?: string
}

const EnhancedDocumentImporter: React.FC<EnhancedDocumentImporterProps> = ({
  onNodesCreated,
  onEdgesCreated,
  onImportComplete
}) => {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    stage: ''
  })
  
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>({
    minEntityImportance: 0.3,
    maxNodes: 50,
    includePhrases: true,
    extractRelationships: true,
    language: 'en'
  })

  const [processingMode, setProcessingMode] = useState<'semantic' | 'word-network'>('semantic')
  const [previewResult, setPreviewResult] = useState<ProcessingResult | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    await processFile(file)
  }, [processingOptions, processingMode])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
      'text/html': ['.html']
    },
    multiple: false
  })

  const processFile = async (file: File) => {
    setProcessingState({
      isProcessing: true,
      progress: 0,
      stage: 'Reading file...'
    })

    try {
      // Read file content
      const text = await readFileContent(file)
      
      setProcessingState(prev => ({
        ...prev,
        progress: 20,
        stage: 'Analyzing text structure...'
      }))

      // Process based on selected mode
      let result: ProcessingResult

      if (processingMode === 'word-network') {
        setProcessingState(prev => ({
          ...prev,
          progress: 40,
          stage: 'Creating word co-occurrence network...'
        }))
        
        result = await enhancedDocumentProcessor.processTextAsWordNetwork(text, 5)
      } else {
        setProcessingState(prev => ({
          ...prev,
          progress: 40,
          stage: 'Extracting entities and concepts...'
        }))
        
        result = await enhancedDocumentProcessor.processDocument(
          text,
          file.name,
          processingOptions
        )
      }

      setProcessingState(prev => ({
        ...prev,
        progress: 80,
        stage: 'Finalizing graph structure...'
      }))

      // Add positioning to nodes
      const positionedNodes = result.nodes.map((node, index) => ({
        ...node,
        position: calculateNodePosition(index, result.nodes.length)
      }))

      const finalResult = {
        ...result,
        nodes: positionedNodes
      }

      setProcessingState({
        isProcessing: false,
        progress: 100,
        stage: 'Complete!',
        result: finalResult
      })

      setPreviewResult(finalResult)

    } catch (error) {
      setProcessingState({
        isProcessing: false,
        progress: 0,
        stage: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        const content = event.target?.result as string
        resolve(content)
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      
      reader.readAsText(file)
    })
  }

  const calculateNodePosition = (index: number, total: number): { x: number; y: number } => {
    // Distribute nodes in a spiral pattern
    const angle = (index * 2 * Math.PI) / Math.max(total, 1)
    const radius = 50 + (index * 300) / Math.max(total, 1)
    
    return {
      x: 400 + radius * Math.cos(angle),
      y: 300 + radius * Math.sin(angle)
    }
  }

  const handleImportNodes = () => {
    if (!previewResult) return

    if (onNodesCreated) {
      onNodesCreated(previewResult.nodes)
    }
    
    if (onEdgesCreated && previewResult.edges.length > 0) {
      onEdgesCreated(previewResult.edges)
    }
    
    if (onImportComplete) {
      onImportComplete(previewResult)
    }

    // Reset state
    setPreviewResult(null)
    setProcessingState({
      isProcessing: false,
      progress: 0,
      stage: ''
    })
  }

  const renderProcessingOptions = () => (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1">Processing Options</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ space: 2 }}>
          {/* Processing Mode */}
          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel component="legend">Processing Mode</FormLabel>
            <RadioGroup
              value={processingMode}
              onChange={(e) => setProcessingMode(e.target.value as 'semantic' | 'word-network')}
            >
              <FormControlLabel
                value="semantic"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2">Semantic Entities</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Extract people, organizations, concepts, and relationships
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="word-network"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2">Word Co-occurrence Network</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Create network based on word proximity (InfraNodus style)
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>

          {/* Semantic Processing Options */}
          {processingMode === 'semantic' && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Entity Importance Threshold: {processingOptions.minEntityImportance}
                </Typography>
                <Slider
                  value={processingOptions.minEntityImportance || 0.3}
                  onChange={(_, value) => setProcessingOptions(prev => ({
                    ...prev,
                    minEntityImportance: value as number
                  }))}
                  min={0.1}
                  max={0.8}
                  step={0.1}
                  marks={[
                    { value: 0.1, label: 'Low' },
                    { value: 0.5, label: 'Medium' },
                    { value: 0.8, label: 'High' }
                  ]}
                />
                <Typography variant="caption" color="text.secondary">
                  Higher values = fewer, more important entities
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Maximum Nodes: {processingOptions.maxNodes}
                </Typography>
                <Slider
                  value={processingOptions.maxNodes || 50}
                  onChange={(_, value) => setProcessingOptions(prev => ({
                    ...prev,
                    maxNodes: value as number
                  }))}
                  min={10}
                  max={100}
                  step={5}
                  marks={[
                    { value: 10, label: '10' },
                    { value: 50, label: '50' },
                    { value: 100, label: '100' }
                  ]}
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={processingOptions.extractRelationships}
                    onChange={(e) => setProcessingOptions(prev => ({
                      ...prev,
                      extractRelationships: e.target.checked
                    }))}
                  />
                }
                label="Extract Relationships"
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={processingOptions.includePhrases}
                    onChange={(e) => setProcessingOptions(prev => ({
                      ...prev,
                      includePhrases: e.target.checked
                    }))}
                  />
                }
                label="Include Key Phrases"
              />
            </>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  )

  const renderPreview = () => {
    if (!previewResult) return null

    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VisibilityIcon />
            Processing Results
          </Typography>

          {/* Summary Stats */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center', minWidth: 100 }}>
              <Typography variant="h4" color="primary">
                {previewResult.nodes.length}
              </Typography>
              <Typography variant="caption">Nodes</Typography>
            </Paper>
            <Paper sx={{ p: 2, textAlign: 'center', minWidth: 100 }}>
              <Typography variant="h4" color="primary">
                {previewResult.edges.length}
              </Typography>
              <Typography variant="caption">Connections</Typography>
            </Paper>
            <Paper sx={{ p: 2, textAlign: 'center', minWidth: 100 }}>
              <Typography variant="h4" color="primary">
                {previewResult.topics.length}
              </Typography>
              <Typography variant="caption">Topics</Typography>
            </Paper>
          </Box>

          {/* Summary */}
          {previewResult.summary && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Summary:</strong> {previewResult.summary}
              </Typography>
            </Alert>
          )}

          {/* Topics */}
          {previewResult.topics.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Main Topics:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {previewResult.topics.slice(0, 10).map((topic, index) => (
                  <Chip key={index} label={topic} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}

          {/* Node Preview */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">
                Extracted Nodes ({previewResult.nodes.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {previewResult.nodes.slice(0, 10).map((node) => (
                  <ListItem key={node.id}>
                    <ListItemText
                      primary={node.label}
                      secondary={`Type: ${node.type} • ${node.richContent.markdown.slice(0, 100)}...`}
                    />
                    <ListItemSecondaryAction>
                      <Chip label={node.type} size="small" />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {previewResult.nodes.length > 10 && (
                  <Typography variant="caption" color="text.secondary" sx={{ p: 2 }}>
                    ... and {previewResult.nodes.length - 10} more nodes
                  </Typography>
                )}
              </List>
            </AccordionDetails>
          </Accordion>

          {/* Connections Preview */}
          {previewResult.edges.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">
                  Relationships ({previewResult.edges.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {previewResult.edges.slice(0, 10).map((edge) => {
                    const sourceNode = previewResult.nodes.find(n => n.id === edge.source)
                    const targetNode = previewResult.nodes.find(n => n.id === edge.target)
                    return (
                      <ListItem key={edge.id}>
                        <ListItemText
                          primary={`${sourceNode?.label} → ${targetNode?.label}`}
                          secondary={`Type: ${edge.type} • Weight: ${edge.weight.toFixed(2)}`}
                        />
                        <ListItemSecondaryAction>
                          <Chip label={edge.type} size="small" variant="outlined" />
                        </ListItemSecondaryAction>
                      </ListItem>
                    )
                  })}
                  {previewResult.edges.length > 10 && (
                    <Typography variant="caption" color="text.secondary" sx={{ p: 2 }}>
                      ... and {previewResult.edges.length - 10} more connections
                    </Typography>
                  )}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={handleImportNodes}
              startIcon={<AddIcon />}
              size="large"
            >
              Import to Graph
            </Button>
            <Button
              variant="outlined"
              onClick={() => setPreviewResult(null)}
            >
              Cancel
            </Button>
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PsychologyIcon />
            Enhanced Document Import
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Upload documents to automatically extract meaningful entities, concepts, and relationships.
            Choose between semantic entity extraction or word co-occurrence networks.
          </Typography>

          {/* Processing Options */}
          {renderProcessingOptions()}

          <Divider sx={{ my: 2 }} />

          {/* Upload Area */}
          <Box
            {...getRootProps()}
            sx={{
              border: 2,
              borderColor: isDragActive ? 'primary.main' : 'divider',
              borderStyle: 'dashed',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive ? 'primary.light' : 'background.default',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'primary.light'
              }
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop your document here' : 'Upload Document'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supports: .txt, .md, .pdf, .html
            </Typography>
          </Box>

          {/* Processing Progress */}
          {processingState.isProcessing && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" gutterBottom>
                {processingState.stage}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={processingState.progress} 
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {processingState.progress.toFixed(0)}% complete
              </Typography>
            </Box>
          )}

          {/* Error Display */}
          {processingState.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {processingState.error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Preview Results */}
      {renderPreview()}
    </Box>
  )
}

export default EnhancedDocumentImporter
