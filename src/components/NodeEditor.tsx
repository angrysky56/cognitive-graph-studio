/**
 * Node Editor Panel
 * Allows editing of selected node properties
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
  alpha
} from '@mui/material'
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material'
import useEnhancedGraphStore from '@/stores/enhancedGraphStore'
import { EnhancedGraphNode } from '@/types/enhanced-graph'

interface NodeEditorProps {
  visible: boolean
  onClose: () => void
}

const NodeEditor: React.FC<NodeEditorProps> = ({ visible, onClose }) => {
  const { nodes, selectedNodes, updateNode, deleteNode } = useEnhancedGraphStore()
  const [editingNode, setEditingNode] = useState<EnhancedGraphNode | null>(null)
  const [tempLabel, setTempLabel] = useState('')
  const [tempContent, setTempContent] = useState('')
  const [tempTags, setTempTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  // Get the first selected node
  const selectedNodeId = selectedNodes.size > 0 ? Array.from(selectedNodes)[0] : null
  const selectedNode = selectedNodeId ? nodes.get(selectedNodeId) : null

  useEffect(() => {
    if (selectedNode) {
      setEditingNode(selectedNode)
      setTempLabel(selectedNode.label)
      setTempContent(selectedNode.richContent.markdown || '')
      setTempTags(selectedNode.metadata?.tags || [])
    } else {
      setEditingNode(null)
    }
  }, [selectedNode])

  const handleSave = () => {
    if (editingNode) {
      updateNode(editingNode.id, {
        label: tempLabel,
        richContent: {
          ...editingNode.richContent,
          markdown: tempContent
        },
        metadata: {
          ...editingNode.metadata,
          tags: tempTags,
          modified: new Date()
        },
        aiMetadata: {
          ...editingNode.aiMetadata,
          flags: {
            ...editingNode.aiMetadata.flags,
            needsReview: true // Mark for AI review after manual edit
          }
        }
      })
      onClose()
    }
  }

  const handleCancel = () => {
    if (selectedNode) {
      setTempLabel(selectedNode.label)
      setTempContent(selectedNode.richContent.markdown || '')
      setTempTags(selectedNode.metadata?.tags || [])
    }
    onClose()
  }

  const handleDelete = () => {
    if (editingNode && window.confirm('Are you sure you want to delete this node?')) {
      deleteNode(editingNode.id)
      onClose()
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tempTags.includes(newTag.trim())) {
      setTempTags([...tempTags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTempTags(tempTags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      handleSave()
    } else if (event.key === 'Escape') {
      handleCancel()
    }
  }

  if (!visible || !editingNode) return null

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        overflow: 'hidden'
      }}
    >
      {/* Content */}
      <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto' }} onKeyDown={handleKeyPress}>
        {/* Node Label */}
        <TextField
          fullWidth
          label="Node Label"
          value={tempLabel}
          onChange={(e) => setTempLabel(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ mb: 2 }}
          autoFocus
        />

        {/* Node Content */}
        <TextField
          fullWidth
          label="Content"
          value={tempContent}
          onChange={(e) => setTempContent(e.target.value)}
          variant="outlined"
          multiline
          rows={4}
          size="small"
          sx={{ mb: 2 }}
        />

        {/* Tags Section */}
        <Typography variant="subtitle2" gutterBottom>
          Tags
        </Typography>
        
        {/* Existing Tags */}
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          {tempTags.map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              onDelete={() => handleRemoveTag(tag)}
              size="small"
              color="primary"
              variant="outlined"
            />
          ))}
        </Stack>

        {/* Add New Tag */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
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
          <IconButton
            size="small"
            onClick={handleAddTag}
            disabled={!newTag.trim()}
          >
            <AddIcon />
          </IconButton>
        </Box>

        {/* Node Metadata */}
        <Box sx={{ mt: 2, p: 2, bgcolor: alpha('#4da6ff', 0.05), borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Created: {editingNode.metadata.created.toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Modified: {editingNode.metadata.modified.toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Type: {editingNode.type}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Connections: {editingNode.connections.length}
          </Typography>
        </Box>
      </Box>

      {/* Actions */}
      <Box sx={{ 
        p: 2, 
        borderTop: 1, 
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<DeleteIcon />}
          onClick={handleDelete}
        >
          Delete
        </Button>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!tempLabel.trim()}
          >
            Save
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default NodeEditor