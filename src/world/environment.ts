import * as T from 'three'
import { box, mesh, metal, sphere } from './models'
import { expeditionFoundations, sites, spawn } from './layout'

export function randomSeed(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

const craters = [[-28, -10, 7, 1.9], [28, 10, 8, 2.3], [-12, 34, 10, 1.5], [21, -31, 8, 2.4], [0, -47, 15, 3], [-42, -33, 10, 3]]
function expeditionRelief(x: number, z: number) {
  const ridge = 4.3 * Math.exp(-(((x + 17) / 6.3) ** 2 + ((z + 8) / 10) ** 2))
  const radius = Math.hypot(x - 12, z - 19)
  return ridge - 4.4 * Math.exp(-((radius / 4.8) ** 2)) + 1.65 * Math.exp(-(((radius - 6.7) / 2.1) ** 2))
}

export function elevation(x: number, z: number, expedition = false) {
  const edge = T.MathUtils.smoothstep(Math.max(Math.abs(x), Math.abs(z)), 20, 45)
  let height = (Math.sin(x * .41) * Math.cos(z * .35) * .32 + Math.sin(x * .96 + z * .55) * .11) * (.18 + .82 * edge)
  for (const [cx, cz, size, depth] of craters) {
    const distance = Math.hypot(x - cx, z - cz) / size
    height += (Math.exp(-(distance ** 2) * 2) * -depth + Math.exp(-((distance - 1) ** 2) * 35) * depth * .44) * edge
  }
  if (expedition) {
    let relief = expeditionRelief(x, z)
    for (const pad of expeditionFoundations) {
      const distance = Math.hypot(x - pad.x, z - pad.z)
      if (distance < pad.radius + 1.5) {
        relief = T.MathUtils.lerp(expeditionRelief(pad.x, pad.z), relief, T.MathUtils.smoothstep(distance, pad.radius, pad.radius + 1.5))
      }
    }
    height += relief
  }
  return height
}

function mineralTexture() {
  const random = randomSeed(71)
  const size = 128
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (x + y * size) * 4
      const speckle = 181 + random() * 62 + Math.sin(x * .24 + y * .13) * 7
      data.set([speckle, speckle, speckle, 255], index)
    }
  }
  const texture = new T.DataTexture(data, size, size, T.RGBAFormat)
  texture.wrapS = texture.wrapT = T.RepeatWrapping
  texture.repeat.set(40, 40)
  texture.magFilter = T.LinearFilter
  texture.minFilter = T.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.colorSpace = T.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function track(scene: T.Scene, a: { x: number; z: number }, b: { x: number; z: number }) {
  const length = Math.hypot(a.x - b.x, a.z - b.z)
  const surface = box(scene, 1.65, .028, length, metal('#414554', .98), (a.x + b.x) / 2, .12, (a.z + b.z) / 2)
  surface.rotation.y = Math.atan2(b.x - a.x, b.z - a.z)
  const random = randomSeed(12)
  const strip = new T.InstancedMesh(new T.BoxGeometry(.083, .028, .31), new T.MeshBasicMaterial({ color: '#e5ac71' }), Math.ceil(length / 1.1) * 2)
  const stencil = new T.Object3D()
  for (let i = 0; i < strip.count; i++) {
    stencil.position.set(i % 2 ? -.72 : .72, .027, -length / 2 + .3 + Math.floor(i / 2) * 1.1)
    stencil.scale.z = .8 + random() * .4
    stencil.updateMatrix()
    strip.setMatrixAt(i, stencil.matrix)
  }
  surface.add(strip)
}

export function terrain(scene: T.Scene, expedition = false) {
  const random = randomSeed(806)
  const detail = expedition ? 224 : 128
  const base = new T.PlaneGeometry(178, 178, detail, detail)
  base.rotateX(-Math.PI / 2)
  const vertices = base.getAttribute('position')
  const colors: number[] = []
  const tint = new T.Color()
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i)
    const z = vertices.getZ(i)
    const y = elevation(x, z, expedition)
    vertices.setY(i, y)
    tint.set('#747887').multiplyScalar(.77 + random() * .35 + .075 * Math.sin(x * .36 + z * .83))
    colors.push(tint.r, tint.g, tint.b)
  }
  base.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  base.computeVertexNormals()
  const surface = mesh(scene, base, new T.MeshStandardMaterial({ vertexColors: true, color: '#d9e0e2', map: mineralTexture(), roughness: 1 }), 0, 0, 0)
  surface.castShadow = false
  if (!expedition) track(scene, spawn, { x: 0, z: 1 })
  if (!expedition) for (const id of ['power', 'garden', 'air', 'rover', 'shelter', 'radio', 'lander'] as const) {
    const site = sites[id]
    const hub = id === 'lander' || id === 'rover' ? spawn : { x: 0, z: -1 }
    track(scene, hub, site)
  }
  const rocks = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), metal('#777e80', .99), 240)
  const dummy = new T.Object3D()
  for (let i = 0; i < rocks.count; i++) {
    const angle = random() * Math.PI * 2
    const distance = 24 + random() * 49
    const x = Math.cos(angle) * distance
    const z = Math.sin(angle) * distance
    const size = .22 + random() ** 3 * 2.35
    dummy.position.set(x, elevation(x, z, expedition) + size * .17, z)
    dummy.rotation.set(random(), random() * 7, random())
    dummy.scale.set(size, size * (.44 + random() * .6), size * (.49 + random()))
    dummy.updateMatrix()
    rocks.setMatrixAt(i, dummy.matrix)
    rocks.setColorAt(i, tint.setScalar(.65 + random() * .6))
  }
  rocks.receiveShadow = true
  scene.add(rocks)
  const peaks = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), metal('#575c70', .92), 43)
  for (let i = 0; i < peaks.count; i++) {
    const a = i / peaks.count * Math.PI * 2
    const r = 48 + random() * 22
    const width = 8 + random() * 9
    dummy.position.set(Math.cos(a) * r, -.8, Math.sin(a) * r)
    dummy.rotation.set(random() * .13, random() * 6, random() * .2)
    dummy.scale.set(width, 4 + random() * 14, width * (.7 + random() * .28))
    dummy.updateMatrix()
    peaks.setMatrixAt(i, dummy.matrix)
  }
  scene.add(peaks)
  return surface
}

export function sky(scene: T.Scene) {
  const random = randomSeed(33)
  const stars = new Float32Array(1700 * 3)
  for (let i = 0; i < 1700; i++) {
    const a = random() * Math.PI * 2
    const y = .04 + random() * .94
    const r = Math.sqrt(1 - y * y)
    stars.set([Math.cos(a) * r * 138, y * 138, Math.sin(a) * r * 138], i * 3)
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.BufferAttribute(stars, 3))
  scene.add(new T.Points(geometry, new T.PointsMaterial({ color: '#abbde8', size: .18, transparent: true, opacity: .84, fog: false })))
  const size = 256
  const globe = new Uint8Array(size * size / 2 * 4)
  for (let y = 0; y < size / 2; y++) {
    for (let x = 0; x < size; x++) {
      const lon = x / size * Math.PI * 2
      const lat = y / (size / 2) * Math.PI - Math.PI / 2
      const land = Math.sin(2 * lon + 2 * lat) * Math.cos(lat * 4) + Math.sin(5 * lon + Math.sin(3 * lat)) * .46 + Math.sin(x * .25 + y * .23) * .22 > .44
      const cloud = Math.sin(lon * 8 + lat * 12) * Math.cos(lat * 9) + Math.sin(lon * 13 + lat * 14) * .35 > .88
      const rgb = Math.abs(lat) > 1.26 || cloud ? [188, 221, 239] : land ? [80, 132, 119] : [33, 91, 164]
      globe.set([...rgb, 255], (y * size + x) * 4)
    }
  }
  const map = new T.DataTexture(globe, size, size / 2, T.RGBAFormat)
  map.colorSpace = T.SRGBColorSpace
  map.magFilter = map.minFilter = T.LinearFilter
  map.needsUpdate = true
  const earth = sphere(scene, 7, new T.MeshStandardMaterial({ map, roughness: 1, fog: false, emissive: '#3e85be', emissiveIntensity: .17 }), 25, 19, -87, 40)
  earth.castShadow = earth.receiveShadow = false
  earth.rotation.z = -.23
  const sun = sphere(scene, 3.4, new T.MeshBasicMaterial({ color: '#fff2c1', fog: false }), -47, 11, -88, 24)
  sun.castShadow = false
  const storm = new T.Group()
  const streaks = new T.InstancedMesh(new T.BoxGeometry(.024, 1.2, .026), new T.MeshBasicMaterial({ color: '#ffd087', transparent: true, opacity: .48, fog: false }), 96)
  const ray = new T.Object3D()
  for (let i = 0; i < streaks.count; i++) {
    ray.position.set(random() * 68 - 34, 1 + random() * 13, random() * 68 - 34)
    ray.rotation.z = -.68
    ray.scale.y = .47 + random()
    ray.updateMatrix()
    streaks.setMatrixAt(i, ray.matrix)
  }
  storm.add(streaks)
  scene.add(storm)
  return { earth, sun, storm }
}

