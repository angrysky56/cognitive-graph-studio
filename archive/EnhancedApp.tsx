/**
 * Enhanced App Component - Integrating All Improvements
 * 
 * Demonstrates the solution to all major issues identified:
 * 1. ✅ AI can now read existing graph state
 * 2. ✅ Semantic document processing (no more "brain inspired 1")
 * 3. ✅ Network analysis and graph metrics
 * 4. ✅ Enhanced node interaction and AI suggestions
 * 5. ✅ Modern text processing with NLP
 * 
 * @module EnhancedApp
 */

import React, { useEffect, useState, useCallback } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Alert, 
  Grid,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Badge,
  Tooltip
} from '@mui/material'
import {
  AccountTree as GraphIcon,
  Psychology as AIIcon,
  Analytics as AnalyticsIcon,
  CloudUpload as ImportIcon,
  Lightbulb as SuggestionsIcon,
  Settings as SettingsIcon
} from '@mui/icons-material'
import cognitiveTheme from '@/utils/theme'

// Enhanced Components
import GraphCanvasEnhanced from '@/components/GraphCanvasEnhanced'
import EnhancedAIPanel from '@/components/EnhancedAIPanel'
import EnhancedDocumentImporter from '@/components/EnhancedDocumentImporter'
import EnhancedConnectionSuggestions from '@/components/EnhancedConnectionSuggestions'
import NetworkAnalysis from '@/components/NetworkAnalysis'
import NodeEditor from '@/components/NodeEditor'

// Services and Stores
import useGraphStore from '@/stores/graphStore'
import { GraphAwareAIService } from '@/services/graph-aware-ai-service'
import { LLMConfig } from '@/services/ai-service'
import { GraphNode, GraphEdge } from '@/types/graph'
import { v4 as uuidv4 } from 'uuid'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`enhanced-tabpanel-${index}`}
    aria-labelledby={`enhanced-tab-${index}`}
    {...other}
  >
    {value === index && (
      <Box sx={{ p: 2, height: 'calc(100vh - 160px)', overflow: 'auto' }}>
        {children}
      </Box>
    )}
  </div>
)

const EnhancedApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0)
  const [aiConfig, setAiConfig] = useState<LLMConfig | null>(null)
  const [connectionSuggestions, setConnectionSuggestions] = useState<number>(0)
  const [showWelcome, setShowWelcome] = useState(true)
  
  // Graph store integration
  const {
    nodes,
    edges,
    clusters,
    selectedNodes,
    addNode,
    addEdge,
    updateNode,
    selectNode,
    clearSelection
  } = useGraphStore()

  // Initialize AI configuration from environment
  useEffect(() => {
    const config: LLMConfig = {
      provider: 'gemini',
      apiKey: import.meta.env.VITE_GEMINI_API_KEY,
      model: 'gemini-1.5-flash',
      temperature: 0.7,
      maxTokens: 1000
    }
    setAiConfig(config)
  }, [])

  // Demo data for first-time users
  useEffect(() => {
    if (nodes.size === 0 && showWelcome) {
      initializeDemoGraph()
    }
  }, [nodes.size, showWelcome])

  const initializeDemoGraph = () => {
    const demoNodes: GraphNode[] = [
      {
        id: 'ai-1',
        label: 'Artificial Intelligence',
        content: 'The simulation of human intelligence in machines that are programmed to think and learn.',
        type: 'concept',
        position: { x: 400, y: 200 },
        metadata: {
          created: new Date(),
          modified: new Date(),
          tags: ['technology', 'computing', 'intelligence'],
          color: '#2196F3'
        },
        connections: [],
        aiGenerated: false
      },
      {
        id: 'ml-1',
        label: 'Machine Learning',
        content: 'A subset of AI that enables machines to learn and improve from experience without being explicitly programmed.',
        type: 'concept',
        position: { x: 600, y: 300 },
        metadata: {
          created: new Date(),
          modified: new Date(),
          tags: ['technology', 'learning', 'algorithms'],
          color: '#4CAF50'
        },
        connections: [],
        aiGenerated: false
      },
      {
        id: 'nn-1',
        label: 'Neural Networks',
        content: 'Computing systems inspired by biological neural networks that process information using a connectionist approach.',
        type: 'concept',
        position: { x: 200, y: 300 },
        metadata: {
          created: new Date(),
          modified: new Date(),
          tags: ['technology', 'networks', 'biology'],
          color: '#FF9800'
        },
        connections: [],
        aiGenerated: false
      }
    ]

    const demoEdges: GraphEdge[] = [
      {
        id: 'edge-1',
        source: 'ai-1',
        target: 'ml-1',
        type: 'hierarchical',
        weight: 0.8,
        label: 'includes',
        metadata: {
          created: new Date(),
          confidence: 0.9,
          aiGenerated: false
        }
      },
      {
        id: 'edge-2',
        source: 'ml-1',
        target: 'nn-1',
        type: 'semantic',
        weight: 0.7,
        label: 'uses',
        metadata: {
          created: new Date(),
          confidence: 0.8,
          aiGenerated: false
        }
      }
    ]

    demoNodes.forEach(node => addNode(node))
    demoEdges.forEach(edge => addEdge(edge))
  }

  const handleNodeCreate = useCallback((nodeData: Partial<GraphNode>) => {
    const newNode: GraphNode = {
      id: uuidv4(),
      label: nodeData.label || 'New Node',
      content: nodeData.content || '',
      type: nodeData.type || 'concept',
      position: nodeData.position || { x: Math.random() * 800, y: Math.random() * 600 },
      metadata: {
        created: new Date(),
        modified: new Date(),
        tags: nodeData.metadata?.tags || [],
        ...nodeData.metadata
      },
      connections: [],
      aiGenerated: nodeData.aiGenerated || false
    }
    
    addNode(newNode)
  }, [addNode])

  const handleEdgeCreate = useCallback((edgeData: Partial<GraphEdge>) => {
    const newEdge: GraphEdge = {
      id: uuidv4(),
      source: edgeData.source!,
      target: edgeData.target!,
      type: edgeData.type || 'semantic',
      weight: edgeData.weight || 0.5,
      label: edgeData.label,
      metadata: {
        created: new Date(),
        confidence: edgeData.metadata?.confidence || 0.7,
        aiGenerated: edgeData.metadata?.aiGenerated || false
      }
    }
    
    addEdge(newEdge)
  }, [addEdge])

  const handleConnectionSuggest = useCallback((suggestions: any[]) => {
    setConnectionSuggestions(suggestions.length)
    // Auto-switch to suggestions tab if there are new suggestions
    if (suggestions.length > 0 && activeTab !== 4) {
      // Don't auto-switch, just update badge
    }
  }, [activeTab])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
    if (newValue === 4) {
      setConnectionSuggestions(0) // Clear badge when viewing suggestions
    }
  }

  const handleDismissWelcome = () => {
    setShowWelcome(false)
  }

  return (
    <ThemeProvider theme={cognitiveTheme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <AppBar position="static" elevation={1}>
          <Toolbar>
            <GraphIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Cognitive Graph Studio - Enhanced
            </Typography>
            <Typography variant="body2" sx={{ mr: 2, opacity: 0.8 }}>
              {nodes.size} nodes • {edges.size} connections
            </Typography>
            <Tooltip title="Settings">
              <IconButton color="inherit">
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        {/* Welcome Message */}
        {showWelcome && (
          <Alert 
            severity="success" 
            onClose={handleDismissWelcome}
            sx={{ borderRadius: 0 }}
          >
            <Typography variant="body2">
              🎉 <strong>Enhanced Version Active!</strong> AI can now read your graph, process documents semantically, 
              and provide intelligent suggestions. Try uploading a document or asking the AI about your graph!
            </Typography>
          </Alert>
        )}

        {/* Main Content */}
        <Box sx={{ flexGrow: 1, display: 'flex' }}>
          
          {/* Graph Canvas - Left Side */}
          <Box sx={{ flexGrow: 1, position: 'relative' }}>
            <GraphCanvasEnhanced />
            
            {/* Selected Node Editor Overlay */}
            {selectedNodes.size === 1 && (
              <Paper
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  width: 320,
                  maxHeight: 400,
                  overflow: 'auto',
                  zIndex: 10
                }}
              >
                <NodeEditor
                  nodeId={Array.from(selectedNodes)[0]}
                  onNodeUpdate={(id, updates) => updateNode(id, updates)}
                  onClose={() => clearSelection()}
                />
              </Paper>
            )}
          </Box>

          {/* Right Panel */}
          <Paper sx={{ width: 400, borderRadius: 0 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab 
                icon={<AIIcon />} 
                label="AI Assistant" 
                iconPosition="start"
              />
              <Tab 
                icon={<ImportIcon />} 
                label="Import" 
                iconPosition="start"
              />
              <Tab 
                icon={<AnalyticsIcon />} 
                label="Analysis" 
                iconPosition="start"
              />
              <Tab 
                icon={
                  <Badge badgeContent={connectionSuggestions} color="error">
                    <SuggestionsIcon />
                  </Badge>
                } 
                label="Suggestions" 
                iconPosition="start"
              />
            </Tabs>

            <TabPanel value={activeTab} index={0}>
              {aiConfig && (
                <EnhancedAIPanel
                  nodes={nodes}
                  edges={edges}
                  clusters={clusters}
                  selectedNodes={selectedNodes}
                  onNodeCreate={handleNodeCreate}
                  onConnectionSuggest={handleConnectionSuggest}
                  aiConfig={aiConfig}
                />
              )}
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <EnhancedDocumentImporter
                onNodesCreated={(newNodes) => newNodes.forEach(addNode)}
                onEdgesCreated={(newEdges) => newEdges.forEach(addEdge)}
                onImportComplete={(result) => {
                  console.log('Import completed:', result)
                  // Could trigger AI analysis here
                }}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <NetworkAnalysis
                nodes={nodes}
                edges={edges}
                clusters={clusters}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={3}>
              {aiConfig && (
                <EnhancedConnectionSuggestions
                  nodes={nodes}
                  edges={edges}
                  selectedNodes={selectedNodes}
                  onConnectionCreate={handleEdgeCreate}
                  onSuggestionDismiss={(id) => console.log('Dismissed:', id)}
                  aiConfig={aiConfig}
                  autoRefresh={true}
                />
              )}
            </TabPanel>
          </Paper>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

export default EnhancedApp
