/**
 * Utility script to clear corrupted localStorage data
 * Run this in browser console if you encounter date serialization errors
 */

console.log('Clearing Cognitive Graph Studio localStorage...')

// Clear all related storage
localStorage.removeItem('cognitive-graph-storage')
sessionStorage.clear()

// Clear any other related keys
Object.keys(localStorage).forEach(key => {
  if (key.includes('cognitive') || key.includes('graph')) {
    localStorage.removeItem(key)
    console.log('Removed:', key)
  }
})

console.log('Storage cleared! Refresh the page to start fresh.')
