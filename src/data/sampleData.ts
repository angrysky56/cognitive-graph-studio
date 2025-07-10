/**
 * Sample Data for Cognitive Graph Studio
 * 
 * Provides initial graph data to demonstrate the React Flow-based 
 * visualization with different node types and relationships
 */

import { GraphNode, GraphEdge } from '@/types/graph';

/**
 * Sample nodes representing different types of cognitive entities
 */
export const sampleNodes: GraphNode[] = [
  // Concept nodes
  {
    id: 'concept-1',
    label: 'Artificial Intelligence',
    content: 'The simulation of human intelligence in machines that are programmed to think and learn like humans.',
    type: 'concept',
    position: { x: 200, y: 100 },
    metadata: {
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-15'),
      tags: ['technology', 'intelligence', 'automation'],
      color: '#4da6ff',
    },
    connections: ['concept-2', 'source-1', 'idea-1'],
    aiGenerated: false,
  },
  {
    id: 'concept-2',
    label: 'Machine Learning',
    content: 'A subset of AI that enables computers to learn and improve from experience without being explicitly programmed.',
    type: 'concept',
    position: { x: 400, y: 200 },
    metadata: {
      created: new Date('2024-01-02'),
      modified: new Date('2024-01-16'),
      tags: ['ml', 'algorithms', 'data science'],
      color: '#4da6ff',
    },
    connections: ['concept-1', 'concept-3', 'source-2'],
    aiGenerated: false,
  },
  {
    id: 'concept-3',
    label: 'Neural Networks',
    content: 'Computing systems inspired by biological neural networks that process information using connectionist approaches.',
    type: 'concept',
    position: { x: 600, y: 300 },
    metadata: {
      created: new Date('2024-01-03'),
      modified: new Date('2024-01-17'),
      tags: ['deep learning', 'neural networks', 'backpropagation'],
      color: '#4da6ff',
    },
    connections: ['concept-2', 'source-3'],
    aiGenerated: false,
  },

  // Source nodes
  {
    id: 'source-1',
    label: 'Attention Is All You Need (2017)',
    content: 'Seminal paper introducing the Transformer architecture that revolutionized natural language processing.',
    type: 'source',
    position: { x: 100, y: 300 },
    metadata: {
      created: new Date('2024-01-04'),
      modified: new Date('2024-01-18'),
      tags: ['transformer', 'attention', 'nlp'],
      author: 'Vaswani et al.',
      sourceType: 'paper',
      published: new Date('2017-06-12'),
      url: 'https://arxiv.org/abs/1706.03762',
    },
    connections: ['concept-1', 'idea-2'],
    aiGenerated: false,
  },
  {
    id: 'source-2',
    label: 'Deep Learning (Goodfellow et al.)',
    content: 'Comprehensive textbook covering the mathematical foundations and practical applications of deep learning.',
    type: 'source',
    position: { x: 500, y: 400 },
    metadata: {
      created: new Date('2024-01-05'),
      modified: new Date('2024-01-19'),
      tags: ['textbook', 'deep learning', 'reference'],
      author: 'Ian Goodfellow, Yoshua Bengio, Aaron Courville',
      sourceType: 'book',
      published: new Date('2016-11-18'),
      url: 'https://www.deeplearningbook.org/',
    },
    connections: ['concept-2', 'concept-3'],
    aiGenerated: false,
  },
  {
    id: 'source-3',
    label: 'AlexNet Paper (2012)',
    content: 'Breakthrough paper that demonstrated the effectiveness of deep convolutional neural networks for image classification.',
    type: 'source',
    position: { x: 700, y: 150 },
    metadata: {
      created: new Date('2024-01-06'),
      modified: new Date('2024-01-20'),
      tags: ['cnn', 'computer vision', 'breakthrough'],
      author: 'Krizhevsky et al.',
      sourceType: 'paper',
      published: new Date('2012-12-03'),
      url: 'https://papers.nips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks',
    },
    connections: ['concept-3'],
    aiGenerated: false,
  },

  // Idea nodes
  {
    id: 'idea-1',
    label: 'AI-Human Collaboration Framework',
    content: 'A systematic approach to designing AI systems that augment human capabilities rather than replace them, focusing on complementary strengths.',
    type: 'idea',
    position: { x: 50, y: 150 },
    metadata: {
      created: new Date('2024-01-07'),
      modified: new Date('2024-01-21'),
      tags: ['collaboration', 'human-ai', 'framework'],
      confidence: 0.8,
      priority: 'high',
      favorite: true,
      status: 'active',
    },
    connections: ['concept-1', 'idea-2'],
    aiGenerated: true,
  },
  {
    id: 'idea-2',
    label: 'Attention-Based Graph Neural Networks',
    content: 'Combining attention mechanisms from Transformers with graph neural networks to better model complex relational data.',
    type: 'idea',
    position: { x: 300, y: 350 },
    metadata: {
      created: new Date('2024-01-08'),
      modified: new Date('2024-01-22'),
      tags: ['attention', 'gnn', 'innovation'],
      confidence: 0.6,
      priority: 'medium',
      favorite: false,
      status: 'draft',
    },
    connections: ['source-1', 'idea-1'],
    aiGenerated: true,
  },
  {
    id: 'idea-3',
    label: 'Interpretable AI Dashboard',
    content: 'A visual interface that makes AI decision-making processes transparent and understandable to non-technical users.',
    type: 'idea',
    position: { x: 450, y: 50 },
    metadata: {
      created: new Date('2024-01-09'),
      modified: new Date('2024-01-23'),
      tags: ['interpretability', 'visualization', 'ux'],
      confidence: 0.9,
      priority: 'high',
      favorite: true,
      status: 'reviewed',
    },
    connections: [],
    aiGenerated: false,
  },
];

/**
 * Sample edges representing different types of relationships
 */
export const sampleEdges: GraphEdge[] = [
  // Semantic relationships
  {
    id: 'edge-1',
    source: 'concept-1',
    target: 'concept-2',
    type: 'semantic',
    weight: 0.9,
    label: 'includes',
    metadata: {
      created: new Date('2024-01-10'),
      modified: new Date('2024-01-24'),
      confidence: 0.9,
      aiGenerated: false,
    },
  },
  {
    id: 'edge-2',
    source: 'concept-2',
    target: 'concept-3',
    type: 'semantic',
    weight: 0.8,
    label: 'implements',
    metadata: {
      created: new Date('2024-01-11'),
      modified: new Date('2024-01-25'),
      confidence: 0.8,
      aiGenerated: false,
    },
  },
  {
    id: 'edge-3',
    source: 'source-1',
    target: 'concept-1',
    type: 'semantic',
    weight: 0.7,
    label: 'contributes to',
    metadata: {
      created: new Date('2024-01-12'),
      modified: new Date('2024-01-26'),
      confidence: 0.7,
      aiGenerated: false,
    },
  },

  // Hierarchical relationships
  {
    id: 'edge-4',
    source: 'concept-1',
    target: 'idea-1',
    type: 'hierarchical',
    weight: 0.6,
    label: 'spawns',
    metadata: {
      created: new Date('2024-01-13'),
      modified: new Date('2024-01-27'),
      confidence: 0.6,
      aiGenerated: true,
      hierarchy: 'parent',
      depth: 1,
    },
  },
  {
    id: 'edge-5',
    source: 'source-1',
    target: 'idea-2',
    type: 'hierarchical',
    weight: 0.8,
    label: 'inspires',
    metadata: {
      created: new Date('2024-01-14'),
      modified: new Date('2024-01-28'),
      confidence: 0.8,
      aiGenerated: true,
      hierarchy: 'parent',
      depth: 1,
    },
  },

  // Additional semantic connections
  {
    id: 'edge-6',
    source: 'source-2',
    target: 'concept-2',
    type: 'semantic',
    weight: 0.9,
    label: 'explains',
    metadata: {
      created: new Date('2024-01-15'),
      modified: new Date('2024-01-29'),
      confidence: 0.9,
      aiGenerated: false,
    },
  },
  {
    id: 'edge-7',
    source: 'source-3',
    target: 'concept-3',
    type: 'semantic',
    weight: 0.8,
    label: 'demonstrates',
    metadata: {
      created: new Date('2024-01-16'),
      modified: new Date('2024-01-30'),
      confidence: 0.8,
      aiGenerated: false,
    },
  },
  {
    id: 'edge-8',
    source: 'idea-1',
    target: 'idea-2',
    type: 'semantic',
    weight: 0.5,
    label: 'relates to',
    metadata: {
      created: new Date('2024-01-17'),
      modified: new Date('2024-01-31'),
      confidence: 0.5,
      aiGenerated: true,
      bidirectional: true,
    },
  },
];

/**
 * Combined sample data for easy import
 */
export const sampleData = {
  nodes: sampleNodes,
  edges: sampleEdges,
};

export default sampleData;
