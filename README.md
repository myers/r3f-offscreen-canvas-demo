# OffscreenCanvas XRLayer Demo

A React Three Fiber (R3F) demonstration of using `OffscreenCanvas` with `XRLayer` for high-performance rendering in WebXR (VR/AR).

## Features

- ✨ **OffscreenCanvas** - Efficient canvas rendering off the main thread
- 🎨 **Animated Background** - Continuously cycling HSL color animation
- 🖱️ **Interactive Counter** - Click to increment (on-demand updates)
- 🎯 **Rounded Corners** - Alpha transparency with smooth rounded edges
- 📱 **High DPR** - 3x device pixel ratio for crisp rendering (5760×3240)
- 🥽 **WebXR Support** - Works in VR/AR with XRLayer API
- 🔄 **Efficient Rendering** - Direct texture copy without 3D scene overhead

## Technical Highlights

This demo showcases the **customRender** pattern with **Option 4** (reused CanvasTexture):
- Creates `CanvasTexture` once and reuses it
- Uses `copyTextureToTexture()` for direct GPU texture copying
- **No wasteful 3D scene rendering** - just efficient texture updates
- Proper alpha blending with `blendTextureSourceAlpha`

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
