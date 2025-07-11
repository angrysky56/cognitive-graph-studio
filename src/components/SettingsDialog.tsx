/**
 * Settings Dialog Component
 * Provides AI provider configuration and other app settings
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
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  Tab,
  Tabs,
  Paper
} from '@mui/material'
import { LLMConfig } from '@/services/ai-service'
import { aiProviderManager, AIProviderConfig } from '@/services/ai-provider-manager'
import ProviderStatus from './ProviderStatus'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  onSave: (config: LLMConfig) => void
  currentConfig?: AIProviderConfig
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

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onClose,
  onSave,
  currentConfig
}) => {
  const [activeTab, setActiveTab] = useState(0)
  const [aiConfig, setAiConfig] = useState<LLMConfig>({
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 1000
  })
  const [availableProviders, setAvailableProviders] = useState<LLMConfig[]>([])
  const [localSettings, setLocalSettings] = useState({
    autoSave: true,
    darkMode: true,
    enableNotifications: true,
    debugMode: false
  })

  useEffect(() => {
    if (currentConfig) {
      // Get the active provider configuration
      const activeProvider = aiProviderManager.getActiveProvider()
      if (activeProvider) {
        setAiConfig(activeProvider)
      }
      
      // Get all available providers
      setAvailableProviders(aiProviderManager.getAvailableProviders())
    } else {
      // Initialize with current provider manager state
      const activeProvider = aiProviderManager.getActiveProvider()
      if (activeProvider) {
        setAiConfig(activeProvider)
      }
      setAvailableProviders(aiProviderManager.getAvailableProviders())
    }
  }, [currentConfig])

  const handleSave = () => {
    // Update the provider configuration in the provider manager
    aiProviderManager.updateProviderConfig(aiConfig.provider, aiConfig)
    
    // Switch to this provider if it's different
    if (aiProviderManager.getConfig().activeProvider !== aiConfig.provider) {
      aiProviderManager.setActiveProvider(aiConfig.provider)
    }
    
    // Still call the onSave callback for backward compatibility
    onSave(aiConfig)
    onClose()
  }

  const handleProviderChange = (provider: string) => {
    // Check if we already have configuration for this provider
    const existingConfig = availableProviders.find(p => p.provider === provider)
    
    if (existingConfig) {
      // Use existing configuration
      setAiConfig(existingConfig)
    } else {
      // Create new configuration with defaults
      const defaultModels = {
        gemini: 'gemini-1.5-flash',
        openai: 'gpt-4o-mini',
        anthropic: 'claude-3-sonnet-20240229',
        'local-ollama': 'qwen3:latest',
        'local-lm-studio': 'local-model'
      }
      
      setAiConfig(prev => ({
        ...prev,
        provider: provider as any,
        model: defaultModels[provider as keyof typeof defaultModels] || prev.model,
        baseUrl: provider.startsWith('local-') ? (
          provider === 'local-ollama' ? 'http://localhost:11434' : 'http://localhost:1234'
        ) : undefined,
        apiKey: provider.startsWith('local-') ? '' : (prev.apiKey || '')
      }))
    }
  }

  const getApiKeyPlaceholder = () => {
    switch (aiConfig.provider) {
      case 'gemini':
        return 'Enter your Google AI API key'
      case 'openai':
        return 'Enter your OpenAI API key'
      case 'anthropic':
        return 'Enter your Anthropic API key'
      case 'local-ollama':
        return 'Not required for Ollama'
      case 'local-lm-studio':
        return 'Not required for LM Studio'
      default:
        return 'Enter API key'
    }
  }

  const isLocalProvider = aiConfig.provider === 'local-ollama' || aiConfig.provider === 'local-lm-studio'

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>Settings</DialogTitle>
      
      <DialogContent>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="AI Provider" />
          <Tab label="General" />
          <Tab label="Advanced" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              AI Configuration
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>AI Provider</InputLabel>
              <Select
                value={aiConfig.provider}
                label="AI Provider"
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                <MenuItem value="gemini">Google Gemini</MenuItem>
                <MenuItem value="openai">OpenAI</MenuItem>
                <MenuItem value="anthropic">Anthropic Claude</MenuItem>
                <MenuItem value="local-ollama">Ollama (Local)</MenuItem>
                <MenuItem value="local-lm-studio">LM Studio (Local)</MenuItem>
              </Select>
            </FormControl>

            {!isLocalProvider && (
              <TextField
                fullWidth
                label="API Key"
                type="password"
                value={aiConfig.apiKey}
                onChange={(e) => setAiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder={getApiKeyPlaceholder()}
                sx={{ mb: 2 }}
              />
            )}

            <TextField
              fullWidth
              label="Model"
              value={aiConfig.model}
              onChange={(e) => setAiConfig(prev => ({ ...prev, model: e.target.value }))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Temperature"
              type="number"
              inputProps={{ min: 0, max: 2, step: 0.1 }}
              value={aiConfig.temperature}
              onChange={(e) => setAiConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Max Tokens"
              type="number"
              inputProps={{ min: 100, max: 4000 }}
              value={aiConfig.maxTokens}
              onChange={(e) => setAiConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
              sx={{ mb: 3 }}
            />

            <Divider sx={{ my: 3 }} />

            <ProviderStatus 
              selectedProvider={aiConfig.provider}
              onProviderSelect={(provider) => handleProviderChange(provider)}
            />

            <Divider sx={{ my: 3 }} />

            {isLocalProvider && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Local providers don't require API keys. Make sure your local service is running:
                <br />
                • Ollama: http://localhost:11434
                <br />
                • LM Studio: http://localhost:1234
              </Alert>
            )}

            {!isLocalProvider && !aiConfig.apiKey && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                API key is required for cloud providers. Add it to your .env.local file or enter it above.
              </Alert>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              General Settings
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={localSettings.autoSave}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, autoSave: e.target.checked }))}
                />
              }
              label="Auto-save graph changes"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localSettings.enableNotifications}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, enableNotifications: e.target.checked }))}
                />
              }
              label="Enable notifications"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localSettings.darkMode}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, darkMode: e.target.checked }))}
                />
              }
              label="Dark mode"
            />
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Advanced Settings
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={localSettings.debugMode}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, debugMode: e.target.checked }))}
                />
              }
              label="Debug mode"
            />
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body2" color="text.secondary">
              Environment Variables:
            </Typography>
            <Paper sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}>
              <Typography variant="caption" component="pre">
                {`VITE_GEMINI_API_KEY=${import.meta.env.VITE_GEMINI_API_KEY ? '***' : 'Not set'}
VITE_OPENAI_API_KEY=${import.meta.env.VITE_OPENAI_API_KEY ? '***' : 'Not set'}
VITE_ANTHROPIC_API_KEY=${import.meta.env.VITE_ANTHROPIC_API_KEY ? '***' : 'Not set'}`}
              </Typography>
            </Paper>
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SettingsDialog
