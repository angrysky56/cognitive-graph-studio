/**
 * SourceNode Component
 * 
 * A custom React Flow node component for source-type nodes
 * Represents documents, papers, or other information sources
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
  Description,
  Edit,
  Delete,
  OpenInNew,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { GraphNode } from '@/types/graph';

/**
 * Data structure for SourceNode
 */
interface SourceNodeData {
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
 * Props for SourceNode component
 */
interface SourceNodeProps extends NodeProps {
  data: SourceNodeData;
}

/**
 * SourceNode - Custom node component for source-type nodes
 * 
 * Renders a source node with Material UI styling and interactive capabilities
 * Includes source-specific actions like opening external links
 */
const SourceNode: React.FC<SourceNodeProps> = memo(({ data, selected }) => {
  const theme = useTheme();

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Edit source node:', data.label);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onDelete();
  };

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Extract URL from metadata or content
    const url = data.metadata.url || extractUrlFromContent(data.content);
    if (url) {
      window.open(url, '_blank');
    }
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

  /**
   * Extracts URL from content text
   */
  const extractUrlFromContent = (content: string): string | null => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = content.match(urlRegex);
    return match ? match[0] : null;
  };

  const hasExternalLink = data.metadata.url || extractUrlFromContent(data.content);

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
          backgroundColor: theme.palette.secondary.main,
          color: theme.palette.secondary.contrastText,
          border: selected ? `2px solid ${theme.palette.primary.main}` : 'none',
          '&:hover': {
            elevation: 4,
            backgroundColor: theme.palette.secondary.dark,
          },
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {/* Header with icon and actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Description sx={{ mr: 1, fontSize: 20 }} />
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
              {hasExternalLink && (
                <Tooltip title="Open External Link">
                  <IconButton
                    size="small"
                    onClick={handleOpenExternal}
                    sx={{ 
                      color: 'inherit',
                      opacity: 0.7,
                      '&:hover': { opacity: 1 }
                    }}
                  >
                    <OpenInNew fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              
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

          {/* Source type and metadata */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {data.metadata.sourceType && (
              <Chip
                label={data.metadata.sourceType}
                size="small"
                sx={{
                  backgroundColor: theme.palette.secondary.dark,
                  color: theme.palette.secondary.contrastText,
                  fontSize: '0.7rem',
                  height: 20,
                }}
              />
            )}
            
            {data.metadata.author && (
              <Chip
                label={`by ${data.metadata.author}`}
                size="small"
                sx={{
                  backgroundColor: theme.palette.secondary.dark,
                  color: theme.palette.secondary.contrastText,
                  fontSize: '0.7rem',
                  height: 20,
                }}
              />
            )}
            
            {data.metadata.published && (
              <Chip
                label={new Date(data.metadata.published).getFullYear().toString()}
                size="small"
                sx={{
                  backgroundColor: theme.palette.secondary.dark,
                  color: theme.palette.secondary.contrastText,
                  fontSize: '0.7rem',
                  height: 20,
                }}
              />
            )}
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
                    backgroundColor: theme.palette.secondary.dark,
                    color: theme.palette.secondary.contrastText,
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
                    backgroundColor: theme.palette.secondary.dark,
                    color: theme.palette.secondary.contrastText,
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
          backgroundColor: theme.palette.primary.main,
          border: `2px solid ${theme.palette.background.paper}`,
          width: 8,
          height: 8,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          backgroundColor: theme.palette.primary.main,
          border: `2px solid ${theme.palette.background.paper}`,
          width: 8,
          height: 8,
        }}
      />
      <Handle
        type="source"
        position={Position.Left}
        style={{
          backgroundColor: theme.palette.primary.main,
          border: `2px solid ${theme.palette.background.paper}`,
          width: 8,
          height: 8,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          backgroundColor: theme.palette.primary.main,
          border: `2px solid ${theme.palette.background.paper}`,
          width: 8,
          height: 8,
        }}
      />
    </Box>
  );
});

SourceNode.displayName = 'SourceNode';

export default SourceNode;
