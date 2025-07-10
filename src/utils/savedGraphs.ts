/**
 * Saved Graphs Utility
 * 
 * Provides functionality for saving, loading, and managing graph configurations
 * Includes persistence to localStorage with proper serialization
 */

import { GraphNode, GraphEdge } from '@/types/graph';

/**
 * Saved graph configuration interface
 */
export interface SavedGraph {
  id: string;
  name: string;
  description?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    created: Date;
    modified: Date;
    nodeCount: number;
    edgeCount: number;
    tags: string[];
    layout?: string;
  };
  thumbnail?: string; // Base64 encoded image
}

/**
 * Graph library interface for managing saved graphs
 */
export interface GraphLibrary {
  graphs: SavedGraph[];
  version: string;
  lastModified: Date;
}

/**
 * SavedGraphsManager - Handles persistence and management of saved graphs
 */
export class SavedGraphsManager {
  private static readonly STORAGE_KEY = 'cognitive-graph-library';
  private static readonly VERSION = '1.0.0';

  /**
   * Save a graph configuration to the library
   * @param name - Human-readable name for the graph
   * @param description - Optional description
   * @param nodes - Graph nodes
   * @param edges - Graph edges
   * @param tags - Optional tags for categorization
   * @param layout - Optional layout algorithm used
   * @returns Promise resolving to the saved graph
   */
  static async saveGraph(
    name: string,
    description: string = '',
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>,
    tags: string[] = [],
    layout?: string
  ): Promise<SavedGraph> {
    const nodeArray = Array.from(nodes.values());
    const edgeArray = Array.from(edges.values());

    const savedGraph: SavedGraph = {
      id: crypto.randomUUID(),
      name,
      description,
      nodes: nodeArray,
      edges: edgeArray,
      metadata: {
        created: new Date(),
        modified: new Date(),
        nodeCount: nodeArray.length,
        edgeCount: edgeArray.length,
        tags,
        layout,
      },
    };

    const library = this.getLibrary();
    library.graphs.push(savedGraph);
    library.lastModified = new Date();

    this.saveLibrary(library);
    return savedGraph;
  }

  /**
   * Load a graph configuration from the library
   * @param graphId - ID of the graph to load
   * @returns Promise resolving to the graph data or null if not found
   */
  static async loadGraph(graphId: string): Promise<SavedGraph | null> {
    const library = this.getLibrary();
    const graph = library.graphs.find(g => g.id === graphId);
    return graph || null;
  }

  /**
   * Get all saved graphs from the library
   * @returns Promise resolving to array of saved graphs
   */
  static async getAllGraphs(): Promise<SavedGraph[]> {
    const library = this.getLibrary();
    return library.graphs.sort((a, b) => 
      new Date(b.metadata.modified).getTime() - new Date(a.metadata.modified).getTime()
    );
  }

  /**
   * Delete a saved graph from the library
   * @param graphId - ID of the graph to delete
   * @returns Promise resolving to success status
   */
  static async deleteGraph(graphId: string): Promise<boolean> {
    const library = this.getLibrary();
    const initialLength = library.graphs.length;
    
    library.graphs = library.graphs.filter(g => g.id !== graphId);
    library.lastModified = new Date();

    if (library.graphs.length < initialLength) {
      this.saveLibrary(library);
      return true;
    }
    
    return false;
  }

  /**
   * Update an existing saved graph
   * @param graphId - ID of the graph to update
   * @param updates - Partial graph data to update
   * @returns Promise resolving to updated graph or null if not found
   */
  static async updateGraph(
    graphId: string, 
    updates: Partial<Omit<SavedGraph, 'id' | 'metadata'>>
  ): Promise<SavedGraph | null> {
    const library = this.getLibrary();
    const graphIndex = library.graphs.findIndex(g => g.id === graphId);
    
    if (graphIndex === -1) {
      return null;
    }

    const existingGraph = library.graphs[graphIndex];
    const updatedGraph: SavedGraph = {
      ...existingGraph,
      ...updates,
      metadata: {
        ...existingGraph.metadata,
        modified: new Date(),
        nodeCount: updates.nodes?.length ?? existingGraph.metadata.nodeCount,
        edgeCount: updates.edges?.length ?? existingGraph.metadata.edgeCount,
      },
    };

    library.graphs[graphIndex] = updatedGraph;
    library.lastModified = new Date();
    
    this.saveLibrary(library);
    return updatedGraph;
  }

  /**
   * Search saved graphs by name, description, or tags
   * @param query - Search query string
   * @returns Promise resolving to matching graphs
   */
  static async searchGraphs(query: string): Promise<SavedGraph[]> {
    const library = this.getLibrary();
    const lowercaseQuery = query.toLowerCase();

    return library.graphs.filter(graph => 
      graph.name.toLowerCase().includes(lowercaseQuery) ||
      graph.description?.toLowerCase().includes(lowercaseQuery) ||
      graph.metadata.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Get graphs by tag
   * @param tag - Tag to filter by
   * @returns Promise resolving to graphs with the specified tag
   */
  static async getGraphsByTag(tag: string): Promise<SavedGraph[]> {
    const library = this.getLibrary();
    return library.graphs.filter(graph => 
      graph.metadata.tags.includes(tag)
    );
  }

  /**
   * Export graph library as JSON
   * @returns JSON string of the entire library
   */
  static exportLibrary(): string {
    const library = this.getLibrary();
    return JSON.stringify(library, this.dateReplacer, 2);
  }

  /**
   * Import graph library from JSON
   * @param jsonData - JSON string containing library data
   * @param merge - Whether to merge with existing library (default: false)
   * @returns Promise resolving to success status
   */
  static async importLibrary(jsonData: string, merge: boolean = false): Promise<boolean> {
    try {
      const importedLibrary: GraphLibrary = JSON.parse(jsonData, this.dateReviver);
      
      if (!this.validateLibrary(importedLibrary)) {
        throw new Error('Invalid library format');
      }

      if (merge) {
        const existingLibrary = this.getLibrary();
        // Merge graphs, avoiding duplicates by ID
        const existingIds = new Set(existingLibrary.graphs.map(g => g.id));
        const newGraphs = importedLibrary.graphs.filter(g => !existingIds.has(g.id));
        
        existingLibrary.graphs.push(...newGraphs);
        existingLibrary.lastModified = new Date();
        
        this.saveLibrary(existingLibrary);
      } else {
        this.saveLibrary(importedLibrary);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import library:', error);
      return false;
    }
  }

  /**
   * Clear all saved graphs
   * @returns Promise resolving when complete
   */
  static async clearLibrary(): Promise<void> {
    const emptyLibrary: GraphLibrary = {
      graphs: [],
      version: this.VERSION,
      lastModified: new Date(),
    };
    
    this.saveLibrary(emptyLibrary);
  }

  /**
   * Get library statistics
   * @returns Library stats object
   */
  static getLibraryStats(): {
    totalGraphs: number;
    totalNodes: number;
    totalEdges: number;
    tags: string[];
    lastModified: Date;
  } {
    const library = this.getLibrary();
    
    const totalNodes = library.graphs.reduce((sum, graph) => sum + graph.metadata.nodeCount, 0);
    const totalEdges = library.graphs.reduce((sum, graph) => sum + graph.metadata.edgeCount, 0);
    const allTags = library.graphs.flatMap(graph => graph.metadata.tags);
    const uniqueTags = Array.from(new Set(allTags));

    return {
      totalGraphs: library.graphs.length,
      totalNodes,
      totalEdges,
      tags: uniqueTags,
      lastModified: library.lastModified,
    };
  }

  /**
   * Private: Get library from localStorage with proper deserialization
   */
  private static getLibrary(): GraphLibrary {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return this.createEmptyLibrary();
      }

      const library = JSON.parse(stored, this.dateReviver);
      
      if (!this.validateLibrary(library)) {
        console.warn('Invalid library format, creating new library');
        return this.createEmptyLibrary();
      }

      return library;
    } catch (error) {
      console.error('Failed to load library:', error);
      return this.createEmptyLibrary();
    }
  }

  /**
   * Private: Save library to localStorage with proper serialization
   */
  private static saveLibrary(library: GraphLibrary): void {
    try {
      const serialized = JSON.stringify(library, this.dateReplacer);
      localStorage.setItem(this.STORAGE_KEY, serialized);
    } catch (error) {
      console.error('Failed to save library:', error);
    }
  }

  /**
   * Private: Create empty library structure
   */
  private static createEmptyLibrary(): GraphLibrary {
    return {
      graphs: [],
      version: this.VERSION,
      lastModified: new Date(),
    };
  }

  /**
   * Private: Validate library structure
   */
  private static validateLibrary(library: any): library is GraphLibrary {
    return (
      library &&
      typeof library === 'object' &&
      Array.isArray(library.graphs) &&
      typeof library.version === 'string' &&
      library.lastModified instanceof Date
    );
  }

  /**
   * Private: JSON replacer for Date objects
   */
  private static dateReplacer(key: string, value: any): any {
    if (value instanceof Date) {
      return { __date: value.toISOString() };
    }
    return value;
  }

  /**
   * Private: JSON reviver for Date objects
   */
  private static dateReviver(key: string, value: any): any {
    if (value && typeof value === 'object' && value.__date) {
      return new Date(value.__date);
    }
    return value;
  }
}

export default SavedGraphsManager;
