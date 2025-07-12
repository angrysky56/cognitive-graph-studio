/**
 * Enhanced Node Editor Panel
 *
 * Dedicated left-side panel for editing selected nodes with full
 * AI integration and deep content access
 */

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress
} from '@mui/material'
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  AutoFixHigh as AutoFixHighIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Link as LinkIcon
} from '@mui/icons-material'
import useEnhancedGraphStore from '@/stores/enhancedGraphStore'
import { EnhancedGraphNode } from '@/types/enhanced-graph'
import { AIService } from '@/services/ai-service'
import EnhancedContextService from '@/services/enhanced-context-service'

interface NodeEditorPanelProps {
  aiService?: AIService
}

const NodeEditorPanel: React.FC<NodeEditorPanelProps> = ({ aiService }) => {
  const {
    nodes,
    edges,
    selectedNodes,
    updateNode,
    deleteNode
  } = useEnhancedGraphStore()

  // Enhanced context service for better AI processing
  const enhancedContextService = new EnhancedContextService()

  // Get the selected node
  const selectedNodeId = selectedNodes.size > 0 ? Array.from(selectedNodes)[0] : null
  const selectedNode = selectedNodeId ? nodes.get(selectedNodeId) : null

  // Local editing state
  const [isEditing, setIsEditing] = useState(false)
  const [editedNode, setEditedNode] = useState<Partial<EnhancedGraphNode>>({})
  const [newTag, setNewTag] = useState('')
  const [aiProcessing, setAiProcessing] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([])

  // Reset editing state when selection changes
  useEffect(() => {
    if (selectedNode) {
      setEditedNode({
        label: selectedNode.label,
        richContent: { ...selectedNode.richContent },
        metadata: { ...selectedNode.metadata }
      })
      setIsEditing(false)
    }
  }, [selectedNode])

  const handleStartEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (selectedNode && editedNode) {
      await updateNode(selectedNode.id, {
        ...editedNode,
        metadata: {
          ...editedNode.metadata,
          created: editedNode.metadata?.created || new Date(),
          modified: new Date(),
          tags: editedNode.metadata?.tags || []
        }
      })
      setIsEditing(false)

      // Trigger AI analysis of the updated node
      if (aiService) {
        handleAIAnalyze()
      }
    }
  }

  const handleCancel = () => {
    if (selectedNode) {
      setEditedNode({
        label: selectedNode.label,
        richContent: { ...selectedNode.richContent },
        metadata: { ...selectedNode.metadata }
      })
    }
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (selectedNode && window.confirm(`Delete "${selectedNode.label}"?`)) {
      deleteNode(selectedNode.id)
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && editedNode.metadata) {
      const currentTags = editedNode.metadata.tags || []
      if (!currentTags.includes(newTag.trim())) {
        setEditedNode({
          ...editedNode,
          metadata: {
            ...editedNode.metadata,
            tags: [...currentTags, newTag.trim()]
          }
        })
        setNewTag('')
      }
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    if (editedNode.metadata) {
      setEditedNode({
        ...editedNode,
        metadata: {
          ...editedNode.metadata,
          tags: editedNode.metadata.tags?.filter(tag => tag !== tagToRemove) || []
        }
      })
    }
  }

  const handleAIEnhance = async () => {
    if (!selectedNode || !aiService) return

    setAiProcessing(true)
    try {
      // Get AI suggestions for enhancing the node
      const enhancementPrompt = `Analyze and enhance this knowledge graph node:

Title: ${selectedNode.label}
Type: ${selectedNode.type}
Content: ${selectedNode.richContent.markdown}
Current Tags: ${selectedNode.metadata.tags?.join(', ') || 'none'}

Please suggest:
1. Enhanced content (more detailed, structured)
2. Additional relevant tags
3. Key concepts that could be extracted
4. Potential connections to make

Return as JSON: {
  "enhancedContent": "improved content",
  "suggestedTags": ["tag1", "tag2"],
  "keyTerms": ["term1", "term2"],
  "connectionSuggestions": ["concept1", "concept2"]
}`

      const response = await aiService.generateText({
        prompt: enhancementPrompt,
        format: 'json',
        temperature: 0.4,
        maxTokens: 8164
      })

      const suggestions = JSON.parse(response.content)

      // Apply suggestions to editing state
      setEditedNode({
        ...editedNode,
        richContent: {
          ...editedNode.richContent,
          markdown: suggestions.enhancedContent || editedNode.richContent?.markdown || '',
          keyTerms: suggestions.keyTerms || editedNode.richContent?.keyTerms || [],
          relatedConcepts: editedNode.richContent?.relatedConcepts || [],
          sources: editedNode.richContent?.sources || [],
          attachments: editedNode.richContent?.attachments || []
        },
        metadata: {
          ...editedNode.metadata,
          created: editedNode.metadata?.created || new Date(),
          modified: new Date(),
          tags: [
            ...(editedNode.metadata?.tags || []),
            ...(suggestions.suggestedTags || [])
          ].filter((tag, index, arr) => arr.indexOf(tag) === index) // Remove duplicates
        }
      })

      setAiSuggestions(suggestions.connectionSuggestions || [])
      setIsEditing(true)

    } catch (error) {
      console.error('AI enhancement failed:', error)
    } finally {
      setAiProcessing(false)
    }
  }

  const handleAIAnalyze = async () => {
    if (!selectedNode || !aiService) return

    setAiProcessing(true)
    try {
      // Use enhanced context service for comprehensive analysis
      const allNodes = Array.from(nodes.values())
      const allEdges = Array.from(edges.values())

      const enhancedAnalysis = await enhancedContextService.analyzeNodeWithContext(
        selectedNode,
        allNodes,
        allEdges
      )

      // Show comprehensive analysis in suggestions
      setAiSuggestions([{
        type: 'enhanced-analysis',
        content: enhancedAnalysis.nodeAnalysis,
        suggestions: enhancedAnalysis.suggestions,
        confidence: enhancedAnalysis.confidence
      }])

    } catch (error) {
      console.error('Enhanced AI analysis failed:', error)

      // Fallback to original analysis method
      const connections = getConnectionsInfo()
      const totalConnections = connections.incoming.length + connections.outgoing.length

      const analysisPrompt = `Analyze this node in the context of a knowledge graph:

Node: ${selectedNode.label}
Content: ${selectedNode.richContent.markdown}
Type: ${selectedNode.type}
Connections: ${totalConnections}

What insights can you provide about:
1. The quality and completeness of this node
2. Missing information that should be added
3. How well it connects to the graph structure
4. Suggestions for improvement

Provide a brief analysis.`

      const response = await aiService.generateText({
        prompt: analysisPrompt,
        temperature: 0.3,
        maxTokens: 8164
      })

      // Show analysis in suggestions
      setAiSuggestions([{
        type: 'analysis',
        content: response.content
      }])
    } finally {
      setAiProcessing(false)
    }
  }

  const getConnectionsInfo = () => {
    if (!selectedNode) return { incoming: [], outgoing: [] }

    const connections = Array.from(edges.values())
    const incoming = connections.filter(edge => edge.target === selectedNode.id)
    const outgoing = connections.filter(edge => edge.source === selectedNode.id)

    return { incoming, outgoing }
  }

  if (!selectedNode) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        <VisibilityIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
        <Typography variant="h6" gutterBottom>
          No Node Selected
        </Typography>
        <Typography variant="body2">
          Click on a node in the graph to edit its properties and content
        </Typography>
      </Box>
    )
  }

  const connections = getConnectionsInfo()

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          {selectedNode.label}
        </Typography>
        <Chip
          label={selectedNode.type}
          size="small"
          color="primary"
          variant="outlined"
        />
        {selectedNode.aiMetadata?.discoverySource?.includes('ai') && (
          <Chip
            label="AI Generated"
            size="small"
            color="secondary"
            variant="outlined"
            sx={{ ml: 1 }}
          />
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>

        {/* Main Content Editor */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Content</Typography>
            {!isEditing && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  handleStartEdit()
                }}
                sx={{ ml: 'auto', mr: 1 }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}
          </AccordionSummary>
          <AccordionDetails>
            {isEditing ? (
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="Label"
                  value={editedNode.label || ''}
                  onChange={(e) => setEditedNode({
                    ...editedNode,
                    label: e.target.value
                  })}
                  size="small"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Content"
                  multiline
                  rows={6}
                  value={editedNode.richContent?.markdown || ''}
                  onChange={(e) => setEditedNode({
                    ...editedNode,
                    richContent: {
                      ...editedNode.richContent,
                      markdown: e.target.value,
                      keyTerms: editedNode.richContent?.keyTerms || [],
                      relatedConcepts: editedNode.richContent?.relatedConcepts || [],
                      sources: editedNode.richContent?.sources || [],
                      attachments: editedNode.richContent?.attachments || []
                    }
                  })}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSave}
                    startIcon={<SaveIcon />}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {selectedNode.richContent.markdown || 'No content'}
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Tags */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">
              Tags ({selectedNode.metadata.tags?.length || 0})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              {(isEditing ? editedNode.metadata?.tags : selectedNode.metadata.tags)?.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  onDelete={isEditing ? () => handleRemoveTag(tag) : undefined}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Stack>
            {isEditing && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Add tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  sx={{ flexGrow: 1 }}
                />
                <IconButton size="small" onClick={handleAddTag}>
                  <AddIcon />
                </IconButton>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Connections */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">
              Connections ({connections.incoming.length + connections.outgoing.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="subtitle2" gutterBottom>
              Incoming ({connections.incoming.length})
            </Typography>
            <List dense>
              {connections.incoming.map(edge => (
                <ListItem key={edge.id}>
                  <ListItemIcon>
                    <LinkIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={nodes.get(edge.source)?.label || edge.source}
                    secondary={edge.label}
                  />
                </ListItem>
              ))}
            </List>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Outgoing ({connections.outgoing.length})
            </Typography>
            <List dense>
              {connections.outgoing.map(edge => (
                <ListItem key={edge.id}>
                  <ListItemIcon>
                    <LinkIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={nodes.get(edge.target)?.label || edge.target}
                    secondary={edge.label}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>

        {/* AI Actions */}
        {aiService && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">AI Actions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Button
                  variant="contained"
                  startIcon={aiProcessing ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
                  onClick={handleAIEnhance}
                  disabled={aiProcessing}
                  fullWidth
                  color="primary"
                >
                  {aiProcessing ? 'Enhancing...' : 'AI Enhance Content'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={aiProcessing ? <CircularProgress size={20} /> : <PsychologyIcon />}
                  onClick={handleAIAnalyze}
                  disabled={aiProcessing}
                  fullWidth
                  color="secondary"
                >
                  {aiProcessing ? 'Analyzing...' : 'Deep Context Analysis'}
                </Button>

                {aiSuggestions.length > 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      AI Analysis Results:
                    </Typography>
                    {aiSuggestions.map((suggestion, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                          {typeof suggestion === 'string' ? suggestion : suggestion.content}
                        </Typography>

                        {/* Enhanced suggestions from context service */}
                        {suggestion.suggestions && (
                          <Box sx={{ mt: 2 }}>
                            {suggestion.suggestions.contentEnhancements?.length > 0 && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="caption" color="primary" fontWeight="bold">
                                  Content Enhancements:
                                </Typography>
                                <List dense>
                                  {suggestion.suggestions.contentEnhancements.map((enhancement: string, i: number) => (
                                    <ListItem key={i} sx={{ py: 0 }}>
                                      <ListItemText primary={`• ${enhancement}`} />
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            )}

                            {suggestion.suggestions.newConnections?.length > 0 && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="caption" color="secondary" fontWeight="bold">
                                  Suggested Connections:
                                </Typography>
                                <List dense>
                                  {suggestion.suggestions.newConnections.map((conn: any, i: number) => (
                                    <ListItem key={i} sx={{ py: 0 }}>
                                      <ListItemText
                                        primary={`• ${conn.target} (${conn.type})`}
                                        secondary={conn.reasoning}
                                      />
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            )}

                            {suggestion.suggestions.relatedConcepts?.length > 0 && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="caption" color="warning.main" fontWeight="bold">
                                  Related Concepts:
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                  {suggestion.suggestions.relatedConcepts.slice(0, 8).map((concept: string, i: number) => (
                                    <Chip
                                      key={i}
                                      label={concept}
                                      size="small"
                                      variant="outlined"
                                      color="warning"
                                    />
                                  ))}
                                </Box>
                              </Box>
                            )}

                            {suggestion.confidence && (
                              <Typography variant="caption" color="text.secondary">
                                Analysis Confidence: {(suggestion.confidence * 100).toFixed(1)}%
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Alert>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Metadata */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Metadata</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Created"
                  secondary={selectedNode.metadata.created.toLocaleString()}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Modified"
                  secondary={selectedNode.metadata.modified.toLocaleString()}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Confidence"
                  secondary={`${Math.round((selectedNode.aiMetadata?.confidenceScore || 0) * 100)}%`}
                />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Actions */}
      <Box sx={{
        p: 2,
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<DeleteIcon />}
          onClick={handleDelete}
        >
          Delete Node
        </Button>

        {!isEditing && (
          <Button
            variant="contained"
            size="small"
            startIcon={<EditIcon />}
            onClick={handleStartEdit}
          >
            Edit
          </Button>
        )}
      </Box>
    </Box>
  )
}

export default NodeEditorPanel
