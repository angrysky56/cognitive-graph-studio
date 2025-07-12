/**
 * Main App Component - Cognitive Graph Studio
 * AI-powered knowledge graph visualization with Material UI
 */

import React, { useEffect, useState } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
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
  Settings as SettingsIcon,
  Folder as SavedIcon,
  ChevronLeft,
  ChevronRight,
  Tune as LayoutIcon
} from '@mui/icons-material'
import cognitiveTheme from '@/utils/theme'

// Components
import MyGraphCanvas from '@/components/MyGraphCanvas'
import EnhancedAIPanel from '@/components/EnhancedAIPanel'
import EnhancedDocumentImporter from '@/components/EnhancedDocumentImporter'
import NetworkAnalysis from '@/components/NetworkAnalysis'
import NodeEditorPanel from '@/components/NodeEditorPanel'
import SettingsDialog from '@/components/SimpleSettingsDialog'
import GraphLayoutControls, { LayoutAlgorithm, LayoutDirection } from '@/components/GraphLayoutControls'
import TemporalLibrary from '@/components/TemporalLibrary'

// Services and Stores
import useEnhancedGraphStore from '@/stores/enhancedGraphStore'
import { LLMConfig } from '@/services/ai-service'
import { simpleAIProviderManager } from '@/services/simple-ai-provider-manager'
import { GraphEngineConfig } from '@/core/GraphEngine'
import { SavedGraph } from '@/services/graph-persistence-service'


interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

// TabPanel component for handling tab content visibility and styling
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    sx={{
      height: value === index ? 'calc(100vh - 160px)' : 0,
      overflow: 'auto',
      p: value === index ? 2 : 0
    }}
  >
    {value === index && children}
  </Box>
)

const App: React.FC = () => {
  const leftPanelWidth = 320;
  const rightPanelWidth = 400;

  // Debug: Check if environment variables are loaded
  console.log('🔑 Environment Variables Check:')
  console.log('Gemini API Key:', import.meta.env.VITE_GEMINI_API_KEY ? '✅ Set' : '❌ Missing')
  console.log('OpenAI API Key:', import.meta.env.VITE_OPENAI_API_KEY ? '✅ Set' : '❌ Missing')
  console.log('Anthropic API Key:', import.meta.env.VITE_ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing')

  const [activeTab, setActiveTab] = useState(0)
  const [aiService, setAiService] = useState<any>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [aiConfig, setAiConfig] = useState<LLMConfig | null>(null)

  // Panel collapse state
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)
  const [leftPanelExpanded, setLeftPanelExpanded] = useState(false)
  const [rightPanelExpanded, setRightPanelExpanded] = useState(false)
  const [layoutTrigger, setLayoutTrigger] = useState<{
    algorithm: LayoutAlgorithm;
    direction?: LayoutDirection;
    timestamp: number;
  } | null>(null)

  const {
    nodes,
    edges,
    clusters,
    selectedNodes,
    createNode,
    initializeEngine,
    engine,
    loadGraph
  } = useEnhancedGraphStore()

  // Initialize AI provider manager
  useEffect(() => {
    const config = simpleAIProviderManager.getActiveConfig()
    setAiConfig(config)
    setAiService(simpleAIProviderManager.getAIService())
    
    // Subscribe to provider changes
    const unsubscribe = simpleAIProviderManager.subscribe((newConfig) => {
      setAiConfig(newConfig)
      setAiService(simpleAIProviderManager.getAIService())
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    const initialize = async () => {
      if (!aiConfig) return

      const config: GraphEngineConfig = {
        aiService: {
          providers: [aiConfig],
          defaultProvider: aiConfig.provider
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
          enabled: true,
          algorithm: 'abmcts-a',
          explorationConstant: 1.0,
          maxTime: 30000,
          maxSimulations: 100
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
  }, [aiConfig, initializeEngine, engine])



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
    console.log('AI Config updated:', config)
    // The provider manager will handle the configuration updates
    // through the SettingsDialog's handleSave function
  }

  const handleGraphLoad = (graph: SavedGraph) => {
    if (loadGraph) {
      loadGraph(graph)
      console.log('Graph loaded:', graph.metadata.title)
    }
  }

  const handleBookLoad = (bookId: string) => {
    console.log('Temporal book selected:', bookId)
    // TODO: Implement book loading logic
    // This could open a special "book view" mode or load the most recent graph from the book
  }

  const handleLayoutChange = (algorithm: LayoutAlgorithm, direction?: LayoutDirection) => {
    console.log('Layout change requested:', algorithm, direction)
    setLayoutTrigger({
      algorithm,
      direction,
      timestamp: Date.now()
    })
  }

  const toggleLeftPanel = () => {
    setLeftPanelCollapsed(!leftPanelCollapsed)
    setLeftPanelExpanded(false)
    setRightPanelExpanded(false)
  }

  const toggleRightPanel = () => {
    setRightPanelCollapsed(!rightPanelCollapsed)
    setLeftPanelExpanded(false)
    setRightPanelExpanded(false)
  }

  const expandLeftPanel = () => {
    setLeftPanelExpanded(true)
    setLeftPanelCollapsed(false)
    setRightPanelCollapsed(true)
    setRightPanelExpanded(false)
  }

  const expandRightPanel = () => {
    setRightPanelExpanded(true)
    setRightPanelCollapsed(false)
    setLeftPanelCollapsed(true)
    setLeftPanelExpanded(false)
  }

  const collapseAllPanels = () => {
    setLeftPanelExpanded(false)
    setRightPanelExpanded(false)
    setLeftPanelCollapsed(false)
    setRightPanelCollapsed(false)
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

        {/* Main Content */}
        <Box sx={{ flexGrow: 1, display: 'flex', height: 'calc(100vh - 64px)' }}>

          {/* Left Panel - Collapsible Node Editor */}
          <Box sx={{
            width: leftPanelExpanded ? '100%' :
                   leftPanelCollapsed ? '40px' : leftPanelWidth,
            minWidth: leftPanelCollapsed ? '40px' : '300px',
            maxWidth: leftPanelExpanded ? '100%' :
                      leftPanelCollapsed ? '40px' : '600px',
            transition: 'width 0.3s ease',
            display: 'flex',
            flexDirection: 'row',
            height: '100%'
          }}>
            {leftPanelCollapsed ? (
              <Box sx={{
                width: '40px',
                height: '100%',
                borderRight: 1,
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: 'background.paper'
              }}>
                <Tooltip title="Expand Node Editor" placement="right">
                  <IconButton
                    size="small"
                    onClick={toggleLeftPanel}
                    sx={{ mt: 1, mb: 1 }}
                  >
                    <ChevronRight />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : (
              <Paper sx={{
                width: '100%',
                height: '100%',
                borderRadius: 0,
                borderRight: leftPanelExpanded ? 0 : 1,
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <Box sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Box>
                    <Typography variant="h6">
                      Node Editor
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      AI-Enhanced Editing
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {!leftPanelExpanded && (
                      <Tooltip title="Expand to full width">
                        <IconButton size="small" onClick={expandLeftPanel} sx={{ color: 'inherit' }}>
                          <ChevronRight />
                        </IconButton>
                      </Tooltip>
                    )}
                    {leftPanelExpanded && (
                      <Tooltip title="Restore normal view">
                        <IconButton size="small" onClick={collapseAllPanels} sx={{ color: 'inherit' }}>
                          <ChevronLeft />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Collapse panel">
                      <IconButton size="small" onClick={toggleLeftPanel} sx={{ color: 'inherit' }}>
                        <ChevronLeft />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  <NodeEditorPanel aiService={aiService} />
                </Box>
              </Paper>
            )}
          </Box>

          {/* Graph Canvas - Center/Main Area */}
          {!leftPanelExpanded && !rightPanelExpanded && (
            <Box sx={{ flexGrow: 1, position: 'relative', minWidth: 0, height: '100%' }}>
              <MyGraphCanvas 
                layoutTrigger={layoutTrigger || undefined}
                onNodeClick={(node) => {
                  console.log('Node clicked:', node.label);
                  // Node selection is already handled in the canvas, just prevent any navigation
                }}
              />
            </Box>
          )}

          {/* Right Panel - Collapsible Controls */}
          <Box sx={{
            width: rightPanelExpanded ? '100%' :
                   rightPanelCollapsed ? '40px' : rightPanelWidth,
            minWidth: rightPanelCollapsed ? '40px' : '300px',
            maxWidth: rightPanelExpanded ? '100%' :
                      rightPanelCollapsed ? '40px' : '800px',
            transition: 'width 0.3s ease',
            display: 'flex',
            flexDirection: 'row',
            height: '100%'
          }}>
            {rightPanelCollapsed ? (
              <Box sx={{
                width: '40px',
                height: '100%',
                borderLeft: 1,
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: 'background.paper'
              }}>
                <Tooltip title="Expand Controls Panel" placement="left">
                  <IconButton
                    size="small"
                    onClick={toggleRightPanel}
                    sx={{ mt: 1, mb: 1 }}
                  >
                    <ChevronLeft />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : (
              <Paper sx={{
                width: '100%',
                height: '100%',
                borderRadius: 0,
                borderLeft: rightPanelExpanded ? 0 : 1,
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
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
                    <Tab icon={<LayoutIcon />} label="Layout" iconPosition="start" />
                    <Tab icon={<SavedIcon />} label="Library" iconPosition="start" />
                  </Tabs>

                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pl: 1,
                    pr: 1,
                    py: 0.5,
                    borderBottom: 1,
                    borderColor: 'divider'
                  }}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {!rightPanelExpanded && (
                        <Tooltip title="Expand to full width">
                          <IconButton size="small" onClick={expandRightPanel}>
                            <ChevronLeft />
                          </IconButton>
                        </Tooltip>
                      )}
                      {rightPanelExpanded && (
                        <Tooltip title="Restore normal view">
                          <IconButton size="small" onClick={collapseAllPanels}>
                            <ChevronRight />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                    <Tooltip title="Collapse panel">
                      <IconButton size="small" onClick={toggleRightPanel}>
                        <ChevronRight />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Box sx={{
                  flexGrow: 1,
                  overflow: 'auto'
                }}>
                  <TabPanel value={activeTab} index={0}>
                    {aiConfig && (
                      <EnhancedAIPanel
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
                    <EnhancedDocumentImporter />
                  </TabPanel>

                  <TabPanel value={activeTab} index={2}>
                    <NetworkAnalysis
                      nodes={nodes}
                      edges={edges}
                      clusters={clusters}
                    />
                  </TabPanel>

                  <TabPanel value={activeTab} index={3}>
                    <Box sx={{ p: 2 }}>
                      <GraphLayoutControls
                        onLayoutChange={handleLayoutChange}
                        currentLayout="dagre"
                      />
                    </Box>
                  </TabPanel>

                  <TabPanel value={activeTab} index={4}>
                    <TemporalLibrary
                      onBookLoad={handleBookLoad}
                    />
                  </TabPanel>
                </Box>
              </Paper>
            )}
          </Box>
        </Box>

        {/* Settings Dialog */}
        <SettingsDialog
          open={showSettings}
          onClose={handleSettingsClose}
          onSave={handleSettingsSave}
        />
      </Box>
    </ThemeProvider>
  )
}

export default App