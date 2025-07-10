/**
 * Enhanced Connection Suggestions Component
 * 
 * Uses the graph-aware AI to suggest meaningful connections between nodes
 * based on semantic similarity and graph structure analysis.
 * 
 * @module EnhancedConnectionSuggestions
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Chip,
  Box,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Badge,
  Divider,
  LinearProgress
} from '@mui/material'
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  Psychology as PsychologyIcon,
  Link as LinkIcon,
  Lightbulb as LightbulbIcon,
  Analytics as AnalyticsIcon,
  Close as CloseIcon
} from '@mui/icons-material'
import { GraphNode, GraphEdge } from '@/types/graph'
import { GraphAwareAIService } from '@/services/graph-aware-ai-service'
import { LLMConfig } from '@/services/ai-service'

interface ConnectionSuggestion {
  id: string
  source: string
  target: string
  sourceNode: GraphNode
  targetNode: GraphNode
  type: 'semantic' | 'causal' | 'temporal' | 'hierarchical'
  confidence: number
  reasoning: string
  aiGenerated: boolean
  category: 'high' | 'medium' | 'low'
}

interface EnhancedConnectionSuggestionsProps {
  nodes: Map<string, GraphNode>
  edges: Map<string, GraphEdge>
  selectedNodes?: Set<string>
  onConnectionCreate?: (edge: Partial<GraphEdge>) => void
  onSuggestionDismiss?: (suggestionId: string) => void
  aiConfig?: LLMConfig
  autoRefresh?: boolean
}

const EnhancedConnectionSuggestions: React.FC<EnhancedConnectionSuggestionsProps> = ({
  nodes,
  edges,
  selectedNodes = new Set(),
  onConnectionCreate,
  onSuggestionDismiss,
  aiConfig,
  autoRefresh = false
}) => {
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['high']))
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  
  const [graphAwareAI] = useState(() => {
    const ai = new GraphAwareAIService(aiConfig ? [aiConfig] : [])
    return ai
  })

  // Update AI context when graph changes
  useEffect(() => {
    graphAwareAI.updateGraphContext(nodes, edges, new Map())
  }, [nodes, edges, graphAwareAI])

  // Auto-refresh suggestions when graph changes significantly
  useEffect(() => {
    if (autoRefresh && nodes.size > 0) {
      const timer = setTimeout(() => {
        generateSuggestions()
      }, 2000) // Debounce

      return () => clearTimeout(timer)
    }
  }, [nodes.size, edges.size, autoRefresh])

  const generateSuggestions = async (focusNodeId?: string) => {
    if (nodes.size < 2) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get AI-generated connection suggestions
      const aiSuggestions = await graphAwareAI.suggestConnections(focusNodeId)

      // Convert to our format and add additional analysis
      const enhancedSuggestions: ConnectionSuggestion[] = aiSuggestions.map(suggestion => {
        const sourceNode = Array.from(nodes.values()).find(n => n.label === suggestion.source)
        const targetNode = Array.from(nodes.values()).find(n => n.label === suggestion.target)

        if (!sourceNode || !targetNode) {
          return null
        }

        const category = suggestion.confidence > 0.7 ? 'high' : 
                        suggestion.confidence > 0.4 ? 'medium' : 'low'

        return {
          id: `ai-${sourceNode.id}-${targetNode.id}`,
          source: sourceNode.id,
          target: targetNode.id,
          sourceNode,
          targetNode,
          type: suggestion.type as any,
          confidence: suggestion.confidence,
          reasoning: suggestion.reasoning,
          aiGenerated: true,
          category
        }
      }).filter((s): s is ConnectionSuggestion => s !== null)

      // Add structural suggestions based on graph analysis
      const structuralSuggestions = generateStructuralSuggestions()
      
      // Combine and deduplicate
      const allSuggestions = [...enhancedSuggestions, ...structuralSuggestions]
      const uniqueSuggestions = deduplicateSuggestions(allSuggestions)

      // Filter out dismissed suggestions
      const activeSuggestions = uniqueSuggestions.filter(s => !dismissedSuggestions.has(s.id))

      setSuggestions(activeSuggestions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions')
    } finally {
      setIsLoading(false)
    }
  }

  const generateStructuralSuggestions = (): ConnectionSuggestion[] => {
    const suggestions: ConnectionSuggestion[] = []
    const nodeArray = Array.from(nodes.values())

    // Find nodes with shared tags but no connection
    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const nodeA = nodeArray[i]
        const nodeB = nodeArray[j]

        // Check if already connected
        const isConnected = Array.from(edges.values()).some(edge =>
          (edge.source === nodeA.id && edge.target === nodeB.id) ||
          (edge.source === nodeB.id && edge.target === nodeA.id)
        )

        if (isConnected) continue

        // Check for shared tags
        const sharedTags = nodeA.metadata.tags.filter(tag =>
          nodeB.metadata.tags.includes(tag)
        )

        if (sharedTags.length > 0) {
          const confidence = Math.min(0.8, sharedTags.length * 0.2)
          const category = confidence > 0.5 ? 'medium' : 'low'

          suggestions.push({
            id: `struct-${nodeA.id}-${nodeB.id}`,
            source: nodeA.id,
            target: nodeB.id,
            sourceNode: nodeA,
            targetNode: nodeB,
            type: 'semantic',
            confidence,
            reasoning: `Shared tags: ${sharedTags.join(', ')}`,
            aiGenerated: false,
            category
          })
        }

        // Check for similar types
        if (nodeA.type === nodeB.type && nodeA.type !== 'concept') {
          suggestions.push({
            id: `type-${nodeA.id}-${nodeB.id}`,
            source: nodeA.id,
            target: nodeB.id,
            sourceNode: nodeA,
            targetNode: nodeB,
            type: 'hierarchical',
            confidence: 0.4,
            reasoning: `Similar entity types: ${nodeA.type}`,
            aiGenerated: false,
            category: 'low'
          })
        }
      }
    }

    return suggestions.slice(0, 20) // Limit structural suggestions
  }

  const deduplicateSuggestions = (suggestions: ConnectionSuggestion[]): ConnectionSuggestion[] => {
    const seen = new Set<string>()
    return suggestions.filter(suggestion => {
      const key = `${suggestion.source}-${suggestion.target}`
      const reverseKey = `${suggestion.target}-${suggestion.source}`
      
      if (seen.has(key) || seen.has(reverseKey)) {
        return false
      }
      
      seen.add(key)
      return true
    })
  }

  const handleCreateConnection = (suggestion: ConnectionSuggestion) => {
    if (!onConnectionCreate) return

    const edge: Partial<GraphEdge> = {
      source: suggestion.source,
      target: suggestion.target,
      type: suggestion.type,
      weight: suggestion.confidence,
      label: suggestion.reasoning.slice(0, 50),
      metadata: {
        created: new Date(),
        confidence: suggestion.confidence,
        aiGenerated: suggestion.aiGenerated
      }
    }

    onConnectionCreate(edge)
    
    // Remove from suggestions
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
  }

  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]))
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
    
    if (onSuggestionDismiss) {
      onSuggestionDismiss(suggestionId)
    }
  }

  const handleCategoryToggle = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const categorizedSuggestions = useMemo(() => {
    return {
      high: suggestions.filter(s => s.category === 'high'),
      medium: suggestions.filter(s => s.category === 'medium'),
      low: suggestions.filter(s => s.category === 'low')
    }
  }, [suggestions])

  const renderSuggestionItem = (suggestion: ConnectionSuggestion) => (
    <ListItem key={suggestion.id} divider>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" fontWeight="medium">
              {suggestion.sourceNode.label}
            </Typography>
            <LinkIcon fontSize="small" color="action" />
            <Typography variant="body2" fontWeight="medium">
              {suggestion.targetNode.label}
            </Typography>
            {suggestion.aiGenerated && (
              <Chip 
                label="AI" 
                size="small" 
                color="primary" 
                variant="outlined"
                icon={<PsychologyIcon />}
              />
            )}
          </Box>
        }
        secondary={
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" display="block">
              {suggestion.reasoning}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Chip label={suggestion.type} size="small" variant="outlined" />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption">Confidence:</Typography>
                <LinearProgress
                  variant="determinate"
                  value={suggestion.confidence * 100}
                  sx={{ width: 60, height: 4 }}
                />
                <Typography variant="caption">
                  {(suggestion.confidence * 100).toFixed(0)}%
                </Typography>
              </Box>
            </Box>
          </Box>
        }
      />
      <ListItemSecondaryAction>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Create connection">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleCreateConnection(suggestion)}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Dismiss suggestion">
            <IconButton
              size="small"
              onClick={() => handleDismissSuggestion(suggestion.id)}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </ListItemSecondaryAction>
    </ListItem>
  )

  const renderCategory = (category: 'high' | 'medium' | 'low', title: string, icon: React.ReactNode) => {
    const categorySuggestions = categorizedSuggestions[category]
    const isExpanded = expandedCategories.has(category)

    if (categorySuggestions.length === 0) return null

    return (
      <Accordion 
        expanded={isExpanded}
        onChange={() => handleCategoryToggle(category)}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon}
            <Typography variant="subtitle2">
              {title}
            </Typography>
            <Badge badgeContent={categorySuggestions.length} color="primary" />
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <List dense>
            {categorySuggestions.map(renderSuggestionItem)}
          </List>
        </AccordionDetails>
      </Accordion>
    )
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LightbulbIcon />
            Connection Suggestions
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {selectedNodes.size > 0 && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => generateSuggestions(Array.from(selectedNodes)[0])}
                disabled={isLoading}
              >
                Focus Selected
              </Button>
            )}
            <Tooltip title="Refresh suggestions">
              <IconButton
                size="small"
                onClick={() => generateSuggestions()}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {nodes.size < 2 && (
          <Alert severity="info">
            Add at least 2 nodes to see connection suggestions
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {nodes.size >= 2 && suggestions.length === 0 && !isLoading && (
          <Alert severity="info">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                No connection suggestions found. Try:
              </Typography>
              <Typography variant="caption">
                • Adding more diverse content
                <br />
                • Using more descriptive node labels
                <br />
                • Adding tags to your nodes
              </Typography>
            </Box>
          </Alert>
        )}

        {suggestions.length > 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Found {suggestions.length} potential connections based on AI analysis and graph structure
            </Typography>

            {renderCategory('high', 'High Confidence', <TrendingUpIcon color="success" />)}
            {renderCategory('medium', 'Medium Confidence', <AnalyticsIcon color="warning" />)}
            {renderCategory('low', 'Low Confidence', <LinkIcon color="action" />)}
          </Box>
        )}

        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Analyzing graph structure and generating suggestions...
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default EnhancedConnectionSuggestions
