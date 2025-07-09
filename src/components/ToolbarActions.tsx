/**
 * Toolbar Actions Component - Top navigation actions
 * File operations, graph management, and TreeQuest integration
 */

import React, { useState } from 'react'
import {
  Box,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Divider,
  Badge
} from '@mui/material'
import {
  Save,
  FileOpen,
  Download,
  Share,
  Settings,
  Help,
  Search,
  AccountTree,
  Psychology,
  MoreVert
} from '@mui/icons-material'
import useGraphStore from '@/stores/graphStore'
import { exportGraph, importGraph, searchGraph, runTreeSearch } from '@/utils/graphOperations'
import { GraphNode } from '@/types/graph'
import './ToolbarActions.css'

const ToolbarActions: React.FC = () => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [loadDialogOpen, setLoadDialogOpen] = useState(false)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [treeSearchDialogOpen, setTreeSearchDialogOpen] = useState(false)
  const [filename, setFilename] = useState('knowledge-graph')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  const {
    nodes,
    edges,
    selectedNodes,
    setLoading
  } = useGraphStore()

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
  }

  const handleSaveGraph = async () => {
    try {
      setLoading(true)
      const graphData = {
        nodes: Array.from(nodes.values()),
        edges: Array.from(edges.values()),
        metadata: {
          created: new Date(),
          version: '1.0',
          nodeCount: nodes.size,
          edgeCount: edges.size
        }
      }

      await exportGraph(graphData, filename)
      setSaveDialogOpen(false)
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadGraph = async (file: File) => {
    try {
      setLoading(true)
      const graphData = await importGraph(file)

      // TODO: Import into store
      console.log('Loaded graph:', graphData)
      setLoadDialogOpen(false)
    } catch (error) {
      console.error('Load failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      const results = await searchGraph(
        Array.from(nodes.values()),
        searchQuery
      )
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const handleTreeSearch = async () => {
    if (selectedNodes.size === 0) return

    try {
      setLoading(true)
      const selectedNodeArray = Array.from(selectedNodes)
        .map(id => nodes.get(id))
        .filter((node): node is GraphNode => node !== undefined)

      // Run TreeQuest AB-MCTS search from selected nodes
      const searchResults = await runTreeSearch(selectedNodeArray, {
        type: 'abmcts-a',
        maxIterations: 100,
        explorationConstant: 1.4,
        maxDepth: 5
      })

      console.log('TreeSearch results:', searchResults)
      setTreeSearchDialogOpen(false)
    } catch (error) {
      console.error('TreeSearch failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportPNG = () => {
    // TODO: Export graph as PNG image
    console.log('Export PNG')
  }

  const handleExportJSON = () => {
    setSaveDialogOpen(true)
  }

  const selectedCount = selectedNodes.size

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Search */}
        <Tooltip title="Search Graph">
          <IconButton
            onClick={() => setSearchDialogOpen(true)}
            color="inherit"
          >
            <Search />
          </IconButton>
        </Tooltip>

        {/* TreeQuest Search */}
        <Tooltip title="AI Tree Search">
          <IconButton
            onClick={() => setTreeSearchDialogOpen(true)}
            color="inherit"
            disabled={selectedCount === 0}
          >
            <Badge badgeContent={selectedCount} color="secondary">
              <AccountTree />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Quick Save */}
        <Tooltip title="Save Graph">
          <IconButton
            onClick={() => setSaveDialogOpen(true)}
            color="inherit"
          >
            <Save />
          </IconButton>
        </Tooltip>

        {/* Quick Load */}
        <Tooltip title="Load Graph">
          <IconButton
            onClick={() => setLoadDialogOpen(true)}
            color="inherit"
          >
            <FileOpen />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem />

        {/* More Actions Menu */}
        <Tooltip title="More Actions">
          <IconButton
            onClick={handleMenuOpen}
            color="inherit"
          >
            <MoreVert />
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleExportPNG}>
            <Download sx={{ mr: 1 }} />
            Export as PNG
          </MenuItem>
          <MenuItem onClick={handleExportJSON}>
            <Download sx={{ mr: 1 }} />
            Export as JSON
          </MenuItem>
          <MenuItem onClick={() => console.log('Share')}>
            <Share sx={{ mr: 1 }} />
            Share Graph
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => console.log('Settings')}>
            <Settings sx={{ mr: 1 }} />
            Settings
          </MenuItem>
          <MenuItem onClick={() => console.log('Help')}>
            <Help sx={{ mr: 1 }} />
            Help
          </MenuItem>
        </Menu>
      </Box>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Knowledge Graph</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Filename"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveGraph} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={loadDialogOpen} onClose={() => setLoadDialogOpen(false)}>
        <DialogTitle>Load Knowledge Graph</DialogTitle>
        <DialogContent>
          <label htmlFor="load-graph-input" className="toolbar-file-label">
            <input
              id="load-graph-input"
              className="toolbar-file-input"
              type="file"
              accept=".json"
              title="Select a JSON file to load"
              placeholder="Choose JSON file"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleLoadGraph(file)
              }}
            />
            <span className="toolbar-file-text">Choose JSON file</span>
          </label>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Search Dialog */}
      <Dialog open={searchDialogOpen} onClose={() => setSearchDialogOpen(false)}>
        <DialogTitle>Search Knowledge Graph</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Search Query"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
          {searchResults.length > 0 && (
            <Box>
              {searchResults.map((result, index) => (
                <Box key={index} sx={{ p: 1, border: 1, borderColor: 'divider', mb: 1 }}>
                  <strong>{result.label}</strong>: {result.content.slice(0, 100)}...
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSearchDialogOpen(false)}>Close</Button>
          <Button onClick={handleSearch} variant="contained">Search</Button>
        </DialogActions>
      </Dialog>

      {/* TreeSearch Dialog */}
      <Dialog open={treeSearchDialogOpen} onClose={() => setTreeSearchDialogOpen(false)}>
        <DialogTitle>
          <Psychology sx={{ mr: 1, verticalAlign: 'middle' }} />
          AI Tree Search
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <p>Run AB-MCTS tree search from {selectedCount} selected node(s) to discover optimal exploration paths and generate new insights.</p>
            <p>This will use TreeQuest algorithms to intelligently explore the knowledge space and suggest new connections.</p>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTreeSearchDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleTreeSearch} variant="contained">
            Run Search
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ToolbarActions
