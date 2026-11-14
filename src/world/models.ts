import * as T from 'three'
import type { CrewId } from '../mission'
import { sites } from './layout'
import type { SiteId } from './layout'

export const metal = (color: T.ColorRepresentation, roughness = .55, metalness = .2) => new T.MeshStandardMaterial({ color, roughness, metalness })
const light = (color: T.ColorRepresentation, intensity = .75) => new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity })
const white = metal('#cbd8db')
const gray = metal('#7e8e9d')
const navy = metal('#182238')
const rubber = metal('#151824', .92)
const amber = metal('#eac071')
const brass = metal('#93734e')
const glass = metal('#153451', .22, .5)
const aqua = light('#6be8e9')
const purple = light('#bbabfc')
const soil = metal('#29242c', .97)
const green = metal('#679647', .82)
const lime = metal('#9fbd62', .8)
const red = light('#ff8154', .7)

export function mesh(parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material, x: number, y: number, z: number) {
  const value = new T.Mesh(geometry, material)
  value.position.set(x, y, z)
  value.castShadow = true
  value.receiveShadow = true
  parent.add(value)
  return value
}
export function box(parent: T.Object3D, w: number, h: number, d: number, material: T.Material, x = 0, y = 0, z = 0) {
  return mesh(parent, new T.BoxGeometry(w, h, d), material, x, y, z)
}
export function sphere(parent: T.Object3D, size: number, material: T.Material, x: number, y: number, z: number, detail = 16) {
  return mesh(parent, new T.SphereGeometry(size, detail, Math.max(8, detail / 2)), material, x, y, z)
}
export function cylinder(parent: T.Object3D, top: number, base: number, height: number, material: T.Material, x: number, y: number, z: number, sides = 16) {
  return mesh(parent, new T.CylinderGeometry(top, base, height, sides), material, x, y, z)
}
function pipe(parent: T.Object3D, a: T.Vector3, b: T.Vector3, radius: number, material: T.Material) {
  const delta = b.clone().sub(a)
  const mid = a.clone().lerp(b, .5)
  const rod = cylinder(parent, radius, radius, delta.length(), material, mid.x, mid.y, mid.z, 10)
  rod.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize())
  return rod
}

function disk(parent: T.Object3D, radius: number, height: number, x: number, z: number) {
  cylinder(parent, radius, radius, height, navy, x, height / 2, z, 24)
  const rim = mesh(parent, new T.RingGeometry(radius - .1, radius + .015, 48), brass, x, height + .006, z)
  rim.rotation.x = -Math.PI / 2
}
function building(x: number, z: number, scene: T.Scene) {
  const group = new T.Group()
  group.position.set(x, .04, z)
  scene.add(group)
  return group
}
function panel(parent: T.Object3D, x: number, z: number, tilt: number) {
  cylinder(parent, .16, .25, 1.33, gray, x, .7, z)
  const frame = new T.Group()
  frame.position.set(x, 1.38, z)
  frame.rotation.x = tilt
  parent.add(frame)
  box(frame, 2.9, .13, 2.2, gray)
  const cell = metal('#203a73', .24, .55)
  for (let col = 0; col < 6; col++) {
    for (let row = 0; row < 4; row++) {
      box(frame, .44, .028, .5, cell, (col - 2.5) * .457, .078, (row - 1.5) * .526)
    }
  }
  for (const xEdge of [-1.47, 1.47]) box(frame, .07, .1, 2.23, brass, xEdge, .07)
  return frame
}
function consoleAt(parent: T.Object3D, color: string, modelAngle = 0) {
  const station = new T.Group()
  station.rotation.y = modelAngle
  parent.add(station)
  box(station, .82, .79, .62, navy, 0, .45)
  box(station, 1.08, .17, .7, gray, 0, .98)
  const screen = box(station, .69, .035, .41, light(color), 0, 1.075, -.07)
  screen.rotation.x = -.15
  for (let k = 0; k < 3; k++) box(station, .085, .026, .065, amber, -.27 + k * .15, 1.08, .23)
  box(station, .7, .08, .025, brass, 0, .78, .32)
  station.position.z = -.73
  return screen
}

function shelterShell(group: T.Group) {
  disk(group, 3.6, .13, 0, 0)
  const hull = cylinder(group, 2.27, 2.64, 2.92, gray, 0, 1.55, 0, 10)
  hull.rotation.y = Math.PI / 10
  cylinder(group, 2.34, 2.27, .27, white, 0, 3.1, 0, 10)
  cylinder(group, 1.55, 2.35, .55, navy, 0, 3.47, 0, 10)
  box(group, 2.55, 2.41, .75, navy, 0, 1.36, 2.19)
  box(group, 1.74, 1.98, .13, gray, 0, 1.2, 2.6)
  const hatch = box(group, 1.42, 1.69, .12, metal('#495470'), 0, 1.14, 2.68)
  const ring = mesh(group, new T.TorusGeometry(.37, .055, 8, 18), purple, 0, 1.17, 2.77)
  ring.castShadow = false
  box(group, 1.5, .08, .055, purple, 0, 2.29, 2.75)
  const water = new T.Group()
  const waterPods: T.Group[] = []
  water.position.set(-1.88, .03, 2.12)
  group.add(water)
  for (let i = 0; i < 2; i++) {
    const pod = new T.Group()
    pod.position.z = i * .57
    water.add(pod)
    waterPods.push(pod)
    box(pod, .49, .86, .52, metal('#345e8a'), 0, .55, 0)
    box(pod, .51, .09, .53, aqua, 0, .73, 0)
  }
  return { water, waterPods, hatch }
}

function greenhouse(group: T.Group) {
  disk(group, 3.43, .23, 0, 0)
  cylinder(group, 3.12, 3.15, .72, white, 0, .52, 0, 24)
  const domeMaterial = new T.MeshStandardMaterial({ color: '#73cddd', transparent: true, opacity: .22, metalness: .18, roughness: .21, side: T.FrontSide, depthWrite: false })
  const dome = mesh(group, new T.SphereGeometry(3.13, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), domeMaterial, 0, .87, 0)
  dome.castShadow = false
  for (let a = 0; a < 8; a++) {
    const rib = mesh(group, new T.TorusGeometry(3.13, .05, 7, 26, Math.PI), gray, 0, .87, 0)
    rib.rotation.y = a * Math.PI / 8
  }
  for (const [radius, y] of [[3.13, .89], [2.55, 2.67]]) {
    const rib = mesh(group, new T.TorusGeometry(radius, .062, 8, 32), aqua, 0, y, 0)
    rib.rotation.x = Math.PI / 2
  }
  const crops: T.Group[] = []
  for (const x of [-1.32, 0, 1.32]) {
    box(group, 1.05, .15, 2.9, navy, x, .93)
    box(group, .95, .086, 2.8, soil, x, 1.01)
    for (let i = 0; i < 6; i++) {
      const plant = new T.Group()
      plant.position.set(x + (i % 2 ? -.25 : .25), 1.02, -1.05 + Math.floor(i / 2) * .95)
      group.add(plant)
      crops.push(plant)
      for (let leaf = 0; leaf < 4; leaf++) {
        const angle = leaf * Math.PI / 2
        const value = sphere(plant, .17, leaf % 2 ? green : lime, Math.cos(angle) * .1, .14, Math.sin(angle) * .1, 7)
        value.scale.set(1.1, 1.3, .55)
        value.rotation.set(.3, angle, .48)
      }
    }
  }
  const growLight = light('#84fac2', .42)
  for (const x of [-1.48, 1.48]) box(group, .17, .095, 3.15, growLight, x, 2.39, 0)
  box(group, 1.66, 1.55, .66, navy, -.9, .91, 2.89)
  box(group, 1.21, 1.23, .07, glass, -.9, .88, 3.28)
  box(group, 1.11, .1, .05, aqua, -.9, 1.58, 3.29)
  return { crops, growLight }
}

function radioDish(group: T.Group) {
  disk(group, 2.3, .19, 0, 0)
  cylinder(group, .36, .67, 1.58, white, 0, .94, 0)
  const pivot = new T.Group()
  pivot.position.y = 2.07
  group.add(pivot)
  const dish = new T.Group()
  dish.rotation.x = -.36
  pivot.add(dish)
  const profile = Array.from({ length: 13 }, (_, index) => {
    const radius = index / 12 * 1.76
    return new T.Vector2(radius, radius * radius * .215)
  })
  const bowl = mesh(dish, new T.LatheGeometry(profile, 40), new T.MeshStandardMaterial({ color: '#bbcbde', metalness: .46, roughness: .37, side: T.DoubleSide }), 0, 0, 0)
  bowl.rotation.x = Math.PI / 2
  mesh(dish, new T.TorusGeometry(1.76, .067, 8, 44), gray, 0, 0, .67)
  for (const angle of [0, 2.094, 4.189]) {
    pipe(dish, new T.Vector3(Math.cos(angle) * 1.62, Math.sin(angle) * 1.62, .57), new T.Vector3(0, 0, 1.54), .036, white)
  }
  sphere(dish, .115, aqua, 0, 0, 1.52)
  return pivot
}

function landingPad(group: T.Group) {
  disk(group, 4.15, .17, 0, 0)
  const decal = mesh(group, new T.RingGeometry(2.59, 2.69, 42), amber, 0, .182, 0)
  decal.rotation.x = -Math.PI / 2
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4
    const x = Math.cos(angle) * 2.04
    const z = Math.sin(angle) * 2.04
    pipe(group, new T.Vector3(x * .53, 1.45, z * .53), new T.Vector3(x, .32, z), .066, gray)
    if (i % 2 === 0) cylinder(group, .23, .31, .18, brass, x, .28, z, 8)
  }
  cylinder(group, 1.12, 1.28, .62, brass, 0, 1.06, 0, 8)
  cylinder(group, .79, 1.18, 1.68, white, 0, 2.18, 0, 8)
  cylinder(group, .26, .8, .64, navy, 0, 3.33, 0, 8)
  box(group, .91, .37, .06, glass, 0, 2.42, .996)
  box(group, .55, .055, .067, aqua, 0, 2.32, 1.012)
  cylinder(group, .07, .055, .56, white, 0, 3.93, 0)
  sphere(group, .085, red, 0, 4.25, 0)
}

export function roverModel() {
  const rover = new T.Group()
  const wheels: T.Group[] = []
  box(rover, 1.56, .42, 2.05, brass, 0, .65)
  box(rover, 1.37, .29, 1.92, amber, 0, .91)
  box(rover, 1.16, .42, .74, white, 0, 1.11, .48)
  box(rover, .97, .29, .026, glass, 0, 1.17, -.0 + .863)
  box(rover, 1.29, .12, .86, navy, 0, 1.02, -.56)
  for (const x of [-.66, .66]) box(rover, .185, .14, .056, aqua, x, .79, 1.052)
  for (const x of [-.88, .88]) {
    for (const z of [-.71, .72]) {
      const wheel = new T.Group()
      wheel.position.set(x, .33, z)
      rover.add(wheel)
      wheels.push(wheel)
      const tire = cylinder(wheel, .348, .348, .26, rubber, 0, 0, 0, 12)
      tire.rotation.z = Math.PI / 2
      const hub = cylinder(wheel, .173, .173, .28, gray, 0, 0, 0, 12)
      hub.rotation.z = Math.PI / 2
      for (let n = 0; n < 8; n++) {
        const a = n * Math.PI / 4
        const tread = box(wheel, .27, .052, .084, navy, 0, .34 * Math.cos(a), .34 * Math.sin(a))
        tread.rotation.x = a
      }
    }
  }
  return { rover, wheels }
}

function crate(parent: T.Object3D, scale = 1) {
  const group = new T.Group()
  group.scale.setScalar(scale)
  parent.add(group)
  box(group, .69, .41, .54, amber, 0, .23)
  box(group, .72, .09, .58, navy, 0, .46)
  for (const x of [-.2, .2]) box(group, .082, .51, .58, brass, x, .25)
  box(group, .18, .067, .018, aqua, 0, .23, .287)
  return group
}

export function outpost(scene: T.Scene) {
  const yard = building(-12.3, -.5, scene)
  disk(yard, 3.05, .07, 0, 0)
  for (const x of [-2.03, 1.12]) for (const z of [-1.36, 1.14]) panel(yard, x, z, -.49)
  const power = building(sites.power.x, sites.power.z, scene)
  const powerScreen = consoleAt(power, '#ffd17b')
  box(power, .85, .64, .61, brass, -1.12, .35, -.7)
  box(power, .88, .08, .64, navy, -1.12, .67, -.7)
  const gardens = greenhouse(building(10, -4, scene))
  consoleAt(building(sites.garden.x, sites.garden.z, scene), '#76ffc3')
  const shelter = shelterShell(building(-11, -15, scene))
  consoleAt(building(sites.shelter.x, sites.shelter.z, scene), '#bfa8ff')
  const dish = radioDish(building(10, -18.7, scene))
  consoleAt(building(sites.radio.x, sites.radio.z, scene), '#78d5ff')
  const air = building(-1, -10.7, scene)
  disk(air, 2.65, .15, 0, 0)
  for (const x of [-1.18, 0, 1.18]) {
    cylinder(air, .49, .49, 1.75, white, x, 1.12, 0)
    sphere(air, .49, gray, x, 1.98, 0)
    cylinder(air, .514, .514, .13, aqua, x, 1.73, 0)
    pipe(air, new T.Vector3(x, .38, 0), new T.Vector3(x, .38, 1.23), .08, brass)
  }
  box(air, 3.65, .17, .17, brass, 0, .38, 1.23)
  consoleAt(building(sites.air.x, sites.air.z, scene), '#82dcff')
  landingPad(building(-18.5, 16.6, scene))
  const { rover, wheels } = roverModel()
  scene.add(rover)
  rover.position.set(sites.rover.x + .6, 0, sites.rover.z - .7)
  const roverCargo = crate(rover, .82)
  roverCargo.position.set(0, 1.1, -.56)
  roverCargo.visible = false
  const kit = crate(building(sites.kit.x + .65, sites.kit.z, scene), 1.3)
  for (const [x, z, angle] of [[4, -9, .3], [2.05, -9.6, -.25], [-15, 1, 0], [15, -8, .14]]) {
    crate(building(x, z, scene), .85).rotation.y = angle
  }
  const beacons = {} as Record<SiteId, T.Group>
  for (const [id, site] of Object.entries(sites) as [SiteId, typeof sites[SiteId]][]) {
    const marker = building(site.x, site.z, scene)
    marker.visible = false
    const mat = new T.MeshBasicMaterial({ color: site.color, transparent: true, opacity: .72, depthWrite: false, side: T.DoubleSide })
    const ring = mesh(marker, new T.RingGeometry(1.12, 1.18, 42), mat, 0, .034, 0)
    ring.rotation.x = -Math.PI / 2
    ring.castShadow = false
    const dot = mesh(marker, new T.OctahedronGeometry(.16), mat, 0, 2.18, 0)
    dot.castShadow = false
    beacons[id] = marker
  }
  return { ...gardens, powerScreen, ...shelter, dish, rover, wheels, kit, roverCargo, beacons }
}

export function astronaut(color: string, npc?: CrewId) {
  const root = new T.Group()
  const suit = metal(color, .64, .12)
  const dark = metal('#28384d', .67, .08)
  const torso = new T.Group()
  root.add(torso)
  const legs: T.Group[] = []
  const arms: T.Group[] = []
  for (const x of [-.23, .23]) {
    const leg = new T.Group()
    leg.position.set(x, .65, 0)
    root.add(leg)
    legs.push(leg)
    mesh(leg, new T.CapsuleGeometry(.149, .27, 5, 12), suit, 0, -.24, 0)
    const boot = box(leg, .3, .19, .365, dark, 0, -.545, -.055)
    boot.rotation.x = -.09
    box(leg, .296, .05, .315, gray, 0, -.605, -.046)
    const arm = new T.Group()
    arm.position.set(x * 2.02, 1.265, 0)
    torso.add(arm)
    arms.push(arm)
    mesh(arm, new T.CapsuleGeometry(.125, .28, 4, 12), suit, 0, -.18, 0)
    sphere(arm, .139, dark, 0, -.41, 0, 12)
  }
  const coat = mesh(torso, new T.CapsuleGeometry(.347, .31, 7, 16), suit, 0, 1.018, 0)
  coat.scale.z = .8
  box(torso, .47, .55, .21, dark, 0, 1.126, .306)
  box(torso, .31, .09, .023, aqua, 0, 1.239, .422)
  box(torso, .32, .23, .09, white, 0, 1.08, -.307)
  for (const x of [-.09, .09]) box(torso, .06, .055, .024, x > 0 ? amber : aqua, x, 1.094, -.36)
  cylinder(torso, .291, .297, .085, amber, 0, 1.453, 0)
  const helmet = sphere(torso, .377, suit, 0, 1.73, 0, 24)
  helmet.scale.set(1.03, .95, 1.02)
  const visor = sphere(torso, .309, glass, 0, 1.735, -.188, 24)
  visor.scale.set(.99, .7, .77)
  const glint = sphere(torso, .085, aqua, -.13, 1.807, -.408, 12)
  glint.scale.set(1.25, .27, .15)
  sphere(torso, .061, aqua, .37, 1.71, .029, 10)
  if (npc) root.scale.setScalar(.92)
  return { root, torso, legs, arms }
}

export function pipModel() {
  const root = new T.Group()
  const torso = new T.Group()
  root.add(torso)
  box(torso, .86, .61, .56, amber, 0, 1.03)
  box(torso, .68, .45, .037, navy, 0, 1.05, -.29)
  for (const eye of [-.16, .16]) box(torso, .086, .11, .028, aqua, eye, 1.08, -.316)
  box(torso, .54, .12, .38, white, 0, .67)
  const thruster = cylinder(torso, .22, .117, .16, aqua, 0, .55, 0, 8)
  thruster.castShadow = false
  const arms = [-1, 1].map((side) => {
    const arm = new T.Group()
    torso.add(arm)
    arm.position.set(side * .49, 1, 0)
    sphere(arm, .116, gray, 0, 0, 0, 10)
    box(arm, .126, .32, .101, white, side * .051, -.15)
    sphere(arm, .089, brass, side * .068, -.34, 0, 10)
    return arm
  })
  return { root, torso, legs: [], arms }
}
