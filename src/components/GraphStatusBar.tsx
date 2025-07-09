/**
 * Graph Status Bar
 * Shows current graph statistics and information
 */

import React from 'react'
import {
  Box,
  Typography,
  Chip,
  Stack,
  alpha,
  useTheme
} from '@mui/material'
import {
  AccountTree as NodesIcon,
  Link as EdgesIcon,
  Psychology as ClustersIcon,
  Visibility as ViewIcon
} from '@mui/icons-material'
import useGraphStore from '@/stores/graphStore'

interface GraphStatusBarProps {
  clusterCount: number
  layoutType: string
}

const GraphStatusBar: React.FC<GraphStatusBarProps> = ({
  clusterCount,
  layoutType
}) => {
  const theme = useTheme()
  const { nodes, edges, selectedNodes, viewport } = useGraphStore()

  const formatZoom = (zoom: number): string => {
    return `${Math.round(zoom * 100)}%`
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        bgcolor: alpha(theme.palette.background.paper, 0.9),
        backdropFilter: 'blur(8px)',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        p: 2,
        minWidth: 300,
        zIndex: 100
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        {/* Nodes */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <NodesIcon sx={{ fontSize: 16, color: 'primary.main' }} />
          <Typography variant="caption">
            {nodes.size} nodes
          </Typography>
          {selectedNodes.size > 0 && (
            <Chip
              label={`${selectedNodes.size} selected`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        {/* Edges */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <EdgesIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
          <Typography variant="caption">
            {edges.size} connections
          </Typography>
        </Box>

        {/* Clusters */}
        {clusterCount > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ClustersIcon sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="caption">
              {clusterCount} clusters
            </Typography>
          </Box>
        )}

        {/* Layout Type */}
        <Chip
          label={layoutType}
          size="small"
          variant="outlined"
          color="default"
        />

        {/* Zoom Level */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ViewIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            {formatZoom(viewport.zoom)}
          </Typography>
        </Box>
      </Stack>
    </Box>
  )
}

export default GraphStatusBar