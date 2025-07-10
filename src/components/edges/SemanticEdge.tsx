/**
 * SemanticEdge Component
 * 
 * A custom React Flow edge component for semantic relationships
 * Represents conceptual connections between nodes with weight visualization
 */

import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from 'reactflow';
import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * Data structure for SemanticEdge
 */
interface SemanticEdgeData {
  label?: string;
  weight?: number;
  metadata?: {
    confidence?: number;
    bidirectional?: boolean;
    created?: Date;
    modified?: Date;
  };
  onClick?: () => void;
}

/**
 * Props for SemanticEdge component
 */
interface SemanticEdgeProps extends EdgeProps {
  data?: SemanticEdgeData;
}

/**
 * SemanticEdge - Custom edge component for semantic relationships
 * 
 * Renders a semantic edge with weight-based styling and interactive label
 * Supports bidirectional relationships and confidence scoring
 */
const SemanticEdge: React.FC<SemanticEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  selected,
}) => {
  const theme = useTheme();

  // Calculate bezier path for the edge
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Calculate edge styling based on weight and selection
  const edgeStyle = {
    ...style,
    stroke: selected 
      ? theme.palette.secondary.main 
      : theme.palette.primary.main,
    strokeWidth: Math.max(2, (data?.weight || 1) * 4),
    strokeOpacity: 0.8,
    strokeDasharray: data?.metadata?.bidirectional ? '5,5' : undefined,
  };

  // Handle edge click
  const handleEdgeClick = () => {
    if (data?.onClick) {
      data.onClick();
    }
  };

  /**
   * Gets confidence color based on confidence level
   */
  const getConfidenceColor = (confidence?: number): string => {
    if (!confidence) return theme.palette.grey[500];
    
    if (confidence >= 0.8) return theme.palette.success.main;
    if (confidence >= 0.6) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={edgeStyle}
        interactionWidth={20}
      />
      
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
            cursor: 'pointer',
          }}
          className="nodrag nopan"
          onClick={handleEdgeClick}
        >
          <Chip
            label={data?.label || 'connection'}
            size="small"
            sx={{
              backgroundColor: selected
                ? theme.palette.secondary.main
                : theme.palette.background.paper,
              color: selected
                ? theme.palette.secondary.contrastText
                : theme.palette.text.primary,
              border: `1px solid ${theme.palette.divider}`,
              fontSize: '0.7rem',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          />
          
          {/* Confidence indicator */}
          {data?.metadata?.confidence && (
            <div
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: getConfidenceColor(data?.metadata?.confidence),
                border: `1px solid ${theme.palette.background.paper}`,
              }}
            />
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default SemanticEdge;
