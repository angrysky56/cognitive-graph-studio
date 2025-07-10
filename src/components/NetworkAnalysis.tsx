/**
 * Network Analysis Component - Fixed Imports
 * 
 * Provides graph metrics, statistics, and insights about the knowledge graph structure.
 * Inspired by InfraNodus network analysis capabilities.
 * 
 * @module NetworkAnalysis
 */

import React, { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Tooltip,
  IconButton
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  AccountTree as AccountTreeIcon,
  Insights as InsightsIcon
} from '@mui/icons-material'
import { EnhancedGraphNode, EnhancedGraphEdge, EnhancedGraphCluster } from '@/types/enhanced-graph'
import Graph from 'graphology'
import betweennessCentrality from 'graphology-metrics/centrality/betweenness'
import { degreeCentrality } from 'graphology-metrics/centrality/degree'
import { density } from 'graphology-metrics/graph/density'
import modularity from 'graphology-metrics/graph/modularity'

interface NetworkAnalysisProps {
  nodes: Map<string, EnhancedGraphNode>
  edges: Map<string, EnhancedGraphEdge>
  clusters: Map<string, EnhancedGraphCluster>
}

const NetworkAnalysis: React.FC<NetworkAnalysisProps> = ({ nodes, edges, clusters }) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview'])

  const metrics = useMemo(() => {
    return calculateNetworkMetrics(nodes, edges, clusters)
  }, [nodes, edges, clusters])

  const handleSectionToggle = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const renderMetricCard = (title: string, value: string | number, subtitle?: string, icon?: React.ReactNode) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" component="div" color="primary">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
            <Typography variant="h6" gutterBottom>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box sx={{ color: 'primary.main', opacity: 0.7 }}>
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  )

  const renderCentralityList = (items: Array<{ id: string; label: string; score?: number; connections?: number; betweenness?: number }>, title: string) => (
    <List dense>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      {items.slice(0, 5).map((item, index) => (
        <ListItem key={item.id} sx={{ py: 0.5 }}>
          <ListItemText
            primary={item.label}
            secondary={
              item.score !== undefined ? `Score: ${item.score.toFixed(3)}` :
              item.connections !== undefined ? `${item.connections} connections` :
              item.betweenness !== undefined ? `Betweenness: ${item.betweenness.toFixed(3)}` : ''
            }
          />
          <Chip 
            label={`#${index + 1}`} 
            size="small" 
            color={index < 3 ? 'primary' : 'default'}
          />
        </ListItem>
      ))}
    </List>
  )

  const renderTypeDistribution = (types: Array<{ type: string; count: number; percentage: number }>) => (
    <Box>
      {types.map(({ type, count, percentage }) => (
        <Box key={type} sx={{ mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
              {type}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {count} ({percentage.toFixed(1)}%)
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={percentage} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      ))}
    </Box>
  )

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <InsightsIcon />
        Network Analysis
      </Typography>

      {/* Overview Metrics */}
      <Accordion 
        expanded={expandedSections.includes('overview')}
        onChange={() => handleSectionToggle('overview')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Overview Metrics</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              {renderMetricCard(
                'Nodes',
                metrics.basic.nodeCount,
                'Total concepts',
                <AccountTreeIcon />
              )}
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              {renderMetricCard(
                'Connections',
                metrics.basic.edgeCount,
                'Total relationships'
              )}
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              {renderMetricCard(
                'Density',
                `${(metrics.basic.density * 100).toFixed(1)}%`,
                'How connected the graph is'
              )}
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              {renderMetricCard(
                'Avg. Degree',
                metrics.basic.averageDegree.toFixed(1),
                'Connections per node'
              )}
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Centrality Analysis */}
      <Accordion 
        expanded={expandedSections.includes('centrality')}
        onChange={() => handleSectionToggle('centrality')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">
            Central Concepts
            <Tooltip title="Nodes that are most important to the network structure">
              <IconButton size="small">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              {renderCentralityList(metrics.centrality.mostConnected, 'Most Connected')}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderCentralityList(metrics.centrality.bridgeNodes, 'Bridge Nodes')}
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Structure Analysis */}
      <Accordion 
        expanded={expandedSections.includes('structure')}
        onChange={() => handleSectionToggle('structure')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Graph Structure</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Structural Metrics
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Modularity Score
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {metrics.structure.modularity.toFixed(3)}
                    </Typography>
                    <Typography variant="caption">
                      {metrics.structure.modularity > 0.3 ? 'Well-clustered' : 'Needs better organization'}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Connected Components
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {metrics.structure.components}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              {metrics.structure.isolatedNodes.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="warning.main">
                      Isolated Nodes ({metrics.structure.isolatedNodes.length})
                    </Typography>
                    <List dense>
                      {metrics.structure.isolatedNodes.slice(0, 5).map(node => (
                        <ListItem key={node.id} sx={{ py: 0.5 }}>
                          <ListItemText primary={node.label} />
                        </ListItem>
                      ))}
                      {metrics.structure.isolatedNodes.length > 5 && (
                        <Typography variant="caption" color="text.secondary">
                          ... and {metrics.structure.isolatedNodes.length - 5} more
                        </Typography>
                      )}
                    </List>
                  </CardContent>
                </Card>
              )}
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Topic Analysis */}
      <Accordion 
        expanded={expandedSections.includes('topics')}
        onChange={() => handleSectionToggle('topics')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Topic Distribution</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Node Types
              </Typography>
              {renderTypeDistribution(metrics.topics.dominantTypes)}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Recent Activity
              </Typography>
              <List dense>
                {metrics.topics.recentActivity.map((item, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={item.label}
                      secondary={`${item.type} • ${item.date}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Tag Analysis */}
      {metrics.topics.tagDistribution.length > 0 && (
        <Accordion 
          expanded={expandedSections.includes('tags')}
          onChange={() => handleSectionToggle('tags')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Popular Tags</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {metrics.topics.tagDistribution.slice(0, 20).map(({ tag, count }) => (
                <Chip
                  key={tag}
                  label={`${tag} (${count})`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  )
}

/**
 * Calculate comprehensive network metrics
 */
interface NetworkMetrics {
  basic: {
    nodeCount: number;
    edgeCount: number;
    clusterCount: number;
    density: number;
    averageDegree: number;
  };
  centrality: {
    mostCentral: Array<{ id: string; label: string; score: number }>;
    mostConnected: Array<{ id: string; label: string; connections: number }>;
    bridgeNodes: Array<{ id: string; label: string; betweenness: number }>;
  };
  structure: {
    modularity: number;
    isolatedNodes: Array<{ id: string; label: string }>;
    components: number;
    longestPath: number;
  };
  topics: {
    dominantTypes: Array<{ type: string; count: number; percentage: number }>;
    recentActivity: Array<{ label: string; type: string; date: string }>;
    tagDistribution: Array<{ tag: string; count: number }>;
  };
}

function calculateNetworkMetrics(
  nodes: Map<string, EnhancedGraphNode>,
  edges: Map<string, EnhancedGraphEdge>,
  clusters: Map<string, EnhancedGraphCluster>
): NetworkMetrics {
  const nodeArray = Array.from(nodes.values())
  const edgeArray = Array.from(edges.values())
  
  // Create graphology instance for advanced metrics
  const graph = new Graph({ type: 'undirected', allowSelfLoops: false })
  
  // Add nodes and edges to graph
  nodeArray.forEach(node => {
    graph.addNode(node.id, { label: node.label, type: node.type })
  })
  
  edgeArray.forEach(edge => {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      try {
        graph.addEdge(edge.source, edge.target, { weight: edge.weight })
      } catch (e) {
        // Edge might already exist, ignore
      }
    }
  })

  // Basic metrics
  const basic = {
    nodeCount: nodeArray.length,
    edgeCount: edgeArray.length,
    clusterCount: clusters.size,
    density: graph.order > 1 ? density(graph) : 0,
    averageDegree: graph.order > 0 ? (2 * graph.size) / graph.order : 0
  }

  // Centrality metrics
  const betweenness = graph.order > 2 ? betweennessCentrality(graph) : {}
  const degreeScores = graph.order > 0 ? degreeCentrality(graph) : {}
  
  const centralityData = nodeArray.map(node => ({
    id: node.id,
    label: node.label,
    betweenness: betweenness[node.id] || 0,
    degree: degreeScores[node.id] || 0,
    connections: graph.hasNode(node.id) ? graph.degree(node.id) : 0
  }))

  const centrality = {
    mostCentral: centralityData
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 10)
      .map(item => ({ id: item.id, label: item.label, score: item.degree })),
    
    mostConnected: centralityData
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 10)
      .map(item => ({ id: item.id, label: item.label, connections: item.connections })),
    
    bridgeNodes: centralityData
      .filter(item => item.betweenness > 0)
      .sort((a, b) => b.betweenness - a.betweenness)
      .slice(0, 10)
      .map(item => ({ id: item.id, label: item.label, betweenness: item.betweenness }))
  }

  // Structure metrics
  const isolatedNodes = nodeArray.filter(node => 
    graph.hasNode(node.id) && graph.degree(node.id) === 0
  )
  
  const structure = {
    modularity: graph.order > 1 ? (modularity(graph) || 0) : 0,
    isolatedNodes: isolatedNodes.map(node => ({ id: node.id, label: node.label })),
    components: graph.order > 0 ? countConnectedComponents(graph) : 0,
    longestPath: 0 // Could implement shortest path algorithms
  }

  // Topic analysis
  const typeCounts = nodeArray.reduce((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalNodes = nodeArray.length || 1

  const topics = {
    dominantTypes: Object.entries(typeCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / totalNodes) * 100
      }))
      .sort((a, b) => b.count - a.count),
    
    recentActivity: nodeArray
      .sort((a, b) => new Date(b.metadata.modified).getTime() - new Date(a.metadata.modified).getTime())
      .slice(0, 5)
      .map(node => ({
        label: node.label,
        type: node.type,
        date: formatDate(node.metadata.modified)
      })),
    
    tagDistribution: getTagDistribution(nodeArray)
  }

  return { basic, centrality, structure, topics }
}

/**
 * Count connected components in graph
 */
function countConnectedComponents(graph: Graph): number {
  const visited = new Set<string>()
  let components = 0

  graph.forEachNode(node => {
    if (!visited.has(node)) {
      components++
      // DFS to mark all connected nodes
      const stack = [node]
      while (stack.length > 0) {
        const current = stack.pop()!
        if (!visited.has(current)) {
          visited.add(current)
          graph.forEachNeighbor(current, neighbor => {
            if (!visited.has(neighbor)) {
              stack.push(neighbor)
            }
          })
        }
      }
    }
  })

  return components
}

/**
 * Get tag distribution from nodes
 */
function getTagDistribution(nodes: EnhancedGraphNode[]): Array<{ tag: string; count: number }> {
  const tagCounts = nodes.reduce((acc, node) => {
    node.metadata.tags.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)

  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  
  return date.toLocaleDateString()
}

export default NetworkAnalysis
