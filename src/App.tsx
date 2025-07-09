/**
 * Main App Component for Cognitive Graph Studio
 * Material UI + React + TypeScript implementation
 */

import React, { useEffect, useState } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { Box, AppBar, Toolbar, Typography, Alert, LinearProgress } from '@mui/material'
import cognitiveTheme from '@/utils/theme'
import GraphCanvasEnhanced from '@/components/GraphCanvasEnhanced'
import NodePanel from '@/components/NodePanel'
import AIPanel from '@/components/AIPanel'
import ToolbarActions from '@/components/ToolbarActions'
import serviceManager from '@/services/service-manager-enhanced'

const App: React.FC = () => {
  const [servicesReady, setServicesReady] = useState(false)
  const [serviceStatus, setServiceStatus] = useState<Map<string, any>>(new Map())
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    // Monitor service initialization
    const unsubscribe = serviceManager.onStatusChange((status) => {
      setServiceStatus(new Map(status))
      
      // Check if all services are ready
      const allReady = Array.from(status.values()).every(
        service => service.status === 'ready'
      )
      setServicesReady(allReady)

      // Check for any errors
      const errorServices = Array.from(status.values()).filter(
        service => service.status === 'error'
      )
      if (errorServices.length > 0) {
        setInitError(`Some services failed to initialize: ${errorServices.map(s => s.name).join(', ')}`)
      }
    })

    return unsubscribe
  }, [])

  return (
    <ThemeProvider theme={cognitiveTheme}>
      <CssBaseline />
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: 'background.default'
      }}>
        {/* Top Navigation Bar */}
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
            
            {/* Service Status Indicator */}
            {!servicesReady && (
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <Typography variant="caption" sx={{ mr: 1 }}>
                  Initializing services...
                </Typography>
                <LinearProgress sx={{ width: 100 }} />
              </Box>
            )}
            
            <ToolbarActions />
          </Toolbar>
        </AppBar>

        {/* Service Status Alert */}
        {initError && (
          <Alert severity="warning" sx={{ m: 1 }}>
            {initError} - Some features may not be available.
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

          {/* Center - Graph Visualization */}
          <Box sx={{ 
            flex: 1,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <GraphCanvasEnhanced />
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
            <AIPanel servicesReady={servicesReady} serviceStatus={serviceStatus} />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

export default App
