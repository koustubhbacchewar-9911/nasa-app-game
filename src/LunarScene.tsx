import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { createWorld } from './world/runtime'
import type { WorldState } from './world/runtime'
import { sites, spawn } from './world/layout'
import type { SiteId } from './world/layout'
import './world/world.css'

type SceneProps = {
  state: WorldState
  demo?: boolean
  intro?: boolean
  onInteract?: (id: SiteId) => void
  onOverview?: () => void
  onUnavailable?: () => void
  onRoverArrived?: () => void
}

export function LunarScene({ state, demo = false, intro = false, onInteract, onOverview, onUnavailable, onRoverArrived }: SceneProps) {
  const host = useRef<HTMLDivElement>(null)
  const controller = useRef<ReturnType<typeof createWorld> | null>(null)
  const latest = useRef({ state, onInteract, onUnavailable, onRoverArrived })
  latest.current = { state, onInteract, onUnavailable, onRoverArrived }
  const [near, setNear] = useState<SiteId | null>(null)
  const [location, setLocation] = useState({ ...spawn, angle: 0 })
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
        onMap: (x, z, angle) => setLocation({ x, z, angle }),
        onUnavailable: unavailable,
        onRoverArrived: () => latest.current.onRoverArrived?.(),
      }, demo, intro)
    } catch (error) {
      console.error('Could not start the lunar scene', error)
      unavailable()
      return
    }
    controller.current = world
    return () => { world.dispose(); controller.current = null }
  }, [demo, intro])

  useEffect(() => { controller.current?.update(state) }, [state])

  function move(event: PointerEvent<HTMLButtonElement>, x: number, y: number) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    controller.current?.touch(x, y)
  }

  const release = () => controller.current?.touch(0, 0)
  const objective = sites[state.site]
  const distance = Math.ceil(Math.hypot(location.x - objective.x, location.z - objective.z))
  const nextToJob = near === state.site

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

  return <div ref={scene} className={'lunar-scene' + (intro ? ' lunar-intro' : '') + (state.overview ? ' lunar-overview' : '')}>
    <div ref={host} className="world-canvas" tabIndex={intro ? -1 : 0}
      aria-label={intro ? undefined : '3D Farpoint outpost. Move with W A S D or the arrow keys. Press E by a station to interact.'} />
    {error && <div className="world-error"><strong>3D graphics could not start</strong><p>Enable WebGL 2 in your browser to walk around Farpoint.</p></div>}
    {!intro && !error && <>
      <div className="world-location"><span>FARPOINT</span><span>{state.light ? '☀ Solar array in sunlight' : '◒ Solar array in shadow'}</span></div>
      <div className="world-map" aria-label={'Outpost map. ' + objective.name + ' is ' + distance + ' meters away.'} style={{ '--objective': objective.color } as CSSProperties}>
        <span className="map-north">N</span>
        {Object.entries(sites).map(([id, site]) => <i key={id} title={site.name} aria-hidden="true" className={id === state.site ? 'map-site map-current' : 'map-site'} style={{ left: (50 + site.x * 1.88) + '%', top: (50 + site.z * 1.88) + '%', background: site.color }} />)}
        <i className="map-player" aria-hidden="true" style={{ left: (50 + location.x * 1.88) + '%', top: (50 + location.z * 1.88) + '%', rotate: location.angle + 'rad' }} />
      </div>
      <button className="world-overview-button" aria-pressed={state.overview} onClick={() => { onOverview?.(); controller.current?.focus() }}>
        {state.overview ? 'Cadet view' : 'Colony view'}
      </button>
      {document.fullscreenEnabled && <button className="world-fullscreen-button" aria-label={full ? 'Exit fullscreen' : 'Play fullscreen'} onClick={() => void fullscreen()}>{full ? '↙' : '⛶'}</button>}
      {!state.locked && !nextToJob && <button className="world-guide-button" onClick={() => { controller.current?.waypoint(); controller.current?.focus() }}>Follow marker</button>}
      {!state.opened && !state.locked && <div className="world-interact" aria-live="polite">
        {near ? <button className="primary" onClick={() => onInteract?.(near)}><kbd>E</kbd> {nextToJob ? 'Operate ' : 'Inspect '}{sites[near].name}</button>
          : <div><i style={{ background: objective.color }} />{objective.name}<small>{distance} m</small></div>}
      </div>}
      {!state.locked && <div className="world-dpad" aria-label="Touch movement">
        {([{ label: 'Move forward', symbol: '↑', x: 0, y: -1 }, { label: 'Move left', symbol: '←', x: -1, y: 0 }, { label: 'Move backward', symbol: '↓', x: 0, y: 1 }, { label: 'Move right', symbol: '→', x: 1, y: 0 }]).map((direction, index) =>
          <button key={direction.label} type="button" className={'dpad-key dpad-' + index} aria-label={direction.label} onPointerDown={(event) => move(event, direction.x, direction.y)}
            onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>{direction.symbol}</button>
        )}
      </div>}
      {!state.opened && !state.locked && <div className="world-controls"><span><kbd>WASD</kbd> Move</span><span>Drag to look</span><span>Tap ground to walk</span></div>}
    </>}
  </div>
}
