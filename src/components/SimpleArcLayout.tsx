import { Children, ReactNode, useMemo } from 'react'

interface SimpleArcLayoutProps {
  children: ReactNode
  angle?: number          // Angle in degrees for side panels (default 45)
  centerDistance?: number // Distance for center panel (default 0.3182)
  sideDistance?: number   // Distance for side panels (default 0.7682)
}

export function SimpleArcLayout({
  children,
  angle = 45,
  centerDistance = 0.3182,
  sideDistance = 0.7682
}: SimpleArcLayoutProps) {
  const childArray = Children.toArray(children).slice(0, 3)

  const positions = useMemo(() => {
    const angleRad = (angle * Math.PI) / 180

    return [
      {
        x: -sideDistance * Math.sin(angleRad),
        z: -sideDistance * Math.cos(angleRad),
        rotation: -angleRad
      },
      {
        x: 0,
        z: -centerDistance,
        rotation: 0
      },
      {
        x: sideDistance * Math.sin(angleRad),
        z: -sideDistance * Math.cos(angleRad),
        rotation: angleRad
      }
    ]
  }, [angle, centerDistance, sideDistance])

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
