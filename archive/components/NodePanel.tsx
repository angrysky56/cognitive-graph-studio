/**
 * Node Panel Component - Left sidebar for node management and editing
 * Shows selected node details with editing capabilities and node library
 */

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  IconButton,
  InputAdornment,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Button,
  Card,
  CardContent,
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material'
import {
  Search,
  Clear,
  Edit,
  Delete,
  ExpandMore,
  Description,
  CloudUpload,
  Save,
  Cancel,
  Add,
  Folder,
  Star,
  StarBorder,
  Psychology,
  Link as LinkIcon,
  OpenInNew
} from '@mui/icons-material'
import useGraphStore from '@/stores/graphStore'
import { GraphNode } from '@/types/graph'
import DocumentImporter from './DocumentImporter'
import SavedGraphsManager, { SavedGraph } from '@/utils/savedGraphs'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ height: '100%', overflow: 'hidden' }}>
    {value === index && (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
    )}
  </div>
)

const NodePanel: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [editingNode, setEditingNode] = useState<GraphNode | null>(null)
  const [editForm, setEditForm] = useState<Partial<GraphNode>>({})
  const [savedGraphs, setSavedGraphs] = useState<SavedGraph[]>([])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [newGraphName, setNewGraphName] = useState('')
  const [newGraphDescription, setNewGraphDescription] = useState('')
  
  const {
    nodes,
    edges,
    selectedNodes,
    selectNode,
    deselectNode,
    updateNode,
    deleteNode,
    addNode,
    addEdge
  } = useGraphStore()

  const nodeArray = Array.from(nodes.values())
  const selectedNodeIds = Array.from(selectedNodes)
  const primarySelectedNode = selectedNodeIds.length > 0 ? nodes.get(selectedNodeIds[0]) : null
  
  // Filter nodes based on search and type
  const filteredNodes = nodeArray.filter(node => {
    const matchesSearch = node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         node.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !selectedType || node.type === selectedType
    return matchesSearch && matchesType
  })

  // Group nodes by type
  const nodesByType = filteredNodes.reduce((acc, node) => {
    if (!acc[node.type]) acc[node.type] = []
    acc[node.type].push(node)
    return acc
  }, {} as Record<string, typeof nodeArray>)

  // Initialize edit form when editing node changes
  useEffect(() => {
    if (editingNode) {
      setEditForm({
        label: editingNode.label,
        content: editingNode.content,
        type: editingNode.type,
        metadata: { ...editingNode.metadata }
      })
    }
  }, [editingNode])

  // Load saved graphs when component mounts
  useEffect(() => {
    const loadSavedGraphs = async () => {
      const graphs = await SavedGraphsManager.getAllGraphs()
      setSavedGraphs(graphs)
    }
    loadSavedGraphs()
  }, [])

  const handleNodeClick = (nodeId: string) => {
    if (selectedNodes.has(nodeId)) {
      deselectNode(nodeId)
    } else {
      selectNode(nodeId)
    }
  }

  const handleNodeEdit = (node: GraphNode) => {
    setEditingNode(node)
    setActiveTab(0) // Switch to nodes tab if not already there
  }

  const handleSaveEdit = () => {
    if (editingNode && editForm) {
      const updates: Partial<GraphNode> = {
        label: editForm.label || editingNode.label,
        content: editForm.content || editingNode.content,
        type: editForm.type || editingNode.type,
        metadata: {
          ...editingNode.metadata,
          ...editForm.metadata,
          modified: new Date()
        }
      }
      
      updateNode(editingNode.id, updates)
      setEditingNode(null)
      setEditForm({})
    }
  }

  const handleCancelEdit = () => {
    setEditingNode(null)
    setEditForm({})
  }

  const handleNodeDelete = (nodeId: string) => {
    if (window.confirm('Are you sure you want to delete this node?')) {
      deleteNode(nodeId)
      if (editingNode?.id === nodeId) {
        setEditingNode(null)
        setEditForm({})
      }
    }
  }

  const handleToggleFavorite = (node: GraphNode) => {
    updateNode(node.id, {
      metadata: {
        ...node.metadata,
        favorite: !node.metadata.favorite
      }
    })
  }

  // Saved graphs handlers
  const handleSaveGraph = async () => {
    if (!newGraphName.trim()) return

    try {
      await SavedGraphsManager.saveGraph(
        newGraphName.trim(),
        newGraphDescription.trim(),
        nodes,
        edges,
        ['user-created'], // default tag
        'dagre' // default layout
      )
      
      // Refresh saved graphs list
      const graphs = await SavedGraphsManager.getAllGraphs()
      setSavedGraphs(graphs)
      
      // Reset form
      setNewGraphName('')
      setNewGraphDescription('')
      setSaveDialogOpen(false)
    } catch (error) {
      console.error('Failed to save graph:', error)
    }
  }

  const handleLoadGraph = async (graphId: string) => {
    try {
      const savedGraph = await SavedGraphsManager.loadGraph(graphId)
      if (!savedGraph) return

      // Clear current graph
      // Add nodes from saved graph
      savedGraph.nodes.forEach(node => addNode(node))
      
      // Add edges from saved graph  
      savedGraph.edges.forEach(edge => addEdge(edge))
      
      console.log('Graph loaded successfully')
    } catch (error) {
      console.error('Failed to load graph:', error)
    }
  }

  const handleDeleteSavedGraph = async (graphId: string) => {
    if (!window.confirm('Are you sure you want to delete this saved graph?')) {
      return
    }

    try {
      await SavedGraphsManager.deleteGraph(graphId)
      
      // Refresh saved graphs list
      const graphs = await SavedGraphsManager.getAllGraphs()
      setSavedGraphs(graphs)
    } catch (error) {
      console.error('Failed to delete graph:', error)
    }
  }

  const nodeTypeColors = {
    concept: '#4da6ff',
    idea: '#80c7ff', 
    source: '#ffca80',
    cluster: '#90ee90'
  }

  const getNodeTypeIcon = (type: string) => {
    switch (type) {
      case 'idea': return <Psychology />
      case 'source': return <Description />
      case 'concept': return <LinkIcon />
      default: return <Description />
    }
  }

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header with Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{ minHeight: 48 }}
        >
          <Tab 
            icon={<Description />} 
            label="Nodes" 
            sx={{ minHeight: 48 }}
          />
          <Tab 
            icon={<CloudUpload />} 
            label="Import" 
            sx={{ minHeight: 48 }}
          />
          <Tab
            icon={<Folder />}
            label="Library"
            sx={{ minHeight: 48 }}
          />
        </Tabs>
      </Box>

      {/* Nodes Tab */}
      <TabPanel value={activeTab} index={0}>
        {/* Show selected node details if any node is selected */}
        {primarySelectedNode && !editingNode && (
          <Card sx={{ m: 2, mb: 1 }}>
            <CardContent sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {getNodeTypeIcon(primarySelectedNode.type)}
                <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                  {primarySelectedNode.label}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleToggleFavorite(primarySelectedNode)}
                >
                  {primarySelectedNode.metadata.favorite ? 
                    <Star sx={{ color: 'warning.main' }} /> : 
                    <StarBorder />
                  }
                </IconButton>
              </Box>
              
              <Chip 
                size="small" 
                label={primarySelectedNode.type}
                sx={{ 
                  mb: 1,
                  backgroundColor: nodeTypeColors[primarySelectedNode.type as keyof typeof nodeTypeColors],
                  color: 'white'
                }}
              />
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {primarySelectedNode.content}
              </Typography>
              
              {primarySelectedNode.metadata.tags && primarySelectedNode.metadata.tags.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                  {primarySelectedNode.metadata.tags.map((tag, index) => (
                    <Chip key={index} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
              )}
              
              {primarySelectedNode.metadata.url && (
                <Button
                  size="small"
                  startIcon={<OpenInNew />}
                  onClick={() => window.open(primarySelectedNode.metadata.url, '_blank')}
                  sx={{ mb: 1 }}
                >
                  Open Source
                </Button>
              )}
            </CardContent>
            
            <CardActions sx={{ pt: 0 }}>
              <Button
                size="small"
                startIcon={<Edit />}
                onClick={() => handleNodeEdit(primarySelectedNode)}
              >
                Edit
              </Button>
              <Button
                size="small"
                startIcon={<Delete />}
                color="error"
                onClick={() => handleNodeDelete(primarySelectedNode.id)}
              >
                Delete
              </Button>
            </CardActions>
          </Card>
        )}

        {/* Edit form if editing */}
        {editingNode && (
          <Card sx={{ m: 2, mb: 1 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Edit Node
              </Typography>
              
              <TextField
                fullWidth
                label="Label"
                value={editForm.label || ''}
                onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                sx={{ mb: 2 }}
              />
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={editForm.type || editingNode.type}
                  label="Type"
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value as GraphNode['type'] })}
                >
                  <MenuItem value="concept">Concept</MenuItem>
                  <MenuItem value="idea">Idea</MenuItem>
                  <MenuItem value="source">Source</MenuItem>
                  <MenuItem value="cluster">Cluster</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Content"
                value={editForm.content || ''}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Tags (comma separated)"
                value={editForm.metadata?.tags?.join(', ') || ''}
                onChange={(e) => setEditForm({ 
                  ...editForm, 
                  metadata: { 
                    ...editForm.metadata, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  }
                })}
                sx={{ mb: 2 }}
              />
              
              {editingNode.type === 'source' && (
                <TextField
                  fullWidth
                  label="URL"
                  value={editForm.metadata?.url || ''}
                  onChange={(e) => setEditForm({ 
                    ...editForm, 
                    metadata: { ...editForm.metadata, url: e.target.value }
                  })}
                  sx={{ mb: 2 }}
                />
              )}
            </CardContent>
            
            <CardActions>
              <Button
                startIcon={<Save />}
                onClick={handleSaveEdit}
                variant="contained"
              >
                Save
              </Button>
              <Button
                startIcon={<Cancel />}
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
            </CardActions>
          </Card>
        )}

        {/* Search and Filter - only show if not editing */}
        {!editingNode && (
          <Box sx={{ p: 2, pb: 1 }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              Knowledge Nodes
            </Typography>

            <TextField
              fullWidth
              size="small"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small" 
                      onClick={() => setSearchTerm('')}
                    >
                      <Clear fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            {/* Type Filters */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {Object.keys(nodeTypeColors).map((type) => (
                <Chip
                  key={type}
                  label={type}
                  size="small"
                  variant={selectedType === type ? 'filled' : 'outlined'}
                  onClick={() => setSelectedType(selectedType === type ? null : type)}
                  sx={{
                    color: nodeTypeColors[type as keyof typeof nodeTypeColors],
                    borderColor: nodeTypeColors[type as keyof typeof nodeTypeColors]
                  }}
                />
              ))}
            </Box>

            <Divider sx={{ mb: 2 }} />
          </Box>
        )}

        {/* Node List - only show if not editing */}
        {!editingNode && (
          <Box sx={{ flex: 1, overflow: 'auto', px: 2 }}>
            {Object.entries(nodesByType).map(([type, typeNodes]) => (
              <Accordion 
                key={type} 
                defaultExpanded
                sx={{ 
                  mb: 1,
                  '&:before': { display: 'none' },
                  boxShadow: 'none'
                }}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMore />}
                  sx={{ 
                    minHeight: 'auto',
                    '& .MuiAccordionSummary-content': {
                      margin: '8px 0'
                    }
                  }}
                >
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      textTransform: 'capitalize',
                      color: nodeTypeColors[type as keyof typeof nodeTypeColors]
                    }}
                  >
                    {type} ({typeNodes.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <List dense>
                    {typeNodes.map((node) => (
                      <ListItem
                        key={node.id}
                        disablePadding
                        secondaryAction={
                          <Box>
                            <IconButton 
                              edge="end" 
                              size="small"
                              onClick={() => handleNodeEdit(node)}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton 
                              edge="end" 
                              size="small"
                              onClick={() => handleNodeDelete(node.id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemButton
                          selected={selectedNodes.has(node.id)}
                          onClick={() => handleNodeClick(node.id)}
                          sx={{
                            borderRadius: 1,
                            mr: 1,
                            '&.Mui-selected': {
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText',
                              '&:hover': {
                                bgcolor: 'primary.dark'
                              }
                            }
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {node.metadata.favorite && (
                                  <Star sx={{ fontSize: 16, mr: 0.5, color: 'warning.main' }} />
                                )}
                                {node.label}
                              </Box>
                            }
                            secondary={node.content.slice(0, 50) + '...'}
                            secondaryTypographyProps={{
                              fontSize: '0.75rem',
                              color: selectedNodes.has(node.id) 
                                ? 'inherit' 
                                : 'text.secondary'
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* Stats */}
        {!editingNode && (
          <Box sx={{ p: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <Typography variant="caption">
                Total: {nodeArray.length} nodes
              </Typography>
              <Typography variant="caption">
                Selected: {selectedNodes.size}
              </Typography>
            </Box>
          </Box>
        )}
      </TabPanel>

      {/* Import Tab */}
      <TabPanel value={activeTab} index={1}>
        <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'secondary.main' }}>
            Document Import
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload documents to automatically create structured knowledge nodes using AI analysis.
          </Typography>
          <DocumentImporter />
        </Box>
      </TabPanel>

      {/* Library Tab */}
      <TabPanel value={activeTab} index={2}>
        <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'success.main' }}>
            Saved Graphs
          </Typography>
          
          {/* Save current graph */}
          {!saveDialogOpen ? (
            <Button
              variant="contained"
              startIcon={<Add />}
              fullWidth
              onClick={() => setSaveDialogOpen(true)}
              sx={{ mb: 2 }}
              disabled={nodeArray.length === 0}
            >
              Save Current Graph
            </Button>
          ) : (
            <Card sx={{ mb: 2, p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Save Current Graph
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Graph name"
                value={newGraphName}
                onChange={(e) => setNewGraphName(e.target.value)}
                sx={{ mb: 1 }}
              />
              <TextField
                fullWidth
                size="small"
                placeholder="Description (optional)"
                value={newGraphDescription}
                onChange={(e) => setNewGraphDescription(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleSaveGraph}
                  disabled={!newGraphName.trim()}
                >
                  Save
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setSaveDialogOpen(false)
                    setNewGraphName('')
                    setNewGraphDescription('')
                  }}
                >
                  Cancel
                </Button>
              </Box>
            </Card>
          )}
          
          <Divider sx={{ mb: 2 }} />
          
          {/* Saved graphs list */}
          {savedGraphs.length === 0 ? (
            <Alert severity="info">
              No saved graphs yet. Create and save your first graph to get started!
            </Alert>
          ) : (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Saved Graphs ({savedGraphs.length})
              </Typography>
              
              <List dense>
                {savedGraphs.map((graph) => (
                  <ListItem
                    key={graph.id}
                    disablePadding
                    sx={{ mb: 1 }}
                  >
                    <Card sx={{ width: '100%' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                            {graph.name}
                          </Typography>
                          <Chip
                            size="small"
                            label={`${graph.metadata.nodeCount} nodes`}
                            sx={{ ml: 1 }}
                          />
                        </Box>
                        
                        {graph.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {graph.description}
                          </Typography>
                        )}
                        
                        <Typography variant="caption" color="text.secondary">
                          Modified: {new Date(graph.metadata.modified).toLocaleDateString()}
                        </Typography>
                        
                        {graph.metadata.tags.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {graph.metadata.tags.map((tag, index) => (
                              <Chip
                                key={index}
                                label={tag}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            ))}
                          </Box>
                        )}
                      </CardContent>
                      
                      <CardActions sx={{ pt: 0 }}>
                        <Button
                          size="small"
                          onClick={() => handleLoadGraph(graph.id)}
                        >
                          Load
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleDeleteSavedGraph(graph.id)}
                        >
                          Delete
                        </Button>
                      </CardActions>
                    </Card>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      </TabPanel>
    </Box>
  )
}

export default NodePanel