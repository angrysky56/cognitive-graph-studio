/**
 * SavedGraphs Component
 * 
 * Provides UI for managing multiple saved graphs with search functionality
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material'
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Download as LoadIcon,
  Add as AddIcon,
  Folder as FolderIcon,
  Timeline as GraphIcon
} from '@mui/icons-material'

import { 
  GraphMetadata, 
  SavedGraph, 
  LocalGraphPersistenceService,
  createDefaultGraphMetadata 
} from '../services/graph-persistence-service'
import useEnhancedGraphStore from '../stores/enhancedGraphStore'

interface SavedGraphsProps {
  onGraphLoad?: (graph: SavedGraph) => void
}

const SavedGraphs: React.FC<SavedGraphsProps> = ({ onGraphLoad }) => {
  const [savedGraphs, setSavedGraphs] = useState<GraphMetadata[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{graphId: string, matches: any[]}>>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { nodes, edges, clusters } = useEnhancedGraphStore()
  const persistenceService = new LocalGraphPersistenceService()

  // Load saved graphs on component mount
  useEffect(() => {
    loadSavedGraphs()
  }, [])

  const loadSavedGraphs = useCallback(async () => {
    try {
      setLoading(true)
      const graphs = await persistenceService.listGraphs()
      setSavedGraphs(graphs.sort((a, b) => b.modified.getTime() - a.modified.getTime()))
    } catch (err) {
      setError('Failed to load saved graphs')
      console.error('Error loading saved graphs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSaveCurrentGraph = useCallback(async () => {
    if (!saveTitle.trim()) return

    try {
      setLoading(true)
      
      const metadata = createDefaultGraphMetadata(saveTitle.trim())
      metadata.description = saveDescription.trim()
      metadata.tags = saveDescription.toLowerCase().split(/[,\s]+/).filter(Boolean)

      const graphToSave: SavedGraph = {
        metadata,
        nodes,
        edges,
        clusters
      }

      await persistenceService.saveGraph(graphToSave)
      await loadSavedGraphs()
      
      setShowSaveDialog(false)
      setSaveTitle('')
      setSaveDescription('')
      setError(null)
    } catch (err) {
      setError('Failed to save graph')
      console.error('Error saving graph:', err)
    } finally {
      setLoading(false)
    }
  }, [saveTitle, saveDescription, nodes, edges, clusters, persistenceService, loadSavedGraphs])

  const handleLoadGraph = useCallback(async (graphId: string) => {
    try {
      setLoading(true)
      const graph = await persistenceService.loadGraph(graphId)
      
      if (graph && onGraphLoad) {
        onGraphLoad(graph)
        setError(null)
      } else {
        setError('Failed to load graph')
      }
    } catch (err) {
      setError('Failed to load graph')
      console.error('Error loading graph:', err)
    } finally {
      setLoading(false)
    }
  }, [onGraphLoad, persistenceService])

  const handleDeleteGraph = useCallback(async (graphId: string) => {
    if (!window.confirm('Are you sure you want to delete this graph? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      await persistenceService.deleteGraph(graphId)
      await loadSavedGraphs()
      setError(null)
    } catch (err) {
      setError('Failed to delete graph')
      console.error('Error deleting graph:', err)
    } finally {
      setLoading(false)
    }
  }, [persistenceService, loadSavedGraphs])

  const handleSearchAcrossGraphs = useCallback(async () => {
    if (!searchQuery.trim()) {
      setShowSearchResults(false)
      return
    }

    try {
      setLoading(true)
      const results = await persistenceService.searchAcrossGraphs(searchQuery.trim())
      setSearchResults(results)
      setShowSearchResults(true)
      setError(null)
    } catch (err) {
      setError('Failed to search across graphs')
      console.error('Error searching graphs:', err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, persistenceService])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderIcon />
          Saved Graphs
        </Typography>
        
        {/* Action Buttons */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => setShowSaveDialog(true)}
            size="small"
            disabled={nodes.size === 0}
          >
            Save Current
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              // Create new empty graph
              const metadata = createDefaultGraphMetadata('New Graph')
              onGraphLoad?.({
                metadata,
                nodes: new Map(),
                edges: new Map(),
                clusters: new Map()
              })
            }}
            size="small"
          >
            New Graph
          </Button>
        </Stack>

        {/* Search */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search across all graphs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchAcrossGraphs()}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={handleSearchAcrossGraphs}
            disabled={!searchQuery.trim() || loading}
          >
            <SearchIcon />
          </Button>
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Search Results */}
      {showSearchResults && searchResults.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Search Results for "{searchQuery}"
          </Typography>
          
          {searchResults.map(({ graphId, matches }) => {
            const graph = savedGraphs.find(g => g.id === graphId)
            return (
              <Card key={graphId} sx={{ mb: 1 }} variant="outlined">
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="subtitle2">
                    {graph?.title || graphId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {matches.length} match(es)
                  </Typography>
                  
                  {matches.slice(0, 3).map((match, idx) => (
                    <Typography key={idx} variant="caption" display="block" sx={{ mt: 0.5 }}>
                      • {match.type}: {match.label}
                    </Typography>
                  ))}
                </CardContent>
                <CardActions sx={{ py: 0.5 }}>
                  <Button size="small" onClick={() => handleLoadGraph(graphId)}>
                    Load Graph
                  </Button>
                </CardActions>
              </Card>
            )
          })}
          
          <Button variant="text" size="small" onClick={() => setShowSearchResults(false)}>
            Hide Results
          </Button>
        </Box>
      )}

      {/* Saved Graphs List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {savedGraphs.length === 0 && !loading ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No saved graphs yet. Create your first graph and save it!
          </Typography>
        ) : (
          <List dense>
            {savedGraphs.map((graph) => (
              <ListItem key={graph.id} sx={{ 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                mb: 1,
                flexDirection: 'column',
                alignItems: 'stretch'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <GraphIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <ListItemText
                    primary={graph.title}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {formatDate(graph.modified)}
                        </Typography>
                        <Typography variant="caption" display="block">
                          {graph.nodeCount} nodes • {graph.edgeCount} edges
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <Tooltip title="Load Graph">
                      <IconButton 
                        size="small" 
                        onClick={() => handleLoadGraph(graph.id)}
                        color="primary"
                      >
                        <LoadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Graph">
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteGraph(graph.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </Box>
                
                {graph.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    {graph.description}
                  </Typography>
                )}
                
                {graph.tags.length > 0 && (
                  <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                    {graph.tags.slice(0, 3).map((tag, idx) => (
                      <Chip key={idx} label={tag} size="small" variant="outlined" />
                    ))}
                    {graph.tags.length > 3 && (
                      <Chip label={`+${graph.tags.length - 3}`} size="small" variant="outlined" />
                    )}
                  </Stack>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Current Graph</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Graph Title"
            fullWidth
            variant="outlined"
            value={saveTitle}
            onChange={(e) => setSaveTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={saveDescription}
            onChange={(e) => setSaveDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveCurrentGraph} 
            variant="contained"
            disabled={!saveTitle.trim() || loading}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default SavedGraphs
