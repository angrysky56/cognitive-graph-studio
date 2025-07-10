/**
 * Material UI Dark Theme for Cognitive Graph Studio
 * Optimized for extended knowledge work sessions
 */

import { createTheme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'

// Augment Material UI theme interface for custom colors
declare module '@mui/material/styles' {
  interface Palette {
    surface: {
      level1: string
      level2: string
      level3: string
    }
  }

  interface PaletteOptions {
    surface?: {
      level1: string
      level2: string
      level3: string
    }
  }
}

// Color palette optimized for knowledge work
const palette = {
  primary: {
    main: '#4da6ff',      // Bright blue for primary actions
    light: '#80c7ff',     // Light blue for hover states
    dark: '#1976d2',      // Dark blue for emphasis
    contrastText: '#ffffff'
  },
  secondary: {
    main: '#ffca80',      // Warm orange for secondary elements
    light: '#ffd6a5',     // Light orange
    dark: '#ff9800',      // Dark orange
    contrastText: '#000000'
  },
  background: {
    default: '#0a0a0f',   // Deep dark blue
    paper: '#161621',     // Slightly lighter for surfaces
  },
  surface: {
    level1: '#1e1e2e',    // Level 1 elevation
    level2: '#262640',    // Level 2 elevation
    level3: '#2e2e52',    // Level 3 elevation
  },
  text: {
    primary: '#e0e0e0',   // High contrast text
    secondary: '#a0a0a0', // Medium contrast text
    disabled: '#606060',  // Low contrast text
  },
  divider: alpha('#ffffff', 0.12),
  action: {
    active: '#ffffff',
    hover: alpha('#ffffff', 0.08),
    selected: alpha('#4da6ff', 0.16),
    disabled: alpha('#ffffff', 0.3),
    disabledBackground: alpha('#ffffff', 0.12),
  }
}

// Graph-specific colors for nodes and edges
export const graphColors = {
  nodes: {
    concept: '#ffca80',     // Orange for concepts
    idea: '#80c7ff',       // Blue for ideas  
    source: '#90ee90',     // Green for sources
    cluster: '#dda0dd',    // Purple for clusters
  },
  edges: {
    semantic: '#a0a0a0',   // Gray for semantic links
    causal: '#ff6b6b',     // Red for causal links
    temporal: '#4ecdc4',   // Teal for temporal links
    hierarchical: '#95e1d3' // Light green for hierarchical
  },
  selection: '#4da6ff',    // Primary blue for selection
  hover: '#80c7ff'         // Light blue for hover
}

// Create the complete Material UI theme
export const cognitiveTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4da6ff',      // Bright blue for primary actions
      light: '#80c7ff',     // Light blue for hover states
      dark: '#1976d2',      // Dark blue for emphasis
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#ffca80',      // Warm orange for secondary elements
      light: '#ffd6a5',     // Light orange
      dark: '#ff9800',      // Dark orange
      contrastText: '#000000'
    },
    background: {
      default: '#0a0a0f',   // Deep dark blue
      paper: '#161621',     // Slightly lighter for surfaces
    },
    surface: {
      level1: '#1e1e2e',    // Level 1 elevation
      level2: '#262640',    // Level 2 elevation
      level3: '#2e2e52',    // Level 3 elevation
    },
    text: {
      primary: '#e0e0e0',   // High contrast text
      secondary: '#a0a0a0', // Medium contrast text
      disabled: '#606060',  // Low contrast text
    },
    divider: alpha('#ffffff', 0.12),
    action: {
      active: '#ffffff',
      hover: alpha('#ffffff', 0.08),
      selected: alpha('#4da6ff', 0.16),
      disabled: alpha('#ffffff', 0.3),
      disabledBackground: alpha('#ffffff', 0.12),
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    caption: {
      fontSize: '0.875rem',
      color: '#a0a0a0',
    }
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0, 0, 0, 0.2)',
    '0px 4px 8px rgba(0, 0, 0, 0.3)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)',
    '0px 8px 16px rgba(0, 0, 0, 0.4)'
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: `#606060 #161621`,
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            backgroundColor: 'transparent',
            width: 8,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#606060',
            minHeight: 24,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          padding: '8px 16px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#161621',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#161621',
          borderBottom: `1px solid ${alpha('#ffffff', 0.12)}`,
        },
      },
    },
  },
})

export default cognitiveTheme