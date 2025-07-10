/**
 * Main App Component - Cognitive Graph Studio
 * AI-powered knowledge graph visualization with Material UI
 */

import React, { useEffect, useState, useCallback } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Alert, 
  Tabs,
  Tab,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  AccountTree as GraphIcon,
  Psychology as AIIcon,
  CloudUpload as ImportIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon
} from '@mui/icons-material'
import cognitiveTheme from '@/utils/theme'

// Components
import MyGraphCanvas from '@/components/MyGraphCanvas'
import AIPanel from '@/components/AIPanel'
import EnhancedDocumentImporter from '@/components/DocumentImporter'
import NetworkAnalysis from '@/components/NetworkAnalysis'
import NodeEditor from '@/components/NodeEditor'
import SettingsDialog from '@/components/SettingsDialog'

// Services and Stores
import useEnhancedGraphStore from '@/stores/enhancedGraphStore'
import { LLMConfig } from '@/services/ai-service'
import { GraphEngineConfig } from '@/core/GraphEngine'


interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    style={{ height: value === index ? 'calc(100vh - 160px)' : 0, overflow: 'auto', padding: value === index ? 16 : 0 }}
  >
    {value === index && children}
  </div>
)

const App: React.FC = () => {
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [rightPanelWidth, setRightPanelWidth] = useState(400);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  const handleMouseDown = (panel: 'left' | 'right') => {
    if (panel === 'left') {
      setIsResizingLeft(true);
    } else {
      setIsResizingRight(true);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizingLeft) {
      setLeftPanelWidth(Math.max(200, Math.min(600, e.clientX)));
    } else if (isResizingRight) {
      setRightPanelWidth(Math.max(300, Math.min(800, window.innerWidth - e.clientX)));
    }
  }, [isResizingLeft, isResizingRight]);

  const handleMouseUp = useCallback(() => {
    setIsResizingLeft(false);
    setIsResizingRight(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  const [activeTab, setActiveTab] = useState(0)
  const [aiConfig, setAiConfig] = useState<LLMConfig | null>(null)
  const [showWelcome, setShowWelcome] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  
  const {
    nodes,
    edges,
    clusters,
    selectedNodes,
    createNode,
    createEdge,
    clearSelection,
    initializeEngine,
    engine
  } = useEnhancedGraphStore()

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

  useEffect(() => {
    const initialize = async () => {
      const config: GraphEngineConfig = {
        aiService: {
          providers: [aiConfig!],
          defaultProvider: 'gemini'
        },
        vectorService: {
          dimensions: 768,
          metric: 'cosine',
          maxVectors: 10000,
          useApproximateSearch: true,
          persistence: {
            enabled: true,
            path: './chroma-data',
            autoSave: true,
            saveInterval: 60
          }
        },
        treeQuest: {
          algorithm: 'standard-mcts',
          maxDepth: 5,
          timeLimit: 30,
          simulations: 100,
          explorationConstant: 1.0,
          llmConfigs: [],
          adaptiveBranching: false,
          confidenceThreshold: 0.5
        },
        visualization: {
          renderer: {
            antialias: true,
            alpha: false,
            shadowMap: true,
            pixelRatio: 1
          },
          camera: {
            fov: 75,
            near: 0.1,
            far: 1000,
            initialPosition: { x: 0, y: 0, z: 100 }
          },
          physics: {
            enabled: false,
            gravity: 0,
            damping: 0.1,
            springStrength: 0.1,
            repulsionStrength: 10
          },
          effects: {
            bloom: false,
            fog: false,
            particles: false,
            animations: false
          },
          performance: {
            maxNodes: 1000,
            lodEnabled: false,
            frustumCulling: false,
            instancedRendering: false
          }
        },
        agents: [],
        behavior: {
          autoDiscovery: true,
          autoLinking: true,
          autoSummarization: true,
          autoCritique: true,
          realTimeUpdates: true,
          maxConcurrentOperations: 5
        },
        performance: {
          maxNodes: 1000,
          maxEdges: 2000,
          cacheSize: 100,
          persistenceEnabled: true
        }
      }
      await initializeEngine(config)
    }

    if (aiConfig && !engine) {
      initialize()
    }
  }, [aiConfig, engine, initializeEngine])

  

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  const handleSettingsOpen = () => {
    setShowSettings(true)
  }

  const handleSettingsClose = () => {
    setShowSettings(false)
  }

  const handleSettingsSave = (config: LLMConfig) => {
    setAiConfig(config)
    console.log('AI Config updated:', config)
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
              Cognitive Graph Studio
            </Typography>
            <Typography variant="body2" sx={{ mr: 2, opacity: 0.8 }}>
              {nodes.size} nodes • {edges.size} connections
            </Typography>
            <Tooltip title="Settings">
              <IconButton color="inherit" onClick={handleSettingsOpen}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        {/* Welcome Message */}
        {showWelcome && (
          <Alert 
            severity="info" 
            onClose={() => setShowWelcome(false)}
            sx={{ borderRadius: 0 }}
          >
            <Typography variant="body2">
              🎯 <strong>Core functionality active!</strong> Interactive graph with node selection, drag, zoom, and editing. 
              Try clicking and dragging nodes, or double-click to edit!
            </Typography>
          </Alert>
        )}

        {/* Main Content */}
        <Box sx={{ flexGrow: 1, display: 'flex', height: 'calc(100vh - 64px)' }}>
          
          {/* Left Panel - Node Editor (when node selected) */}
          {selectedNodes.size === 1 && (
            <Paper sx={{
              width: leftPanelWidth,
              minWidth: '200px',
              maxWidth: '600px',
              borderRadius: 0,
              borderRight: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              resize: 'horizontal',
              overflowX: 'auto'
            }}>
              <Box sx={{ 
                p: 2, 
                borderBottom: 1, 
                borderColor: 'divider',
                backgroundColor: 'primary.main',
                color: 'primary.contrastText'
              }}>
                <Typography variant="h6">
                  Node Editor
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Editing selected node
                </Typography>
              </Box>
              <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                <NodeEditor
                  visible={true}
                  onClose={() => clearSelection()}
                />
              </Box>
            </Paper>
          )}

          {/* Resizer for Left Panel */}
          {selectedNodes.size === 1 && (
            <Box
              sx={{
                width: '8px',
                cursor: 'ew-resize',
                bgcolor: 'divider',
                '&:hover': { bgcolor: 'primary.main' },
                transition: 'background-color 0.2s',
              }}
              onMouseDown={() => handleMouseDown('left')}
            />
          )}

          {/* Graph Canvas - Center/Main Area */}
          <Box sx={{ flexGrow: 1, position: 'relative' }}>
            <MyGraphCanvas />
          </Box>

          {/* Right Panel */}
          <Paper sx={{
            width: rightPanelWidth,
            minWidth: '300px',
            maxWidth: '800px',
            borderRadius: 0,
            borderLeft: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            resize: 'horizontal',
            overflowX: 'auto'
          }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                flexShrink: 0
              }}
            >
              <Tab icon={<AIIcon />} label="AI Assistant" iconPosition="start" />
              <Tab icon={<ImportIcon />} label="Import" iconPosition="start" />
              <Tab icon={<AnalyticsIcon />} label="Analysis" iconPosition="start" />
            </Tabs>

            <Box sx={{ 
              flexGrow: 1, 
              overflow: 'auto',
            }}>
              <TabPanel value={activeTab} index={0}>
                {aiConfig && (
                  <AIPanel
                    nodes={nodes}
                    edges={edges}
                    clusters={clusters}
                    selectedNodes={selectedNodes}
                    onNodeCreate={createNode}
                    aiConfig={aiConfig}
                  />
                )}
              </TabPanel>

              <TabPanel value={activeTab} index={1}>
                <EnhancedDocumentImporter
                  onNodesCreated={(newNodes) => newNodes.forEach(createNode)}
                  onEdgesCreated={(newEdges) => newEdges.forEach(createEdge)}
                  onImportComplete={(result) => {
                    console.log('Import completed:', result)
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
            </Box>
          </Paper>

          {/* Resizer for Right Panel */}
          <Box
            sx={{
              width: '8px',
              cursor: 'ew-resize',
              bgcolor: 'divider',
              '&:hover': { bgcolor: 'primary.main' },
              transition: 'background-color 0.2s',
            }}
            onMouseDown={() => handleMouseDown('right')}
          />
        </Box>

        {/* Settings Dialog */}
        <SettingsDialog
          open={showSettings}
          onClose={handleSettingsClose}
          onSave={handleSettingsSave}
          currentConfig={aiConfig || undefined}
        />
      </Box>
    </ThemeProvider>
  )
}

export default App
