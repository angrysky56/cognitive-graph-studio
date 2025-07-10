/**
 * Connection Suggestions Panel
 * Shows AI-powered semantic connection suggestions
 */

import React from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  alpha
} from '@mui/material'
import {
  Add as AddIcon,
  Close as CloseIcon,
  Psychology as PsychologyIcon,
  AutoGraph as AutoGraphIcon
} from '@mui/icons-material'
import useGraphStore from '@/stores/graphStore'

interface ConnectionSuggestion {
  source: string
  target: string
  similarity: number
  reason: string
}

interface ConnectionSuggestionsProps {
  suggestions: ConnectionSuggestion[]
  visible: boolean
  onClose: () => void
}

const ConnectionSuggestions: React.FC<ConnectionSuggestionsProps> = ({
  suggestions,
  visible,
  onClose
}) => {
  const { nodes, addEdge } = useGraphStore()

  const handleAddConnection = (suggestion: ConnectionSuggestion) => {
    const newEdge = {
      id: crypto.randomUUID(),
      source: suggestion.source,
      target: suggestion.target,
      type: 'semantic' as const,
      weight: suggestion.similarity,
      label: 'AI Suggested',
      metadata: {
        created: new Date(),
        confidence: suggestion.similarity,
        aiGenerated: true
      }
    }
    
    addEdge(newEdge)
  }

  const getNodeLabel = (nodeId: string): string => {
    const node = nodes.get(nodeId)
    return node?.label || 'Unknown Node'
  }

  const getSimilarityColor = (similarity: number): string => {
    if (similarity >= 0.7) return '#4caf50' // High similarity - green
    if (similarity >= 0.5) return '#ff9800' // Medium similarity - orange  
    return '#2196f3' // Low similarity - blue
  }

  if (!visible || suggestions.length === 0) return null

  return (
    <Box
      sx={{
        position: 'fixed',
        top: '50%',
        right: 16,
        transform: 'translateY(-50%)',
        width: 350,
        maxHeight: '80vh',
        zIndex: 1000,
        bgcolor: 'surface.level2',
        borderRadius: 2,
        boxShadow: (theme) => theme.shadows[8],
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PsychologyIcon />
          <Typography variant="h6">
            Connection Suggestions
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: 'inherit' }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ p: 1, maxHeight: 'calc(80vh - 100px)', overflow: 'auto' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, px: 1 }}>
          AI detected {suggestions.length} potential semantic connections
        </Typography>

        <List sx={{ p: 0 }}>
          {suggestions.map((suggestion, index) => (
            <ListItem key={index} sx={{ p: 0, mb: 1 }}>
              <Card
                sx={{
                  width: '100%',
                  bgcolor: alpha('primary.main', 0.05),
                  border: 1,
                  borderColor: alpha('primary.main', 0.2)
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  {/* Connection nodes */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip
                      label={getNodeLabel(suggestion.source)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <AutoGraphIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                    <Chip
                      label={getNodeLabel(suggestion.target)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>

                  {/* Similarity score */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Similarity:
                    </Typography>
                    <Chip
                      label={`${Math.round(suggestion.similarity * 100)}%`}
                      size="small"
                      sx={{
                        bgcolor: getSimilarityColor(suggestion.similarity),
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>

                  {/* Reason */}
                  <Typography variant="body2" color="text.secondary">
                    {suggestion.reason}
                  </Typography>
                </CardContent>

                <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleAddConnection(suggestion)}
                    fullWidth
                  >
                    Add Connection
                  </Button>
                </CardActions>
              </Card>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          bgcolor: alpha('primary.main', 0.1),
          borderTop: 1,
          borderColor: 'divider'
        }}
      >
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          Suggestions based on semantic content analysis
        </Typography>
      </Box>
    </Box>
  )
}

export default ConnectionSuggestions