import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { CrewId } from '../mission'
import { astronaut, outpost, pipModel } from './models'
import { canWalk, expeditionBarriers, expeditionSites, moduleMount, moduleSites, reach, sectors, sites, spawn } from './layout'
import type { Sector, SiteId } from './layout'
import { elevation, sky, terrain } from './environment'

export type WorkVisual = { target?: SiteId; working?: boolean; bearing?: number; pods?: number; light?: number; roverStops?: ('kit' | 'shelter' | 'ridge')[]; pose?: 'rest' | 'sample' | 'carry'; pulse?: 'power' | 'oxygen' }
export type WorldState = {
  site: SiteId
  turn: number
  light: boolean
  storm: boolean
  crew: CrewId
  work: WorkVisual
  opened: boolean
  locked: boolean
  completed?: string
  kit: boolean
  garden: number
  sending: boolean
  overview: boolean
  expedition?: {
    sector: Sector; recon: boolean; descent: boolean
    layout: readonly (boolean | null)[]; sheltered: boolean; sampleCollected: boolean
    plants: readonly { health: number; growth: number }[]
    preview?: { part: number; outer: boolean }
    pending?: { part: number; outer: boolean }
    focusModule?: number
  }
}

type Callbacks = { onNear: (value: SiteId | null) => void; onUse: (site: SiteId) => void; onMap: (x: number, z: number, angle: number, cameraYaw: number) => void; onUnavailable: () => void; onRoverArrived: () => void; onTouchdown?: () => void }
type MoveInput = { x: number; y: number }

const keyControls = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyR'])
const crewColors = { mira: '#9d79d0', jo: '#7fbd91', ren: '#7794d3', pip: '#e4b15c' }
const roverWaypoints = { kit: new T.Vector3(17.3, 0, 1.35), shelter: new T.Vector3(-7.35, 0, -10.5), ridge: new T.Vector3(17, 0, 10) }
const cameraTarget = new T.Vector3()
const up = new T.Vector3(0, 1, 0)
const campaignCropIndices = [0, 4, 7, 10, 13, 17]

function tweenAngle(from: number, to: number, speed: number) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from))
  return from + delta * speed
}

function batchOutpost(scene: T.Scene, movingObjects: T.Object3D[]) {
  const moving = new Set(movingObjects)
  const batches = new Map<string, T.Mesh<T.BufferGeometry, T.Material>[]>()
  scene.updateMatrixWorld(true)

  function collect(object: T.Object3D) {
    if (moving.has(object)) return
    if (object instanceof T.Mesh && !(object instanceof T.InstancedMesh) && !object.children.length && !Array.isArray(object.material) && !object.material.transparent) {
      const key = [object.material.uuid, object.castShadow, object.receiveShadow].join(':')
      const group = batches.get(key) ?? []
      group.push(object)
      batches.set(key, group)
    }
    for (const child of object.children) collect(child)
  }
  collect(scene)

  for (const group of batches.values()) {
    if (group.length < 3) continue
    const geometries = group.map((part) => part.geometry.clone().applyMatrix4(part.matrixWorld))
    const merged = mergeGeometries(geometries)
    for (const geometry of geometries) geometry.dispose()
    if (!merged) continue
    const combined = new T.Mesh(merged, group[0].material)
    combined.castShadow = group[0].castShadow
    combined.receiveShadow = group[0].receiveShadow
    for (const part of group) {
      part.removeFromParent()
      part.geometry.dispose()
    }
    scene.add(combined)
  }
}

// A small A* grid lets tap-to-walk follow routes around the same barriers as keyboard movement.
function findRoute(start: T.Vector3, goal: T.Vector3, walkable = canWalk) {
  const size = 43
  const radius = 21
  const cell = (x: number, z: number) => (z + radius) * size + x + radius
  const decode = (index: number) => [index % size - radius, Math.floor(index / size) - radius] as const
  const source = cell(T.MathUtils.clamp(Math.round(start.x), -radius, radius), T.MathUtils.clamp(Math.round(start.z), -radius, radius))
  const destination = cell(T.MathUtils.clamp(Math.round(goal.x), -radius, radius), T.MathUtils.clamp(Math.round(goal.z), -radius, radius))
  const previous = new Int16Array(size * size).fill(-1)
  const distance = new Float32Array(size * size).fill(Infinity)
  const open = new Set([source])
  distance[source] = 0
  while (open.size) {
    let best = -1
    let score = Infinity
    for (const id of open) {
      const [x, z] = decode(id)
      const candidate = distance[id] + Math.hypot(x - goal.x, z - goal.z)
      if (candidate < score) {
        best = id
        score = candidate
      }
    }
    if (best === destination) {
      const route: T.Vector3[] = [goal]
      for (let id = best; id !== source; id = previous[id]) {
        const [x, z] = decode(id)
        route.push(new T.Vector3(x, 0, z))
      }
      return route.reverse()
    }
    open.delete(best)
    const [x, z] = decode(best)
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const px = x + dx
      const pz = z + dz
      if (Math.abs(px) > radius || Math.abs(pz) > radius || !walkable(px, pz) || !walkable(x + dx / 2, z + dz / 2)) continue
      const next = cell(px, pz)
      const length = distance[best] + Math.hypot(dx, dz)
      if (length >= distance[next]) continue
      distance[next] = length
      previous[next] = best
      open.add(next)
    }
  }
  return []
}

export function createWorld(host: HTMLDivElement, initial: WorldState, callbacks: Callbacks, demo: boolean, intro = false) {
  const contextOptions = { alpha: false, antialias: true, powerPreference: 'high-performance' as const }
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('webgl2', contextOptions) as WebGL2RenderingContext | null
  if (!context) throw new Error('WebGL 2 is unavailable.')
  const renderer = new T.WebGLRenderer({ canvas, context, ...contextOptions })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFShadowMap
  renderer.shadowMap.autoUpdate = false
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.13
  renderer.outputColorSpace = T.SRGBColorSpace
  host.append(canvas)
  canvas.setAttribute('aria-hidden', 'true')

  const scene = new T.Scene()
  scene.background = new T.Color('#080d1e')
  scene.fog = new T.FogExp2('#131a33', .011)
  const camera = new T.PerspectiveCamera(53, 1, .12, 285)
  const directional = new T.DirectionalLight('#ffe0aa', 2.75)
  directional.position.set(-22, 15, -20)
  directional.castShadow = true
  const shadowCamera = directional.shadow.camera
  Object.assign(shadowCamera, { left: -27, right: 27, top: 27, bottom: -27, near: .5, far: 100 })
  directional.shadow.mapSize.set(1024, 1024)
  directional.shadow.normalBias = .06
  directional.shadow.bias = -.00022
  scene.add(directional, directional.target)
  const ambient = new T.HemisphereLight('#bacdff', '#8c8198', 1.37)
  const fill = new T.DirectionalLight('#a7b7ff', .66)
  fill.position.set(9, 11, 13)
  scene.add(ambient, fill)
  const campaign = !!initial.expedition
  const heightAt = (x: number, z: number) => elevation(x, z, campaign)
  const floor = terrain(scene, campaign)
  const cosmos = sky(scene)
  const base = outpost(scene, campaign)
  const expeditionParts = campaign ? [base.craft, ...base.pads.map(({ pad }) => pad), ...base.modules, ...base.consoles] : []
  if (campaign) {
    for (const { pad } of base.pads) pad.position.y = heightAt(pad.position.x, pad.position.z) + .04
    for (const marker of Object.values(base.beacons)) {
      const point = marker.children[1] as T.Mesh
      point.geometry.dispose()
      point.geometry = new T.ConeGeometry(.36, .65, 16).rotateZ(Math.PI)
    }
  }
  batchOutpost(scene, [floor, cosmos.earth, cosmos.sun, cosmos.storm, base.rover, base.dish, base.water, base.hatch, base.kit, ...base.crops, ...Object.values(base.beacons), ...expeditionParts])
  base.rover.rotation.y = .48
  const cadet = astronaut('#e7ae67')
  scene.add(cadet.root)
  const npc = Object.fromEntries(Object.entries(crewColors).map(([id, color]) => {
    const actor = id === 'pip' ? pipModel() : astronaut(color, id as CrewId)
    scene.add(actor.root)
    return [id, actor]
  })) as Record<CrewId, ReturnType<typeof astronaut>>

  const pad = new T.Mesh(new T.RingGeometry(.31, .37, 32), new T.MeshBasicMaterial({ color: '#a9f3d9', side: T.DoubleSide, transparent: true, opacity: .72 }))
  pad.rotation.x = -Math.PI / 2
  scene.add(pad)
  const ping = new T.Mesh(new T.TorusGeometry(.55, .045, 8, 26), new T.MeshBasicMaterial({ color: '#b1f3ff', transparent: true, opacity: .8 }))
  ping.rotation.x = -Math.PI / 2
  scene.add(ping)
  const workRing = new T.Mesh(new T.TorusGeometry(.46, .035, 8, 32), new T.MeshBasicMaterial({ transparent: true }))
  workRing.rotation.x = -Math.PI / 2
  workRing.visible = false
  scene.add(workRing)
  const mountRing = new T.Mesh(new T.RingGeometry(3.67, 3.75, 64), new T.MeshBasicMaterial({
    color: '#98ecff', transparent: true, opacity: .8, depthWrite: false,
  }))
  mountRing.rotation.x = -Math.PI / 2
  mountRing.visible = false
  scene.add(mountRing)
  const dust = new T.Mesh(new T.RingGeometry(.8, 1.1, 48), new T.MeshBasicMaterial({
    color: '#c6bcb4', transparent: true, opacity: 0, depthWrite: false,
  }))
  dust.rotation.x = -Math.PI / 2
  dust.visible = false
  scene.add(dust)
  const rockSite = { x: sites.kit.x - .7, z: sites.kit.z - .75 }
  const sample = new T.Mesh(new T.DodecahedronGeometry(.32), new T.MeshStandardMaterial({ color: '#bab0a3', roughness: 1 }))
  sample.scale.set(1.25, .73, .84)
  sample.visible = false
  scene.add(sample)
  const cargoPosition = new T.Vector3()
  const targetMarker = pad.clone()
  targetMarker.material = new T.MeshBasicMaterial({ color: '#d6fabc', side: T.DoubleSide, transparent: true, opacity: .68 })
  scene.add(targetMarker)
  targetMarker.visible = false
  const circuitMaterial = new T.MeshBasicMaterial({ color: '#9dffd0', transparent: true, opacity: .82 })
  const circuit = new T.Mesh(new T.CylinderGeometry(.035, .035, 1, 7), circuitMaterial)
  scene.add(circuit)
  const circuitStart = new T.Vector3()
  const circuitEnd = new T.Vector3()
  const circuitDirection = new T.Vector3()

  let state = initial
  let worldSites = sites
  let obstacles: ReturnType<typeof expeditionBarriers> | undefined
  let descentTime = 0
  let touchdownSent = false
  const previews = base.modules.map(() => ({ slot: null as boolean | null, installed: false }))
  const walkable = (x: number, z: number) => canWalk(x, z, obstacles)
  const route = (start: T.Vector3, goal: T.Vector3) => findRoute(start, goal, walkable)
  function roverTarget(stop: keyof typeof roverWaypoints) {
    if (!campaign || stop === 'kit') return roverWaypoints[stop]
    const { x, z } = stop === 'ridge' ? moduleMount(0, true).approach : worldSites.shelter
    return new T.Vector3(x, 0, z)
  }
  function syncGeography(expedition: NonNullable<WorldState['expedition']>) {
    worldSites = expeditionSites(expedition.sector, expedition.layout, expedition.pending)
    obstacles = expeditionBarriers(expedition.sector, expedition.layout)
    for (const [index, id] of moduleSites.entries()) {
      const { x, z } = worldSites[id]
      base.consoles[index].position.set(x, heightAt(x, z - .73), z)
      base.consoles[index].visible = expedition.layout[index] != null
    }
  }
  let azimuth = 0
  let height = 5.2
  let range = 7.5
  let destination: T.Vector3[] = []
  let previousNear: SiteId | null = null
  let angle = 0
  let frame = 0
  let last = performance.now()
  let clock = 0
  let mapTime = 0
  let shadowTime = -1
  let workingTime = 0
  let displayedWork = 0
  let wasWorking = false
  let roverStops: WorkVisual['roverStops']
  let roverStopIndex = 0
  let roverHasKit = false
  let hatchOpened = false
  let roverRoute: T.Vector3[] = []
  let moving = false
  let drag: { x: number; y: number; total: number; id: number } | null = null
  const pressed = new Set<string>()
  const touch: MoveInput = { x: 0, y: 0 }
  const walkingVector = new T.Vector3()
  const desiredCamera = new T.Vector3()
  const lookAt = new T.Vector3()
  const point = new T.Vector2()
  const ray = new T.Raycaster()
  const motionPref = window.matchMedia('(prefers-reduced-motion: reduce)')
  cadet.root.position.set(demo ? sites[initial.site].x - .6 : spawn.x, .06, demo ? sites[initial.site].z + 1.2 : spawn.z)
  camera.position.set(cadet.root.position.x, 6, cadet.root.position.z + 8)
  if (intro) camera.position.set(27, 29, 28)
  if (initial.expedition) {
    syncGeography(initial.expedition)
    const { x, z } = sectors[initial.expedition.sector].access
    cadet.root.position.set(x, heightAt(x, z), z)
    camera.position.set(x + 12, 17, z + 15)
    lookAt.set(x, 2, z)
    directional.intensity = initial.light ? 2.75 : .25
    ambient.intensity = initial.light ? 1.32 : 1.12
  }

  function resize() {
    const width = host.clientWidth
    const height = host.clientHeight
    if (!width || !height) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  function onKey(event: KeyboardEvent) {
    if (intro || event.altKey || event.ctrlKey || event.metaKey || state.locked) return
    const element = event.target
    if (element instanceof HTMLElement && element.closest('input, select, textarea, [contenteditable]')) return
    if (keyControls.has(event.code)) {
      pressed.add(event.code)
      event.preventDefault()
    }
    if (event.code === 'KeyE' && !event.repeat && previousNear) {
      callbacks.onUse(previousNear)
      event.preventDefault()
    }
  }
  function keyUp(event: KeyboardEvent) { pressed.delete(event.code) }
  function stopMovement() {
    pressed.clear()
    touch.x = touch.y = 0
    destination = []
    targetMarker.visible = false
  }
  function pointerDown(event: PointerEvent) {
    if (state.locked || event.button !== 0 || intro) return
    host.focus({ preventScroll: true })
    host.setPointerCapture(event.pointerId)
    drag = { x: event.clientX, y: event.clientY, total: 0, id: event.pointerId }
  }
  function pointerMove(event: PointerEvent) {
    if (!drag || drag.id !== event.pointerId) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    drag.total += Math.abs(dx) + Math.abs(dy)
    drag.x = event.clientX
    drag.y = event.clientY
    if (drag.total <= 6) return
    azimuth -= dx * .005
    height = T.MathUtils.clamp(height + dy * .026, 2.8, 9)
  }
  function pointerUp(event: PointerEvent) {
    if (!drag || drag.id !== event.pointerId) return
    const wasTap = drag.total < 7
    drag = null
    if (!wasTap || state.locked) return
    const rect = canvas.getBoundingClientRect()
    point.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
    ray.setFromCamera(point, camera)
    const hit = ray.intersectObject(floor)[0]?.point
    if (!hit || !walkable(hit.x, hit.z)) return
    destination = route(cadet.root.position, hit)
    if (destination.length) {
      targetMarker.position.copy(hit)
      targetMarker.position.y += .055
      targetMarker.visible = true
    }
  }
  function wheel(event: WheelEvent) {
    if (state.locked || intro || state.overview || !event.altKey) return
    range = T.MathUtils.clamp(range + event.deltaY * .008, 5.2, 12)
    event.preventDefault()
  }
  host.addEventListener('pointerdown', pointerDown)
  host.addEventListener('pointermove', pointerMove)
  host.addEventListener('pointerup', pointerUp)
  const clearDrag = () => { drag = null }
  host.addEventListener('pointercancel', clearDrag)
  host.addEventListener('lostpointercapture', clearDrag)
  host.addEventListener('wheel', wheel, { passive: false })
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', keyUp)
  window.addEventListener('blur', stopMovement)
  canvas.addEventListener('webglcontextlost', callbacks.onUnavailable)

  let antenna = (30 - 35) * .034
  let raisedPods = 0
  let cropPower = 0
  let lastProcessedTurn = -1

  function animate(time: number) {
    const dt = Math.min((time - last) / 1000, .21)
    last = time
    clock += dt
    const reduced = motionPref.matches
    if (!intro && !state.locked) {
      const left = pressed.has('KeyA') || pressed.has('ArrowLeft')
      const right = pressed.has('KeyD') || pressed.has('ArrowRight')
      const forward = pressed.has('KeyW') || pressed.has('ArrowUp')
      const backward = pressed.has('KeyS') || pressed.has('ArrowDown')
      const x = Number(right) - Number(left) + touch.x
      const y = Number(backward) - Number(forward) + touch.y
      if (pressed.has('KeyQ')) azimuth += dt * 1.35
      if (pressed.has('KeyR')) azimuth -= dt * 1.35
      walkingVector.set(x, 0, y)
      let walkStep = Math.min(dt * 7, .75)
      if (walkingVector.lengthSq() > 0) {
        destination = []
        targetMarker.visible = false
        walkingVector.applyAxisAngle(up, azimuth)
      } else if (destination.length) {
        const next = destination[0]
        walkingVector.set(next.x - cadet.root.position.x, 0, next.z - cadet.root.position.z)
        const distance = walkingVector.length()
        walkStep = Math.min(dt * 8, distance)
        if (distance < .15) {
          destination.shift()
          if (!destination.length) targetMarker.visible = false
        }
      }
      moving = walkingVector.lengthSq() > .013
      if (moving) {
        walkingVector.normalize()
        const position = cadet.root.position
        const dx = walkingVector.x * walkStep
        const dz = walkingVector.z * walkStep
        if (destination.length && walkable(position.x + dx, position.z + dz)) {
          position.x += dx
          position.z += dz
        } else {
          if (walkable(position.x + dx, position.z)) position.x += dx
          if (walkable(position.x, position.z + dz)) position.z += dz
        }
        angle = tweenAngle(angle, Math.atan2(-walkingVector.x, -walkingVector.z), 1 - Math.exp(-dt * 15))
      }
    } else {
      moving = false
    }

    const position = cadet.root.position
    position.y = heightAt(position.x, position.z) + .075
    const activeSite = worldSites[state.site]
    const expedition = state.expedition
    const surveying = !!expedition?.recon
    const landing = !!expedition?.descent
    const landingSite = expedition && sectors[expedition.sector]
    cadet.root.visible = !surveying && !landing
    if (state.opened) {
      angle = tweenAngle(angle, Math.atan2(position.x - activeSite.x, position.z - (activeSite.z - .73)), 1 - Math.exp(-dt * 9))
    }
    cadet.root.rotation.y = angle
    if (state.work.working && !wasWorking) workingTime = 0
    wasWorking = !!state.work.working
    if (state.work.working) workingTime += dt
    displayedWork = Math.max(0, displayedWork - dt)
    if (state.work.working) displayedWork = .28
    const doing = state.opened && (displayedWork > 0 || state.sending)
    const gait = moving && !reduced ? Math.sin(clock * 17) * .62 : 0
    const kneeling = doing && (state.work.pose === 'rest' || state.work.pose === 'sample')
    cadet.torso.position.y = moving && !reduced ? Math.abs(Math.sin(clock * 17)) * .076 : kneeling ? -.2 : 0
    cadet.torso.rotation.x = kneeling ? .42 : doing ? .15 : moving ? .07 : 0
    for (let i = 0; i < 2; i++) {
      cadet.legs[i].rotation.x = kneeling ? (i === 0 ? -.5 : .48) : gait * (i === 0 ? 1 : -1)
      cadet.arms[i].rotation.x = doing ? 1.24 + (reduced ? 0 : Math.sin(workingTime * 17 + i) * .19) : gait * (i === 0 ? -.78 : .78)
    }
    pad.position.set(position.x, position.y - .025, position.z)
    pad.visible = !intro && !surveying && !landing

    let near: SiteId | null = null
    let closest = reach
    for (const [id, site] of Object.entries(worldSites) as [SiteId, typeof activeSite][]) {
      const moduleIndex = moduleSites.findIndex((module) => module === id)
      const accessible = !expedition || moduleIndex < 0 || expedition.layout[moduleIndex] != null || expedition.pending?.part === moduleIndex
      const distance = Math.hypot(position.x - site.x, position.z - site.z)
      const marked = !!expedition && id === state.site
      if (accessible && distance < reach && (marked || (distance < closest && (!expedition || near !== state.site)))) {
        closest = distance
        near = id
      }
      const marker = base.beacons[id]
      marker.visible = accessible && id === state.site && !intro && !state.opened && !surveying && !landing
      if (marker.visible) {
        if (campaign) marker.position.set(site.x, heightAt(site.x, site.z) + .05, site.z)
        marker.children[1].position.y = 2.04 + (reduced ? 0 : Math.sin(clock * 3) * .22)
        marker.children[1].rotation.y = clock * 1.4
      }
    }
    if (near !== previousNear && !intro) {
      previousNear = near
      callbacks.onNear(near)
    }

    const alpha = 1 - Math.exp(-dt * 4)
    directional.intensity = T.MathUtils.lerp(directional.intensity, state.light ? 2.75 : .25, alpha)
    ambient.intensity = T.MathUtils.lerp(ambient.intensity, state.light ? 1.32 : 1.12, alpha)
    cosmos.storm.visible = state.storm
    cosmos.storm.position.y = reduced ? 0 : -.8 * Math.sin(clock * 2.4)
    cosmos.earth.rotation.y = clock * .014
    const assignments = { mira: state.site === 'shelter' ? worldSites.shelter : worldSites.power, jo: worldSites.garden, ren: worldSites.radio, pip: worldSites.rover }
    for (const [id, actor] of Object.entries(npc) as [CrewId, typeof cadet][]) {
      const site = assignments[id]
      const offset = id === 'mira' ? -1.95 : 1.9
      const alongRover = id === 'pip' && !!state.work.roverStops
      const guiding = id === 'pip' && !!state.expedition && !alongRover
      const sheltered = id !== 'pip' && state.expedition?.sheltered
      const x = alongRover ? base.rover.position.x + .65 : guiding ? position.x + 1.1 : sheltered ? worldSites.shelter.x + offset * .8 : site.x + offset
      const z = alongRover ? base.rover.position.z : guiding ? position.z + .8 : sheltered ? worldSites.shelter.z - (id === 'ren' ? 1.1 : .15) : site.z
      const firstFrame = clock <= dt
      const inTransit = Math.hypot(x - actor.root.position.x, z - actor.root.position.z) > .35
      actor.root.position.x = T.MathUtils.lerp(firstFrame ? x : actor.root.position.x, x, alpha)
      actor.root.position.z = T.MathUtils.lerp(firstFrame ? z : actor.root.position.z, z, alpha)
      actor.root.position.y = heightAt(actor.root.position.x, actor.root.position.z) + (id === 'pip' && !reduced ? .18 + Math.sin(clock * 4) * .085 : .07)
      actor.root.visible = !surveying && !landing
      actor.root.rotation.y = guiding ? angle : .32 + Math.sin(clock * 1.1) * .16
      if (state.expedition && id !== 'pip') actor.legs.forEach((leg, i) => {
        leg.rotation.x = inTransit && !reduced ? Math.sin(clock * 13 + i * Math.PI) * .45 : 0
      })
      actor.arms[1].rotation.x = id === state.crew && doing ? .65 + Math.sin(clock * 9) * .17 : .25
    }

    if (state.completed && lastProcessedTurn !== state.turn) {
      lastProcessedTurn = state.turn
      displayedWork = .8
      if (state.completed === 'shield') raisedPods = state.work.pods ?? 2
      if (['garden', 'prep-garden', 'harvest', 'store', 'pause', 'refill'].includes(state.completed)) cropPower = state.work.light ?? 0
    }
    if (state.work.bearing !== undefined) antenna = (state.work.bearing - 35) * .034
    base.dish.rotation.y = tweenAngle(base.dish.rotation.y, antenna, alpha)
    for (const [index, pod] of base.waterPods.entries()) {
      const movingToGap = index < (state.work.pods ?? 0)
      const raised = index < raisedPods || (movingToGap && doing)
      pod.position.x = T.MathUtils.lerp(pod.position.x, movingToGap || raised ? 1.14 + index * .48 : 0, alpha)
      pod.position.y = T.MathUtils.lerp(pod.position.y, raised ? .83 : 0, alpha)
    }
    const openHatch = state.expedition ? state.expedition.sheltered : hatchOpened && state.turn === 2
    base.hatch.position.x = T.MathUtils.lerp(base.hatch.position.x, openHatch ? 1.01 : 0, alpha)
    const lightSetting = state.opened ? state.work.light ?? cropPower : cropPower
    base.growLight.emissiveIntensity = T.MathUtils.lerp(base.growLight.emissiveIntensity, .23 + lightSetting * .4, alpha)
    base.crops.forEach((crop, index) => {
      const plant = state.expedition?.plants[campaignCropIndices.indexOf(index)]
      crop.visible = !state.expedition || !!plant
      if (!crop.visible) return
      const size = plant ? .52 + plant.growth * .13 : .71 + state.garden * .097
      crop.scale.lerp(plant ? TEMP_CROP_SCALE.set(size, size * (.65 + plant.health * .07), size) : TEMP_CROP_SCALE.setScalar(size), alpha)
    })
    const powerMat = base.powerScreen.material as T.MeshStandardMaterial
    powerMat.emissiveIntensity = state.site === 'power' && doing ? 1.8 + Math.sin(clock * 13) * .45 : .74
    const port = state.work.target
    circuit.visible = doing && (state.site === 'power' || state.site === 'garden' || state.site === 'air') && !!port && port !== state.site
    if (circuit.visible && port) {
      const receiver = worldSites[port]
      circuitStart.set(activeSite.x, heightAt(activeSite.x, activeSite.z) + .15, activeSite.z - .73)
      circuitEnd.set(receiver.x, heightAt(receiver.x, receiver.z) + .15, receiver.z - .73)
      circuitDirection.subVectors(circuitEnd, circuitStart)
      circuit.position.copy(circuitStart).lerp(circuitEnd, .5)
      circuit.scale.y = circuitDirection.length()
      circuit.quaternion.setFromUnitVectors(up, circuitDirection.normalize())
      circuitMaterial.opacity = reduced ? .85 : .75 + .18 * Math.sin(clock * 14)
    }

    if (expedition && landingSite) {
      const progress = reduced ? 1 : Math.min(1, descentTime / 2.6)
      if (landing) descentTime += dt
      const padHeight = heightAt(landingSite.x, landingSite.z)
      base.craft.visible = !surveying
      base.craft.position.set(landingSite.x, padHeight + .04 + (landing ? 14 * (1 - progress) ** 2 : 0), landingSite.z)
      dust.visible = landing && !reduced && progress > .63
      if (dust.visible) {
        const plume = (progress - .63) / .37
        dust.position.set(landingSite.x, padHeight + .3, landingSite.z)
        dust.scale.setScalar(1 + plume * 3)
        dust.material.opacity = Math.sin(plume * Math.PI) * .38
      }
      if (landing && progress === 1 && !touchdownSent) {
        touchdownSent = true
        callbacks.onTouchdown?.()
      }
      for (const { id, pad } of base.pads) pad.visible = surveying || id === expedition.sector
      const placement = expedition.preview ?? expedition.pending
      mountRing.visible = !!placement
      if (placement) {
        const { x, z } = moduleMount(placement.part, placement.outer)
        mountRing.position.set(x, heightAt(x, z) + .2, z)
        mountRing.scale.setScalar(placement.part === 2 ? .62 : .96)
        mountRing.material.opacity = reduced ? .8 : .75 + Math.sin(clock * 4) * .2
      }
      base.modules.forEach((part, i) => {
        const { preview, pending } = expedition
        const installed = expedition.layout[i] != null
        const slot = expedition.layout[i] ?? (preview?.part === i ? preview.outer : pending?.part === i ? pending.outer : null)
        part.visible = slot !== null
        if (slot === null) {
          previews[i].slot = null
          return
        }
        const spot = moduleMount(i, slot)
        const ground = heightAt(spot.x, spot.z) + .06
        if (previews[i].slot !== slot || previews[i].installed !== installed) {
          part.scale.setScalar(reduced ? 1 : installed ? .32 : .8)
          part.position.set(spot.x, ground, spot.z)
          previews[i] = { slot, installed }
        }
        part.scale.setScalar(T.MathUtils.lerp(part.scale.x, 1, reduced ? 1 : 1 - Math.exp(-dt * 5)))
      })
    }
    workRing.visible = doing && !!(state.work.pulse || state.work.pose === 'sample')
    if (workRing.visible) {
      const cycle = reduced ? .25 : (workingTime * 1.4) % 1
      workRing.position.set(position.x, position.y + .3 + cycle, position.z)
      workRing.scale.setScalar(.8 + cycle * 2.3)
      workRing.material.color.set(state.work.pulse === 'oxygen' ? '#91e8ff' : state.work.pose === 'sample' ? '#a3ffd4' : '#ffd584')
      workRing.material.opacity = .9 * (1 - cycle)
    }

    const roverPosition = base.rover.position
    const requestedStops = state.work.roverStops
    if (requestedStops && requestedStops !== roverStops) {
      roverStops = requestedStops
      roverStopIndex = 0
      roverRoute = route(roverPosition, roverTarget(roverStops[0]))
    }
    if (roverRoute.length) {
      const waypoint = roverRoute[0]
      walkingVector.set(waypoint.x - roverPosition.x, 0, waypoint.z - roverPosition.z)
      const distance = walkingVector.length()
      if (distance < .09) roverRoute.shift()
      else {
        base.rover.rotation.y = tweenAngle(base.rover.rotation.y, Math.atan2(walkingVector.x, walkingVector.z), 1 - Math.exp(-dt * 10))
        roverPosition.addScaledVector(walkingVector.normalize(), Math.min(distance, dt * (reduced ? 32 : 12)))
        for (const wheel of base.wheels) wheel.rotation.x -= dt * 11
      }
    }
    if (roverStops && !roverRoute.length && roverStopIndex < roverStops.length) {
      if (roverStops[roverStopIndex] === 'kit') roverHasKit = true
      roverStopIndex += 1
      if (roverStopIndex === roverStops.length) {
        hatchOpened = true
        callbacks.onRoverArrived()
      }
      else roverRoute = route(roverPosition, roverTarget(roverStops[roverStopIndex]))
    }
    roverPosition.y = heightAt(roverPosition.x, roverPosition.z) + .07
    base.kit.visible = !state.kit && !roverHasKit
    base.roverCargo.visible = state.kit || roverHasKit
    if (state.expedition) {
      const carrying = doing && state.work.pose === 'carry'
      if (carrying && base.kit.parent) {
        cargoPosition.set(position.x - Math.sin(angle) * .6, position.y + .73, position.z - Math.cos(angle) * .6)
        base.kit.position.lerp(base.kit.parent.worldToLocal(cargoPosition), reduced ? 1 : alpha)
      } else base.kit.position.set(0, 0, 0)
      const sampling = doing && state.work.pose === 'sample'
      const lift = sampling ? Math.min(1, workingTime * 1.2) : 0
      sample.visible = !state.expedition.sampleCollected
      sample.position.set(T.MathUtils.lerp(rockSite.x, position.x, lift), heightAt(rockSite.x, rockSite.z) + .23 + lift * .7,
        T.MathUtils.lerp(rockSite.z, position.z - .45, lift))
      sample.rotation.y = sampling && !reduced ? clock : 0
    }
    ping.visible = state.sending
    if (ping.visible) {
      const cycle = (clock * 1.5) % 1
      const relay = expedition ? base.modules[2].position : worldSites.radio
      ping.position.set(relay.x, heightAt(relay.x, relay.z) + 2.8 + cycle * 7, relay.z - (expedition ? 0 : 1.3))
      ping.scale.setScalar(.7 + cycle * 4)
      ping.material.opacity = (1 - cycle) * .85
    }

    if (intro) {
      const orbit = .7 + (reduced ? 0 : Math.sin(clock * .19) * .22)
      desiredCamera.set(Math.sin(orbit) * 41, 28, Math.cos(orbit) * 41)
      cameraTarget.set(0, 1, -2)
    } else if (surveying && landingSite) {
      const { x, z } = landingSite
      desiredCamera.set(x + 15, heightAt(x, z) + 14, z + (expedition?.sector === 'basin' ? 18 : 12))
      cameraTarget.set(x, heightAt(x, z), z + (expedition?.sector === 'basin' ? 4.5 : 0))
    } else if (landing && landingSite) {
      const { x, z } = landingSite
      const ground = heightAt(x, z)
      desiredCamera.set(x + 10, ground + 9, z + 12)
      cameraTarget.set(x, ground + 1 + (base.craft.position.y - ground) * .58, z)
    } else if (state.overview || (state.opened && requestedStops && roverStopIndex < requestedStops.length)) {
      desiredCamera.set(position.x * .19 + Math.sin(azimuth) * 28, 38, position.z * .16 + Math.cos(azimuth) * 29)
      cameraTarget.set(position.x * .16, 0, position.z * .16 - 2)
    } else if (state.opened) {
      const viewSite = worldSites[state.work.target ?? state.site]
      const module = expedition?.focusModule
      if (module !== undefined && base.modules[module].visible) {
        const placement = base.modules[module].position
        desiredCamera.set(placement.x + 6.7, placement.y + 7.5, placement.z + (module === 0 ? -7.8 : 8))
        cameraTarget.set(placement.x, placement.y + 1, placement.z)
      } else {
        desiredCamera.set(position.x + 4.2, position.y + 3.75, position.z + 5.6)
        cameraTarget.set(position.x * .75 + viewSite.x * .25, position.y + .87, position.z * .72 + (viewSite.z - 1) * .28)
      }
    } else {
      desiredCamera.set(position.x + Math.sin(azimuth) * range, position.y + height, position.z + Math.cos(azimuth) * range)
      cameraTarget.set(position.x - Math.sin(azimuth) * 3.3, position.y + .75, position.z - Math.cos(azimuth) * 3.3)
    }
    camera.position.lerp(desiredCamera, reduced ? 1 : 1 - Math.exp(-dt * 9))
    lookAt.lerp(cameraTarget, reduced ? 1 : 1 - Math.exp(-dt * 17))
    camera.lookAt(lookAt)
    if (time - shadowTime > 80 || shadowTime < 0) {
      renderer.shadowMap.needsUpdate = true
      shadowTime = time
    }
    renderer.render(scene, camera)
    if (!intro && time - mapTime > 120) {
      callbacks.onMap(position.x, position.z, -angle, azimuth)
      mapTime = time
    }
    frame = requestAnimationFrame(animate)
  }
  const TEMP_CROP_SCALE = new T.Vector3()
  frame = requestAnimationFrame(animate)

  return {
    update(next: WorldState) {
      if (next.locked && !state.locked) stopMovement()
      if (next.expedition) {
        const before = state.expedition
        const after = next.expedition
        if (!before || after.sector !== before.sector || after.layout !== before.layout || after.pending?.part !== before.pending?.part || after.pending?.outer !== before.pending?.outer) {
          syncGeography(after)
          previousNear = null
          callbacks.onNear(null)
        }
        if (after.descent && !before?.descent) {
          descentTime = 0
          touchdownSent = false
          const { x, z } = sectors[after.sector].access
          cadet.root.position.set(x, heightAt(x, z), z)
        }
      }
      state = next
    },
    touch(x: number, y: number) { touch.x = x; touch.y = y },
    focus() { host.focus({ preventScroll: true }) },
    waypoint() {
      if (intro || state.locked) return
      const target = worldSites[state.site]
      const goal = new T.Vector3(target.x, heightAt(target.x, target.z), target.z)
      destination = route(cadet.root.position, goal)
      targetMarker.position.copy(goal)
      targetMarker.position.y += .055
      targetMarker.visible = destination.length > 0
    },
    dispose() {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', stopMovement)
      host.removeEventListener('pointerdown', pointerDown)
      host.removeEventListener('pointermove', pointerMove)
      host.removeEventListener('pointerup', pointerUp)
      host.removeEventListener('pointercancel', clearDrag)
      host.removeEventListener('lostpointercapture', clearDrag)
      host.removeEventListener('wheel', wheel)
      canvas.removeEventListener('webglcontextlost', callbacks.onUnavailable)
      scene.traverse((object) => {
        if (object instanceof T.Mesh || object instanceof T.Points) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          for (const material of materials) {
            if (material.map instanceof T.Texture) material.map.dispose()
            material.dispose()
          }
        }
      })
      directional.shadow.dispose()
      renderer.dispose()
      canvas.remove()
    },
  }
}
