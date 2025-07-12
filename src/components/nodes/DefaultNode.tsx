/**
 * DefaultNode Component
 * 
 * A versatile React Flow node component that handles any node type
 * Provides fallback rendering for unknown node types and maintains
 * consistent visual styling across all node variations
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Circle,
  Edit,
  Delete,
  Visibility,
  AccountTree,
  Description,
  Psychology,
  Lightbulb,
  Topic,
  Category,
  Extension,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

/**
 * Data structure for DefaultNode
 */
interface DefaultNodeData {
  label: string;
  content?: string;
  metadata?: {
    tags?: string[];
    created?: Date;
    modified?: Date;
    [key: string]: any;
  };
  aiGenerated?: boolean;
  type?: string;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * Props for DefaultNode component
 */
interface DefaultNodeProps extends NodeProps {
  data: DefaultNodeData;
}

/**
 * Get appropriate icon for node type
 */
const getNodeIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'concept': return Psychology;
    case 'source': return Description;
    case 'idea': return Lightbulb;
    case 'topic': return Topic;
    case 'technology': return Extension;
    case 'category': return Category;
    case 'tree': return AccountTree;
    default: return Circle;
  }
};

/**
 * Get theme color for node type
 */
const getNodeColor = (type: string, theme: any) => {
  switch (type?.toLowerCase()) {
    case 'concept': return theme.palette.primary.main;
    case 'source': return theme.palette.secondary.main;
    case 'idea': return theme.palette.success.main;
    case 'topic': return theme.palette.info.main;
    case 'technology': return theme.palette.warning.main;
    case 'category': return theme.palette.error.main;
    default: return theme.palette.grey[600];
  }
};

/**
 * DefaultNode - Universal node component for any node type
 * 
 * Provides consistent rendering and interaction for all node types
 * with appropriate visual styling and functional capabilities
 */
const DefaultNode: React.FC<DefaultNodeProps> = memo(({ 
  data, 
  selected, 
  id,
  type = 'default'
}) => {
  const theme = useTheme();
  
  // Get appropriate icon and color for this node type
  const IconComponent = getNodeIcon(data.type || type);
  const nodeColor = getNodeColor(data.type || type, theme);
  const contrastColor = theme.palette.getContrastText(nodeColor);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onClick?.();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onEdit?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onDelete?.();
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('View node details:', { id, type, data });
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
          backgroundColor: nodeColor,
          color: contrastColor,
          border: selected ? `2px solid ${theme.palette.warning.main}` : 'none',
          '&:hover': {
            elevation: 4,
            filter: 'brightness(1.1)',
          },
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {/* Header with icon and actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <IconComponent sx={{ mr: 1, fontSize: 20 }} />
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
              {data.label || 'Untitled Node'}
            </Typography>
            
            {/* Node actions */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="View Details">
                <IconButton
                  size="small"
                  onClick={handleView}
                  sx={{ 
                    color: 'inherit',
                    opacity: 0.7,
                    '&:hover': { opacity: 1 }
                  }}
                >
                  <Visibility fontSize="small" />
                </IconButton>
              </Tooltip>
              
              {data.onEdit && (
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
              )}
              
              {data.onDelete && (
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
              )}
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

          {/* Node type indicator */}
          {(data.type || type) && (data.type !== 'default' && type !== 'default') && (
            <Box sx={{ mb: 1 }}>
              <Chip
                label={data.type || type}
                size="small"
                sx={{
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  fontSize: '0.7rem',
                  height: 20,
                }}
              />
            </Box>
          )}

          {/* Tags */}
          {data.metadata?.tags && data.metadata.tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
              {data.metadata.tags.slice(0, 3).map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: contrastColor,
                    fontSize: '0.7rem',
                    height: 20,
                  }}
                />
              ))}
              {data.metadata.tags.length > 3 && (
                <Chip
                  label={`+${data.metadata.tags.length - 3}`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: contrastColor,
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
                sx={{
                  backgroundColor: theme.palette.warning.main,
                  color: theme.palette.warning.contrastText,
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

DefaultNode.displayName = 'DefaultNode';

export default DefaultNode;
