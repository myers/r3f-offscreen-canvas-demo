import { Environment } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { createXRStore, noEvents, PointerEvents, useXR, useXRInputSourceState, XR, XRLayer, XROrigin } from '@react-three/xr'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CanvasTexture, Euler, Group, Quaternion, SRGBColorSpace, Vector2, Vector3, WebGLRenderTarget } from 'three'
import { damp } from 'three/src/math/MathUtils.js'

const store = createXRStore({ foveation: 0 })

export function App() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'b' && store.getState().session != null) {
        store.getState().session?.end()
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
          <XROrigin position-y={-1.5} position-z={0.5} />
          <OffscreenCanvasLayer />
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

const eulerHelper = new Euler()
const quaternionHelper = new Quaternion()
const vectorHelper1 = new Vector3()
const vectorHelper2 = new Vector3()
const zAxis = new Vector3(0, 0, 1)

function OffscreenCanvasLayer() {
  const ref = useRef<Group>(null)
  const [dpr, setDpr] = useState(1)
  const needsUpdateRef = useRef(true)

  // Create offscreen canvas (16:9 ratio, dynamic DPR, with alpha)
  const offscreenCanvas = useMemo(() => {
    const canvas = new OffscreenCanvas(1920 * dpr, 1080 * dpr)
    return canvas
  }, [dpr])

  // Background color animation state
  const hueRef = useRef(0)

  // Draw canvas function (called every frame via customRender)
  const drawCanvas = useCallback((canvas: OffscreenCanvas, dpr: number) => {
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    // Save context state
    ctx.save()

    // Flip vertically to fix WebGL texture orientation
    ctx.translate(0, 1080 * dpr)
    ctx.scale(1, -1)

    // Clear with transparency
    ctx.clearRect(0, 0, 1920 * dpr, 1080 * dpr)

    // Animated background color
    hueRef.current = (hueRef.current + 1) % 360

    // Draw rounded rectangle background
    const radius = 50 * dpr // Corner radius (scaled for DPR)
    ctx.fillStyle = `hsl(${hueRef.current}, 70%, 50%)`
    ctx.beginPath()
    ctx.moveTo(radius, 0)
    ctx.lineTo(1920 * dpr - radius, 0)
    ctx.arcTo(1920 * dpr, 0, 1920 * dpr, radius, radius)
    ctx.lineTo(1920 * dpr, 1080 * dpr - radius)
    ctx.arcTo(1920 * dpr, 1080 * dpr, 1920 * dpr - radius, 1080 * dpr, radius)
    ctx.lineTo(radius, 1080 * dpr)
    ctx.arcTo(0, 1080 * dpr, 0, 1080 * dpr - radius, radius)
    ctx.lineTo(0, radius)
    ctx.arcTo(0, 0, radius, 0, radius)
    ctx.closePath()
    ctx.fill()

    // Draw emoji title (scaled for DPR)
    ctx.fillStyle = 'white'
    ctx.font = `${160 * dpr}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('😎👌🔥🥽', 960 * dpr, 300 * dpr)

    // Draw DPR text (scaled for DPR)
    ctx.font = `bold ${120 * dpr}px sans-serif`
    ctx.fillText(`DPR: ${dpr}x`, 960 * dpr, 540 * dpr)

    // Draw instruction text (scaled for DPR)
    ctx.font = `${40 * dpr}px sans-serif`
    ctx.fillText('Click to cycle DPR!', 960 * dpr, 780 * dpr)

    // Restore context state
    ctx.restore()
  }, [])

  // Billboard rotation to face camera
  useFrame((state, dt) => {
    if (ref.current == null) {
      return
    }
    state.camera.getWorldPosition(vectorHelper1)
    ref.current.getWorldPosition(vectorHelper2)
    quaternionHelper.setFromUnitVectors(zAxis, vectorHelper1.sub(vectorHelper2).normalize())
    eulerHelper.setFromQuaternion(quaternionHelper, 'YXZ')
    ref.current.rotation.y = damp(ref.current.rotation.y, eulerHelper.y, 10, dt)
  })

  // Custom render using Option 4: Reused CanvasTexture + copyTextureToTexture
  const customRender = useMemo(() => {
    let canvasTexture: CanvasTexture | null = null

    return (renderTarget: WebGLRenderTarget, state: any) => {
      // Draw to canvas every frame (works in both 2D and XR modes)
      drawCanvas(offscreenCanvas, dpr)

      // Create texture once, reuse
      if (!canvasTexture) {
        canvasTexture = new CanvasTexture(offscreenCanvas)
        canvasTexture.colorSpace = SRGBColorSpace
      }

      // Always update because background animates continuously
      canvasTexture.needsUpdate = true

      // Direct texture copy - NO 3D SCENE RENDERING!
      state.gl.copyTextureToTexture(canvasTexture, renderTarget.texture, null, new Vector2(0, 0), 0)
    }
  }, [offscreenCanvas, dpr, drawCanvas])

  const handleClick = useCallback(() => {
    setDpr((d) => (d % 3) + 1)
    needsUpdateRef.current = true
  }, [])

  const inXR = useXR((s) => s.session != null)

  return (
    <group position-y={inXR ? -0.3 : 0} position-z={inXR ? -0.5 : 0}>
      <group ref={ref}>
        <XRLayer
          customRender={customRender}
          onClick={handleClick}
          position={[0, 0, 0]}
          scale={[0.8, 0.45, 1]}
          shape="quad"
          pixelWidth={1920}
          pixelHeight={1080}
          dpr={dpr}
          blendTextureSourceAlpha={true}
        />
      </group>
    </group>
  )
}
