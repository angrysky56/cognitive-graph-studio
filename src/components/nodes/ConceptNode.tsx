/**
 * ConceptNode Component
 * 
 * A custom React Flow node component for concept-type nodes
 * Features Material UI theming and interactive capabilities
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
} from '@mui/material';
import {
  Psychology,
  Edit,
  Delete,
  MoreVert,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { EnhancedGraphNode } from '@/types/enhanced-graph';

/**
 * Data structure for ConceptNode
 */
interface ConceptNodeData {
  label: string;
  content: string;
  metadata: EnhancedGraphNode['metadata'];
  aiGenerated: boolean;
  selected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  onUpdate: (updates: Partial<EnhancedGraphNode>) => void;
  onDelete: () => void;
  onClick: () => void;
}

/**
 * Props for ConceptNode component
 */
interface ConceptNodeProps extends NodeProps {
  data: ConceptNodeData;
}

/**
 * ConceptNode - Custom node component for concept-type nodes
 * 
 * Renders a concept node with Material UI styling and interactive capabilities
 * Supports selection, editing, and deletion operations
 */
const ConceptNode: React.FC<ConceptNodeProps> = memo(({ data, selected }) => {
  const theme = useTheme();

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement inline editing or open edit dialog
    console.log('Edit concept node:', data.label);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onDelete();
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
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          border: selected ? `2px solid ${theme.palette.secondary.main}` : 'none',
          '&:hover': {
            elevation: 4,
            backgroundColor: theme.palette.primary.dark,
          },
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {/* Header with icon and actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Psychology sx={{ mr: 1, fontSize: 20 }} />
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

          {/* Tags */}
          {data.metadata.tags && data.metadata.tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
              {data.metadata.tags.slice(0, 3).map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  sx={{
                    backgroundColor: theme.palette.primary.dark,
                    color: theme.palette.primary.contrastText,
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
                    backgroundColor: theme.palette.primary.dark,
                    color: theme.palette.primary.contrastText,
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
                  backgroundColor: theme.palette.secondary.main,
                  color: theme.palette.secondary.contrastText,
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
          backgroundColor: theme.palette.secondary.main,
          border: `2px solid ${theme.palette.background.paper}`,
          width: 8,
          height: 8,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          backgroundColor: theme.palette.secondary.main,
          border: `2px solid ${theme.palette.background.paper}`,
          width: 8,
          height: 8,
        }}
      />
      <Handle
        type="source"
        position={Position.Left}
        style={{
          backgroundColor: theme.palette.secondary.main,
          border: `2px solid ${theme.palette.background.paper}`,
          width: 8,
          height: 8,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          backgroundColor: theme.palette.secondary.main,
          border: `2px solid ${theme.palette.background.paper}`,
          width: 8,
          height: 8,
        }}
      />
    </Box>
  );
});

ConceptNode.displayName = 'ConceptNode';

export default ConceptNode;
