import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { createWorld } from './world/runtime'
import type { WorldState } from './world/runtime'
import { expeditionSites, habitat, moduleMount, moduleSites, sectors, sites, spawn } from './world/layout'
import type { SiteId } from './world/layout'
import { landingSites } from './colony'
import { Icon } from './ui/Icon'
import './world/world.css'

type SceneProps = {
  state: WorldState
  demo?: boolean
  onInteract?: (id: SiteId) => void
  onOverview?: () => void
  onUnavailable?: () => void
  onRoverArrived?: () => void
  onTouchdown?: () => void
}

export function LunarScene({ state, demo = false, onInteract, onOverview, onUnavailable, onRoverArrived, onTouchdown }: SceneProps) {
  const host = useRef<HTMLDivElement>(null)
  const controller = useRef<ReturnType<typeof createWorld> | null>(null)
  const latest = useRef({ state, onInteract, onUnavailable, onRoverArrived, onTouchdown })
  latest.current = { state, onInteract, onUnavailable, onRoverArrived, onTouchdown }
  const [near, setNear] = useState<SiteId | null>(null)
  const [location, setLocation] = useState({ ...spawn, angle: 0, cameraYaw: 0 })
  const [error, setError] = useState(false)
  const scene = useRef<HTMLDivElement>(null)
  const [full, setFull] = useState(false)

  useEffect(() => {
    if (!host.current) return
    function unavailable() {
      setError(true)
      latest.current.onUnavailable?.()
    }
    let world: ReturnType<typeof createWorld>
    try {
      world = createWorld(host.current, latest.current.state, {
        onNear: setNear,
        onUse: (id) => latest.current.onInteract?.(id),
        onMap: (x, z, angle, cameraYaw) => setLocation({ x, z, angle, cameraYaw }),
        onUnavailable: unavailable,
        onRoverArrived: () => latest.current.onRoverArrived?.(),
        onTouchdown: () => latest.current.onTouchdown?.(),
      }, demo)
    } catch (error) {
      console.error('Could not start the lunar scene', error)
      unavailable()
      return
    }
    controller.current = world
    return () => { world.dispose(); controller.current = null }
  }, [demo])

  useEffect(() => { controller.current?.update(state) }, [state])

  function move(event: PointerEvent<HTMLButtonElement>, x: number, y: number) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    controller.current?.touch(x, y)
  }

  const release = () => controller.current?.touch(0, 0)
  const expedition = state.expedition
  const flight = expedition?.recon || expedition?.descent
  const mapSites = expedition ? expeditionSites(expedition.sector, expedition.layout, expedition.pending) : sites
  const objective = mapSites[state.site]
  const placement = expedition?.preview ?? expedition?.pending
  const focus = placement ? moduleMount(placement.part, placement.outer) : null
  const landingName = expedition ? landingSites[expedition.sector].name : 'Farpoint surface'
  const distance = Math.ceil(Math.hypot(location.x - objective.x, location.z - objective.z))
  const nextToJob = near === state.site
  const bearing = Math.atan2(objective.x - location.x, location.z - objective.z) + location.cameraYaw

  useEffect(() => {
    function syncFullscreen() { setFull(document.fullscreenElement === scene.current?.closest('.game-wrap')) }
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  async function fullscreen() {
    const game = scene.current?.closest('.game-wrap')
    try {
      if (document.fullscreenElement === game) await document.exitFullscreen()
      else await game?.requestFullscreen()
      controller.current?.focus()
    } catch {
      controller.current?.focus()
    }
  }

  return <div ref={scene} className="lunar-scene">
    <div ref={host} className="world-canvas" role="region" tabIndex={0}
      aria-label={flight ? '3D view of ' + landingName : '3D Farpoint outpost. Move with W A S D or the arrow keys. Press E by a station to interact.'} />
    {!error && <>
      <div className="world-location"><Icon name="target" size={16} /><span>{flight ? landingName : 'Farpoint surface'}</span></div>
      {state.expedition && !state.locked && !nextToJob && <div className="world-bearing" aria-hidden="true">
        <span style={{ transform: 'rotate(' + bearing + 'rad)' }}><Icon name="down" size={22} /></span>
        <strong>{objective.name}</strong><small>{distance} m</small>
      </div>}
      <div className="world-map" role="img" aria-label={flight ? 'Landing sites map. Selected landing site: ' + landingName : 'Outpost map. ' + objective.name + ' is ' + distance + ' meters away.'} style={{ '--objective': objective.color } as CSSProperties}>
        <span className="map-north">N</span>
        {expedition && Object.entries(sectors).map(([id, site]) => <i key={id} title={landingSites[id as keyof typeof sectors].name} aria-hidden="true"
          className={'map-site map-landing' + (id === expedition.sector ? ' map-selected' : '')}
          style={{ left: (50 + site.x * 1.88) + '%', top: (50 + site.z * 1.88) + '%', background: site.color }} />)}
        {expedition && <i title={habitat.name} aria-hidden="true" className="map-site"
          style={{ left: (50 + habitat.x * 1.88) + '%', top: (50 + habitat.z * 1.88) + '%', background: habitat.color }} />}
        {focus && <i title="Selected installation mount" aria-hidden="true" className="map-site map-landing map-selected"
          style={{ left: (50 + focus.x * 1.88) + '%', top: (50 + focus.z * 1.88) + '%', background: objective.color }} />}
        {!flight && expedition?.layout.map((slot, index) => {
          if (slot == null) return null
          const mount = moduleMount(index, slot)
          const station = mapSites[moduleSites[index]]
          return <i key={station.name} title={station.name + ' equipment'} aria-hidden="true" className="map-site map-landing"
            style={{ left: (50 + mount.x * 1.88) + '%', top: (50 + mount.z * 1.88) + '%', background: station.color }} />
        })}
        {!flight && Object.entries(mapSites).filter(([id]) => {
          const module = moduleSites.findIndex((module) => module === id)
          return !expedition || module < 0 || expedition.layout[module] != null || expedition.pending?.part === module
        }).map(([id, site]) => <i key={id} title={site.name} aria-hidden="true" className={id === state.site ? 'map-site map-current' : 'map-site'} style={{ left: (50 + site.x * 1.88) + '%', top: (50 + site.z * 1.88) + '%', background: site.color }} />)}
        {!flight && <i className="map-player" aria-hidden="true" style={{ left: (50 + location.x * 1.88) + '%', top: (50 + location.z * 1.88) + '%', rotate: location.angle + 'rad' }} />}
      </div>
      {!state.locked && <div className="world-interact">
        {!nextToJob && <button className="world-button world-guide" onClick={() => { controller.current?.waypoint(); controller.current?.focus() }}>
          <Icon name="target" size={18} /><span>Follow marker</span><small>{distance} m</small>
        </button>}
        {near && <button className={nextToJob ? 'primary' : 'world-button'} onClick={() => onInteract?.(near)}>
          <kbd>E</kbd><span>{nextToJob ? (expedition?.pending ? 'Build at ' : 'Operate ') : 'Inspect '}{mapSites[near].name}</span>
        </button>}
      </div>}
      {!state.locked && <div className="world-dpad" aria-label="Touch movement">
        {([{ label: 'Move forward', symbol: '↑', x: 0, y: -1 }, { label: 'Move left', symbol: '←', x: -1, y: 0 }, { label: 'Move backward', symbol: '↓', x: 0, y: 1 }, { label: 'Move right', symbol: '→', x: 1, y: 0 }]).map((direction, index) =>
          <button key={direction.label} type="button" className={'dpad-key dpad-' + index} aria-label={direction.label} onPointerDown={(event) => move(event, direction.x, direction.y)}
            onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>{direction.symbol}</button>
        )}
      </div>}
      <div className="world-toolbar">
        {!state.locked && <div className="world-controls"><span><kbd>WASD</kbd> Move</span><span>Drag to look</span><span>Tap ground to walk</span></div>}
        <div className="world-tools">
          {!flight && <button className="world-button" data-active={state.overview} onClick={onOverview}><Icon name="globe" size={17} />{state.overview ? 'Cadet view' : 'Colony view'}</button>}
          {document.fullscreenEnabled && <button className="icon-button world-button" aria-label={full ? 'Exit fullscreen' : 'Play fullscreen'} onClick={() => void fullscreen()}>
            <Icon name={full ? 'collapse' : 'expand'} size={18} />
          </button>}
        </div>
      </div>
    </>}
  </div>
}
