/**
 * IdeaNode Component
 * 
 * A custom React Flow node component for idea-type nodes
 * Represents insights, hypotheses, or generated ideas
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Lightbulb,
  Edit,
  Delete,
  Star,
  StarBorder,
  TrendingUp,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { GraphNode } from '@/types/graph';

/**
 * Data structure for IdeaNode
 */
interface IdeaNodeData {
  label: string;
  content: string;
  metadata: GraphNode['metadata'];
  aiGenerated: boolean;
  selected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  onUpdate: (updates: Partial<GraphNode>) => void;
  onDelete: () => void;
  onClick: () => void;
}

/**
 * Props for IdeaNode component
 */
interface IdeaNodeProps extends NodeProps {
  data: IdeaNodeData;
}

/**
 * IdeaNode - Custom node component for idea-type nodes
 * 
 * Renders an idea node with Material UI styling and interactive capabilities
 * Includes idea-specific features like confidence scoring and favoriting
 */
const IdeaNode: React.FC<IdeaNodeProps> = memo(({ data, selected }) => {
  const theme = useTheme();

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Edit idea node:', data.label);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onDelete();
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentFavorite = data.metadata.favorite || false;
    data.onUpdate({
      metadata: {
        ...data.metadata,
        favorite: !currentFavorite,
      },
    });
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onClick();
    
    if (selected) {
      data.onDeselect();
    } else {
      data.onSelect();
    }
  };

  // Get idea-specific metadata with type safety
  const confidence = data.metadata.confidence || 0;
  const priority = data.metadata.priority || 'medium';
  const favorite = data.metadata.favorite || false;
  const status = data.metadata.status || 'draft';

  /**
   * Gets priority color based on priority level
   */
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return theme.palette.error.main;
      case 'medium': return theme.palette.warning.main;
      case 'low': return theme.palette.success.main;
      default: return theme.palette.grey[500];
    }
  };

  /**
   * Gets status color based on status
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return theme.palette.success.main;
      case 'reviewed': return theme.palette.info.main;
      case 'draft': return theme.palette.warning.main;
      default: return theme.palette.grey[500];
    }
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
        '&:hover': {
          transform: 'scale(1.02)',
        },
      }}
    >
      <Card
        elevation={selected ? 8 : 2}
        sx={{
          minWidth: 160,
          maxWidth: 280,
          backgroundColor: theme.palette.success.main,
          color: theme.palette.success.contrastText,
          border: selected ? `2px solid ${theme.palette.warning.main}` : 'none',
          '&:hover': {
            elevation: 4,
            backgroundColor: theme.palette.success.dark,
          },
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {/* Header with icon and actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Lightbulb sx={{ mr: 1, fontSize: 20 }} />
            <Typography
              variant="subtitle2"
              sx={{ 
                flexGrow: 1, 
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {data.label}
            </Typography>
            
            {/* Node actions */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title={favorite ? 'Remove from favorites' : 'Add to favorites'}>
                <IconButton
                  size="small"
                  onClick={handleToggleFavorite}
                  sx={{ 
                    color: favorite ? theme.palette.warning.main : 'inherit',
                    opacity: 0.7,
                    '&:hover': { opacity: 1 }
                  }}
                >
                  {favorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Edit">
                <IconButton
                  size="small"
                  onClick={handleEdit}
                  sx={{ 
                    color: 'inherit',
                    opacity: 0.7,
                    '&:hover': { opacity: 1 }
                  }}
                >
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={handleDelete}
                  sx={{ 
                    color: 'inherit',
                    opacity: 0.7,
                    '&:hover': { opacity: 1, color: theme.palette.error.main }
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Content preview */}
          {data.content && (
            <Typography
              variant="body2"
              sx={{
                mb: 1,
                opacity: 0.8,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {data.content}
            </Typography>
          )}

          {/* Confidence indicator */}
          {confidence > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Confidence: {Math.round(confidence * 100)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={confidence * 100}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.palette.success.dark,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: theme.palette.warning.main,
                  },
                }}
              />
            </Box>
          )}

          {/* Status and priority indicators */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            <Chip
              label={status}
              size="small"
              sx={{
                backgroundColor: getStatusColor(status),
                color: theme.palette.getContrastText(getStatusColor(status)),
                fontSize: '0.7rem',
                height: 20,
              }}
            />
            
            <Chip
              label={priority}
              size="small"
              sx={{
                backgroundColor: getPriorityColor(priority),
                color: theme.palette.getContrastText(getPriorityColor(priority)),
                fontSize: '0.7rem',
                height: 20,
              }}
            />
          </Box>

          {/* Tags */}
          {data.metadata.tags && data.metadata.tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
              {data.metadata.tags.slice(0, 2).map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  sx={{
                    backgroundColor: theme.palette.success.dark,
                    color: theme.palette.success.contrastText,
                    fontSize: '0.7rem',
                    height: 20,
                  }}
                />
              ))}
              {data.metadata.tags.length > 2 && (
                <Chip
                  label={`+${data.metadata.tags.length - 2}`}
                  size="small"
                  sx={{
                    backgroundColor: theme.palette.success.dark,
                    color: theme.palette.success.contrastText,
                    fontSize: '0.7rem',
                    height: 20,
                  }}
                />
              )}
            </Box>
          )}

          {/* AI generated indicator */}
          {data.aiGenerated && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Chip
                label="AI"
                size="small"
                icon={<TrendingUp fontSize="small" />}
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  fontSize: '0.6rem',
                  height: 18,
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          backgroundColor: theme.palette.warning.main,
          border: `2px solid ${theme.palette.background.paper}`,
          width: 8,
          height: 8,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          backgroundColor: theme.palette.warning.main,
          border: `2px solid ${theme.palette.background.paper}`,
          width: 8,
          height: 8,
        }}
      />
      <Handle
        type="source"
        position={Position.Left}
        style={{
          backgroundColor: theme.palette.warning.main,
          border: `2px solid ${theme.palette.background.paper}`,
          width: 8,
          height: 8,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          backgroundColor: theme.palette.warning.main,
          border: `2px solid ${theme.palette.background.paper}`,
          width: 8,
          height: 8,
        }}
      />
    </Box>
  );
});

IdeaNode.displayName = 'IdeaNode';

export default IdeaNode;
