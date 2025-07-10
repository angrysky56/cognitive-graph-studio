/**
 * AI Panel Component - Right sidebar for AI integration and graph editing
 * Supports Gemini, LM Studio, and Ollama - all free services
 * Provides AI-powered graph analysis, node generation, and intelligent connections
 */

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Chip,
  LinearProgress,
  Alert,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider
} from '@mui/material'
import {
  Send,
  Settings,
  ExpandMore,
  Psychology,
  AutoAwesome,
  Link as LinkIcon
} from '@mui/icons-material'
import useGraphStore from '@/stores/graphStore'
import serviceManager from '@/services/service-manager-enhanced'
import { AIProvider } from '@/types/ai'

interface AIPanelProps {
  servicesReady: boolean
  serviceStatus: Map<string, any>
}

const AIPanel: React.FC<AIPanelProps> = ({ servicesReady, serviceStatus }) => {
  const [prompt, setPrompt] = useState('')
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [activeProvider, setActiveProvider] = useState('gemini')
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastResponse, setLastResponse] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1000)
  const [error, setError] = useState<string | null>(null)

  const {
    nodes,
    selectedNodes,
    addNode,
    addEdge
  } = useGraphStore()

  useEffect(() => {
    // Get providers from service manager when services are ready
    if (servicesReady) {
      const allProviders = serviceManager.getAIProviders()
      setProviders(allProviders)
    }
  }, [servicesReady])

  const handleGenerate = async () => {
    if (!prompt.trim() || !servicesReady) return

    setIsGenerating(true)
    setError(null)

    try {
      const selectedNodeArray = Array.from(selectedNodes).map(id => nodes.get(id)).filter(Boolean)
      const context = selectedNodeArray.length > 0 
        ? `Context from selected nodes: ${selectedNodeArray.map(n => `${n!.label}: ${n!.content}`).join('\n')}`
        : undefined

      const response = await serviceManager.generateAIContent(prompt.trim(), context)
      setLastResponse(response.content)
      
      // Create new node with AI-generated content
      if (response.content) {
        await handleCreateNodeFromAI(response.content)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreateNodeFromAI = async (content: string) => {
    const newNode = {
      id: crypto.randomUUID(),
      label: content.split(' ').slice(0, 3).join(' ') + '...',
      content,
      type: 'idea' as const,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      metadata: {
        created: new Date(),
        modified: new Date(),
        tags: ['ai-generated'],
        color: '#80c7ff'
      },
      connections: [],
      aiGenerated: true
    }

    addNode(newNode)

    // Process node with all available services
    const processingResults = await serviceManager.processNewNode(newNode)
    
    // Connect to selected nodes
    Array.from(selectedNodes).forEach(selectedId => {
      addEdge({
        id: crypto.randomUUID(),
        source: selectedId,
        target: newNode.id,
        type: 'semantic',
        weight: 1.0,
        metadata: {
          created: new Date(),
          confidence: 0.8,
          aiGenerated: true
        }
      })
    })

    // Create connections to related nodes if found
    if (processingResults.relatedNodes) {
      processingResults.relatedNodes.slice(0, 2).forEach(relatedNode => {
        addEdge({
          id: crypto.randomUUID(),
          source: newNode.id,
          target: relatedNode.nodeId,
          type: 'semantic',
          weight: 0.6,
          metadata: {
            created: new Date(),
            confidence: 0.6,
            aiGenerated: true
          }
        })
      })
    }
  }

  const handleExploreNode = async () => {
    if (selectedNodes.size === 0) return

    const selectedNode = nodes.get(Array.from(selectedNodes)[0])
    if (!selectedNode) return

    const explorePrompt = `Expand on this concept and suggest 3-5 related ideas: "${selectedNode.label}" - ${selectedNode.content}`
    setPrompt(explorePrompt)
  }

  const handleConnectNodes = async () => {
    if (selectedNodes.size < 2) return

    const selectedNodeArray = Array.from(selectedNodes).map(id => nodes.get(id)).filter(Boolean)
    const nodeLabels = selectedNodeArray.map(n => n!.label).join(', ')
    
    const connectPrompt = `What single concept connects these ideas: ${nodeLabels}? Provide a brief explanation.`
    setPrompt(connectPrompt)
  }

  const handleProviderChange = (providerName: string) => {
    setActiveProvider(providerName)
    // Note: Service manager handles provider switching internally
  }

  const getProviderStatus = (provider: AIProvider) => {
    switch (provider.status) {
      case 'available':
        return { color: 'success' as const, text: 'Connected' }
      case 'error':
        return { color: 'error' as const, text: 'Offline' }
      case 'loading':
        return { color: 'warning' as const, text: 'Connecting...' }
      default:
        return { color: 'default' as const, text: 'Unknown' }
    }
  }

  const aiServiceStatus = serviceStatus.get('ai')

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      p: 2
    }}>
      {/* Header */}
      <Typography variant="h6" sx={{ mb: 2, color: 'secondary.main' }}>
        AI Assistant
      </Typography>

      {/* Service Status */}
      {!servicesReady && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Initializing AI services...
        </Alert>
      )}

      {aiServiceStatus?.status === 'error' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {aiServiceStatus.message}
        </Alert>
      )}

      {/* Provider Selection */}
      <FormControl fullWidth size="small" sx={{ mb: 2 }} disabled={!servicesReady}>
        <InputLabel>AI Provider</InputLabel>
        <Select
          value={activeProvider}
          label="AI Provider"
          onChange={(e) => handleProviderChange(e.target.value)}
        >
          {providers.map((provider) => (
            <MenuItem key={provider.name} value={provider.name}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Typography sx={{ flexGrow: 1 }}>
                  {provider.displayName}
                </Typography>
                <Chip 
                  size="small" 
                  label={getProviderStatus(provider).text}
                  color={getProviderStatus(provider).color}
                />
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Quick Actions */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Tooltip title="Explore selected node">
          <Button
            size="small"
            variant="outlined"
            startIcon={<Psychology />}
            onClick={handleExploreNode}
            disabled={selectedNodes.size === 0 || !servicesReady}
          >
            Explore
          </Button>
        </Tooltip>
        
        <Tooltip title="Connect selected nodes">
          <Button
            size="small"
            variant="outlined"
            startIcon={<LinkIcon />}
            onClick={handleConnectNodes}
            disabled={selectedNodes.size < 2 || !servicesReady}
          >
            Connect
          </Button>
        </Tooltip>
      </Box>

      {/* Prompt Input */}
      <TextField
        fullWidth
        multiline
        rows={4}
        placeholder="Describe what you want to explore or ask about your knowledge graph..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        sx={{ mb: 2 }}
        disabled={isGenerating || !servicesReady}
      />

      {/* Generate Button */}
      <Button
        fullWidth
        variant="contained"
        startIcon={isGenerating ? null : <Send />}
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim() || !servicesReady}
        sx={{ mb: 2 }}
      >
        {isGenerating ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress sx={{ width: 100 }} />
            Generating...
          </Box>
        ) : (
          'Generate Ideas'
        )}
      </Button>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Settings */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle2">
            <Settings sx={{ mr: 1, verticalAlign: 'middle' }} />
            Generation Settings
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>
              Temperature: {temperature}
            </Typography>
            <Slider
              value={temperature}
              onChange={(_, value) => setTemperature(value as number)}
              min={0}
              max={1}
              step={0.1}
              marks={[
                { value: 0, label: 'Focused' },
                { value: 1, label: 'Creative' }
              ]}
              disabled={!servicesReady}
            />
          </Box>
          
          <Box>
            <Typography gutterBottom>
              Max Tokens: {maxTokens}
            </Typography>
            <Slider
              value={maxTokens}
              onChange={(_, value) => setMaxTokens(value as number)}
              min={100}
              max={2000}
              step={100}
              marks={[
                { value: 100, label: 'Short' },
                { value: 1000, label: 'Medium' },
                { value: 2000, label: 'Long' }
              ]}
              disabled={!servicesReady}
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Last Response */}
      {lastResponse && (
        <Paper sx={{ p: 2, flex: 1, overflow: 'auto' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'secondary.main' }}>
            <AutoAwesome sx={{ mr: 1, verticalAlign: 'middle' }} />
            Last Generated Response
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {lastResponse}
          </Typography>
        </Paper>
      )}
    </Box>
  )
}

export default AIPanel
