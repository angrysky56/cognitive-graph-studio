/**
 * Document Importer Component
 * Handles file upload and AI-powered processing into graph nodes
 */

import React, { useState, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Slider,
  Divider
} from '@mui/material'
import {
  CloudUpload,
  Description,
  TableChart,
  Image,
  PictureAsPdf,
  Delete,
  PlayArrow,
  Stop,
  Settings,
  AutoAwesome
} from '@mui/icons-material'
import { useDropzone } from 'react-dropzone'
import useGraphStore from '@/stores/graphStore'
import serviceManager from '@/services/service-manager-enhanced'

interface ProcessingJob {
  id: string
  file: File
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  nodesCreated: number
  error?: string
  preview?: string
}

interface ProcessingOptions {
  chunkSize: number
  createClusters: boolean
  useAIAnalysis: boolean
  extractRelationships: boolean
  minChunkWords: number
  maxChunkWords: number
}

const DocumentImporter: React.FC = () => {
  const [jobs, setJobs] = useState<ProcessingJob[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [options, setOptions] = useState<ProcessingOptions>({
    chunkSize: 500,
    createClusters: true,
    useAIAnalysis: true,
    extractRelationships: true,
    minChunkWords: 50,
    maxChunkWords: 1000
  })

  const { addNode, addEdge } = useGraphStore()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newJobs = acceptedFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      status: 'pending' as const,
      progress: 0,
      nodesCreated: 0
    }))

    setJobs(prev => [...prev, ...newJobs])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
      'application/json': ['.json'],
      'text/markdown': ['.md'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: true
  })

  const removeJob = (jobId: string) => {
    setJobs(prev => prev.filter(job => job.id !== jobId))
  }

  const processAllJobs = async () => {
    setIsProcessing(true)
    
    for (const job of jobs.filter(j => j.status === 'pending')) {
      await processJob(job.id)
    }
    
    setIsProcessing(false)
  }

  const processJob = async (jobId: string) => {
    const updateJob = (updates: Partial<ProcessingJob>) => {
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, ...updates } : job
      ))
    }

    try {
      updateJob({ status: 'processing', progress: 10 })
      
      const job = jobs.find(j => j.id === jobId)
      if (!job) return

      // Import the document processor
      const { documentProcessor } = await import('@/services/document-processor')

      updateJob({ progress: 20 })

      // Process the file using the enhanced document processor
      const processingOptions = {
        maxChunkWords: options.maxChunkWords,
        minChunkWords: options.minChunkWords,
        useAIEnhancement: options.useAIAnalysis,
        extractEntities: true,
        createRelationships: options.extractRelationships,
        language: 'en'
      }

      const result = await documentProcessor.processFile(job.file, processingOptions)
      
      updateJob({ 
        progress: 60, 
        preview: result.summary 
      })

      // Create nodes from processed chunks
      let nodesCreated = 0
      const createdNodeIds: string[] = []

      for (let i = 0; i < result.chunks.length; i++) {
        const chunk = result.chunks[i]
        
        try {
          const nodeId = await createNodeFromChunk(
            chunk.content, 
            job.file.name, 
            i, 
            result.suggestedTags,
            result.nodeType
          )
          if (nodeId) {
            createdNodeIds.push(nodeId)
            nodesCreated++
          }
        } catch (error) {
          console.warn('Failed to create node for chunk:', error)
        }

        updateJob({ 
          progress: 60 + (i / result.chunks.length) * 30, 
          nodesCreated 
        })
      }

      // Create relationships if enabled
      if (options.extractRelationships && createdNodeIds.length > 1) {
        await createRelationships(createdNodeIds, result.extractedEntities)
      }

      updateJob({ 
        status: 'completed', 
        progress: 100, 
        nodesCreated 
      })

    } catch (error) {
      updateJob({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Processing failed'
      })
    }
  }

  const createNodeFromChunk = async (
    content: string, 
    filename: string, 
    index: number,
    suggestedTags: string[] = [],
    nodeType: 'source' | 'concept' | 'idea' = 'source'
  ): Promise<string | null> => {
    try {
      // Generate a descriptive label using AI if enabled
      let label = `${filename} - Part ${index + 1}`
      let enhancedContent = content

      if (options.useAIAnalysis) {
        try {
          const aiResponse = await serviceManager.generateAIContent(
            `Create a concise 3-6 word title for this content: "${content.slice(0, 300)}"`
          )
          
          if (aiResponse.content) {
            label = aiResponse.content.trim().replace(/['"]/g, '').slice(0, 60)
          }

          // Get AI insights for important chunks
          if (content.length > 200) {
            const insightResponse = await serviceManager.generateAIContent(
              `Extract 2-3 key insights from: "${content.slice(0, 500)}"`
            )
            
            if (insightResponse.content) {
              enhancedContent = `${content}\n\n--- Key Insights ---\n${insightResponse.content}`
            }
          }
        } catch (error) {
          console.warn('AI analysis failed for chunk, using basic processing:', error)
        }
      }

      // Create the node
      const nodeId = crypto.randomUUID()
      const node = {
        id: nodeId,
        label,
        content: enhancedContent,
        type: nodeType,
        position: { 
          x: Math.random() * 800, 
          y: Math.random() * 600 
        },
        metadata: {
          created: new Date(),
          modified: new Date(),
          tags: ['imported', ...suggestedTags, filename.split('.').pop() || 'document'].slice(0, 5),
          color: nodeType === 'concept' ? '#ffca80' : nodeType === 'idea' ? '#80c7ff' : '#90ee90'
        },
        connections: [],
        aiGenerated: false
      }

      addNode(node)

      // Process with all available services
      await serviceManager.processNewNode(node)

      return nodeId
    } catch (error) {
      console.error('Failed to create node from chunk:', error)
      return null
    }
  }

  const createRelationships = async (
    nodeIds: string[], 
    extractedEntities: string[] = []
  ): Promise<void> => {
    // Create relationships between adjacent nodes (document flow)
    for (let i = 0; i < nodeIds.length - 1; i++) {
      addEdge({
        id: crypto.randomUUID(),
        source: nodeIds[i],
        target: nodeIds[i + 1],
        type: 'temporal',
        weight: 0.7,
        metadata: {
          created: new Date(),
          confidence: 0.7,
          aiGenerated: true
        }
      })
    }

    // Create thematic relationships for nodes with shared entities
    if (extractedEntities.length > 0 && options.useAIAnalysis) {
      try {
        // Use AI to suggest semantic relationships
        const relationshipPrompt = `Based on these entities: ${extractedEntities.join(', ')}, suggest which of these ${nodeIds.length} document chunks should be semantically connected. Return indices (0-${nodeIds.length-1}) as pairs like "0-2, 1-3".`
        
        const relationshipResponse = await serviceManager.generateAIContent(relationshipPrompt)
        
        if (relationshipResponse.content) {
          const pairs = relationshipResponse.content.match(/\d+-\d+/g) || []
          
          pairs.slice(0, 5).forEach(pair => { // Limit to 5 relationships
            const [sourceIdx, targetIdx] = pair.split('-').map(Number)
            
            if (sourceIdx < nodeIds.length && targetIdx < nodeIds.length && sourceIdx !== targetIdx) {
              addEdge({
                id: crypto.randomUUID(),
                source: nodeIds[sourceIdx],
                target: nodeIds[targetIdx],
                type: 'semantic',
                weight: 0.6,
                metadata: {
                  created: new Date(),
                  confidence: 0.6,
                  aiGenerated: true
                }
              })
            }
          })
        }
      } catch (error) {
        console.warn('Failed to create AI-suggested relationships:', error)
      }
    }
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf': return <PictureAsPdf />
      case 'csv': return <TableChart />
      case 'jpg':
      case 'png':
      case 'gif': return <Image />
      default: return <Description />
    }
  }

  const getStatusColor = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'completed': return 'success'
      case 'error': return 'error'
      case 'processing': return 'warning'
      default: return 'default'
    }
  }

  return (
    <Box>
      {/* Drop Zone */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          textAlign: 'center',
          mb: 2,
          transition: 'all 0.2s ease'
        }}
      >
        <input {...getInputProps()} />
        <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop files here' : 'Import Documents'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Drag & drop files or click to browse
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Supports: TXT, CSV, PDF, JSON, MD, DOCX
        </Typography>
      </Paper>

      {/* Processing Options */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<PlayArrow />}
          onClick={processAllJobs}
          disabled={isProcessing || jobs.filter(j => j.status === 'pending').length === 0}
        >
          Process All ({jobs.filter(j => j.status === 'pending').length})
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<Settings />}
          onClick={() => setSettingsOpen(true)}
        >
          Options
        </Button>

        {isProcessing && (
          <Chip 
            icon={<AutoAwesome />} 
            label="AI Processing..." 
            color="primary" 
            variant="outlined" 
          />
        )}
      </Box>

      {/* Job List */}
      {jobs.length > 0 && (
        <Paper sx={{ mb: 2 }}>
          <List>
            {jobs.map((job) => (
              <ListItem key={job.id}>
                <ListItemIcon>
                  {getFileIcon(job.file.name)}
                </ListItemIcon>
                <ListItemText
                  primary={job.file.name}
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        {(job.file.size / 1024).toFixed(1)} KB
                        {job.nodesCreated > 0 && ` • ${job.nodesCreated} nodes created`}
                      </Typography>
                      {job.status === 'processing' && (
                        <LinearProgress 
                          variant="determinate" 
                          value={job.progress} 
                          sx={{ mt: 1 }}
                        />
                      )}
                      {job.error && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {job.error}
                        </Alert>
                      )}
                      {job.preview && (
                        <Typography variant="caption" color="text.secondary">
                          {job.preview}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <Chip 
                  label={job.status} 
                  color={getStatusColor(job.status)}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <IconButton 
                  onClick={() => removeJob(job.id)}
                  disabled={job.status === 'processing'}
                >
                  <Delete />
                </IconButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Processing Options</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={options.useAIAnalysis}
                  onChange={(e) => setOptions(prev => ({ ...prev, useAIAnalysis: e.target.checked }))}
                />
              }
              label="Use AI Analysis for Enhanced Processing"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={options.extractRelationships}
                  onChange={(e) => setOptions(prev => ({ ...prev, extractRelationships: e.target.checked }))}
                />
              }
              label="Extract Relationships Between Chunks"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={options.createClusters}
                  onChange={(e) => setOptions(prev => ({ ...prev, createClusters: e.target.checked }))}
                />
              }
              label="Create Semantic Clusters"
            />

            <Divider sx={{ my: 2 }} />

            <Typography gutterBottom>
              Chunk Size (words): {options.chunkSize}
            </Typography>
            <Slider
              value={options.chunkSize}
              onChange={(_, value) => setOptions(prev => ({ ...prev, chunkSize: value as number }))}
              min={100}
              max={2000}
              step={100}
              marks={[
                { value: 100, label: 'Small' },
                { value: 500, label: 'Medium' },
                { value: 1000, label: 'Large' },
                { value: 2000, label: 'X-Large' }
              ]}
            />

            <Typography gutterBottom sx={{ mt: 2 }}>
              Min Chunk Words: {options.minChunkWords}
            </Typography>
            <Slider
              value={options.minChunkWords}
              onChange={(_, value) => setOptions(prev => ({ ...prev, minChunkWords: value as number }))}
              min={10}
              max={200}
              step={10}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default DocumentImporter
