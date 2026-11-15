import * as T from 'three'

export function createTrail(scene: T.Scene, heightAt: (x: number, z: number) => number, opacity = .84) {
  const shape = new T.Shape()
  shape.moveTo(-.42, -.24)
  shape.lineTo(0, .22)
  shape.lineTo(.42, -.24)
  shape.lineTo(.42, .02)
  shape.lineTo(0, .48)
  shape.lineTo(-.42, .02)
  shape.closePath()
  const geometry = new T.ShapeGeometry(shape).rotateX(-Math.PI / 2)
  const material = new T.MeshBasicMaterial({ color: '#a9f5ff', transparent: true, opacity, depthWrite: false, toneMapped: false })
  const limit = 64
  const arrows = new T.InstancedMesh(geometry, material, limit)
  arrows.instanceMatrix.setUsage(T.DynamicDrawUsage)
  arrows.frustumCulled = false
  arrows.visible = false
  scene.add(arrows)

  const marker = new T.Object3D()
  const facing = new T.Quaternion()
  const normal = new T.Vector3()
  const up = new T.Vector3(0, 1, 0)
  const color = new T.Color()
  const white = new T.Color('#ffffff')

  return {
    hide() { arrows.visible = false },
    draw(start: T.Vector3, route: readonly T.Vector3[], tint: string) {
      let count = 0
      let distance = .85
      let previous = start
      for (const end of route) {
        const dx = end.x - previous.x
        const dz = end.z - previous.z
        const length = Math.hypot(dx, dz)
        while (distance <= length && count < limit) {
          const x = previous.x + dx * distance / length
          const z = previous.z + dz * distance / length
          const y = heightAt(x, z)
          normal.set(y - heightAt(x + .5, z), .5, y - heightAt(x, z + .5)).normalize()
          facing.setFromAxisAngle(up, Math.atan2(-dx, -dz))
          marker.quaternion.setFromUnitVectors(up, normal).multiply(facing)
          marker.position.set(x, y + .16, z)
          marker.updateMatrix()
          arrows.setMatrixAt(count++, marker.matrix)
          distance += 1.16
        }
        previous = end
        distance -= length
      }
      arrows.count = count
      arrows.visible = count > 0
      arrows.instanceMatrix.needsUpdate = true
      material.color.copy(color.set(tint).lerp(white, .42))
    },
  }
}
