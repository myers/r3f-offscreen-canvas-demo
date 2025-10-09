import { Environment } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { createXRStore, noEvents, PointerEvents, useXR, useXRInputSourceState, XR, XRLayer } from '@react-three/xr'
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CanvasTexture, SRGBColorSpace, Vector2, Vector3, WebGLRenderTarget } from 'three'

import { GitHubBadge } from './components/GitHubBadge'
import { SplashScreen } from './components/SplashScreen'

const store = createXRStore({
  emulate: { syntheticEnvironment: false },
  foveation: 0,
  controller: {
    rayPointer: {
      cursorModel: {
        opacity: 0.9,
        size: 0.01
      }
    }
  }
})

// Canvas dimensions
const CANVAS_WIDTH = 960
const CANVAS_HEIGHT = 540
const CANVAS_SCALE = 0.0005 // Scale factor to convert pixels to world units

// Default eye level for camera and panel positioning (in meters)
const DEFAULT_EYE_LEVEL = 1.5

export function App() {
  return (
    <>
      <SplashScreen store={store}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>
          High-Quality UI in VR/AR
        </h1>
        <p style={{ margin: '0 0 1rem 0', lineHeight: '1.6' }}>
          In VR/AR experiences, displaying sharp UI, video, or interactive content can be challenging.
          Traditional WebXR renders content to an eye buffer, which the compositor then resamples to match the display—a
          process called "double sampling." This causes quality degradation and visual distortion.
        </p>
        <p style={{ margin: '0 0 1rem 0', lineHeight: '1.6' }}>
          This demo shows a better approach: <strong>XRLayer</strong> renders content directly to the compositor,
          bypassing the eye buffer entirely. You'll see two panels side-by-side—the
          <strong> left</strong> uses XRLayer for crisp rendering, while the <strong>right</strong> uses the
          traditional texture approach for comparison.
        </p>
        <p style={{ margin: '0 0 1rem 0', lineHeight: '1.6' }}>
          <strong>Why this matters:</strong> XRLayer eliminates double sampling, providing sharper visuals, up to 50% reduction
          in GPU usage, better performance, and lower latency—essential for readable text, smooth video playback, and responsive
          interfaces in VR/AR applications.
        </p>
        <p style={{ margin: '0 0 1rem 0', lineHeight: '1.6' }}>
          <strong>How it works:</strong> This demo uses <code>customRender</code> with <code>OffscreenCanvas</code>,
          allowing you to draw anything using standard Canvas 2D API (shapes, text, images, videos) and have it
          rendered at full quality in your VR/AR scene. Perfect for dashboards, control panels, or
          any interactive UI element. For more technical details, see{' '}
          <a href="https://developers.meta.com/horizon/documentation/web/webxr-layers/" target="_blank" rel="noopener noreferrer" style={{ color: '#007AFF' }}>
            Meta's WebXR Layers documentation
          </a>.
        </p>
        <p style={{ margin: '0 0 1rem 0', lineHeight: '1.6', fontSize: '0.9rem', color: '#666' }}>
          <strong>Note:</strong> As of October 2025, XRLayers have native support on Meta Quest devices using the Meta Browser.
          A WebXR Layers polyfill is available for other browsers. On devices without support, the left panel will fall back to
          standard texture rendering, so both panels will appear identical.
        </p>
        <GitHubBadge repoUrl="https://github.com/myers/r3f-offscreen-canvas-demo" />
      </SplashScreen>
      <Canvas
        events={noEvents}
        style={{ width: '100%', flexGrow: 1 }}
        camera={{ position: [0, DEFAULT_EYE_LEVEL, 0], rotation: [0, 0, 0] }}
      >
        <PointerEvents />
        <XR store={store}>
          <NonAREnvironment />
          <PanelGroup defaultEyeLevel={DEFAULT_EYE_LEVEL}>
            <CanvasXRLayer
              position={[-0.3, 0, -0.7]}
              rotation-y={Math.PI / 16}
              canvasWidth={CANVAS_WIDTH}
              canvasHeight={CANVAS_HEIGHT}
              canvasScale={CANVAS_SCALE}
            />
            <CanvasMesh
              position={[0.3, 0, -0.7]}
              rotation-y={-Math.PI / 16}
              canvasWidth={CANVAS_WIDTH}
              canvasHeight={CANVAS_HEIGHT}
              canvasScale={CANVAS_SCALE}
            />
          </PanelGroup>
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


// Shared canvas drawing hook
function useOffscreenCanvasDrawing(counter: number, label: string, canvasWidth: number, canvasHeight: number) {
  const offscreenCanvas = useMemo(() => new OffscreenCanvas(canvasWidth, canvasHeight), [canvasWidth, canvasHeight])

  const drawCanvas = useCallback((canvas: OffscreenCanvas, counter: number, label: string, width: number, height: number) => {
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const dpr = 2 // For scaling text/graphics

    ctx.save()
    ctx.translate(0, height)
    ctx.scale(1, -1)
    ctx.clearRect(0, 0, width, height)

    // Static black background with gradient fade
    const radius = 25 * dpr
    const fadeWidth = 2 * dpr

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

    // Top gradient
    const topGradient = ctx.createLinearGradient(0, 0, 0, fadeWidth)
    topGradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
    topGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = topGradient
    ctx.fillRect(radius, 0, width - 2 * radius, fadeWidth)

    // Bottom gradient
    const bottomGradient = ctx.createLinearGradient(0, height - fadeWidth, 0, height)
    bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 1)')
    ctx.fillStyle = bottomGradient
    ctx.fillRect(radius, height - fadeWidth, width - 2 * radius, fadeWidth)

    // Left gradient
    const leftGradient = ctx.createLinearGradient(0, 0, fadeWidth, 0)
    leftGradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
    leftGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = leftGradient
    ctx.fillRect(0, radius, fadeWidth, height - 2 * radius)

    // Right gradient
    const rightGradient = ctx.createLinearGradient(width - fadeWidth, 0, width, 0)
    rightGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    rightGradient.addColorStop(1, 'rgba(0, 0, 0, 1)')
    ctx.fillStyle = rightGradient
    ctx.fillRect(width - fadeWidth, radius, fadeWidth, height - 2 * radius)

    // Corner radial gradients
    const tlGradient = ctx.createRadialGradient(radius, radius, radius - fadeWidth, radius, radius, radius)
    tlGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    tlGradient.addColorStop(1, 'rgba(0, 0, 0, 1)')
    ctx.fillStyle = tlGradient
    ctx.fillRect(0, 0, radius, radius)

    const trGradient = ctx.createRadialGradient(width - radius, radius, radius - fadeWidth, width - radius, radius, radius)
    trGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    trGradient.addColorStop(1, 'rgba(0, 0, 0, 1)')
    ctx.fillStyle = trGradient
    ctx.fillRect(width - radius, 0, radius, radius)

    const blGradient = ctx.createRadialGradient(radius, height - radius, radius - fadeWidth, radius, height - radius, radius)
    blGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    blGradient.addColorStop(1, 'rgba(0, 0, 0, 1)')
    ctx.fillStyle = blGradient
    ctx.fillRect(0, height - radius, radius, radius)

    const brGradient = ctx.createRadialGradient(width - radius, height - radius, radius - fadeWidth, width - radius, height - radius, radius)
    brGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    brGradient.addColorStop(1, 'rgba(0, 0, 0, 1)')
    ctx.fillStyle = brGradient
    ctx.fillRect(width - radius, height - radius, radius, radius)

    ctx.globalCompositeOperation = 'source-over'

    // Draw label (XRLayer or Mesh Texture)
    ctx.fillStyle = 'white'
    ctx.font = `bold ${35 * dpr}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, width / 2, 40 * dpr)

    // Draw emoji title
    ctx.font = `${40 * dpr}px sans-serif`
    ctx.fillText('😎👌🔥🥽', width / 2, 100 * dpr)

    // Draw resolution text
    ctx.font = `bold ${30 * dpr}px sans-serif`
    ctx.fillText(`${width}×${height}px`, width / 2, 155 * dpr)

    // Draw counter text
    ctx.font = `bold ${25 * dpr}px sans-serif`
    ctx.fillText(`Clicks: ${counter}`, width / 2, 210 * dpr)

    // Draw instruction text
    ctx.font = `${10 * dpr}px sans-serif`
    ctx.fillText('Click me!', width / 2, 245 * dpr)

    ctx.restore()
  }, [])

  // Redraw when counter or label changes
  useEffect(() => {
    drawCanvas(offscreenCanvas, counter, label, canvasWidth, canvasHeight)
  }, [counter, label, drawCanvas, offscreenCanvas, canvasWidth, canvasHeight])

  return { offscreenCanvas, drawCanvas }
}

// Parent component that positions panels at user's eye level
function PanelGroup({ children, defaultEyeLevel }: { children: ReactNode; defaultEyeLevel: number }) {
  const session = useXR((state) => state.session)
  const { camera } = useThree()
  const [eyeLevel, setEyeLevel] = useState(defaultEyeLevel)
  const heightCapturedRef = useRef(false)

  // Capture camera height once when entering XR
  useEffect(() => {
    if (session) {
      heightCapturedRef.current = false
    } else {
      setEyeLevel(defaultEyeLevel)
    }
  }, [session, defaultEyeLevel])

  useFrame(() => {
    if (camera && session && !heightCapturedRef.current) {
      setEyeLevel(camera.position.y)
      heightCapturedRef.current = true
    }
  })

  return <group position-y={eyeLevel}>{children}</group>
}

// Canvas rendered with XRLayer
function CanvasXRLayer({
  position,
  'rotation-y': rotationY,
  canvasWidth,
  canvasHeight,
  canvasScale,
}: {
  position: Vector3 | [number, number, number]
  'rotation-y'?: number
  canvasWidth: number
  canvasHeight: number
  canvasScale: number
}) {
  const [counter, setCounter] = useState(0)
  const { offscreenCanvas } = useOffscreenCanvasDrawing(counter, 'XRLayer', canvasWidth, canvasHeight)

  const customRender = useMemo(() => {
    let canvasTexture: CanvasTexture | null = null

    return (renderTarget: WebGLRenderTarget, state: any) => {
      if (!canvasTexture) {
        canvasTexture = new CanvasTexture(offscreenCanvas)
        canvasTexture.colorSpace = SRGBColorSpace
      }

      canvasTexture.needsUpdate = true
      state.gl.copyTextureToTexture(canvasTexture, renderTarget.texture, null, new Vector2(0, 0), 0)
    }
  }, [offscreenCanvas])

  const handleClick = useCallback(() => setCounter((c) => c + 1), [])

  return (
    <XRLayer
      customRender={customRender}
      onClick={handleClick}
      position={position}
      rotation-y={rotationY}
      scale={[canvasWidth * canvasScale, canvasHeight * canvasScale, 1]}
      shape="quad"
      pixelWidth={canvasWidth}
      pixelHeight={canvasHeight}
      blendTextureSourceAlpha={true}
    />
  )
}

// Canvas rendered with regular mesh texture
function CanvasMesh({
  position,
  'rotation-y': rotationY,
  canvasWidth,
  canvasHeight,
  canvasScale,
}: {
  position: Vector3 | [number, number, number]
  'rotation-y'?: number
  canvasWidth: number
  canvasHeight: number
  canvasScale: number
}) {
  const [counter, setCounter] = useState(0)
  const { offscreenCanvas } = useOffscreenCanvasDrawing(counter, 'Mesh Texture', canvasWidth, canvasHeight)

  const canvasTexture = useMemo(() => {
    const texture = new CanvasTexture(offscreenCanvas)
    texture.colorSpace = SRGBColorSpace
    return texture
  }, [offscreenCanvas])

  // Update texture when counter changes
  useEffect(() => {
    canvasTexture.needsUpdate = true
  }, [counter, canvasTexture])

  const handleClick = useCallback(() => setCounter((c) => c + 1), [])

  return (
    <mesh
      position={position}
      rotation-y={rotationY}
      scale={[canvasWidth * canvasScale, -(canvasHeight * canvasScale), 1]}
      onClick={handleClick}
    >
      <planeGeometry />
      <meshBasicMaterial map={canvasTexture} toneMapped={false} transparent />
    </mesh>
  )
}
