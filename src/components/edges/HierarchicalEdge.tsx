/**
 * HierarchicalEdge Component
 * 
 * A custom React Flow edge component for hierarchical relationships
 * Represents parent-child or containment relationships with directional styling
 */

import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getStraightPath,
} from 'reactflow';
import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * Data structure for HierarchicalEdge
 */
interface HierarchicalEdgeData {
  label: string;
  weight: number;
  metadata?: {
    hierarchy?: 'parent' | 'child' | 'sibling';
    depth?: number;
    created?: Date;
    modified?: Date;
  };
  onClick?: () => void;
}

/**
 * Props for HierarchicalEdge component
 */
interface HierarchicalEdgeProps extends EdgeProps {
  data?: HierarchicalEdgeData;
}

/**
 * HierarchicalEdge - Custom edge component for hierarchical relationships
 * 
 * Renders a hierarchical edge with directional styling and depth indication
 * Uses straight paths for cleaner hierarchical visualization
 */
const HierarchicalEdge: React.FC<HierarchicalEdgeProps> = ({
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

  // Calculate straight path for hierarchical connections
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  // Calculate edge styling based on hierarchy and selection
  const edgeStyle = {
    ...style,
    stroke: selected 
      ? theme.palette.warning.main 
      : theme.palette.info.main,
    strokeWidth: Math.max(3, (data?.weight || 1) * 3),
    strokeOpacity: 0.9,
    strokeDasharray: undefined, // Always solid for hierarchy
  };

  // Handle edge click
  const handleEdgeClick = () => {
    if (data?.onClick) {
      data.onClick();
    }
  };

  /**
   * Gets hierarchy color based on hierarchy type
   */
  const getHierarchyColor = (hierarchy?: string): string => {
    switch (hierarchy) {
      case 'parent': return theme.palette.info.main;
      case 'child': return theme.palette.success.main;
      case 'sibling': return theme.palette.warning.main;
      default: return theme.palette.grey[500];
    }
  };

  /**
   * Gets hierarchy icon based on hierarchy type
   */
  const getHierarchyIcon = (hierarchy?: string): string => {
    switch (hierarchy) {
      case 'parent': return '↑';
      case 'child': return '↓';
      case 'sibling': return '↔';
      default: return '→';
    }
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
            label={
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{getHierarchyIcon(data?.metadata?.hierarchy)}</span>
                <span>{data?.label || 'hierarchy'}</span>
                {data?.metadata?.depth && (
                  <span style={{ 
                    fontSize: '0.6rem', 
                    opacity: 0.7,
                    marginLeft: 4
                  }}>
                    L{data?.metadata?.depth}
                  </span>
                )}
              </div>
            }
            size="small"
            sx={{
              backgroundColor: selected
                ? theme.palette.warning.main
                : theme.palette.background.paper,
              color: selected
                ? theme.palette.warning.contrastText
                : theme.palette.text.primary,
              border: `2px solid ${getHierarchyColor(data?.metadata?.hierarchy)}`,
              fontSize: '0.7rem',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
                transform: 'scale(1.05)',
              },
            }}
          />
          
          {/* Hierarchy type indicator */}
          {data?.metadata?.hierarchy && (
            <div
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: getHierarchyColor(data?.metadata?.hierarchy),
                border: `2px solid ${theme.palette.background.paper}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.6rem',
                color: theme.palette.getContrastText(
                  getHierarchyColor(data?.metadata?.hierarchy || '')
                ),
              }}
            >
              {getHierarchyIcon(data?.metadata?.hierarchy)}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default HierarchicalEdge;
