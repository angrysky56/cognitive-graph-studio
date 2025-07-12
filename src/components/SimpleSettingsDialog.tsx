/**
 * Simplified Settings Dialog Component
 * Single provider configuration with model fetching
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  Tab,
  Tabs,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material'
import {
  Refresh as RefreshIcon,
  CheckCircle as ConnectedIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { LLMConfig, LLMProvider } from '@/types/ai'
import { simpleAIProviderManager } from '@/services/simple-ai-provider-manager'

interface SimpleSettingsDialogProps {
  open: boolean
  onClose: () => void
  onSave: (config: LLMConfig) => void
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ padding: value === index ? '16px 0' : 0 }}>
    {value === index && children}
  </div>
)

const SimpleSettingsDialog: React.FC<SimpleSettingsDialogProps> = ({
  open,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState(0)
  const [currentConfig, setCurrentConfig] = useState<LLMConfig | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown')
  const [testingConnection, setTestingConnection] = useState(false)

  useEffect(() => {
    // Load current configuration
    const config = simpleAIProviderManager.getActiveConfig()
    if (config) {
      setCurrentConfig({ ...config })
      loadModels(config.provider)
      checkConnection(config.provider)
    }

    // Subscribe to provider changes
    const unsubscribe = simpleAIProviderManager.subscribe((newConfig) => {
      if (newConfig) {
        setCurrentConfig({ ...newConfig })
        loadModels(newConfig.provider)
        checkConnection(newConfig.provider)
      }
    })

    return unsubscribe
  }, [])

  const loadModels = async (provider: LLMProvider) => {
    setLoadingModels(true)
    try {
      const models = await simpleAIProviderManager.getAvailableModels()
      setAvailableModels(models)
    } catch (error) {
      console.error('Failed to load models:', error)
      setAvailableModels([])
    } finally {
      setLoadingModels(false)
    }
  }

  const checkConnection = async (provider: LLMProvider) => {
    setTestingConnection(true)
    try {
      const connected = await simpleAIProviderManager.testProvider(provider)
      setConnectionStatus(connected ? 'connected' : 'failed')
    } catch (error) {
      setConnectionStatus('failed')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleProviderChange = async (provider: LLMProvider) => {
    const newConfig = simpleAIProviderManager.createProviderConfig(provider)
    setCurrentConfig(newConfig)
    await loadModels(provider)
    setConnectionStatus('unknown')
  }

  const handleSave = async () => {
    if (!currentConfig) return

    const success = await simpleAIProviderManager.setActiveProvider(currentConfig)
    if (success) {
      onSave(currentConfig)
      onClose()
    }
  }

  const testConnection = async () => {
    if (!currentConfig) return
    await checkConnection(currentConfig.provider)
  }

  const refreshModels = async () => {
    if (!currentConfig) return
    await loadModels(currentConfig.provider)
  }

  if (!currentConfig) {
    return null
  }

  const providerInfo = simpleAIProviderManager.getProviderInfo(currentConfig.provider)
  const isLocalProvider = providerInfo.type === 'local'

  const getConnectionIcon = () => {
    if (testingConnection) return <CircularProgress size={20} />
    switch (connectionStatus) {
      case 'connected': return <ConnectedIcon color="success" />
      case 'failed': return <ErrorIcon color="error" />
      default: return <WarningIcon color="warning" />
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { minHeight: '500px' } }}
    >
      <DialogTitle>AI Provider Settings</DialogTitle>
      
      <DialogContent>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Provider" />
          <Tab label="Debug" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <Box sx={{ mt: 2 }}>
            {/* Provider Selection */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Active Provider
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>AI Provider</InputLabel>
                <Select
                  value={currentConfig.provider}
                  label="AI Provider"
                  onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
                >
                  <MenuItem value="gemini">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Google Gemini
                      <Chip size="small" label="cloud" color="primary" variant="outlined" />
                    </Box>
                  </MenuItem>
                  <MenuItem value="openai">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      OpenAI
                      <Chip size="small" label="cloud" color="primary" variant="outlined" />
                    </Box>
                  </MenuItem>
                  <MenuItem value="anthropic">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Anthropic Claude
                      <Chip size="small" label="cloud" color="primary" variant="outlined" />
                    </Box>
                  </MenuItem>
                  <MenuItem value="local-ollama">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Ollama (Local)
                      <Chip size="small" label="local" color="secondary" variant="outlined" />
                    </Box>
                  </MenuItem>
                  <MenuItem value="local-lm-studio">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      LM Studio (Local)
                      <Chip size="small" label="local" color="secondary" variant="outlined" />
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              {/* Connection Status */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getConnectionIcon()}
                  <Typography variant="body2">
                    {testingConnection ? 'Testing...' : 
                     connectionStatus === 'connected' ? 'Connected' :
                     connectionStatus === 'failed' ? 'Connection Failed' : 'Not Tested'}
                  </Typography>
                </Box>
                <Tooltip title="Test Connection">
                  <IconButton size="small" onClick={testConnection} disabled={testingConnection}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>

            {/* Configuration */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Configuration
              </Typography>

              {!isLocalProvider && (
                <TextField
                  fullWidth
                  label="API Key"
                  type="password"
                  value={currentConfig.apiKey || ''}
                  onChange={(e) => setCurrentConfig(prev => prev ? { ...prev, apiKey: e.target.value } : null)}
                  placeholder={`Enter your ${providerInfo.name} API key`}
                  sx={{ mb: 2 }}
                />
              )}

              {isLocalProvider && (
                <TextField
                  fullWidth
                  label="Base URL"
                  value={currentConfig.baseUrl || ''}
                  onChange={(e) => setCurrentConfig(prev => prev ? { ...prev, baseUrl: e.target.value } : null)}
                  sx={{ mb: 2 }}
                />
              )}

              {/* Model Selection */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={currentConfig.model}
                    label="Model"
                    onChange={(e) => setCurrentConfig(prev => prev ? { ...prev, model: e.target.value } : null)}
                  >
                    {availableModels.map((model) => (
                      <MenuItem key={model} value={model}>
                        {model}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Tooltip title="Refresh Models">
                  <IconButton onClick={refreshModels} disabled={loadingModels}>
                    {loadingModels ? <CircularProgress size={20} /> : <RefreshIcon />}
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Temperature"
                  type="number"
                  inputProps={{ min: 0, max: 2, step: 0.1 }}
                  value={currentConfig.temperature}
                  onChange={(e) => setCurrentConfig(prev => prev ? { ...prev, temperature: parseFloat(e.target.value) } : null)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Max Tokens"
                  type="number"
                  inputProps={{ min: 100, max: 8000 }}
                  value={currentConfig.maxTokens}
                  onChange={(e) => setCurrentConfig(prev => prev ? { ...prev, maxTokens: parseInt(e.target.value) } : null)}
                  sx={{ flex: 1 }}
                />
              </Box>

              {isLocalProvider && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Make sure your local service is running:
                  <br />
                  {currentConfig.provider === 'local-ollama' && '• Ollama: http://localhost:11434'}
                  {currentConfig.provider === 'local-lm-studio' && '• LM Studio: http://localhost:1234'}
                </Alert>
              )}

              {!isLocalProvider && !currentConfig.apiKey && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  API key is required. Add it to your .env.local file or enter it above.
                </Alert>
              )}
            </Paper>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Debug Information
            </Typography>
            
            {/* Environment Variables */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" gutterBottom>
                Environment Variables:
              </Typography>
              <Typography variant="caption" component="pre">
                {`VITE_GEMINI_API_KEY=${import.meta.env.VITE_GEMINI_API_KEY ? '***' : 'Not set'}
VITE_OPENAI_API_KEY=${import.meta.env.VITE_OPENAI_API_KEY ? '***' : 'Not set'}
VITE_ANTHROPIC_API_KEY=${import.meta.env.VITE_ANTHROPIC_API_KEY ? '***' : 'Not set'}`}
              </Typography>
            </Paper>

            {/* Provider Test */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Provider Test:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => testConnection()}
                  disabled={testingConnection}
                >
                  {testingConnection ? 'Testing...' : 'Test Current Provider'}
                </Button>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => refreshModels()}
                  disabled={loadingModels}
                >
                  {loadingModels ? 'Loading...' : 'Refresh Models'}
                </Button>
              </Box>
            </Paper>

            {/* Current Config */}
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" gutterBottom>
                Current Configuration:
              </Typography>
              <Typography variant="caption" component="pre">
                {JSON.stringify(currentConfig, null, 2)}
              </Typography>
            </Paper>
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={connectionStatus === 'failed'}
        >
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SimpleSettingsDialog
