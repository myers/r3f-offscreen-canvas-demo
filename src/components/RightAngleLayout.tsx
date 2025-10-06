import { Children, ReactNode, useMemo } from 'react'

interface RightAngleLayoutProps {
  children: ReactNode
  panelWidth?: number     // Width of each panel (default 0.8)
  gap?: number           // Gap between panels (default 0.1)
  centerDistance?: number // Distance for center panel (default 0.3182)
  angle?: number         // Angle in degrees from center panel plane (default 90)
}

export function RightAngleLayout({
  children,
  panelWidth = 0.8,
  gap = 0.1,
  centerDistance = 0.3182,
  angle = 90
}: RightAngleLayoutProps) {
  const childArray = Children.toArray(children).slice(0, 3)

  const positions = useMemo(() => {
    // Distance from center of center panel to center of side panel (horizontal)
    const horizontalDistance = panelWidth / 2 + gap + panelWidth / 2

    // Convert angle to radians
    const angleRad = (angle * Math.PI) / 180

    const zOffsetFromCenter = horizontalDistance * Math.sin(angleRad)
    const sideZ = (zOffsetFromCenter - panelWidth / 2) - centerDistance

    const sideRotation = angleRad

    return [
      {
        // Left panel
        x: -horizontalDistance * Math.sin(angleRad),
        z: sideZ,
        rotation: sideRotation
      },
      {
        // Center panel
        x: 0,
        z: -centerDistance,
        rotation: 0
      },
      {
        // Right panel
        x: horizontalDistance * Math.sin(angleRad),
        z: sideZ,
        rotation: -sideRotation
      }
    ]
  }, [panelWidth, gap, centerDistance, angle])

  return (
    <group>
      {childArray.map((child, i) => (
        <group key={i} position={[positions[i].x, 0, positions[i].z]} rotation={[0, positions[i].rotation, 0]}>
          {child}
        </group>
      ))}
    </group>
  )
}
