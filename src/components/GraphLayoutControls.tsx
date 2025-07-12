/**
 * Graph Layout Controls Component
 * Enhanced UI controls for different graph layout algorithms and configurations
 */

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Chip,
  Slider,
  FormControlLabel,
  Switch,
  IconButton,
  ButtonGroup,
  Paper,
  Stack,
  Badge
} from '@mui/material'
import {
  AccountTree,
  AutoFixHigh,
  Refresh,
  Tune,
  GridOn,
  Hub,
  Timeline,
  ScatterPlot,
  Speed,
  Straighten,
  BlurOn
} from '@mui/icons-material'

export type LayoutAlgorithm = 'dagre' | 'circular' | 'grid' | 'radial' | 'tree' | 'force'
export type LayoutDirection = 'TB' | 'BT' | 'LR' | 'RL'

interface GraphLayoutControlsProps {
  onLayoutChange?: (algorithm: LayoutAlgorithm, direction?: LayoutDirection) => void
  currentLayout?: LayoutAlgorithm
}

const layoutOptions = [
  {
    value: 'dagre',
    label: 'Hierarchical',
    icon: <AccountTree />,
    description: 'Organized top-down structure',
    color: '#1976d2'
  },
  {
    value: 'force',
    label: 'Force-Directed',
    icon: <ScatterPlot />,
    description: 'Natural physics-based positioning',
    color: '#388e3c'
  },
  {
    value: 'circular',
    label: 'Circular',
    icon: <Hub />,
    description: 'Nodes arranged in a circle',
    color: '#f57c00'
  },
  {
    value: 'grid',
    label: 'Grid',
    icon: <GridOn />,
    description: 'Uniform grid arrangement',
    color: '#7b1fa2'
  },
  {
    value: 'radial',
    label: 'Radial',
    icon: <BlurOn />,
    description: 'Central hub with radiating spokes',
    color: '#c2185b'
  },
  {
    value: 'tree',
    label: 'Tree',
    icon: <Timeline />,
    description: 'Branching tree structure',
    color: '#303f9f'
  }
] as const

const directionOptions = [
  { value: 'TB', label: 'Top → Bottom', icon: '↓' },
  { value: 'BT', label: 'Bottom → Top', icon: '↑' },
  { value: 'LR', label: 'Left → Right', icon: '→' },
  { value: 'RL', label: 'Right → Left', icon: '←' }
] as const

export const GraphLayoutControls: React.FC<GraphLayoutControlsProps> = ({
  onLayoutChange,
  currentLayout = 'dagre'
}) => {
  const [selectedLayout, setSelectedLayout] = useState<LayoutAlgorithm>(currentLayout)
  const [direction, setDirection] = useState<LayoutDirection>('TB')
  const [autoLayout, setAutoLayout] = useState(false)
  const [nodeSpacing, setNodeSpacing] = useState(100)
  const [edgeLength, setEdgeLength] = useState(150)
  const [iterations, setIterations] = useState(300)

  // Update selected layout when prop changes
  useEffect(() => {
    setSelectedLayout(currentLayout)
  }, [currentLayout])

  const handleLayoutChange = (algorithm: LayoutAlgorithm) => {
    setSelectedLayout(algorithm)
    onLayoutChange?.(algorithm, direction)
  }

  const handleDirectionChange = (newDirection: LayoutDirection) => {
    setDirection(newDirection)
    onLayoutChange?.(selectedLayout, newDirection)
  }

  const handleApplyLayout = () => {
    onLayoutChange?.(selectedLayout, direction)
  }

  const currentLayoutOption = layoutOptions.find(opt => opt.value === selectedLayout)

  return (
    <Stack spacing={2} sx={{ p: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tune color="primary" />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Layout Controls
        </Typography>
        <Badge badgeContent={selectedLayout} color="primary">
          <IconButton size="small" onClick={handleApplyLayout}>
            <Refresh />
          </IconButton>
        </Badge>
      </Box>

      {/* Current Layout Status */}
      <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.default' }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Active Layout
        </Typography>
        <Chip
          icon={currentLayoutOption?.icon}
          label={currentLayoutOption?.label}
          sx={{
            bgcolor: currentLayoutOption?.color + '20',
            color: currentLayoutOption?.color,
            fontWeight: 600
          }}
        />
        <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.7 }}>
          {currentLayoutOption?.description}
        </Typography>
      </Paper>

      {/* Quick Layout Buttons */}
      <Box>
        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Speed fontSize="small" />
          Quick Layouts
        </Typography>
        <ButtonGroup variant="outlined" size="small" fullWidth>
          {layoutOptions.slice(0, 3).map((option) => (
            <Button
              key={option.value}
              onClick={() => handleLayoutChange(option.value)}
              startIcon={option.icon}
              variant={selectedLayout === option.value ? 'contained' : 'outlined'}
              sx={{ flex: 1, fontSize: '0.75rem' }}
            >
              {option.label.split(' ')[0]}
            </Button>
          ))}
        </ButtonGroup>
        <ButtonGroup variant="outlined" size="small" fullWidth sx={{ mt: 1 }}>
          {layoutOptions.slice(3, 6).map((option) => (
            <Button
              key={option.value}
              onClick={() => handleLayoutChange(option.value)}
              startIcon={option.icon}
              variant={selectedLayout === option.value ? 'contained' : 'outlined'}
              sx={{ flex: 1, fontSize: '0.75rem' }}
            >
              {option.label.split(' ')[0]}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      {/* Direction Controls (for hierarchical layouts) */}
      {(selectedLayout === 'dagre' || selectedLayout === 'tree') && (
        <Box>
          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Straighten fontSize="small" />
            Direction
          </Typography>
          <ButtonGroup variant="outlined" size="small" fullWidth>
            {directionOptions.map((option) => (
              <Button
                key={option.value}
                onClick={() => handleDirectionChange(option.value)}
                variant={direction === option.value ? 'contained' : 'outlined'}
                sx={{ flex: 1 }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="h6">{option.icon}</Typography>
                  <Typography variant="caption">{option.value}</Typography>
                </Box>
              </Button>
            ))}
          </ButtonGroup>
        </Box>
      )}

      {/* Advanced Controls */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Spacing & Layout
        </Typography>

        {/* Node Spacing */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Node Spacing</span>
            <span>{nodeSpacing}px</span>
          </Typography>
          <Slider
            value={nodeSpacing}
            onChange={(_, value) => setNodeSpacing(value as number)}
            min={50}
            max={300}
            step={25}
            size="small"
            valueLabelDisplay="auto"
            sx={{
              '& .MuiSlider-thumb': {
                width: 16,
                height: 16,
              },
              '& .MuiSlider-track': {
                height: 4,
              },
              '& .MuiSlider-rail': {
                height: 4,
              }
            }}
          />
        </Box>

        {/* Edge Length (for force layout) */}
        {selectedLayout === 'force' && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Edge Length</span>
              <span>{edgeLength}px</span>
            </Typography>
            <Slider
              value={edgeLength}
              onChange={(_, value) => setEdgeLength(value as number)}
              min={50}
              max={400}
              step={25}
              size="small"
              valueLabelDisplay="auto"
              sx={{
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16,
                },
                '& .MuiSlider-track': {
                  height: 4,
                },
                '& .MuiSlider-rail': {
                  height: 4,
                }
              }}
            />
          </Box>
        )}

        {/* Force Iterations (for force layout) */}
        {selectedLayout === 'force' && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Simulation Steps</span>
              <span>{iterations}</span>
            </Typography>
            <Slider
              value={iterations}
              onChange={(_, value) => setIterations(value as number)}
              min={100}
              max={1000}
              step={50}
              size="small"
              valueLabelDisplay="auto"
              sx={{
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16,
                },
                '& .MuiSlider-track': {
                  height: 4,
                },
                '& .MuiSlider-rail': {
                  height: 4,
                }
              }}
            />
          </Box>
        )}
      </Box>

      {/* Auto Layout Toggle */}
      <FormControlLabel
        control={
          <Switch
            checked={autoLayout}
            onChange={(e) => setAutoLayout(e.target.checked)}
            size="small"
          />
        }
        label={
          <Typography variant="body2">
            Auto-apply layout changes
          </Typography>
        }
      />

      {/* Apply Button */}
      <Button
        variant="contained"
        size="medium"
        startIcon={<AutoFixHigh />}
        onClick={handleApplyLayout}
        fullWidth
        sx={{
          bgcolor: currentLayoutOption?.color,
          '&:hover': {
            bgcolor: currentLayoutOption?.color + 'dd',
          }
        }}
      >
        Apply {currentLayoutOption?.label} Layout
      </Button>

      {/* Layout Tips */}
      <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'action.hover' }}>
        <Typography variant="caption" color="text.secondary">
          💡 <strong>Tip:</strong> {(() => {
            switch (selectedLayout) {
              case 'dagre': return 'Best for hierarchical data with clear relationships'
              case 'force': return 'Great for discovering natural clusters and relationships'
              case 'circular': return 'Perfect for showing equal importance of all nodes'
              case 'grid': return 'Ideal for comparing nodes side-by-side'
              case 'radial': return 'Excellent for hub-and-spoke type relationships'
              case 'tree': return 'Perfect for branching hierarchies and taxonomies'
              default: return 'Choose a layout that matches your data structure'
            }
          })()}
        </Typography>
      </Paper>
    </Stack>
  )
}

export default GraphLayoutControls
