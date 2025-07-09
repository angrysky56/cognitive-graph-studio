/**
 * 3D Graph Visualization Service using Three.js
 * 
 * Implements the "3D visualization upgrade" concept from project blueprint.
 * Replaces 2D D3.js with immersive 3D Three.js rendering for enhanced
 * spatial knowledge exploration and cognitive graph navigation.
 * 
 * @module Graph3DService
 */

import * as THREE from 'three'
import { 
  EnhancedGraphNode, 
  EnhancedGraphEdge, 
  EnhancedGraphCluster 
} from '../types/enhanced-graph'

/**
 * 3D visualization configuration
 */
export interface Graph3DConfig {
  /** Renderer settings */
  renderer: {
    antialias: boolean
    alpha: boolean
    shadowMap: boolean
    pixelRatio: number
  }
  /** Camera configuration */
  camera: {
    fov: number
    near: number
    far: number
    initialPosition: { x: number; y: number; z: number }
  }
  /** Physics simulation settings */
  physics: {
    enabled: boolean
    gravity: number
    damping: number
    springStrength: number
    repulsionStrength: number
  }
  /** Visual effects */
  effects: {
    bloom: boolean
    fog: boolean
    particles: boolean
    animations: boolean
  }
  /** Performance optimization */
  performance: {
    maxNodes: number
    lodEnabled: boolean
    frustumCulling: boolean
    instancedRendering: boolean
  }
}

/**
 * 3D node visual properties
 */
export interface Node3DVisual {
  /** Node mesh object */
  mesh: THREE.Mesh
  /** Text label */
  label: THREE.Sprite
  /** Hover glow effect */
  glow: THREE.Mesh
  /** Selection indicator */
  selection: THREE.Mesh
  /** Connection points for edges */
  connectionPoints: THREE.Vector3[]
  /** Animation mixer for node animations */
  mixer?: THREE.AnimationMixer
}

/**
 * 3D edge visual properties
 */
export interface Edge3DVisual {
  /** Edge line or tube geometry */
  mesh: THREE.Mesh
  /** Directional arrow indicator */
  arrow?: THREE.Mesh
  /** Flow animation particles */
  particles: THREE.Points[]
  /** Edge label */
  label?: THREE.Sprite
}

/**
 * 3D cluster visual properties
 */
export interface Cluster3DVisual {
  /** Cluster boundary mesh */
  boundary: THREE.Mesh
  /** Cluster center indicator */
  center: THREE.Mesh
  /** Cluster label */
  label: THREE.Sprite
  /** Particle system for cluster effects */
  particles?: THREE.Points
}

/**
 * 3D interaction state
 */
export interface Graph3DInteraction {
  /** Currently hovered node */
  hoveredNode: string | null
  /** Selected nodes */
  selectedNodes: Set<string>
  /** Camera controls state */
  camera: {
    position: THREE.Vector3
    target: THREE.Vector3
    zoom: number
  }
  /** Mouse/touch interaction state */
  input: {
    mouse: THREE.Vector2
    isDragging: boolean
    dragStartPosition: THREE.Vector2
    dragTarget: string | null
  }
}

/**
 * 3D Graph visualization service interface
 * 
 * Provides immersive 3D rendering and interaction for cognitive graphs
 * with spatial navigation, physics simulation, and visual effects.
 */
export interface IGraph3DService {
  /**
   * Initialize 3D visualization with canvas and configuration
   * @param canvas - HTML canvas element for rendering
   * @param config - 3D visualization configuration
   * @returns Promise resolving when initialization is complete
   */
  initialize(canvas: HTMLCanvasElement, config: Graph3DConfig): Promise<void>

  /**
   * Update graph data and refresh visualization
   * @param nodes - Enhanced graph nodes
   * @param edges - Enhanced graph edges
   * @param clusters - Enhanced graph clusters
   * @returns Promise resolving when update is complete
   */
  updateGraph(
    nodes: EnhancedGraphNode[], 
    edges: EnhancedGraphEdge[], 
    clusters: EnhancedGraphCluster[]
  ): Promise<void>

  /**
   * Start animation loop and physics simulation
   * @returns Promise resolving when animation starts
   */
  startAnimation(): Promise<void>

  /**
   * Stop animation loop
   * @returns Promise resolving when animation stops
   */
  stopAnimation(): Promise<void>

  /**
   * Handle window resize events
   * @param width - New canvas width
   * @param height - New canvas height
   * @returns Promise resolving when resize is complete
   */
  handleResize(width: number, height: number): Promise<void>

  /**
   * Focus camera on specific node with smooth transition
   * @param nodeId - Node to focus on
   * @param duration - Animation duration in milliseconds
   * @returns Promise resolving when focus animation completes
   */
  focusOnNode(nodeId: string, duration: number): Promise<void>

  /**
   * Set camera view mode
   * @param mode - View mode type
   * @returns Promise resolving when view change completes
   */
  setViewMode(mode: 'free' | 'orbit' | 'fly' | 'top-down'): Promise<void>

  /**
   * Enable/disable physics simulation
   * @param enabled - Physics enabled state
   * @returns Promise resolving when physics state changes
   */
  setPhysicsEnabled(enabled: boolean): Promise<void>

  /**
   * Get current interaction state
   * @returns Current interaction state
   */
  getInteractionState(): Graph3DInteraction

  /**
   * Export current view as image
   * @param width - Export image width
   * @param height - Export image height
   * @param format - Image format
   * @returns Promise resolving to image data URL
   */
  exportImage(width: number, height: number, format: 'png' | 'jpg'): Promise<string>

  /**
   * Dispose of all 3D resources
   * @returns Promise resolving when cleanup is complete
   */
  dispose(): Promise<void>
}

/**
 * 3D Graph visualization service implementation
 * 
 * Provides high-performance 3D rendering with Three.js, physics simulation,
 * and interactive exploration for cognitive graphs.
 */
export class Graph3DService implements IGraph3DService {
  private config: Graph3DConfig | null = null
  private canvas: HTMLCanvasElement | null = null
  
  // Three.js core objects
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private renderer: THREE.WebGLRenderer | null = null
  
  // Graph visual objects
  private nodeVisuals: Map<string, Node3DVisual> = new Map()
  private edgeVisuals: Map<string, Edge3DVisual> = new Map()
  private clusterVisuals: Map<string, Cluster3DVisual> = new Map()
  
  // Interaction and animation
  private interaction: Graph3DInteraction
  private animationId: number | null = null
  private clock: THREE.Clock = new THREE.Clock()
  
  // Physics simulation (simplified)
  private physicsEnabled = true
  private nodePositions: Map<string, THREE.Vector3> = new Map()
  private nodeVelocities: Map<string, THREE.Vector3> = new Map()
  
  // Event handlers
  private eventHandlers: Map<string, EventListener> = new Map()

  constructor() {
    this.interaction = {
      hoveredNode: null,
      selectedNodes: new Set(),
      camera: {
        position: new THREE.Vector3(0, 0, 100),
        target: new THREE.Vector3(0, 0, 0),
        zoom: 1
      },
      input: {
        mouse: new THREE.Vector2(),
        isDragging: false,
        dragStartPosition: new THREE.Vector2(),
        dragTarget: null
      }
    }
  }

  /**
   * Initialize 3D visualization
   */
  async initialize(canvas: HTMLCanvasElement, config: Graph3DConfig): Promise<void> {
    this.canvas = canvas
    this.config = config

    // Initialize Three.js scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0a0f)

    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      config.camera.fov,
      canvas.width / canvas.height,
      config.camera.near,
      config.camera.far
    )
    this.camera.position.copy(new THREE.Vector3().copy(config.camera.initialPosition as any))

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: config.renderer.antialias,
      alpha: config.renderer.alpha
    })
    this.renderer.setPixelRatio(window.devicePixelRatio * config.renderer.pixelRatio)
    this.renderer.setSize(canvas.width, canvas.height)
    
    if (config.renderer.shadowMap) {
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }

    // Setup lighting
    this.setupLighting()

    // Setup fog effect
    if (config.effects.fog) {
      this.scene.fog = new THREE.Fog(0x0a0a0f, 50, 500)
    }

    // Setup event listeners
    this.setupEventListeners()

    // Initialize post-processing effects
    if (config.effects.bloom) {
      await this.setupBloomEffect()
    }
  }

  /**
   * Update graph visualization
   */
  async updateGraph(
    nodes: EnhancedGraphNode[], 
    edges: EnhancedGraphEdge[], 
    clusters: EnhancedGraphCluster[]
  ): Promise<void> {
    if (!this.scene || !this.config) return

    // Clear existing visuals
    this.clearVisuals()

    // Create node visuals
    for (const node of nodes) {
      await this.createNodeVisual(node)
    }

    // Create edge visuals
    for (const edge of edges) {
      await this.createEdgeVisual(edge, nodes)
    }

    // Create cluster visuals
    for (const cluster of clusters) {
      await this.createClusterVisual(cluster, nodes)
    }

    // Initialize physics positions
    this.initializePhysics(nodes, edges)
  }

  /**
   * Start animation loop
   */
  async startAnimation(): Promise<void> {
    if (this.animationId) return

    const animate = () => {
      this.animationId = requestAnimationFrame(animate)
      
      const delta = this.clock.getDelta()
      
      // Update physics simulation
      if (this.physicsEnabled) {
        this.updatePhysics(delta)
      }
      
      // Update animations
      this.updateAnimations(delta)
      
      // Render scene
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera)
      }
    }

    animate()
  }

  /**
   * Stop animation loop
   */
  async stopAnimation(): Promise<void> {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  /**
   * Handle canvas resize
   */
  async handleResize(width: number, height: number): Promise<void> {
    if (!this.camera || !this.renderer) return

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  /**
   * Focus camera on specific node
   */
  async focusOnNode(nodeId: string, duration: number): Promise<void> {
    const nodeVisual = this.nodeVisuals.get(nodeId)
    if (!nodeVisual || !this.camera) return

    const targetPosition = nodeVisual.mesh.position.clone()
    targetPosition.z += 50 // Offset for viewing

    return new Promise(resolve => {
      const startPosition = this.camera!.position.clone()
      const startTime = Date.now()

      const animateCamera = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = this.easeInOutCubic(progress)

        this.camera!.position.lerpVectors(startPosition, targetPosition, eased)
        this.camera!.lookAt(nodeVisual.mesh.position)

        if (progress < 1) {
          requestAnimationFrame(animateCamera)
        } else {
          resolve()
        }
      }

      animateCamera()
    })
  }

  /**
   * Set camera view mode
   */
  async setViewMode(mode: 'free' | 'orbit' | 'fly' | 'top-down'): Promise<void> {
    if (!this.camera) return

    switch (mode) {
      case 'top-down':
        this.camera.position.set(0, 200, 0)
        this.camera.lookAt(0, 0, 0)
        break
      case 'free':
        // Default free camera - no constraints
        break
      // Add other view modes as needed
    }
  }

  /**
   * Enable/disable physics simulation
   */
  async setPhysicsEnabled(enabled: boolean): Promise<void> {
    this.physicsEnabled = enabled
  }

  /**
   * Get current interaction state
   */
  getInteractionState(): Graph3DInteraction {
    return { ...this.interaction }
  }

  /**
   * Export current view as image
   */
  async exportImage(width: number, height: number, format: 'png' | 'jpg'): Promise<string> {
    if (!this.renderer || !this.scene || !this.camera) {
      throw new Error('3D service not initialized')
    }

    // Temporarily resize for export
    const originalSize = this.renderer.getSize(new THREE.Vector2())
    this.renderer.setSize(width, height)
    
    // Render at export resolution
    this.renderer.render(this.scene, this.camera)
    
    // Get image data
    const dataURL = this.renderer.domElement.toDataURL(`image/${format}`)
    
    // Restore original size
    this.renderer.setSize(originalSize.x, originalSize.y)
    
    return dataURL
  }

  /**
   * Dispose of all 3D resources
   */
  async dispose(): Promise<void> {
    // Stop animation
    await this.stopAnimation()

    // Remove event listeners
    this.removeEventListeners()

    // Dispose of visuals
    this.clearVisuals()

    // Dispose of Three.js objects
    if (this.renderer) {
      this.renderer.dispose()
    }

    // Clear references
    this.scene = null
    this.camera = null
    this.renderer = null
    this.canvas = null
  }

  /**
   * Setup scene lighting
   */
  private setupLighting(): void {
    if (!this.scene) return

    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    this.scene.add(ambientLight)

    // Directional light for shadows and depth
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(50, 50, 50)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    this.scene.add(directionalLight)

    // Point lights for dynamic illumination
    const pointLight1 = new THREE.PointLight(0x4da6ff, 0.5, 100)
    pointLight1.position.set(25, 25, 25)
    this.scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xffca80, 0.5, 100)
    pointLight2.position.set(-25, -25, 25)
    this.scene.add(pointLight2)
  }

  /**
   * Setup bloom post-processing effect
   */
  private async setupBloomEffect(): Promise<void> {
    // Placeholder for bloom effect setup
    // Would use EffectComposer, RenderPass, and UnrealBloomPass
    console.log('Setting up bloom effect...')
  }

  /**
   * Create visual representation for a node
   */
  private async createNodeVisual(node: EnhancedGraphNode): Promise<void> {
    if (!this.scene) return

    // Create node geometry based on type
    let geometry: THREE.BufferGeometry
    
    switch (node.type) {
      case 'concept':
        geometry = new THREE.SphereGeometry(8, 16, 16)
        break
      case 'idea':
        geometry = new THREE.BoxGeometry(10, 10, 10)
        break
      case 'source':
        geometry = new THREE.ConeGeometry(6, 12, 8)
        break
      default:
        geometry = new THREE.SphereGeometry(6, 12, 12)
    }

    // Create material with node color
    const material = new THREE.MeshPhongMaterial({
      color: node.metadata.color || 0x4da6ff,
      transparent: true,
      opacity: 0.8
    })

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(
      node.position3D?.x || Math.random() * 100 - 50,
      node.position3D?.y || Math.random() * 100 - 50,
      node.position3D?.z || Math.random() * 100 - 50
    )
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData = { nodeId: node.id }

    // Create text label
    const label = this.createTextSprite(node.label, 16)
    label.position.copy(mesh.position)
    label.position.y += 15

    // Create glow effect
    const glowGeometry = new THREE.SphereGeometry(12, 16, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: node.metadata.color || 0x4da6ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.position.copy(mesh.position)

    // Create selection indicator
    const selectionGeometry = new THREE.RingGeometry(10, 12, 16)
    const selectionMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    })
    const selection = new THREE.Mesh(selectionGeometry, selectionMaterial)
    selection.position.copy(mesh.position)

    // Add to scene
    this.scene.add(mesh)
    this.scene.add(label)
    this.scene.add(glow)
    this.scene.add(selection)

    // Store visual components
    this.nodeVisuals.set(node.id, {
      mesh,
      label,
      glow,
      selection,
      connectionPoints: [mesh.position.clone()]
    })

    // Store physics data
    this.nodePositions.set(node.id, mesh.position.clone())
    this.nodeVelocities.set(node.id, new THREE.Vector3())
  }

  /**
   * Create visual representation for an edge
   */
  private async createEdgeVisual(edge: EnhancedGraphEdge, nodes: EnhancedGraphNode[]): Promise<void> {
    if (!this.scene) return

    const sourceNode = nodes.find(n => n.id === edge.source)
    const targetNode = nodes.find(n => n.id === edge.target)
    
    if (!sourceNode || !targetNode) return

    const sourceVisual = this.nodeVisuals.get(edge.source)
    const targetVisual = this.nodeVisuals.get(edge.target)
    
    if (!sourceVisual || !targetVisual) return

    // Create edge geometry
    const points = [
      sourceVisual.mesh.position.clone(),
      targetVisual.mesh.position.clone()
    ]

    const geometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      16, // tubular segments
      edge.visual?.curvature || 0.5, // radius
      8, // radial segments
      false // closed
    )

    const material = new THREE.MeshPhongMaterial({
      color: edge.visual?.color || 0xaaaaaa,
      transparent: true,
      opacity: edge.visual?.opacity || 0.6
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.userData = { edgeId: edge.id }

    this.scene.add(mesh)

    // Create edge label if specified
    let label: THREE.Sprite | undefined
    if (edge.label) {
      const midpoint = new THREE.Vector3().addVectors(
        sourceVisual.mesh.position,
        targetVisual.mesh.position
      ).multiplyScalar(0.5)

      label = this.createTextSprite(edge.label, 12)
      label.position.copy(midpoint)
      this.scene.add(label)
    }

    // Store visual components
    this.edgeVisuals.set(edge.id, {
      mesh,
      label,
      particles: []
    })
  }

  /**
   * Create visual representation for a cluster
   */
  private async createClusterVisual(cluster: EnhancedGraphCluster, nodes: EnhancedGraphNode[]): Promise<void> {
    if (!this.scene) return

    // Calculate cluster bounds
    const clusterNodes = nodes.filter(n => cluster.nodeIds.includes(n.id))
    if (clusterNodes.length === 0) return

    const bounds = this.calculateClusterBounds(clusterNodes)

    // Create cluster boundary
    const boundaryGeometry = new THREE.SphereGeometry(bounds.radius, 16, 16)
    const boundaryMaterial = new THREE.MeshBasicMaterial({
      color: cluster.properties.color,
      transparent: true,
      opacity: 0.1,
      wireframe: true
    })
    const boundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial)
    boundary.position.copy(bounds.center)

    // Create cluster center
    const centerGeometry = new THREE.SphereGeometry(2, 8, 8)
    const centerMaterial = new THREE.MeshBasicMaterial({
      color: cluster.properties.color
    })
    const center = new THREE.Mesh(centerGeometry, centerMaterial)
    center.position.copy(bounds.center)

    // Create cluster label
    const label = this.createTextSprite(cluster.label, 14)
    label.position.copy(bounds.center)
    label.position.y += bounds.radius + 10

    this.scene.add(boundary)
    this.scene.add(center)
    this.scene.add(label)

    this.clusterVisuals.set(cluster.id, {
      boundary,
      center,
      label
    })
  }

  /**
   * Create text sprite for labels
   */
  private createTextSprite(text: string, size: number): THREE.Sprite {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    
    canvas.width = 256
    canvas.height = 128
    
    context.fillStyle = 'rgba(0, 0, 0, 0)'
    context.fillRect(0, 0, canvas.width, canvas.height)
    
    context.fillStyle = '#ffffff'
    context.font = `${size}px Arial`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, canvas.width / 2, canvas.height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture })
    const sprite = new THREE.Sprite(material)
    
    sprite.scale.set(20, 10, 1)
    
    return sprite
  }

  /**
   * Calculate cluster bounds from nodes
   */
  private calculateClusterBounds(nodes: EnhancedGraphNode[]): {
    center: THREE.Vector3
    radius: number
  } {
    const positions = nodes.map(node => {
      const visual = this.nodeVisuals.get(node.id)
      return visual ? visual.mesh.position : new THREE.Vector3()
    })

    // Calculate center
    const center = new THREE.Vector3()
    positions.forEach(pos => center.add(pos))
    center.divideScalar(positions.length)

    // Calculate radius
    let maxDistance = 0
    positions.forEach(pos => {
      const distance = center.distanceTo(pos)
      maxDistance = Math.max(maxDistance, distance)
    })

    return {
      center,
      radius: maxDistance + 15 // Add padding
    }
  }

  /**
   * Setup event listeners for interaction
   */
  private setupEventListeners(): void {
    if (!this.canvas) return

    const handleMouseMove = (event: MouseEvent) => {
      this.updateMousePosition(event)
      this.handleHover()
    }

    const handleMouseDown = (event: MouseEvent) => {
      this.interaction.input.isDragging = true
      this.interaction.input.dragStartPosition.set(event.clientX, event.clientY)
    }

    const handleMouseUp = () => {
      this.interaction.input.isDragging = false
      this.interaction.input.dragTarget = null
    }

    const handleClick = (event: MouseEvent) => {
      this.handleNodeSelection(event)
    }

    this.canvas.addEventListener('mousemove', handleMouseMove)
    this.canvas.addEventListener('mousedown', handleMouseDown)
    this.canvas.addEventListener('mouseup', handleMouseUp)
    this.canvas.addEventListener('click', handleClick)

    this.eventHandlers.set('mousemove', handleMouseMove as EventListener)
    this.eventHandlers.set('mousedown', handleMouseDown as EventListener)
    this.eventHandlers.set('mouseup', handleMouseUp as EventListener)
    this.eventHandlers.set('click', handleClick as EventListener)
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    if (!this.canvas) return

    this.eventHandlers.forEach((handler, event) => {
      this.canvas!.removeEventListener(event, handler)
    })
    this.eventHandlers.clear()
  }

  /**
   * Update mouse position for raycasting
   */
  private updateMousePosition(event: MouseEvent): void {
    if (!this.canvas) return

    const rect = this.canvas.getBoundingClientRect()
    this.interaction.input.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.interaction.input.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  /**
   * Handle node hover detection
   */
  private handleHover(): void {
    if (!this.camera || !this.scene) return

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(this.interaction.input.mouse, this.camera)

    const nodeObjects = Array.from(this.nodeVisuals.values()).map(visual => visual.mesh)
    const intersects = raycaster.intersectObjects(nodeObjects)

    // Clear previous hover
    if (this.interaction.hoveredNode) {
      const prevVisual = this.nodeVisuals.get(this.interaction.hoveredNode)
      if (prevVisual) {
        (prevVisual.glow.material as THREE.MeshBasicMaterial).opacity = 0
      }
    }

    // Set new hover
    if (intersects.length > 0) {
      const nodeId = intersects[0].object.userData.nodeId
      this.interaction.hoveredNode = nodeId
      
      const visual = this.nodeVisuals.get(nodeId)
      if (visual) {
        (visual.glow.material as THREE.MeshBasicMaterial).opacity = 0.3
      }
    } else {
      this.interaction.hoveredNode = null
    }
  }

  /**
   * Handle node selection
   */
  private handleNodeSelection(_event: MouseEvent): void {
    if (!this.interaction.hoveredNode) return

    const nodeId = this.interaction.hoveredNode
    const visual = this.nodeVisuals.get(nodeId)
    
    if (!visual) return

    if (this.interaction.selectedNodes.has(nodeId)) {
      // Deselect
      this.interaction.selectedNodes.delete(nodeId);
      (visual.selection.material as THREE.MeshBasicMaterial).opacity = 0
    } else {
      // Select
      this.interaction.selectedNodes.add(nodeId);
      (visual.selection.material as THREE.MeshBasicMaterial).opacity = 0.8
    }
  }

  /**
   * Initialize physics simulation
   */
  private initializePhysics(nodes: EnhancedGraphNode[], _edges: EnhancedGraphEdge[]): void {
    if (!this.config?.physics.enabled) return

    // Initialize node positions and velocities
    nodes.forEach(node => {
      const visual = this.nodeVisuals.get(node.id)
      if (visual) {
        this.nodePositions.set(node.id, visual.mesh.position.clone())
        this.nodeVelocities.set(node.id, new THREE.Vector3())
      }
    })
  }

  /**
   * Update physics simulation
   */
  private updatePhysics(delta: number): void {
    if (!this.config?.physics.enabled) return

    const damping = this.config.physics.damping
    const repulsion = this.config.physics.repulsionStrength

    // Apply forces between nodes
    this.nodePositions.forEach((pos1, nodeId1) => {
      const vel1 = this.nodeVelocities.get(nodeId1)!
      const visual1 = this.nodeVisuals.get(nodeId1)!

      this.nodePositions.forEach((pos2, nodeId2) => {
        if (nodeId1 === nodeId2) return

        const distance = pos1.distanceTo(pos2)
        if (distance > 0) {
          const direction = new THREE.Vector3().subVectors(pos1, pos2).normalize()
          const force = direction.multiplyScalar(repulsion / (distance * distance))
          vel1.add(force.multiplyScalar(delta))
        }
      })

      // Apply damping
      vel1.multiplyScalar(1 - damping * delta)

      // Update position
      pos1.add(vel1.clone().multiplyScalar(delta))
      visual1.mesh.position.copy(pos1)
      visual1.label.position.copy(pos1).add(new THREE.Vector3(0, 15, 0))
      visual1.glow.position.copy(pos1)
      visual1.selection.position.copy(pos1)
    })

    // Update edge positions
    this.edgeVisuals.forEach((_visual, _edgeId) => {
      // Update edge geometry based on new node positions
      // This would require rebuilding the tube geometry
    })
  }

  /**
   * Update animations
   */
  private updateAnimations(delta: number): void {
    // Update any node animation mixers
    this.nodeVisuals.forEach(visual => {
      if (visual.mixer) {
        visual.mixer.update(delta)
      }
    })

    // Animate edge particles
    this.edgeVisuals.forEach(visual => {
      visual.particles.forEach(particles => {
        // Animate particle flow along edges
        const positions = particles.geometry.attributes.position.array as Float32Array
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 2] += delta * 10 // Move along Z axis
        }
        particles.geometry.attributes.position.needsUpdate = true
      })
    })
  }

  /**
   * Clear all visual objects from scene
   */
  private clearVisuals(): void {
    if (!this.scene) return

    // Remove node visuals
    this.nodeVisuals.forEach(visual => {
      this.scene!.remove(visual.mesh)
      this.scene!.remove(visual.label)
      this.scene!.remove(visual.glow)
      this.scene!.remove(visual.selection)
      
      // Dispose geometries and materials
      visual.mesh.geometry.dispose()
      if (Array.isArray(visual.mesh.material)) {
        visual.mesh.material.forEach(material => material.dispose())
      } else {
        visual.mesh.material.dispose()
      }
    })
    this.nodeVisuals.clear()

    // Remove edge visuals
    this.edgeVisuals.forEach(visual => {
      this.scene!.remove(visual.mesh)
      if (visual.label) this.scene!.remove(visual.label)
      
      visual.mesh.geometry.dispose()
      if (Array.isArray(visual.mesh.material)) {
        visual.mesh.material.forEach(material => material.dispose())
      } else {
        visual.mesh.material.dispose()
      }
    })
    this.edgeVisuals.clear()

    // Remove cluster visuals
    this.clusterVisuals.forEach(visual => {
      this.scene!.remove(visual.boundary)
      this.scene!.remove(visual.center)
      this.scene!.remove(visual.label)
      
      visual.boundary.geometry.dispose()
      visual.center.geometry.dispose()
    })
    this.clusterVisuals.clear()
  }

  /**
   * Easing function for smooth animations
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }
}
