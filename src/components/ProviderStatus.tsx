/**
 * Provider Status Component
 * Shows the status of all available AI providers
 */

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material'
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
  Star as ActiveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import { aiProviderManager } from '@/services/ai-provider-manager'
import { LLMProvider } from '@/types/ai'

interface ProviderStatusProps {
  onProviderSelect?: (provider: LLMProvider) => void
  selectedProvider?: LLMProvider
}

const ProviderStatus: React.FC<ProviderStatusProps> = ({
  onProviderSelect,
  selectedProvider
}) => {
  const [providers, setProviders] = useState(aiProviderManager.getAvailableProviders())
  const [activeProvider, setActiveProvider] = useState(aiProviderManager.getConfig().activeProvider)
  const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean | null>>({})
  const [testing, setTesting] = useState<Set<LLMProvider>>(new Set())

  useEffect(() => {
    // Subscribe to provider changes
    const unsubscribe = aiProviderManager.subscribe((config) => {
      setProviders(config.providers)
      setActiveProvider(config.activeProvider)
    })

    // Initial connection test
    testAllProviders()

    return unsubscribe
  }, [])

  const testAllProviders = async () => {
    const allProviders = providers.map(p => p.provider)
    setTesting(new Set(allProviders))
    
    try {
      const results = await aiProviderManager.testAllProviders()
      setConnectionStatus(results)
    } catch (error) {
      console.error('Failed to test providers:', error)
    } finally {
      setTesting(new Set())
    }
  }

  const testSingleProvider = async (provider: LLMProvider) => {
    setTesting(prev => new Set([...prev, provider]))
    
    try {
      const result = await aiProviderManager.testProvider(provider)
      setConnectionStatus(prev => ({ ...prev, [provider]: result }))
    } catch (error) {
      console.error(`Failed to test provider ${provider}:`, error)
      setConnectionStatus(prev => ({ ...prev, [provider]: false }))
    } finally {
      setTesting(prev => {
        const newSet = new Set(prev)
        newSet.delete(provider)
        return newSet
      })
    }
  }

  const getProviderStatusIcon = (provider: LLMProvider) => {
    const status = connectionStatus[provider]
    const isActive = provider === activeProvider
    const isTesting = testing.has(provider)

    if (isTesting) {
      return <CircularProgress size={20} />
    }

    if (isActive) {
      return (
        <Tooltip title="Active Provider">
          <ActiveIcon color="primary" />
        </Tooltip>
      )
    }

    if (status === true) {
      return (
        <Tooltip title="Connected">
          <CheckIcon color="success" />
        </Tooltip>
      )
    }

    if (status === false) {
      return (
        <Tooltip title="Connection Failed">
          <ErrorIcon color="error" />
        </Tooltip>
      )
    }

    return (
      <Tooltip title="Not Tested">
        <SettingsIcon color="action" />
      </Tooltip>
    )
  }

  const getProviderDisplayName = (provider: LLMProvider): string => {
    const info = aiProviderManager.getProviderDisplayInfo(provider)
    return info.name
  }

  const getProviderTypeChip = (provider: LLMProvider) => {
    const info = aiProviderManager.getProviderDisplayInfo(provider)
    return (
      <Chip
        size="small"
        label={info.type}
        color={info.type === 'cloud' ? 'primary' : 'secondary'}
        variant="outlined"
        sx={{ ml: 1 }}
      />
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Provider Status
        </Typography>
        <Tooltip title="Test All Providers">
          <IconButton 
            size="small" 
            onClick={testAllProviders}
            disabled={testing.size > 0}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <List dense>
        {providers.map((config) => (
          <ListItem
            key={config.provider}
            component={onProviderSelect ? "div" : undefined}
            onClick={() => onProviderSelect?.(config.provider)}
            selected={selectedProvider === config.provider}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
              '&.Mui-selected': {
                backgroundColor: 'action.selected'
              }
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getProviderDisplayName(config.provider)}
                  {getProviderTypeChip(config.provider)}
                </Box>
              }
              secondary={
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Model: {config.model}
                  </Typography>
                  {config.baseUrl && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      URL: {config.baseUrl}
                    </Typography>
                  )}
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getProviderStatusIcon(config.provider)}
                <Tooltip title="Test Connection">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      testSingleProvider(config.provider)
                    }}
                    disabled={testing.has(config.provider)}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        {providers.length} provider{providers.length !== 1 ? 's' : ''} configured. 
        Active: {getProviderDisplayName(activeProvider)}
      </Typography>
    </Box>
  )
}

export default ProviderStatus
