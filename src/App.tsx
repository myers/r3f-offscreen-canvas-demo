import { Environment } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { createXRStore, noEvents, PointerEvents, useXR, useXRInputSourceState, XR, XRLayer } from '@react-three/xr'
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CanvasTexture, LinearFilter, SRGBColorSpace, Vector2, Vector3, WebGLRenderTarget } from 'three'

import { GitHubBadge } from './components/GitHubBadge'
import { SplashScreen } from './components/SplashScreen'

const store = createXRStore({
  emulate: { syntheticEnvironment: false, inject: true },
  foveation: 0,
  controller: {
    rayPointer: {
      cursorModel: false,
      rayModel: {
        opacity: 1.0
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
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const dpr = 2 // For scaling text/graphics

    ctx.save()
    ctx.translate(0, height)
    ctx.scale(1, -1)

    // Simple black background
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, width, height)

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
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
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
      <meshBasicMaterial map={canvasTexture} toneMapped={false} />
    </mesh>
  )
}
