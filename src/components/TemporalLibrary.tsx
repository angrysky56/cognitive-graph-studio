/**
 * Temporal Library Component - Knowledge-Narrative-Graph Interface
 * 
 * Displays the hierarchical organization of temporal books and library shelves
 * implementing the KNG concept for browsing knowledge narratives across time
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  Badge
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Book as BookIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Archive as ArchiveIcon,
  Star as StarIcon,
  AccessTime as AccessTimeIcon,
  DateRange as DateRangeIcon,
  Timeline as TimelineIcon,
  LocalLibrary as LibraryIcon,
  MenuBook as MenuBookIcon,
  AutoStories as AutoStoriesIcon
} from '@mui/icons-material'
import { 
  TemporalNarrativeService, 
  TemporalBook, 
  LibraryShelf, 
  TemporalScale,
  defaultTemporalNarrativeConfig 
} from '../services/temporal-narrative-service'

interface TemporalLibraryProps {
  onBookLoad?: (bookId: string) => void
}

const TemporalLibrary: React.FC<TemporalLibraryProps> = ({ onBookLoad }) => {
  const [narrativeService] = useState(() => new TemporalNarrativeService(defaultTemporalNarrativeConfig))
  const [shelves, setShelves] = useState<LibraryShelf[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TemporalBook[]>([])
  const [expandedShelves, setExpandedShelves] = useState<Set<string>>(new Set(['active']))

  // Load library data
  useEffect(() => {
    const loadLibrary = () => {
      const libraryShelves = narrativeService.getLibraryShelves()
      setShelves(libraryShelves)
      
      // Auto-expand the active shelf
      if (libraryShelves.length > 0) {
        setExpandedShelves(new Set([libraryShelves[0].id]))
      }
    }
    
    loadLibrary()
  }, [narrativeService])

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    
    if (query.trim()) {
      const results = narrativeService.searchBooks(query)
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }, [narrativeService])

  // Toggle shelf expansion
  const toggleShelf = (shelfId: string) => {
    const newExpanded = new Set(expandedShelves)
    if (newExpanded.has(shelfId)) {
      newExpanded.delete(shelfId)
    } else {
      newExpanded.add(shelfId)
    }
    setExpandedShelves(newExpanded)
  }

  // Get shelf icon based on category
  const getShelfIcon = (category: LibraryShelf['category']) => {
    switch (category) {
      case 'active': return <TrendingUpIcon color="primary" />
      case 'recent': return <AccessTimeIcon color="secondary" />
      case 'reference': return <StarIcon color="warning" />
      case 'archived': return <ArchiveIcon color="disabled" />
      default: return <BookIcon />
    }
  }

  // Get time scale icon
  const getTimeScaleIcon = (scale: TemporalScale) => {
    switch (scale) {
      case 'minute':
      case 'hour': return <AccessTimeIcon fontSize="small" />
      case 'day': return <DateRangeIcon fontSize="small" />
      case 'week':
      case 'month': return <TimelineIcon fontSize="small" />
      case 'year': return <ScheduleIcon fontSize="small" />
      default: return <TimelineIcon fontSize="small" />
    }
  }

  // Format time scale for display
  const formatTimeScale = (scale: TemporalScale) => {
    return scale.charAt(0).toUpperCase() + scale.slice(1)
  }

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Render a temporal book
  const renderBook = (book: TemporalBook) => (
    <Card key={book.id} sx={{ mb: 1, transition: 'all 0.2s ease' }}>
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {getTimeScaleIcon(book.timeScale)}
          <Typography variant="subtitle2" fontWeight="bold">
            {book.title}
          </Typography>
          <Chip 
            label={formatTimeScale(book.timeScale)} 
            size="small" 
            variant="outlined"
            sx={{ ml: 'auto' }}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {book.description}
        </Typography>

        {/* Persistent themes */}
        {book.persistentThemes.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap' }}>
            {book.persistentThemes.slice(0, 3).map(theme => (
              <Chip 
                key={theme}
                label={theme} 
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
            {book.persistentThemes.length > 3 && (
              <Chip 
                label={`+${book.persistentThemes.length - 3} more`}
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        )}

        {/* Book stats */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {book.graphs.length} graph{book.graphs.length !== 1 ? 's' : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Depth: {book.narrativeDepth}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatRelativeTime(book.modified)}
          </Typography>
        </Box>
      </CardContent>
      
      <CardActions sx={{ pt: 0 }}>
        <Button 
          size="small" 
          startIcon={<MenuBookIcon />}
          onClick={() => onBookLoad?.(book.id)}
        >
          Open Book
        </Button>
        <Button 
          size="small"
          startIcon={<AutoStoriesIcon />}
          onClick={() => {
            // Load the most recent graph from this book
            if (book.graphs.length > 0) {
              // For now, just trigger book load - we'll need to implement graph loading from book
              onBookLoad?.(book.id)
            }
          }}
        >
          Read Story
        </Button>
      </CardActions>
    </Card>
  )

  // Render a library shelf
  const renderShelf = (shelf: LibraryShelf) => {
    const books = narrativeService.getBooksOnShelf(shelf.id)
    const isExpanded = expandedShelves.has(shelf.id)

    return (
      <Accordion 
        key={shelf.id}
        expanded={isExpanded}
        onChange={() => toggleShelf(shelf.id)}
        sx={{ mb: 1 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            {getShelfIcon(shelf.category)}
            <Typography variant="h6" fontWeight="bold">
              {shelf.name}
            </Typography>
            <Badge badgeContent={books.length} color="primary" sx={{ ml: 'auto' }}>
              <LibraryIcon />
            </Badge>
          </Box>
        </AccordionSummary>
        
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {shelf.description}
          </Typography>
          
          {/* Time span info */}
          <Box sx={{ mb: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Time Span:</strong> {shelf.timeSpan.start.toLocaleDateString()} → {shelf.timeSpan.end.toLocaleDateString()}
            </Typography>
            <br />
            <Typography variant="caption" color="text.secondary">
              <strong>Primary Scale:</strong> {formatTimeScale(shelf.timeSpan.primaryScale)}
            </Typography>
          </Box>

          {/* Books on shelf */}
          {books.length > 0 ? (
            <Box>
              {books.map(renderBook)}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
              <BookIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2">
                No books on this shelf yet
              </Typography>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    )
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
          <LibraryIcon />
          Temporal Library
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Knowledge narratives organized across time
        </Typography>
      </Box>

      {/* Search */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search books and narratives..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {searchQuery && searchResults.length > 0 ? (
          /* Search Results */
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Found {searchResults.length} book{searchResults.length !== 1 ? 's' : ''}
            </Typography>
            {searchResults.map(renderBook)}
          </Box>
        ) : searchQuery && searchResults.length === 0 ? (
          /* No Results */
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <SearchIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2">
              No books found for "{searchQuery}"
            </Typography>
          </Box>
        ) : (
          /* Library Shelves */
          <Box>
            <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center" gap={1}>
              <LibraryIcon fontSize="small" />
              Library Shelves ({shelves.length})
            </Typography>
            {shelves.length > 0 ? (
              shelves.map(renderShelf)
            ) : (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <LibraryIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                <Typography variant="body2">
                  Your library is empty. Save some graphs to create your first temporal books!
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default TemporalLibrary
