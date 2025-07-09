/**
 * Node Panel Component - Left sidebar for node management
 * Displays node list, search, editing capabilities, and document import
 */

import React, { useState } from 'react'
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
  Tab
} from '@mui/material'
import {
  Search,
  Clear,
  Edit,
  Delete,
  ExpandMore,
  Description,
  CloudUpload
} from '@mui/icons-material'
import useGraphStore from '@/stores/graphStore'
import DocumentImporter from './DocumentImporter'

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
  
  const {
    nodes,
    selectedNodes,
    selectNode,
    deselectNode,
    removeNode
  } = useGraphStore()

  const nodeArray = Array.from(nodes.values())
  
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

  const handleNodeClick = (nodeId: string) => {
    if (selectedNodes.has(nodeId)) {
      deselectNode(nodeId)
    } else {
      selectNode(nodeId)
    }
  }

  const handleNodeEdit = (nodeId: string) => {
    // TODO: Open node editor modal
    console.log('Edit node:', nodeId)
  }

  const handleNodeDelete = (nodeId: string) => {
    removeNode(nodeId)
  }

  const nodeTypeColors = {
    concept: '#ffca80',
    idea: '#80c7ff',
    source: '#90ee90',
    cluster: '#dda0dd'
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
        </Tabs>
      </Box>

      {/* Nodes Tab */}
      <TabPanel value={activeTab} index={0}>
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
            Knowledge Nodes
          </Typography>

          {/* Search and Filter */}
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

        {/* Node List */}
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
                            onClick={() => handleNodeEdit(node.id)}
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
                          primary={node.label}
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

        {/* Stats */}
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
    </Box>
  )
}

export default NodePanel
