# High-Quality UI in VR/AR

In VR/AR experiences, displaying sharp UI, video, or interactive content can be challenging. Traditional WebXR renders content to an eye buffer, which the compositor then resamples to match the display—a process called "double sampling." This causes quality degradation and visual distortion.

This demo shows a better approach: **XRLayer** renders content directly to the compositor, bypassing the eye buffer entirely. You'll see two panels side-by-side—the **left** uses XRLayer for crisp rendering, while the **right** uses the traditional texture approach for comparison.

**Why this matters:** XRLayer eliminates double sampling, providing sharper visuals, up to 50% reduction in GPU usage, better performance, and lower latency—essential for readable text, smooth video playback, and responsive interfaces in VR/AR applications.

**How it works:** This demo uses `customRender` with `OffscreenCanvas`, allowing you to draw anything using standard Canvas 2D API (shapes, text, images, videos) and have it rendered at full quality in your VR/AR scene. Perfect for dashboards, control panels, or any interactive UI element. For more technical details, see [Meta's WebXR Layers documentation](https://developers.meta.com/horizon/documentation/web/webxr-layers/).

**Note:** As of October 2025, XRLayers have native support on Meta Quest devices using the Meta Browser. A WebXR Layers polyfill is available for other browsers. On devices without support, the left panel will fall back to standard texture rendering, so both panels will appear identical.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
npm install
# or
pnpm install
```

### Development

```bash
npm run dev
# or
pnpm dev
```

The dev server runs with HTTPS (required for WebXR) at `https://localhost:5173`

### Build

```bash
npm run build
# or
pnpm build
```

### Deploy to GitHub Pages

```bash
npm run deploy
# or
pnpm deploy
```

## How It Works

1. **OffscreenCanvas Creation** - Creates a 5760×3240 canvas (16:9 at 3x DPR)
2. **Canvas Animation** - `requestAnimationFrame` draws animated background + counter
3. **Vertical Flip** - Canvas is flipped to match WebGL texture coordinates
4. **Rounded Rectangle** - Path API draws rounded corners with transparency
5. **Texture Reuse** - Single `CanvasTexture` is created and reused each frame
6. **Direct Copy** - `copyTextureToTexture()` copies canvas to XRLayer render target
7. **XRLayer Display** - WebXR Layers API shows high-quality quad in VR/AR

## Project Structure

```
r3f-offscreen-canvas-demo/
├── src/
│   ├── App.tsx           # Main application component
│   └── main.tsx          # React entry point
├── index.html            # HTML entry point
├── vite.config.ts        # Vite configuration (GitHub Pages base)
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

## Dependencies

- **@react-three/fiber** - React renderer for Three.js
- **@react-three/xr** - WebXR hooks and components for R3F
- **@react-three/drei** - Useful helpers (Environment)
- **three** - 3D library
- **react** & **react-dom** - React framework

## Browser Support

Requires a browser with WebXR support:
- Meta Quest Browser
- Chrome/Edge with WebXR emulator
- Apple Vision Pro (Safari)

## License

MIT

## Learn More

- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [React Three XR](https://github.com/pmndrs/xr)
- [WebXR Layers API](https://immersive-web.github.io/layers/)
