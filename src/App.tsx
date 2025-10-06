import { Environment } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { createXRStore, noEvents, PointerEvents, useXR, useXRInputSourceState, XR, XRLayer, XROrigin } from '@react-three/xr'
import { Children, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CanvasTexture, Euler, Group, Quaternion, SRGBColorSpace, Vector2, Vector3, WebGLRenderTarget } from 'three'
import { damp } from 'three/src/math/MathUtils.js'
import { SimpleArcLayout } from './components/SimpleArcLayout'
import { RightAngleLayout } from './components/RightAngleLayout'

const store = createXRStore({ foveation: 0 })

export function App() {
  const [useSimpleLayout, setUseSimpleLayout] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'b' && store.getState().session != null) {
        store.getState().session?.end()
      }
      if (event.key === 'l') {
        setUseSimpleLayout(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '1rem',
          position: 'absolute',
          zIndex: 10000,
          bottom: '1rem',
          left: '50%',
          transform: 'translate(-50%, 0)',
        }}
      >
        <button
          style={{
            background: 'white',
            borderRadius: '0.5rem',
            border: 'none',
            fontWeight: 'bold',
            color: 'black',
            padding: '1rem 2rem',
            cursor: 'pointer',
            fontSize: '1.5rem',
            boxShadow: '0px 0px 20px rgba(0,0,0,1)',
          }}
          onClick={() => store.enterAR()}
        >
          Enter AR
        </button>
        <button
          style={{
            background: 'white',
            borderRadius: '0.5rem',
            border: 'none',
            fontWeight: 'bold',
            color: 'black',
            padding: '1rem 2rem',
            cursor: 'pointer',
            fontSize: '1.5rem',
            boxShadow: '0px 0px 20px rgba(0,0,0,1)',
          }}
          onClick={() => store.enterVR()}
        >
          Enter VR
        </button>
      </div>
      <Canvas
        events={noEvents}
        style={{ width: '100%', flexGrow: 1 }}
        camera={{ position: [0, 0, 0.65] }}
      >
        <PointerEvents />
        <XR store={store}>
          <NonAREnvironment />
          <XROrigin position-y={0} position-z={0} />
          <RightAngleLayout panelWidth={0.8} gap={0.2} centerDistance={0.5} angle={45} position-y={1.5}>
            <OffscreenCanvasPanel dpr={1} width={0.8} height={0.45} />
            <OffscreenCanvasPanel dpr={2} width={0.8} height={0.45} />
            <OffscreenCanvasPanel dpr={3} width={0.8} height={0.45} />
          </RightAngleLayout>
          <ExitOnBButton />
        </XR>
      </Canvas>
    </>
  )
}

function NonAREnvironment() {
  const inAR = useXR((s) => s.mode === 'immersive-ar')
  return <Environment blur={0.2} background={!inAR} environmentIntensity={2} preset="city" />
}

function OctagonLayoutWithVisualization({ children }: { children: ReactNode }) {
  const childArray = Children.toArray(children).slice(0, 3)
  const groupRefs = useRef<(Group | null)[]>([null, null, null])

  // Octagon parameters
  const panelWidth = 0.8
  const edgeLength = panelWidth + 0.10
  const rotationOffset = Math.PI / 8

  // Calculate octagon radius from edge length
  const radius = edgeLength / (2 * Math.sin(Math.PI / 8))

  // Calculate vertex positions
  const vertices = useMemo(() => {
    const verts = []
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + rotationOffset
      const x = radius * Math.sin(angle)
      const z = -radius * Math.cos(angle)
      verts.push({ x, z })
    }
    return verts
  }, [radius, rotationOffset])

  // Get edge midpoint
  const getEdgeMidpoint = useCallback((edgeIndex: number) => {
    const nextIndex = (edgeIndex + 1) % 8
    const midX = (vertices[edgeIndex].x + vertices[nextIndex].x) / 2
    const midZ = (vertices[edgeIndex].z + vertices[nextIndex].z) / 2
    return { x: midX, z: midZ }
  }, [vertices])

  // Get edge rotation (parallel to edge)
  const getEdgeRotation = useCallback((edgeIndex: number) => {
    const nextIndex = (edgeIndex + 1) % 8
    const dx = vertices[nextIndex].x - vertices[edgeIndex].x
    const dz = vertices[nextIndex].z - vertices[edgeIndex].z
    // In 3D, rotation around Y-axis, edge direction is (dx, dz)
    // Add π/2 to rotate panel 90 degrees to be parallel to edge
    // Add π to rotate 180 degrees to face viewer
    const edgeAngle = Math.atan2(dx, dz) + Math.PI / 2 + Math.PI
    return edgeAngle
  }, [vertices])

  // Positions for edges E6 (left), E7 (middle), E0 (right)
  const positions = useMemo(() => [
    {
      position: [getEdgeMidpoint(6).x, 0, getEdgeMidpoint(6).z] as [number, number, number],
      rotation: [0, getEdgeRotation(6), 0] as [number, number, number],
    },
    {
      position: [getEdgeMidpoint(7).x, 0, getEdgeMidpoint(7).z] as [number, number, number],
      rotation: [0, getEdgeRotation(7), 0] as [number, number, number],
    },
    {
      position: [getEdgeMidpoint(0).x, 0, getEdgeMidpoint(0).z] as [number, number, number],
      rotation: [0, getEdgeRotation(0), 0] as [number, number, number],
    },
  ], [getEdgeMidpoint, getEdgeRotation])

  // Calculate offset to move viewer to midpoint between E6 and E0 endpoints
  // X position should be same as E7 midpoint
  // Z position should be midpoint between vertex 6 and vertex 0
  const e7Midpoint = getEdgeMidpoint(7)
  const v6 = vertices[6]
  const v0 = vertices[0]
  const targetX = e7Midpoint.x
  const targetZ = (v6.z + v0.z) / 2
  const offset = {
    x: -targetX,
    z: -targetZ
  }

  return (
    <group position={[offset.x, 0, offset.z]}>
      {childArray.map((child, i) => (
        <group key={i} ref={(el) => (groupRefs.current[i] = el)} position={positions[i].position} rotation={positions[i].rotation}>
          {child}
        </group>
      ))}
      {/* <PanelVisualization
        groupRefs={groupRefs}
        vertices={vertices}
        rotationOffset={rotationOffset}
        panelWidth={panelWidth}
        edgeLength={edgeLength}
        viewerOffset={offset}
      /> */}
    </group>
  )
}

function ExitOnBButton() {
  const session = useXR((s) => s.session)
  const controllerLeft = useXRInputSourceState('controller', 'left')
  const controllerRight = useXRInputSourceState('controller', 'right')
  const bPressedRef = useRef(false)

  useFrame(() => {
    const leftBPressed = controllerLeft?.gamepad?.['b-button']?.state === 'pressed'
    const rightBPressed = controllerRight?.gamepad?.['b-button']?.state === 'pressed'

    if ((leftBPressed || rightBPressed) && !bPressedRef.current) {
      bPressedRef.current = true
      session?.end()
    }

    if (!leftBPressed && !rightBPressed) {
      bPressedRef.current = false
    }
  })

  return null
}

interface PanelVisualizationProps {
  groupRefs: React.MutableRefObject<(Group | null)[]>
  vertices: { x: number; z: number }[]
  rotationOffset: number
  panelWidth: number
  edgeLength: number
  viewerOffset: { x: number; z: number }
}

function PanelVisualization({ groupRefs, vertices, rotationOffset, panelWidth, edgeLength, viewerOffset }: PanelVisualizationProps) {
  const offscreenCanvas = useMemo(() => {
    const canvas = new OffscreenCanvas(1920, 1080)
    return canvas
  }, [])

  const drawCanvas = useCallback((canvas: OffscreenCanvas) => {
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    ctx.save()
    ctx.translate(0, 1080)
    ctx.scale(1, -1)
    ctx.clearRect(0, 0, 1920, 1080)

    // White background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, 1920, 1080)

    // Center of canvas
    const centerX = 960
    const centerY = 540
    const scale = 300

    // Draw octagon edges
    const radius = edgeLength / (2 * Math.sin(Math.PI / 8)) * scale
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 1
    ctx.beginPath()
    const canvasVertices = []
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + rotationOffset
      const x = centerX + radius * Math.sin(angle)
      const y = centerY + radius * Math.cos(angle)
      canvasVertices.push({ x, y })
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.closePath()
    ctx.stroke()

    // Label each edge
    ctx.fillStyle = 'blue'
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    for (let i = 0; i < 8; i++) {
      const nextI = (i + 1) % 8
      const midX = (canvasVertices[i].x + canvasVertices[nextI].x) / 2
      const midY = (canvasVertices[i].y + canvasVertices[nextI].y) / 2
      ctx.fillText(`E${i}`, midX, midY)
    }

    // Draw viewer position (accounting for offset)
    // Viewer is at origin in world space, but octagon has been offset
    // So viewer position relative to octagon is -viewerOffset
    const viewerCanvasX = centerX + (-viewerOffset.x) * scale
    const viewerCanvasY = centerY - (-viewerOffset.z) * scale
    ctx.fillStyle = 'red'
    ctx.beginPath()
    ctx.arc(viewerCanvasX, viewerCanvasY, 10, 0, Math.PI * 2)
    ctx.fill()

    // Read actual panel positions from refs
    const panelData = [
      { label: 'DPR 1', color: 'green' },
      { label: 'DPR 3', color: 'purple' },
      { label: 'DPR 2', color: 'orange' },
    ]

    ctx.lineWidth = 8
    groupRefs.current.forEach((group, i) => {
      if (!group) return

      const worldPos = new Vector3()
      const worldQuat = new Quaternion()
      group.getWorldPosition(worldPos)
      group.getWorldQuaternion(worldQuat)

      // Convert world rotation to Y-axis angle
      const euler = new Euler().setFromQuaternion(worldQuat)
      const yRotation = euler.y

      // Convert 3D position to canvas position
      const canvasX = centerX + worldPos.x * scale
      const canvasY = centerY - worldPos.z * scale

      // Panel width in canvas units
      const panelWidthPixels = panelWidth * scale
      const halfWidth = panelWidthPixels / 2

      // Calculate panel endpoints based on rotation
      const cosRot = Math.cos(yRotation)
      const sinRot = Math.sin(yRotation)

      const x1 = canvasX - halfWidth * cosRot
      const y1 = canvasY + halfWidth * sinRot
      const x2 = canvasX + halfWidth * cosRot
      const y2 = canvasY - halfWidth * sinRot

      ctx.strokeStyle = panelData[i].color
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()

      // Draw position point
      ctx.fillStyle = 'red'
      ctx.beginPath()
      ctx.arc(canvasX, canvasY, 6, 0, Math.PI * 2)
      ctx.fill()

      // Draw label
      ctx.fillStyle = 'black'
      ctx.font = '24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(panelData[i].label, canvasX, canvasY - 30)
    })

    ctx.restore()
  }, [groupRefs, panelWidth, edgeLength, rotationOffset, viewerOffset])

  const customRender = useMemo(() => {
    let canvasTexture: CanvasTexture | null = null

    return (renderTarget: WebGLRenderTarget, state: any) => {
      drawCanvas(offscreenCanvas)

      if (!canvasTexture) {
        canvasTexture = new CanvasTexture(offscreenCanvas)
        canvasTexture.colorSpace = SRGBColorSpace
      }

      canvasTexture.needsUpdate = true
      state.gl.copyTextureToTexture(canvasTexture, renderTarget.texture, null, new Vector2(0, 0), 0)
    }
  }, [offscreenCanvas, drawCanvas])

  return (
    <group position={[0, 0.5, 0]}>
      <XRLayer
        customRender={customRender}
        position={[0, 0, 0]}
        scale={[1.6, 0.9, 1]}
        shape="quad"
        pixelWidth={1920}
        pixelHeight={1080}
        dpr={1}
        blendTextureSourceAlpha={true}
      />
    </group>
  )
}

function TopDownViewPanel() {
  const inXR = useXR((s) => s.session != null)

  const offscreenCanvas = useMemo(() => {
    const canvas = new OffscreenCanvas(1920, 1080)
    return canvas
  }, [])

  const drawCanvas = useCallback((canvas: OffscreenCanvas) => {
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    ctx.save()
    ctx.translate(0, 1080)
    ctx.scale(1, -1)
    ctx.clearRect(0, 0, 1920, 1080)

    // White background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, 1920, 1080)

    // Center of canvas
    const centerX = 960
    const centerY = 540
    const scale = 300 // pixels per unit (scaled down by 1/2)

    // Panel and edge dimensions
    const panelWidth = 0.8
    const edgeLength = panelWidth + 0.10

    // Draw octagon edges (thin black lines)
    // Rotate by 22.5° (π/8) so top edge is horizontal
    // For a regular octagon, if edge length = edgeLength, then radius = edgeLength / (2 * sin(π/8))
    const radius = edgeLength / (2 * Math.sin(Math.PI / 8)) * scale
    const rotationOffset = Math.PI / 8
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 1
    ctx.beginPath()
    const vertices = []
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + rotationOffset
      const x = centerX + radius * Math.sin(angle)
      const y = centerY + radius * Math.cos(angle)
      vertices.push({ x, y })
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.closePath()
    ctx.stroke()

    // Label each edge
    ctx.fillStyle = 'blue'
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    for (let i = 0; i < 8; i++) {
      const nextI = (i + 1) % 8
      const midX = (vertices[i].x + vertices[nextI].x) / 2
      const midY = (vertices[i].y + vertices[nextI].y) / 2
      ctx.fillText(`E${i}`, midX, midY)
    }

    // Draw viewer position (red dot at center)
    ctx.fillStyle = 'red'
    ctx.beginPath()
    ctx.arc(centerX, centerY, 10, 0, Math.PI * 2)
    ctx.fill()

    // Calculate panel positions - position at midpoint of E6, E7, E0
    // E7 is at index 7, E0 is at index 0, E6 is at index 6
    const octagonApothem = radius / Math.cos(Math.PI / 8)

    // Calculate midpoint of each edge
    const getEdgeMidpoint = (edgeIndex: number) => {
      const nextIndex = (edgeIndex + 1) % 8
      const midX = (vertices[edgeIndex].x + vertices[nextIndex].x) / 2
      const midY = (vertices[edgeIndex].y + vertices[nextIndex].y) / 2
      return { x: midX, y: midY }
    }

    // Calculate edge angle (parallel to edge)
    const getEdgeRotation = (edgeIndex: number) => {
      const nextIndex = (edgeIndex + 1) % 8
      const dx = vertices[nextIndex].x - vertices[edgeIndex].x
      const dy = vertices[nextIndex].y - vertices[edgeIndex].y
      // Angle of the edge in canvas space (Y down is positive)
      // In 3D space, we need rotation around Y axis
      // atan2 gives us the angle, but we need to convert from canvas to 3D
      const edgeAngle = Math.atan2(dx, -dy) // -dy because canvas Y is flipped
      return edgeAngle + Math.PI / 2 // Rotate 90 degrees to align with edge
    }

    const positions = [
      {
        x: (getEdgeMidpoint(7).x - centerX) / scale,
        z: -(getEdgeMidpoint(7).y - centerY) / scale,
        rotation: -getEdgeRotation(7),
        label: 'DPR 1'
      },
      {
        x: (getEdgeMidpoint(6).x - centerX) / scale,
        z: -(getEdgeMidpoint(6).y - centerY) / scale,
        rotation: -getEdgeRotation(6),
        label: 'DPR 3'
      },
      {
        x: (getEdgeMidpoint(0).x - centerX) / scale,
        z: -(getEdgeMidpoint(0).y - centerY) / scale,
        rotation: -getEdgeRotation(0),
        label: 'DPR 2'
      },
    ]

    // Draw panels (thick black lines)
    ctx.lineWidth = 8
    positions.forEach((pos) => {
      const canvasX = centerX + pos.x * scale
      const canvasY = centerY - pos.z * scale // flip Z for top-down view

      // Panel endpoints in local coordinates
      const halfWidth = (panelWidth / 2) * scale
      const localX1 = -halfWidth
      const localX2 = halfWidth

      // Rotate to world coordinates
      const cos = Math.cos(pos.rotation)
      const sin = Math.sin(pos.rotation)
      const worldX1 = canvasX + localX1 * cos
      const worldY1 = canvasY - localX1 * sin
      const worldX2 = canvasX + localX2 * cos
      const worldY2 = canvasY - localX2 * sin

      ctx.strokeStyle = 'black'
      ctx.beginPath()
      ctx.moveTo(worldX1, worldY1)
      ctx.lineTo(worldX2, worldY2)
      ctx.stroke()

      // Draw position point (red dot)
      ctx.fillStyle = 'red'
      ctx.beginPath()
      ctx.arc(canvasX, canvasY, 6, 0, Math.PI * 2)
      ctx.fill()

      // Draw label
      ctx.fillStyle = 'black'
      ctx.font = '24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(pos.label, canvasX, canvasY - 30)
    })

    ctx.restore()
  }, [])

  const customRender = useMemo(() => {
    let canvasTexture: CanvasTexture | null = null

    return (renderTarget: WebGLRenderTarget, state: any) => {
      drawCanvas(offscreenCanvas)

      if (!canvasTexture) {
        canvasTexture = new CanvasTexture(offscreenCanvas)
        canvasTexture.colorSpace = SRGBColorSpace
      }

      canvasTexture.needsUpdate = true
      state.gl.copyTextureToTexture(canvasTexture, renderTarget.texture, null, new Vector2(0, 0), 0)
    }
  }, [offscreenCanvas, drawCanvas])

  return (
    <group position={[0, 0.5, 0]}>
      <XRLayer
        customRender={customRender}
        position={[0, 0, 0]}
        scale={[1.6, 0.9, 1]}
        shape="quad"
        pixelWidth={1920}
        pixelHeight={1080}
        dpr={1}
        blendTextureSourceAlpha={true}
      />
    </group>
  )
}

function OffscreenCanvasPanel({ dpr, width = 0.8, height = 0.45 }: { dpr: number, width?: number, height?: number }) {
  const [counter, setCounter] = useState(0)

  // Create offscreen canvas (16:9 ratio, scaled by DPR)
  const offscreenCanvas = useMemo(() => {
    const canvas = new OffscreenCanvas(480 * dpr, 270 * dpr)
    return canvas
  }, [dpr])

  // Draw canvas function (called every frame via customRender)
  const drawCanvas = useCallback((canvas: OffscreenCanvas, counter: number, dpr: number) => {
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const width = 480 * dpr
    const height = 270 * dpr

    // Save context state
    ctx.save()

    // Flip vertically to fix WebGL texture orientation
    ctx.translate(0, height)
    ctx.scale(1, -1)

    // Clear with transparency
    ctx.clearRect(0, 0, width, height)

    // Static black background with gradient fade to transparent at edges
    const radius = 25 * dpr
    const fadeWidth = 2 * dpr // Width of the fade effect

    // Draw solid black background
    ctx.fillStyle = 'black'
    ctx.beginPath()
    ctx.moveTo(radius, 0)
    ctx.lineTo(width - radius, 0)
    ctx.arcTo(width, 0, width, radius, radius)
    ctx.lineTo(width, height - radius)
    ctx.arcTo(width, height, width - radius, height, radius)
    ctx.lineTo(radius, height)
    ctx.arcTo(0, height, 0, height - radius, radius)
    ctx.lineTo(0, radius)
    ctx.arcTo(0, 0, radius, 0, radius)
    ctx.closePath()
    ctx.fill()

    // Apply gradient mask for fade to transparent at edges
    ctx.globalCompositeOperation = 'destination-out'

    // Top gradient (excluding corners)
    const topGradient = ctx.createLinearGradient(0, 0, 0, fadeWidth)
    topGradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
    topGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = topGradient
    ctx.fillRect(radius, 0, width - 2 * radius, fadeWidth)

    // Bottom gradient (excluding corners)
    const bottomGradient = ctx.createLinearGradient(0, height - fadeWidth, 0, height)
    bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 1)')
    ctx.fillStyle = bottomGradient
    ctx.fillRect(radius, height - fadeWidth, width - 2 * radius, fadeWidth)

    // Left gradient (excluding corners)
    const leftGradient = ctx.createLinearGradient(0, 0, fadeWidth, 0)
    leftGradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
    leftGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = leftGradient
    ctx.fillRect(0, radius, fadeWidth, height - 2 * radius)

    // Right gradient (excluding corners)
    const rightGradient = ctx.createLinearGradient(width - fadeWidth, 0, width, 0)
    rightGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    rightGradient.addColorStop(1, 'rgba(0, 0, 0, 1)')
    ctx.fillStyle = rightGradient
    ctx.fillRect(width - fadeWidth, radius, fadeWidth, height - 2 * radius)

    // Corner radial gradients
    // Top-left corner
    const tlGradient = ctx.createRadialGradient(radius, radius, radius - fadeWidth, radius, radius, radius)
    tlGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    tlGradient.addColorStop(1, 'rgba(0, 0, 0, 1)')
    ctx.fillStyle = tlGradient
    ctx.fillRect(0, 0, radius, radius)

    // Top-right corner
    const trGradient = ctx.createRadialGradient(width - radius, radius, radius - fadeWidth, width - radius, radius, radius)
    trGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    trGradient.addColorStop(1, 'rgba(0, 0, 0, 1)')
    ctx.fillStyle = trGradient
    ctx.fillRect(width - radius, 0, radius, radius)

    // Bottom-left corner
    const blGradient = ctx.createRadialGradient(radius, height - radius, radius - fadeWidth, radius, height - radius, radius)
    blGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    blGradient.addColorStop(1, 'rgba(0, 0, 0, 1)')
    ctx.fillStyle = blGradient
    ctx.fillRect(0, height - radius, radius, radius)

    // Bottom-right corner
    const brGradient = ctx.createRadialGradient(width - radius, height - radius, radius - fadeWidth, width - radius, height - radius, radius)
    brGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    brGradient.addColorStop(1, 'rgba(0, 0, 0, 1)')
    ctx.fillStyle = brGradient
    ctx.fillRect(width - radius, height - radius, radius, radius)

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over'

    // Draw emoji title
    ctx.fillStyle = 'white'
    ctx.font = `${40 * dpr}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('😎👌🔥🥽', width / 2, 60 * dpr)

    // Draw resolution text
    ctx.font = `bold ${30 * dpr}px sans-serif`
    ctx.fillText(`${width}×${height}px`, width / 2, 115 * dpr)

    // Draw counter text
    ctx.font = `bold ${25 * dpr}px sans-serif`
    ctx.fillText(`Clicks: ${counter}`, width / 2, 180 * dpr)

    // Draw instruction text
    ctx.font = `${10 * dpr}px sans-serif`
    ctx.fillText('Click me!', width / 2, 215 * dpr)

    // Restore context state
    ctx.restore()
  }, [])

  // Custom render using Option 4: Reused CanvasTexture + copyTextureToTexture
  const customRender = useMemo(() => {
    let canvasTexture: CanvasTexture | null = null
    let lastCounter = -1
    let needsRedraw = true

    return (renderTarget: WebGLRenderTarget, state: any) => {
      // Only redraw canvas when counter changes (not every frame)
      if (counter !== lastCounter) {
        drawCanvas(offscreenCanvas, counter, dpr)
        lastCounter = counter
        needsRedraw = true
      }

      // Create texture once, reuse
      if (!canvasTexture) {
        canvasTexture = new CanvasTexture(offscreenCanvas)
        canvasTexture.colorSpace = SRGBColorSpace
        needsRedraw = true
      }

      // Only update texture when canvas was redrawn
      if (needsRedraw) {
        canvasTexture.needsUpdate = true
        needsRedraw = false
      }

      state.gl.copyTextureToTexture(canvasTexture, renderTarget.texture, null, new Vector2(0, 0), 0)
    }
  }, [offscreenCanvas, counter, drawCanvas, dpr])

  const handleClick = useCallback(() => {
    setCounter((c) => c + 1)
  }, [])

  return (
    <XRLayer
      customRender={customRender}
      onClick={handleClick}
      scale={[width, height, 1]}
      shape="quad"
      pixelWidth={480}
      pixelHeight={270}
      dpr={dpr}
      blendTextureSourceAlpha={true}
    />
  )
}
