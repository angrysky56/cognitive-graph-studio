/**
 * Enhanced AI Panel with Deep Graph Integration
 *
 * Provides AI with full access to node content, editing capabilities,
 * and intelligent graph analysis with context awareness.
 *
 * @module EnhancedAIPanel
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  TextField,
  Button,
  Typography,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Paper,
} from '@mui/material'
import {
  Send as SendIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import { EnhancedGraphNode, EnhancedGraphEdge, EnhancedGraphCluster } from '@/types/enhanced-graph'
import { AIService, LLMConfig } from '@/services/ai-service'
import useEnhancedGraphStore from '@/stores/enhancedGraphStore'

interface EnhancedAIPanelProps {
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
    edits?: Array<{ nodeId: string; changes: any; reasoning: string }>
  }
}

const EnhancedAIPanel: React.FC<EnhancedAIPanelProps> = ({
  nodes,
  edges,
  clusters,
  selectedNodes = new Set(),
  aiConfig
}) => {
  const { updateNode, createNode } = useEnhancedGraphStore()

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'system',
      content: '🧠 **Deep Graph AI Assistant**\n\nI have complete access to your knowledge graph and can:\n• **Read and analyze** all node content in depth\n• **Edit and enhance** existing nodes\n• **Create new nodes** with intelligent content\n• **Suggest connections** based on semantic analysis\n• **Provide insights** about your knowledge structure\n\nTry: "Analyze the selected node" or "Enhance my graph about [topic]"',
      timestamp: new Date()
    }
  ])

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aiService, setAiService] = useState<AIService | null>(null)
  const [deepAnalysisMode, setDeepAnalysisMode] = useState(true)
  const [autoEnhanceMode, setAutoEnhanceMode] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize AI service
  useEffect(() => {
    if (aiConfig) {
      const service = new AIService([aiConfig])
      setAiService(service)
    }
  }, [aiConfig])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /**
   * Get deep context about the current graph state
   */
  const getDeepGraphContext = () => {
    const allNodes = Array.from(nodes.values())
    const allEdges = Array.from(edges.values())

    // Selected node details with full content
    const selectedNodeDetails = Array.from(selectedNodes)
      .map(id => nodes.get(id))
      .filter(Boolean)
      .map(node => ({
        id: node!.id,
        label: node!.label,
        type: node!.type,
        content: node!.richContent.markdown,
        summary: node!.richContent.summary,
        keyTerms: node!.richContent.keyTerms,
        relatedConcepts: node!.richContent.relatedConcepts,
        sources: node!.richContent.sources,
        tags: node!.metadata.tags,
        created: node!.metadata.created,
        modified: node!.metadata.modified,
        connections: allEdges.filter(e => e.source === node!.id || e.target === node!.id).length,
        confidence: node!.aiMetadata?.confidenceScore,
        lastProcessed: node!.aiMetadata?.lastProcessed
      }))

    // All nodes with full content for comprehensive analysis
    const allNodesDetails = allNodes.map(node => ({
      id: node.id,
      label: node.label,
      type: node.type,
      content: node.richContent.markdown,
      summary: node.richContent.summary,
      keyTerms: node.richContent.keyTerms,
      tags: node.metadata.tags,
      connections: allEdges.filter(e => e.source === node.id || e.target === node.id).length,
      confidence: node.aiMetadata?.confidenceScore
    }))

    // Edge details with full context
    const edgeDetails = allEdges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: edge.type,
      weight: edge.weight,
      sourceNode: nodes.get(edge.source)?.label,
      targetNode: nodes.get(edge.target)?.label,
      created: edge.metadata?.created,
      confidence: edge.metadata?.confidence
    }))

    // Graph structure analysis
    const nodeTypes = allNodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const connectionDensity = allEdges.length / (allNodes.length * (allNodes.length - 1) / 2)

    // Cluster information
    const clusterDetails = Array.from(clusters.values()).map(cluster => ({
      id: cluster.id,
      label: cluster.label,
      nodeCount: cluster.nodeIds.length,
      members: cluster.nodeIds.map((nodeId: string) => nodes.get(nodeId)?.label).filter(Boolean)
    }))

    return {
      totalNodes: allNodes.length,
      totalEdges: allEdges.length,
      totalClusters: clusters.size,
      nodeTypes,
      connectionDensity,
      selectedNodes: selectedNodeDetails,
      allNodes: allNodesDetails,
      edges: edgeDetails,
      clusters: clusterDetails,
      recentlyModified: allNodes
        .filter(node => node.metadata.modified > new Date(Date.now() - 24 * 60 * 60 * 1000))
        .map(node => ({
          id: node.id,
          label: node.label,
          modified: node.metadata.modified,
          content: node.richContent.markdown
        })),
      graphStats: {
        avgConnectionsPerNode: allNodes.length > 0 ? allEdges.length / allNodes.length : 0,
        mostConnectedNode: allNodes.reduce((max, node) => {
          const connections = allEdges.filter(e => e.source === node.id || e.target === node.id).length
          return connections > (max.connections || 0) ? { node: node.label, connections } : max
        }, {} as any),
        nodesByType: nodeTypes,
        contentLength: allNodes.reduce((sum, node) => sum + (node.richContent.markdown?.length || 0), 0)
      }
    }
  }

  /**
   * Enhanced message processing with deep graph understanding
   */
  const handleSendMessage = async () => {
    if (!input.trim() || !aiService) return

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
      const graphContext = getDeepGraphContext()
      const lowerInput = input.toLowerCase()

      let responseContent = ''
      let suggestions: any = {}

      if (lowerInput.includes('analyze') && selectedNodes.size > 0) {
        // Deep analysis of selected node(s)
        responseContent = await analyzeSelectedNodes(graphContext)
      } else if (lowerInput.includes('enhance') || lowerInput.includes('improve')) {
        // Enhance nodes or graph
        const enhancement = await enhanceContent(graphContext, input)
        responseContent = enhancement.analysis
        suggestions = enhancement.suggestions
      } else if (lowerInput.includes('create') || lowerInput.includes('add')) {
        // Create new nodes
        const creation = await createNewContent(graphContext, input)
        responseContent = creation.analysis
        suggestions = creation.suggestions
      } else if (lowerInput.includes('connect') || lowerInput.includes('link')) {
        // Suggest connections
        const connections = await suggestConnections(graphContext, input)
        responseContent = connections.analysis
        suggestions = connections.suggestions
      } else {
        // General conversation with deep context
        responseContent = await generalConversation(graphContext, input)
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        graphContext: true,
        suggestions
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (error) {
      console.error('AI processing failed:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '❌ Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Deep analysis of selected nodes
   */
  const analyzeSelectedNodes = async (context: any): Promise<string> => {
    if (context.selectedNodes.length === 0) {
      return "Please select a node first for detailed analysis."
    }

    const node = context.selectedNodes[0]

    const analysisPrompt = `Perform a comprehensive deep analysis of this knowledge graph node and its context within the entire graph:

**Primary Node Analysis:**
- Label: ${node.label}
- Type: ${node.type}
- Full Content: ${node.content}
- Summary: ${node.summary || 'Not available'}
- Key Terms: ${node.keyTerms?.join(', ') || 'none'}
- Related Concepts: ${node.relatedConcepts?.join(', ') || 'none'}
- Tags: ${node.tags?.join(', ') || 'none'}
- Created: ${node.created}
- Modified: ${node.modified}
- Direct Connections: ${node.connections}
- AI Confidence: ${node.confidence ? (node.confidence * 100).toFixed(1) + '%' : 'unknown'}
- AI Reasoning: ${node.reasoning || 'Not available'}

**Graph Context & Positioning:**
- Total Graph Size: ${context.totalNodes} nodes, ${context.totalEdges} connections
- Graph Density: ${(context.connectionDensity * 100).toFixed(2)}%
- Node Types Distribution: ${Object.entries(context.nodeTypes).map(([type, count]) => `${type}(${count})`).join(', ')}
- Average Connections per Node: ${context.graphStats.avgConnectionsPerNode.toFixed(1)}
- Most Connected Node: ${context.graphStats.mostConnectedNode.node} (${context.graphStats.mostConnectedNode.connections} connections)
- Total Content Volume: ${context.graphStats.contentLength} characters

**Related Nodes in Graph:**
${context.allNodes.filter((n: any) => n.id !== node.id).slice(0, 10).map((n: any) => `- ${n.label} (${n.type}): ${n.content?.substring(0, 100)}...`).join('\n')}

**Connected Edges:**
${context.edges.filter((e: any) => e.source === node.id || e.target === node.id).map((e: any) => `- ${e.sourceNode} → ${e.targetNode} (${e.label})`).join('\n')}

**Clusters & Communities:**
${context.clusters.map((c: any) => `- ${c.label}: ${c.nodeCount} nodes (${c.members.join(', ')})`).join('\n')}

Based on this comprehensive analysis, provide:

1. **Content Quality Assessment** - Evaluate depth, accuracy, completeness, and structure
2. **Graph Integration Analysis** - How well this node fits into the knowledge structure
3. **Connection Analysis** - Quality and relevance of current connections, missing connections
4. **Knowledge Gaps** - What information is missing or could be expanded
5. **Semantic Relationships** - How this node relates to other concepts in the graph
6. **Improvement Recommendations** - Specific, actionable suggestions
7. **Expansion Opportunities** - New nodes or connections that would enhance understanding
8. **Strategic Value** - This node's importance to the overall knowledge structure

Be thorough and analytical, leveraging the full context of the knowledge graph.`

    const response = await aiService!.generateText({
      prompt: analysisPrompt,
      temperature: 0.3,
      maxTokens: 8164
    })

    return response.content
  }

  /**
   * Enhance existing content
   */
  const enhanceContent = async (context: any, query: string) => {
    if (context.selectedNodes.length === 0) {
      return {
        analysis: "Please select a node to enhance.",
        suggestions: {}
      }
    }

    const node = context.selectedNodes[0]

    const enhancePrompt = `Enhance this knowledge graph node based on the request: "${query}"

Current Node:
- Label: ${node.label}
- Content: ${node.content}
- Tags: ${node.tags?.join(', ') || 'none'}

Please suggest specific improvements:
1. Enhanced content (more detailed, structured)
2. Additional tags
3. Key terms to extract
4. Potential connections

Return as JSON: {
  "enhancedContent": "improved content here",
  "additionalTags": ["tag1", "tag2"],
  "keyTerms": ["term1", "term2"],
  "connectionSuggestions": [{"target": "node", "type": "semantic", "reasoning": "why"}]
}`

    const response = await aiService!.generateText({
      prompt: enhancePrompt,
      format: 'json',
      temperature: 0.4,
      maxTokens: 8164
    })

    try {
      const suggestions = JSON.parse(response.content)

      return {
        analysis: `I've analyzed "${node.label}" and can enhance it with:\n\n**Enhanced Content:**\n${suggestions.enhancedContent}\n\n**Additional Tags:** ${suggestions.additionalTags?.join(', ')}\n\n**Key Terms:** ${suggestions.keyTerms?.join(', ')}\n\nWould you like me to apply these enhancements?`,
        suggestions: {
          edits: [{
            nodeId: node.id,
            changes: {
              richContent: { markdown: suggestions.enhancedContent },
              metadata: {
                tags: [...(node.tags || []), ...(suggestions.additionalTags || [])]
              }
            },
            reasoning: "AI-enhanced content with better structure and additional metadata"
          }],
          connections: suggestions.connectionSuggestions || []
        }
      }
    } catch (error) {
      return {
        analysis: response.content,
        suggestions: {}
      }
    }
  }

  /**
   * Create new content
   */
  const createNewContent = async (context: any, query: string) => {
    const createPrompt = `Based on the current knowledge graph and the request "${query}", suggest new nodes to create.

Current Graph:
- Nodes: ${context.totalNodes}
- Types: ${Object.entries(context.nodeTypes).map(([type, count]) => `${type}(${count})`).join(', ')}

Create 2-3 new nodes that would enhance this knowledge graph. Return as JSON:
{
  "nodes": [{
    "label": "Node Title",
    "type": "concept|source|idea|topic|tool",
    "content": "Detailed content for this node",
    "tags": ["tag1", "tag2"],
    "reasoning": "Why this node would be valuable"
  }],
  "connections": [{
    "source": "existing_node_id",
    "target": "new_node_label",
    "type": "semantic",
    "reasoning": "Why these should connect"
  }]
}`

    const response = await aiService!.generateText({
      prompt: createPrompt,
      format: 'json',
      temperature: 0.6,
      maxTokens: 8164
    })

    try {
      const suggestions = JSON.parse(response.content)

      return {
        analysis: `I suggest creating ${suggestions.nodes?.length || 0} new nodes:\n\n${suggestions.nodes?.map((node: any, i: number) => `**${i + 1}. ${node.label}** (${node.type})\n${node.content}\n\n*Reasoning:* ${node.reasoning}`).join('\n\n')}`,
        suggestions
      }
    } catch (error) {
      return {
        analysis: response.content,
        suggestions: {}
      }
    }
  }

  /**
   * Suggest connections
   */
  const suggestConnections = async (context: any, query: string) => {
    const connectPrompt = `Analyze the knowledge graph and suggest meaningful connections based on: "${query}"

Graph Overview:
- Total nodes: ${context.totalNodes}
- Connection density: ${(context.connectionDensity * 100).toFixed(2)}%
- Selected nodes: ${context.selectedNodes.map((n: any) => n.label).join(', ')}

Find potential connections between existing nodes that would enhance the knowledge structure.`

    const response = await aiService!.generateText({
      prompt: connectPrompt,
      temperature: 0.3,
      maxTokens: 8164
    })

    return {
      analysis: response.content,
      suggestions: { connections: [] }
    }
  }

  /**
   * General conversation with graph context
   */
  const generalConversation = async (context: any, query: string): Promise<string> => {
    const conversationPrompt = `You are an AI assistant with complete access to a knowledge graph. Answer the user's question using the graph context.

Graph Context:
- ${context.totalNodes} nodes, ${context.totalEdges} connections
- Node types: ${Object.entries(context.nodeTypes).map(([type, count]) => `${type}(${count})`).join(', ')}
- Selected: ${context.selectedNodes.map((n: any) => n.label).join(', ') || 'none'}

User Question: ${query}

Provide a helpful response that leverages the graph information.`

    const response = await aiService!.generateText({
      prompt: conversationPrompt,
      temperature: 0.5,
      maxTokens: 8164
    })

    return response.content
  }

  /**
   * Apply AI suggestions
   */
  const applySuggestion = async (suggestion: any, type: string) => {
    try {
      if (type === 'edit' && suggestion.nodeId) {
        await updateNode(suggestion.nodeId, suggestion.changes)
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'system',
          content: `✅ Applied AI enhancement to node. ${suggestion.reasoning}`,
          timestamp: new Date()
        }])
      } else if (type === 'node') {
        await createNode({
          label: suggestion.label,
          type: suggestion.type,
          richContent: {
            markdown: suggestion.content,
            keyTerms: suggestion.keyTerms || [],
            relatedConcepts: [],
            sources: [],
            attachments: []
          },
          metadata: {
            created: new Date(),
            modified: new Date(),
            tags: suggestion.tags || []
          }
        })
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'system',
          content: `✅ Created new node: "${suggestion.label}"`,
          timestamp: new Date()
        }])
      }
    } catch (error) {
      console.error('Failed to apply suggestion:', error)
    }
  }

  // Sample data functionality removed - use Document Importer instead

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          🧠 Deep Graph AI
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            label={`${nodes.size} nodes`}
            size="small"
            color="primary"
          />
          <Chip
            label={`${edges.size} edges`}
            size="small"
            color="secondary"
          />
          {selectedNodes.size > 0 && (
            <Chip
              label={`${selectedNodes.size} selected`}
              size="small"
              color="success"
            />
          )}
        </Box>

        {/* Quick Actions */}
        {nodes.size === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              No graph data yet. Use the Document Importer in the right panel to upload and process documents!
            </Typography>
          </Alert>
        )}
      </Box>

      {/* Settings */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">AI Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControlLabel
            control={
              <Switch
                checked={deepAnalysisMode}
                onChange={(e) => setDeepAnalysisMode(e.target.checked)}
              />
            }
            label="Deep Analysis Mode"
          />
          <FormControlLabel
            control={
              <Switch
                checked={autoEnhanceMode}
                onChange={(e) => setAutoEnhanceMode(e.target.checked)}
              />
            }
            label="Auto-enhance Responses"
          />
        </AccordionDetails>
      </Accordion>

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {messages.map((message) => (
          <Box key={message.id} sx={{ mb: 2 }}>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                backgroundColor: message.type === 'user'
                  ? 'primary.main'
                  : message.type === 'system'
                  ? 'success.main'
                  : 'background.paper',
                color: message.type === 'user' || message.type === 'system'
                  ? 'white'
                  : 'text.primary'
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
              </Typography>

              {/* Suggestions */}
              {message.suggestions && (
                <Box sx={{ mt: 2 }}>
                  {message.suggestions.edits?.map((edit, i) => (
                    <Button
                      key={i}
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => applySuggestion(edit, 'edit')}
                      sx={{ mr: 1, mb: 1 }}
                    >
                      Apply Enhancement
                    </Button>
                  ))}
                  {message.suggestions.nodes?.map((node, i) => (
                    <Button
                      key={i}
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => applySuggestion(node, 'node')}
                      sx={{ mr: 1, mb: 1 }}
                    >
                      Create "{node.label}"
                    </Button>
                  ))}
                </Box>
              )}
            </Paper>
          </Box>
        ))}
        {isLoading && (
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              AI analyzing your graph...
            </Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask about your graph, request analysis, or get suggestions..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            multiline
            maxRows={3}
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            sx={{ minWidth: 'auto', px: 2 }}
          >
            <SendIcon />
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default EnhancedAIPanel
