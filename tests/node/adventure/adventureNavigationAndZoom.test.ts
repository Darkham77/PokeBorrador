import { describe, it } from 'vitest'
import assert from 'node:assert/strict'

function resolveDirectionFromDelta(dx: number, dy: number): 'down' | 'up' | 'left' | 'right' {
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  if (angle >= -45 && angle < 45) return 'right'
  if (angle >= 45 && angle < 135) return 'down'
  if (angle >= -135 && angle < -45) return 'up'
  return 'left'
}

function calculateFocalPan(
  midScreen: { x: number; y: number },
  focalWorld: { x: number; y: number },
  targetScale: number
): { x: number; y: number } {
  return {
    x: midScreen.x - (focalWorld.x * targetScale),
    y: midScreen.y - (focalWorld.y * targetScale)
  }
}

describe('Adventure Map Navigation & Zoom Math', () => {
  describe('Direction Resolution', () => {
    it('resolves Right direction when moving East (+X)', () => {
      assert.strictEqual(resolveDirectionFromDelta(750, 0), 'right')
      assert.strictEqual(resolveDirectionFromDelta(750, 100), 'right')
      assert.strictEqual(resolveDirectionFromDelta(750, -100), 'right')
    })

    it('resolves Down direction when moving South (+Y)', () => {
      assert.strictEqual(resolveDirectionFromDelta(0, 750), 'down')
      assert.strictEqual(resolveDirectionFromDelta(100, 750), 'down')
      assert.strictEqual(resolveDirectionFromDelta(-100, 750), 'down')
    })

    it('resolves Left direction when moving West (-X)', () => {
      assert.strictEqual(resolveDirectionFromDelta(-750, 0), 'left')
      assert.strictEqual(resolveDirectionFromDelta(-750, 100), 'left')
      assert.strictEqual(resolveDirectionFromDelta(-750, -100), 'left')
    })

    it('resolves Up direction when moving North (-Y)', () => {
      assert.strictEqual(resolveDirectionFromDelta(0, -750), 'up')
      assert.strictEqual(resolveDirectionFromDelta(100, -750), 'up')
      assert.strictEqual(resolveDirectionFromDelta(-100, -750), 'up')
    })
  })

  describe('Focal-Point Zoom Math Invariant', () => {
    it('maintains the world point directly under the touch midpoint before and after zoom', () => {
      const initialPan = { x: -300, y: -450 }
      const initialScale = 1.0
      const midScreen0 = { x: 200, y: 400 }

      // Convert midScreen0 to world coordinates
      const focalWorld = {
        x: (midScreen0.x - initialPan.x) / initialScale, // (200 - (-300)) / 1 = 500
        y: (midScreen0.y - initialPan.y) / initialScale  // (400 - (-450)) / 1 = 850
      }

      assert.strictEqual(focalWorld.x, 500)
      assert.strictEqual(focalWorld.y, 850)

      // Scale up to 1.4x while fingers stay at midScreen0
      const newScale = 1.4
      const newPan = calculateFocalPan(midScreen0, focalWorld, newScale)

      // Verifies world coordinate under newPan + newScale lands exactly on midScreen0
      const screenRecomputed = {
        x: focalWorld.x * newScale + newPan.x,
        y: focalWorld.y * newScale + newPan.y
      }

      assert.strictEqual(Math.round(screenRecomputed.x), midScreen0.x)
      assert.strictEqual(Math.round(screenRecomputed.y), midScreen0.y)
    })

    it('maintains the focal point even when touch midpoint also shifts (pinch + pan combined)', () => {
      const initialPan = { x: 100, y: 200 }
      const initialScale = 0.8
      const midScreen0 = { x: 150, y: 250 }

      const focalWorld = {
        x: (midScreen0.x - initialPan.x) / initialScale,
        y: (midScreen0.y - initialPan.y) / initialScale
      }

      // Midpoint shifted during pinch (e.g. user moved both hands to the right)
      const midScreen1 = { x: 180, y: 270 }
      const newScale = 1.2
      const newPan = calculateFocalPan(midScreen1, focalWorld, newScale)

      const screenRecomputed = {
        x: focalWorld.x * newScale + newPan.x,
        y: focalWorld.y * newScale + newPan.y
      }

      assert.strictEqual(Math.round(screenRecomputed.x), midScreen1.x)
      assert.strictEqual(Math.round(screenRecomputed.y), midScreen1.y)
    })

    it('keeps the world point under mouse cursor stationary during mouse wheel zoom on PC', () => {
      const initialPan = { x: -500, y: -800 }
      const initialScale = 1.0
      const mouseCursor = { x: 960, y: 540 } // Center of 1920x1080 display

      const focalWorld = {
        x: (mouseCursor.x - initialPan.x) / initialScale,
        y: (mouseCursor.y - initialPan.y) / initialScale
      }

      // Wheel zooms in to 1.4x
      const newScale = 1.4
      const newPan = calculateFocalPan(mouseCursor, focalWorld, newScale)

      const screenRecomputed = {
        x: focalWorld.x * newScale + newPan.x,
        y: focalWorld.y * newScale + newPan.y
      }

      assert.strictEqual(Math.round(screenRecomputed.x), mouseCursor.x)
      assert.strictEqual(Math.round(screenRecomputed.y), mouseCursor.y)
    })

    it('anchors zoom to arbitrary off-center mouse cursor on PC (e.g. hovering over Viridian City)', () => {
      const initialPan = { x: -200, y: -400 }
      const initialScale = 1.2
      const mouseCursor = { x: 350, y: 720 } // Off-center mouse pointing at a city

      const focalWorld = {
        x: (mouseCursor.x - initialPan.x) / initialScale,
        y: (mouseCursor.y - initialPan.y) / initialScale
      }

      // Wheel zooms out to 0.9x
      const newScale = 0.9
      const newPan = calculateFocalPan(mouseCursor, focalWorld, newScale)

      const screenRecomputed = {
        x: focalWorld.x * newScale + newPan.x,
        y: focalWorld.y * newScale + newPan.y
      }

      assert.strictEqual(Math.round(screenRecomputed.x), mouseCursor.x)
      assert.strictEqual(Math.round(screenRecomputed.y), mouseCursor.y)
    })
  })
})
