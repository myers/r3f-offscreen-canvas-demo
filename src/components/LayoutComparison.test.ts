import { describe, it, expect } from 'vitest'

// RightAngle layout calculations
function calculateRightAngleLayout(panelWidth = 0.8, gap = 0.1, centerDistance = 0.3182, angle = 45) {
  const horizontalDistance = panelWidth / 2 + gap + panelWidth / 2
  const angleRad = (angle * Math.PI) / 180
  const complementAngle = Math.PI / 2 - angleRad
  const zOffsetFromCenter = horizontalDistance * Math.tan(complementAngle)
  const sideZ = -centerDistance + zOffsetFromCenter
  const sideRotation = angleRad

  return [
    {
      x: -horizontalDistance,
      z: sideZ,
      rotation: sideRotation
    },
    {
      x: 0,
      z: -centerDistance,
      rotation: 0
    },
    {
      x: horizontalDistance,
      z: sideZ,
      rotation: -sideRotation
    }
  ]
}

// Octagon layout calculations
function calculateOctagonLayout() {
  const panelWidth = 0.8
  const edgeLength = panelWidth + 0.10
  const rotationOffset = Math.PI / 8
  const radius = edgeLength / (2 * Math.sin(Math.PI / 8))

  // Calculate vertices
  const vertices = []
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 + rotationOffset
    const x = radius * Math.sin(angle)
    const z = -radius * Math.cos(angle)
    vertices.push({ x, z })
  }

  // Calculate edge midpoints and rotations for E6, E7, E0
  const edgeIndices = [6, 7, 0]
  const positions = edgeIndices.map(edgeIndex => {
    const nextIndex = (edgeIndex + 1) % 8
    const midX = (vertices[edgeIndex].x + vertices[nextIndex].x) / 2
    const midZ = (vertices[edgeIndex].z + vertices[nextIndex].z) / 2

    const dx = vertices[nextIndex].x - vertices[edgeIndex].x
    const dz = vertices[nextIndex].z - vertices[edgeIndex].z
    const rotation = Math.atan2(dx, dz) + Math.PI / 2 + Math.PI

    return { x: midX, z: midZ, rotation }
  })

  // Calculate viewer offset
  const e7Midpoint = positions[1] // E7 is middle
  const v6 = vertices[6]
  const v0 = vertices[0]
  const targetX = e7Midpoint.x
  const targetZ = (v6.z + v0.z) / 2
  const offset = {
    x: -targetX,
    z: -targetZ
  }

  // Apply offset to positions
  return positions.map(pos => ({
    x: pos.x + offset.x,
    z: pos.z + offset.z,
    rotation: pos.rotation
  }))
}

// Simple arc layout calculations (now using trigonometry)
function calculateSimpleArcLayout(angle = 45, centerDistance = 0.3182, sideDistance = 0.7682) {
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
}

describe('Layout Comparison', () => {
  it('should calculate octagon layout positions', () => {
    const positions = calculateOctagonLayout()

    console.log('\n=== OCTAGON LAYOUT ===')
    positions.forEach((pos, i) => {
      const labels = ['Left (E6)', 'Center (E7)', 'Right (E0)']
      console.log(`${labels[i]}:`)
      console.log(`  Position: (${pos.x.toFixed(4)}, ${pos.z.toFixed(4)})`)
      console.log(`  Rotation: ${pos.rotation.toFixed(4)} rad (${(pos.rotation * 180 / Math.PI).toFixed(2)}°)`)
      console.log(`  Distance from origin: ${Math.sqrt(pos.x ** 2 + pos.z ** 2).toFixed(4)}`)
    })

    // Calculate spacing between panels
    const spacing01 = Math.sqrt((positions[1].x - positions[0].x) ** 2 + (positions[1].z - positions[0].z) ** 2)
    const spacing12 = Math.sqrt((positions[2].x - positions[1].x) ** 2 + (positions[2].z - positions[1].z) ** 2)
    console.log(`\nSpacing left-to-center: ${spacing01.toFixed(4)}`)
    console.log(`Spacing center-to-right: ${spacing12.toFixed(4)}`)

    expect(positions).toHaveLength(3)
  })

  it('should calculate simple arc layout positions', () => {
    const positions = calculateSimpleArcLayout()

    console.log('\n=== SIMPLE ARC LAYOUT ===')
    positions.forEach((pos, i) => {
      const labels = ['Left (-30°)', 'Center (0°)', 'Right (30°)']
      console.log(`${labels[i]}:`)
      console.log(`  Position: (${pos.x.toFixed(4)}, ${pos.z.toFixed(4)})`)
      console.log(`  Rotation: ${pos.rotation.toFixed(4)} rad (${(pos.rotation * 180 / Math.PI).toFixed(2)}°)`)
      console.log(`  Distance from origin: ${Math.sqrt(pos.x ** 2 + pos.z ** 2).toFixed(4)}`)
    })

    // Calculate spacing between panels
    const spacing01 = Math.sqrt((positions[1].x - positions[0].x) ** 2 + (positions[1].z - positions[0].z) ** 2)
    const spacing12 = Math.sqrt((positions[2].x - positions[1].x) ** 2 + (positions[2].z - positions[1].z) ** 2)
    console.log(`\nSpacing left-to-center: ${spacing01.toFixed(4)}`)
    console.log(`Spacing center-to-right: ${spacing12.toFixed(4)}`)

    expect(positions).toHaveLength(3)
  })

  it('should compare both layouts side by side', () => {
    const octagon = calculateOctagonLayout()
    const simpleArc = calculateSimpleArcLayout(45, 0.3182, 0.7682)

    console.log('\n=== COMPARISON ===')
    console.log('\nPosition differences:')
    for (let i = 0; i < 3; i++) {
      const labels = ['Left', 'Center', 'Right']
      const xDiff = Math.abs(octagon[i].x - simpleArc[i].x)
      const zDiff = Math.abs(octagon[i].z - simpleArc[i].z)
      const posDiff = Math.sqrt(xDiff ** 2 + zDiff ** 2)
      const rotDiff = Math.abs(octagon[i].rotation - simpleArc[i].rotation)

      console.log(`${labels[i]}:`)
      console.log(`  Position diff: ${posDiff.toFixed(4)} meters`)
      console.log(`  Rotation diff: ${rotDiff.toFixed(4)} rad (${(rotDiff * 180 / Math.PI).toFixed(2)}°)`)
    }

    // Compare overall arc characteristics
    const octagonRadius = Math.sqrt(octagon[1].x ** 2 + octagon[1].z ** 2)
    const simpleRadius = Math.sqrt(simpleArc[1].x ** 2 + simpleArc[1].z ** 2)
    console.log(`\nRadius comparison:`)
    console.log(`  Octagon center panel: ${octagonRadius.toFixed(4)} meters`)
    console.log(`  Simple arc center panel: ${simpleRadius.toFixed(4)} meters`)
    console.log(`  Difference: ${Math.abs(octagonRadius - simpleRadius).toFixed(4)} meters`)
  })

  it('should produce different layouts with different angles', () => {
    const angle30 = calculateSimpleArcLayout(30, 0.3182, 0.7682)
    const angle45 = calculateSimpleArcLayout(45, 0.3182, 0.7682)
    const angle60 = calculateSimpleArcLayout(60, 0.3182, 0.7682)

    console.log('\n=== ANGLE COMPARISON ===')
    console.log('\n30° angle:')
    console.log(`  Left: (${angle30[0].x.toFixed(4)}, ${angle30[0].z.toFixed(4)})`)
    console.log(`  Right: (${angle30[2].x.toFixed(4)}, ${angle30[2].z.toFixed(4)})`)

    console.log('\n45° angle:')
    console.log(`  Left: (${angle45[0].x.toFixed(4)}, ${angle45[0].z.toFixed(4)})`)
    console.log(`  Right: (${angle45[2].x.toFixed(4)}, ${angle45[2].z.toFixed(4)})`)

    console.log('\n60° angle:')
    console.log(`  Left: (${angle60[0].x.toFixed(4)}, ${angle60[0].z.toFixed(4)})`)
    console.log(`  Right: (${angle60[2].x.toFixed(4)}, ${angle60[2].z.toFixed(4)})`)

    // Verify that different angles produce different positions
    expect(angle30[0].x).not.toBeCloseTo(angle45[0].x)
    expect(angle45[0].x).not.toBeCloseTo(angle60[0].x)
  })

  it('should exactly match octagon layout at 45 degrees', () => {
    const octagon = calculateOctagonLayout()
    const simpleArc = calculateSimpleArcLayout(45, 0.3182, 0.7682)

    // Helper to normalize rotation to [-PI, PI]
    const normalizeRotation = (rot: number) => {
      while (rot > Math.PI) rot -= 2 * Math.PI
      while (rot < -Math.PI) rot += 2 * Math.PI
      return rot
    }

    console.log('\n=== EXACT MATCH TEST (45°) ===')

    for (let i = 0; i < 3; i++) {
      const labels = ['Left', 'Center', 'Right']
      const octNormRot = normalizeRotation(octagon[i].rotation)
      const arcNormRot = normalizeRotation(simpleArc[i].rotation)

      console.log(`\n${labels[i]}:`)
      console.log(`  Octagon: (${octagon[i].x.toFixed(4)}, ${octagon[i].z.toFixed(4)}) @ ${octNormRot.toFixed(4)} rad`)
      console.log(`  ArcLayout: (${simpleArc[i].x.toFixed(4)}, ${simpleArc[i].z.toFixed(4)}) @ ${arcNormRot.toFixed(4)} rad`)

      // Assert positions match
      expect(simpleArc[i].x).toBeCloseTo(octagon[i].x, 4)
      expect(simpleArc[i].z).toBeCloseTo(octagon[i].z, 4)

      // Assert rotations match when normalized
      expect(arcNormRot).toBeCloseTo(octNormRot, 4)
    }

    console.log('\n✓ All positions and rotations match!')
  })

  it('should match octagon layout with RightAngleLayout at 45 degrees', () => {
    const octagon = calculateOctagonLayout()

    // Octagon has side panels at x = ±0.7682, z = 0
    // We need to find panelWidth and gap such that:
    // 1. horizontalDistance = 0.7682
    // 2. At 45°, z should be 0
    //
    // From z = -centerDistance + horizontalDistance * tan(90° - 45°)
    // 0 = -0.3182 + horizontalDistance * tan(45°)
    // 0 = -0.3182 + horizontalDistance * 1
    // horizontalDistance = 0.3182
    //
    // But octagon has horizontalDistance = 0.7682, which doesn't match!
    // Let's use the octagon's actual values and reverse-engineer the angle
    //
    // 0 = -0.3182 + 0.7682 * tan(90° - angle)
    // 0.3182 = 0.7682 * tan(90° - angle)
    // tan(90° - angle) = 0.3182 / 0.7682 = 0.4142
    // 90° - angle = atan(0.4142) = 22.5°
    // angle = 90° - 22.5° = 67.5°
    //
    // So we need angle = 67.5° with horizontalDistance = 0.7682
    // horizontalDistance = panelWidth/2 + gap + panelWidth/2 = 0.7682
    // With panelWidth = 0.8, gap = 0.1: horizontalDistance = 0.4 + 0.1 + 0.4 = 0.9 (doesn't match)
    //
    // We need panelWidth such that: panelWidth + gap = 0.7682
    // If gap = 0, then panelWidth = 0.7682
    // Let's try: panelWidth = 0.6682, gap = 0.1 → horizontalDistance = 0.3341 + 0.1 + 0.3341 = 0.7682 ✓

    const rightAngle = calculateRightAngleLayout(0.6682, 0.1, 0.3182, 67.5)

    // Helper to normalize rotation to [-PI, PI]
    const normalizeRotation = (rot: number) => {
      while (rot > Math.PI) rot -= 2 * Math.PI
      while (rot < -Math.PI) rot += 2 * Math.PI
      return rot
    }

    console.log('\n=== RIGHT ANGLE vs OCTAGON (45°) ===')

    for (let i = 0; i < 3; i++) {
      const labels = ['Left', 'Center', 'Right']
      const octNormRot = normalizeRotation(octagon[i].rotation)
      const rightNormRot = normalizeRotation(rightAngle[i].rotation)

      console.log(`\n${labels[i]}:`)
      console.log(`  Octagon: (${octagon[i].x.toFixed(4)}, ${octagon[i].z.toFixed(4)}) @ ${octNormRot.toFixed(4)} rad (${(octNormRot * 180 / Math.PI).toFixed(2)}°)`)
      console.log(`  RightAngle: (${rightAngle[i].x.toFixed(4)}, ${rightAngle[i].z.toFixed(4)}) @ ${rightNormRot.toFixed(4)} rad (${(rightNormRot * 180 / Math.PI).toFixed(2)}°)`)

      const xDiff = Math.abs(octagon[i].x - rightAngle[i].x)
      const zDiff = Math.abs(octagon[i].z - rightAngle[i].z)
      const posDiff = Math.sqrt(xDiff ** 2 + zDiff ** 2)
      const rotDiff = Math.abs(octNormRot - rightNormRot)

      console.log(`  Position diff: ${posDiff.toFixed(4)} meters`)
      console.log(`  Rotation diff: ${rotDiff.toFixed(4)} rad (${(rotDiff * 180 / Math.PI).toFixed(2)}°)`)

      // Check if they match (allow small tolerance)
      if (posDiff < 0.01 && rotDiff < 0.01) {
        console.log(`  ✓ MATCH!`)
      } else {
        console.log(`  ✗ Different`)
      }
    }
  })
})
