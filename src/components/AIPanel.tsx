/**
 * Enhanced AI Panel with Graph Context Awareness
 *
 * Demonstrates the solution to the critical issue where AI couldn't read
 * existing graph state. Now includes graph context in AI interactions.
 *
 * @module EnhancedAIPanel
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Switch,
  FormControlLabel,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  IconButton,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Tooltip,
  Divider
} from '@mui/material'
import {
  Send as SendIcon,
  Psychology as PsychologyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ExpandMore as ExpandMoreIcon,
  Analytics as AnalyticsIcon,
  Link as LinkIcon,
  Lightbulb as LightbulbIcon,
  AutoFixHigh as AutoFixHighIcon
} from '@mui/icons-material'
import { EnhancedGraphNode, EnhancedGraphEdge, EnhancedGraphCluster } from '@/types/enhanced-graph'
import { GraphAwareAIService } from '@/services/graph-aware-ai-service'
import { LLMConfig } from '@/services/ai-service'

interface AIPanelProps {
  nodes: Map<string, EnhancedGraphNode>
  edges: Map<string, EnhancedGraphEdge>
  clusters: Map<string, EnhancedGraphCluster>
  selectedNodes?: Set<string>
  onNodeCreate?: (node: Partial<EnhancedGraphNode>) => void
  aiConfig?: LLMConfig
}

interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  graphContext?: boolean
  suggestions?: {
    nodes?: Array<{ label: string; type: string; content: string }>
    connections?: Array<{ source: string; target: string; type: string; reasoning: string }>
  }
}

const AIPanel: React.FC<AIPanelProps> = ({
  nodes,
  edges,
  clusters,
  selectedNodes = new Set(),
  onNodeCreate,
  aiConfig
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'system',
      content: '🧠 **Graph-Aware AI Assistant Ready!**\n\nI can now see and understand your knowledge graph! Try asking me:\n• "Analyze my current graph"\n• "What connections am I missing?"\n• "Summarize my knowledge structure"\n• "Suggest new nodes related to [topic]"',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [includeGraphContext, setIncludeGraphContext] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [graphAwareAI] = useState(() => {
    const ai = new GraphAwareAIService(aiConfig ? [aiConfig] : [])
    return ai
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Update AI with current graph context
  useEffect(() => {
    graphAwareAI.updateGraphContext(nodes, edges, clusters)
  }, [nodes, edges, clusters, graphAwareAI])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Determine if this is a special command
      const lowerInput = input.toLowerCase()
      let response

      if (lowerInput.includes('analyze') && (lowerInput.includes('graph') || lowerInput.includes('network'))) {
        // Graph analysis request
        const analysis = await graphAwareAI.analyzeGraph('detailed')
        response = {
          content: analysis.response.content,
          suggestions: {
            nodes: analysis.suggestions.newNodes,
            connections: analysis.suggestions.newConnections
          }
        }
      } else if (lowerInput.includes('connection') && lowerInput.includes('suggest')) {
        // Connection suggestion request
        const connections = await graphAwareAI.suggestConnections()
        response = {
          content: `I found ${connections.length} potential connections based on semantic similarity:\n\n${connections.map(conn => `• **${conn.source}** → **${conn.target}** (${conn.type})\n  ${conn.reasoning}`).join('\n\n')}`,
          suggestions: { connections: connections.map(c => ({ ...c, source: c.source, target: c.target })) }
        }
      } else if (lowerInput.includes('find') || lowerInput.includes('search')) {
        // Search for relevant nodes
        const query = input.replace(/find|search|for/gi, '').trim()
        const relevantNodes = await graphAwareAI.findRelevantNodes(query)
        response = {
          content: `Found ${relevantNodes.length} nodes relevant to "${query}":\n\n${relevantNodes.map(result => `• **${result.node.label}** (${result.node.type})\n  Relevance: ${(result.relevanceScore * 100).toFixed(1)}% - ${result.reasoning}`).join('\n\n')}`
        }
      } else {
        // General conversation with graph context
        const aiResponse = await graphAwareAI.generateTextWithContext({
          prompt: input,
          includeGraphContext,
          focusNodes: Array.from(selectedNodes),
          maxTokens: 1000
        })
        response = { content: aiResponse.content }
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.content,
        timestamp: new Date(),
        graphContext: includeGraphContext,
        suggestions: response.suggestions
      }

      setMessages(prev => [...prev, assistantMessage])

      // Handle suggestions
      

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: 'system',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = async (action: string) => {
    setInput(action)
    // Small delay to show the input, then send
    setTimeout(() => handleSendMessage(), 100)
  }

  const renderMessage = (message: ChatMessage) => {
    return (
    <ListItem key={message.id} sx={{ flexDirection: 'column', alignItems: 'stretch', py: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
          {message.type === 'user' ? '👤' : message.type === 'assistant' ? '🤖' : 'ℹ️'}
        </ListItemIcon>
        <Typography variant="caption" color="text.secondary">
          {message.timestamp.toLocaleTimeString()}
          {message.graphContext && (
            <Chip
              label="Graph Context"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ ml: 1, height: 20 }}
            />
          )}
        </Typography>
      </Box>

      <Box sx={{
        bgcolor: message.type === 'user' ? 'primary.light' :
                message.type === 'assistant' ? 'background.paper' : 'info.light',
        color: message.type === 'user' ? 'primary.contrastText' : 'text.primary',
        p: 2,
        borderRadius: 2,
        whiteSpace: 'pre-wrap',
        border: 1,
        borderColor: 'divider'
      }}>
        <Typography variant="body2" component="div">
          {message.content}
        </Typography>
      </Box>

      {/* Render suggestions */}
      {message.suggestions && showSuggestions && (
        <Box sx={{ mt: 2 }}>
          {message.suggestions.nodes && message.suggestions.nodes.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">
                  <LightbulbIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Suggested Nodes ({message.suggestions.nodes.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {message.suggestions.nodes.map((node, index) => (
                  <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {node.label} ({node.type})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {node.content}
                    </Typography>
                    {onNodeCreate && (
                      <Button
                        size="small"
                        onClick={() => onNodeCreate({
                          label: node.label,
                          type: node.type as any,
                          richContent: {
                            markdown: node.content || '',
                            keyTerms: [],
                            relatedConcepts: [],
                            sources: [],
                            attachments: []
                          },
                          aiMetadata: { confidenceScore: 0, lastProcessed: new Date(), agentHistory: [], suggestions: [], flags: { needsReview: false, needsUpdate: false, isStale: false, hasErrors: false } },
                          position3D: { x: 0, y: 0, z: 0 },
                          similarities: new Map(),
                          connections: [],
                          aiGenerated: true,
                          metadata: { created: new Date(), modified: new Date(), tags: [] }
                        })}
                        sx={{ mt: 0.5 }}
                      >
                        Add Node
                      </Button>
                    )}
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          )}

          {message.suggestions.connections && message.suggestions.connections.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">
                  <LinkIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Suggested Connections ({message.suggestions.connections.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {message.suggestions.connections.map((conn, index) => (
                  <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {conn.source} → {conn.target}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Type: {conn.type} • {conn.reasoning}
                    </Typography>
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )}
    </ListItem>
    )
  }

  const quickActions = [
    'Analyze my current graph',
    'What connections am I missing?',
    'Summarize my knowledge structure',
    'Find gaps in my knowledge',
    'Suggest related concepts',
    'Auto-cleanup structure'
  ]

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PsychologyIcon />
            Graph-Aware AI
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Toggle suggestion display">
              <IconButton
                size="small"
                onClick={() => setShowSuggestions(!showSuggestions)}
                color={showSuggestions ? 'primary' : 'default'}
              >
                {showSuggestions ? <VisibilityIcon /> : <VisibilityOffIcon />}
              </IconButton>
            </Tooltip>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={includeGraphContext}
                  onChange={(e) => setIncludeGraphContext(e.target.checked)}
                />
              }
              label="Graph Context"
              sx={{ m: 0 }}
            />
          </Box>
        </Box>

        {/* Graph Status */}
        <Alert
          severity="info"
          icon={<AnalyticsIcon />}
          sx={{ mb: 2 }}
        >
          <Typography variant="body2">
            Connected to graph: {nodes.size} nodes, {edges.size} edges
            {selectedNodes.size > 0 && ` • ${selectedNodes.size} selected`}
          </Typography>
        </Alert>

        {/* Quick Actions */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Quick Actions:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {quickActions.map((action, index) => (
              <Chip
                key={index}
                label={action}
                size="small"
                variant="outlined"
                clickable
                onClick={() => handleQuickAction(action)}
                icon={<AutoFixHighIcon />}
              />
            ))}
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Messages */}
        <Box
          ref={messagesContainerRef}
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            mb: 2,
            maxHeight: 'calc(100vh - 400px)',
            minHeight: '300px'
          }}
        >
          <List sx={{ py: 0 }}>
            {messages.map(renderMessage)}
          </List>
          <div ref={messagesEndRef} />
        </Box>

        {/* Input */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask about your graph or request analysis..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={isLoading}
            multiline
            maxRows={3}
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            sx={{ minWidth: 'auto', px: 2 }}
          >
            {isLoading ? <CircularProgress size={20} /> : <SendIcon />}
          </Button>
        </Box>

        {/* Context Info */}
        {includeGraphContext && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            🔍 AI can see: {nodes.size} concepts, {edges.size} connections, {clusters.size} clusters
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default AIPanel
