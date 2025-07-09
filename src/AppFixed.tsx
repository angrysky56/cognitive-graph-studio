/**
 * Main App Component for Cognitive Graph Studio - Fixed Version
 * Integrates fixed graph canvas and AI services with proper error handling
 * 
 * @fileoverview Enhanced main application component with robust service integration,
 * comprehensive error handling, and optimized user experience
 */

import React, { useEffect, useState, useCallback } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Alert, 
  LinearProgress, 
  Chip,
  Button,
  Snackbar
} from '@mui/material'
import { 
  Refresh as RefreshIcon, 
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon 
} from '@mui/icons-material'

import cognitiveTheme from '@/utils/theme'
import GraphCanvasFixed from '@/components/GraphCanvasFixed'
import NodePanel from '@/components/NodePanel'
import AIPanel from '@/components/AIPanel'
import ToolbarActions from '@/components/ToolbarActions'
import serviceManager from '@/services/service-manager-enhanced'
import aiServiceFixed from '@/services/aiServiceFixed'

/**
 * Service status type definition
 */
interface ServiceStatus {
  name: string
  status: 'initializing' | 'ready' | 'error' | 'testing'
  message?: string
  lastCheck?: Date
}

/**
 * Enhanced App component with comprehensive service management
 */
const AppFixed: React.FC = () => {
  // Service state management
  const [servicesReady, setServicesReady] = useState(false)
  const [serviceStatus, setServiceStatus] = useState<Map<string, ServiceStatus>>(new Map())
  const [initError, setInitError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showSuccessNotification, setShowSuccessNotification] = useState(false)

  // AI service specific state
  const [aiProviders, setAiProviders] = useState(aiServiceFixed.getAllProviders())
  const [activeProvider, setActiveProvider] = useState(aiServiceFixed.getActiveProvider())
  const [connectionStatus, setConnectionStatus] = useState(aiServiceFixed.getConnectionStatus())

  /**
   * Handle service status updates with enhanced monitoring
   */
  const handleServiceStatusUpdate = useCallback((status: Map<string, ServiceStatus>) => {
    setServiceStatus(new Map(status))
    
    // Check if all critical services are ready
    const criticalServices = ['ai', 'vector', 'treequest']
    const readyServices = criticalServices.filter(serviceName => {
      const service = status.get(serviceName)
      return service?.status === 'ready'
    })
    
    const allReady = readyServices.length === criticalServices.length
    setServicesReady(allReady)

    // Aggregate error messages
    const errorServices = Array.from(status.values()).filter(
      service => service.status === 'error'
    )
    
    if (errorServices.length > 0) {
      const errorMessage = `Service issues detected: ${errorServices.map(s => s.name).join(', ')}`
      setInitError(errorMessage)
    } else {
      setInitError(null)
      if (allReady && !showSuccessNotification) {
        setShowSuccessNotification(true)
      }
    }

    console.log(`📊 Service Status Update: ${readyServices.length}/${criticalServices.length} ready`)
  }, [showSuccessNotification])

  /**
   * Refresh AI service connections
   */
  const refreshAIConnections = useCallback(async () => {
    setIsRefreshing(true)
    try {
      console.log('🔄 Refreshing AI service connections...')
      await aiServiceFixed.refreshConnections()
      
      // Update local state
      setAiProviders(aiServiceFixed.getAllProviders())
      setActiveProvider(aiServiceFixed.getActiveProvider())
      setConnectionStatus(aiServiceFixed.getConnectionStatus())
      
      console.log('✅ AI connections refreshed successfully')
    } catch (error) {
      console.error('❌ Failed to refresh AI connections:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  /**
   * Handle AI provider switching
   */
  const handleProviderSwitch = useCallback((providerName: string) => {
    const success = aiServiceFixed.setActiveProvider(providerName)
    if (success) {
      setActiveProvider(providerName)
      console.log(`🔄 Switched to AI provider: ${providerName}`)
    }
  }, [])

  /**
   * Initialize services and set up monitoring
   */
  useEffect(() => {
    console.log('🚀 Initializing Cognitive Graph Studio...')
    
    // Subscribe to service manager updates
    const unsubscribe = serviceManager.onStatusChange(handleServiceStatusUpdate)
    
    // Set up periodic health checks for AI services
    const healthCheckInterval = setInterval(() => {
      // Silent health check every 30 seconds
      aiServiceFixed.refreshConnections().catch(console.warn)
    }, 30000)

    return () => {
      unsubscribe()
      clearInterval(healthCheckInterval)
    }
  }, [handleServiceStatusUpdate])

  /**
   * Render service status indicator
   */
  const renderServiceStatus = (serviceName: string, service: ServiceStatus) => {
    const getStatusColor = (status: ServiceStatus['status']) => {
      switch (status) {
        case 'ready': return 'success'
        case 'error': return 'error'
        case 'testing': return 'warning'
        default: return 'default'
      }
    }

    const getStatusIcon = (status: ServiceStatus['status']) => {
      switch (status) {
        case 'ready': return <CheckIcon fontSize="small" />
        case 'error': return <ErrorIcon fontSize="small" />
        case 'testing': return <WarningIcon fontSize="small" />
        default: return null
      }
    }

    return (
      <Chip
        key={serviceName}
        label={service.name}
        color={getStatusColor(service.status) as any}
        size="small"
        icon={getStatusIcon(service.status)}
        variant={service.status === 'ready' ? 'filled' : 'outlined'}
        sx={{ mr: 1 }}
      />
    )
  }

  /**
   * Render AI provider status
   */
  const renderAIProviderStatus = () => {
    const availableProviders = aiProviders.filter(p => p.status === 'available')
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          AI: {activeProvider}
        </Typography>
        <Chip
          label={`${availableProviders.length}/${aiProviders.length}`}
          color={availableProviders.length > 0 ? 'success' : 'error'}
          size="small"
          variant="outlined"
        />
      </Box>
    )
  }

  return (
    <ThemeProvider theme={cognitiveTheme}>
      <CssBaseline />
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: 'background.default'
      }}>
        {/* Enhanced Navigation Bar */}
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                flexGrow: 1,
                fontWeight: 700,
                background: 'linear-gradient(45deg, #4da6ff, #ffca80)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}
            >
              Cognitive Graph Studio
            </Typography>
            
            {/* Service Status Indicators */}
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              {Array.from(serviceStatus.entries()).map(([name, service]) => 
                renderServiceStatus(name, service)
              )}
              {renderAIProviderStatus()}
            </Box>

            {/* Service Initialization Progress */}
            {!servicesReady && (
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <Typography variant="caption" sx={{ mr: 1 }}>
                  Initializing...
                </Typography>
                <LinearProgress sx={{ width: 100 }} />
              </Box>
            )}

            {/* Refresh Button */}
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={refreshAIConnections}
              disabled={isRefreshing}
              sx={{ color: 'inherit' }}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            
            <ToolbarActions />
          </Toolbar>
        </AppBar>

        {/* Service Status Alert */}
        {initError && (
          <Alert 
            severity="warning" 
            sx={{ m: 1 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={refreshAIConnections}
                disabled={isRefreshing}
              >
                Retry
              </Button>
            }
          >
            {initError} - Some features may not be available.
          </Alert>
        )}

        {/* Success Notification */}
        {servicesReady && (
          <Alert 
            severity="success" 
            sx={{ m: 1 }}
            onClose={() => setShowSuccessNotification(false)}
          >
            All services are ready! AI provider: {activeProvider}
          </Alert>
        )}

        {/* Main Application Area */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex',
          overflow: 'hidden'
        }}>
          {/* Left Panel - Node Management */}
          <Box sx={{ 
            width: 320,
            borderRight: 1,
            borderColor: 'divider',
            bgcolor: 'surface.level1',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <NodePanel />
          </Box>

          {/* Center - Enhanced Graph Visualization */}
          <Box sx={{ 
            flex: 1,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <GraphCanvasFixed />
          </Box>

          {/* Right Panel - AI Integration */}
          <Box sx={{ 
            width: 320,
            borderLeft: 1,
            borderColor: 'divider',
            bgcolor: 'surface.level1',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <AIPanel 
              servicesReady={servicesReady} 
              serviceStatus={serviceStatus}
              aiProviders={aiProviders}
              activeProvider={activeProvider}
              onProviderSwitch={handleProviderSwitch}
              onRefreshConnections={refreshAIConnections}
            />
          </Box>
        </Box>

        {/* Success Snackbar */}
        <Snackbar
          open={showSuccessNotification}
          autoHideDuration={3000}
          onClose={() => setShowSuccessNotification(false)}
          message="All services initialized successfully!"
        />
      </Box>
    </ThemeProvider>
  )
}

export default AppFixed