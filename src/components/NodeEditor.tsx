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
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Stack,
  alpha
} from '@mui/material'
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material'
import useGraphStore from '@/stores/graphStore'
import { GraphNode } from '@/types/graph'

interface NodeEditorProps {
  visible: boolean
  onClose: () => void
}

const NodeEditor: React.FC<NodeEditorProps> = ({ visible, onClose }) => {
  const { nodes, selectedNodes, updateNode, removeNode } = useGraphStore()
  const [editingNode, setEditingNode] = useState<GraphNode | null>(null)
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
      setTempContent(selectedNode.content || '')
      setTempTags(selectedNode.metadata?.tags || [])
    } else {
      setEditingNode(null)
    }
  }, [selectedNode])

  const handleSave = () => {
    if (editingNode) {
      updateNode(editingNode.id, {
        label: tempLabel,
        content: tempContent,
        metadata: {
          ...editingNode.metadata,
          tags: tempTags,
          modified: new Date()
        }
      })
      onClose()
    }
  }

  const handleCancel = () => {
    if (selectedNode) {
      setTempLabel(selectedNode.label)
      setTempContent(selectedNode.content || '')
      setTempTags(selectedNode.metadata?.tags || [])
    }
    onClose()
  }

  const handleDelete = () => {
    if (editingNode && window.confirm('Are you sure you want to delete this node?')) {
      removeNode(editingNode.id)
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
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 450,
        maxHeight: '80vh',
        zIndex: 1100,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: (theme) => theme.shadows[12],
        border: 1,
        borderColor: 'divider'
      }}
    >
      <Card elevation={0}>
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
            <EditIcon />
            <Typography variant="h6">
              Edit Node
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleCancel}
            sx={{ color: 'inherit' }}
          >
            <CancelIcon />
          </IconButton>
        </Box>

        <CardContent sx={{ p: 3 }} onKeyDown={handleKeyPress}>
          {/* Node Label */}
          <TextField
            fullWidth
            label="Node Label"
            value={tempLabel}
            onChange={(e) => setTempLabel(e.target.value)}
            variant="outlined"
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
          <Box sx={{ mt: 2, p: 2, bgcolor: alpha('primary.main', 0.05), borderRadius: 1 }}>
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
        </CardContent>

        <CardActions sx={{ p: 3, pt: 0, justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
          >
            Delete
          </Button>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!tempLabel.trim()}
            >
              Save
            </Button>
          </Box>
        </CardActions>
      </Card>
    </Box>
  )
}

export default NodeEditor