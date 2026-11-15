import { useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { airCost, frames, limits, solarPower, step, turns } from './mission'
import type { Mission, Plan } from './mission'
import type { WorkVisual } from './world/runtime'
import { Icon } from './ui/Icon'
import './stations.css'

type StationProps = { mission: Mission; onMove: (move: WorkVisual) => void; onCommit: (plan: Plan) => void }

function Projection({ mission, plan }: { mission: Mission; plan: Plan }) {
  const next = step(mission, plan)
  const log = next.history.at(-1)
  const following = frames.slice(next.turn, turns.length)
  const firstLight = following.findIndex((frame) => frame.sunlit)
  const shade = firstLight < 0 ? following.length : firstLight
  const airTurns = Math.floor(next.power / airCost)
  return <div className="station-projection" aria-live="polite">
    <span className="eyebrow">After this job</span>
    <div className="projected-resources">
      <span className="amber"><strong>{next.power}</strong> Battery</span>
      <span className="sage"><strong>{next.air}</strong> Backup air</span>
      <span className="mint"><strong>{next.garden}</strong> Crop steps</span>
    </div>
    {shade > 0 && <small>{shade} turns of shadow ahead. Stored power covers {airTurns} {airTurns === 1 ? 'turn' : 'turns'} of air.</small>}
    {mission.turn === 2 || mission.turn === 3 ? <small>Exposure after work: {next.exposure} training points.</small> : null}
    {log && !log.applied && <small className="station-warning">The extra equipment needs more power. The crew will use its backup plan.</small>}
  </div>
}

function drop(event: DragEvent, type: string, handle: (value: string) => void) {
  event.preventDefault()
  const value = event.dataTransfer.getData(type)
  if (value) handle(value)
}

function PowerStation({ mission, onMove, onCommit }: StationProps) {
  const [light, setLight] = useState(0)
  const [fill, setFill] = useState(false)
  const last = mission.turn === 5
  const max = mission.turn === 1 ? 5 : 4
  const input = mission.power + (frames[mission.turn].sunlit ? solarPower : 0)
  const spare = Math.max(0, input - airCost)
  const cost = light + (fill ? 3 : 0)
  const plan: Plan = { kind: 'power', light, air: fill ? 3 : 0 }
  const crop = Math.floor(light * (last ? 3 : 2) / max)
  function changeLight(value: number) {
    setLight(Math.max(0, Math.min(max, value)))
    onMove({ target: value > 0 ? 'garden' : 'power', light: Math.max(0, Math.min(max, value)), working: false })
  }
  return <div className="workstation">
    <div className="station-heading"><h2>{last ? 'Bring Farpoint back online' : 'Build the power schedule'}</h2>
      <p>Life support draws {airCost} power first. Drag an energy cell to the greenhouse or use the dimmer. Unused power stays in the battery.</p></div>
    <div className="power-bus">
      <div><span>Air machine</span><strong>{input >= airCost ? '4 reserved' : 'On backup air'}</strong></div>
      <div><span>Battery after routing</span><strong>{Math.min(limits.power, Math.max(0, spare - cost))}</strong></div>
      <button draggable className="station-button energy-cell" onDragStart={(event) => event.dataTransfer.setData('application/x-power-cell', 'energy')}
        onClick={() => changeLight(light + 1)} aria-label="Add 1 power to the greenhouse"><Icon name="bolt" size={17} />Add 1 power</button>
    </div>
    <div className="power-load" onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, 'application/x-power-cell', () => changeLight(light + 1))}>
      <label htmlFor="light-load">Greenhouse dimmer <strong>{light} / {max}</strong></label>
      <input id="light-load" type="range" min={0} max={max} value={light} onChange={(event) => changeLight(Number(event.target.value))} />
      <div className="load-dots" aria-hidden="true">{Array.from({ length: max }, (_, cell) => <i key={cell} className={cell < light ? 'lit' : ''} />)}</div>
      <small>{crop ? 'Crop growth +' + crop + (crop === 1 ? ' step' : ' steps') : light ? 'Too dim for a growth step' : 'Lights off'}</small>
    </div>
    {last && <button className="station-button refill-air" aria-pressed={fill} onClick={() => {
      setFill(!fill)
      onMove({ target: !fill ? 'air' : light ? 'garden' : 'power', working: false })
    }}><Icon name={fill ? 'check' : 'air'} size={18} />Connect air tanks · 3 power</button>}
    {cost > spare && <p className="station-warning" role="status">Over budget by {cost - spare}. {last ? 'Dim the grow lights or disconnect the tanks.' : 'Dim the grow lights to stay within budget.'}</p>}
    <Projection mission={mission} plan={plan} />
    <button className="primary" disabled={cost > spare} onClick={() => {
      onMove({ target: fill ? 'air' : light ? 'garden' : 'power', light, working: true })
      onCommit(plan)
    }}>Apply power schedule <Icon name="arrow" size={18} /></button>
  </div>
}

type RoutePoint = 'start' | 'junction' | 'ridge' | 'kit' | 'hatch'
const nodes: Record<RoutePoint, { x: number; y: number; label: string }> = {
  start: { x: 13, y: 76, label: 'Rover' },
  junction: { x: 38, y: 76, label: 'Trail' },
  ridge: { x: 38, y: 28, label: 'Ridge' },
  kit: { x: 67, y: 28, label: 'Repair kit' },
  hatch: { x: 83, y: 76, label: 'Shelter' },
}
const roads: [RoutePoint, RoutePoint][] = [['start', 'junction'], ['start', 'ridge'], ['junction', 'hatch'], ['junction', 'kit'], ['ridge', 'kit'], ['ridge', 'hatch'], ['kit', 'hatch']]

function RouteStation({ mission, onMove, onCommit }: StationProps) {
  const [route, setRoute] = useState<RoutePoint[]>(['start'])
  const [hint, setHint] = useState('')
  const end = route[route.length - 1]
  const kit = route.includes('kit')
  const rough = route.includes('ridge')
  const done = end === 'hatch'
  const plan: Plan = { kind: 'route', kit, rough }
  const power = Number(kit) * 3 + Number(rough) * 2
  const exposure = (kit ? 3 : 1) - Number(rough)
  const overBudget = power > Math.max(0, mission.power - airCost)

  function visit(next: RoutePoint) {
    if (next === end) return
    const earlier = route.indexOf(next)
    if (earlier !== -1) {
      setHint('')
      setRoute(route.slice(0, earlier + 1))
      return
    }
    if (done || !roads.some(([a, b]) => a === end && b === next)) {
      setHint(done ? 'Tap an earlier stop to change the route.' : 'Follow a marked path from the last stop.')
      return
    }
    setHint('')
    setRoute([...route, next])
  }

  return <div className="workstation">
    <div className="station-heading"><h2>Chart Pip’s route</h2><p>Trace a path to shelter. The kit carries a spare radio cell. The ridge shortcut adds 2 power to the drive and cuts exposure by 1.</p></div>
    <div className="route-board route-puzzle">
      <svg className="route-lines" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
        {roads.map(([a, b]) => <line key={a + b} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          className={route.indexOf(a) >= 0 && route.indexOf(b) === route.indexOf(a) + 1 ? 'traced' : a === 'ridge' || b === 'ridge' ? 'rough-road' : undefined} />)}
      </svg>
      {(Object.entries(nodes) as [RoutePoint, typeof nodes.start][]).map(([id, node]) => <button key={id}
        className="station-button waypoint" style={{ left: node.x + '%', top: node.y + '%' }}
        aria-pressed={route.includes(id)} onPointerEnter={(event) => {
          if (event.buttons === 1 && event.pointerType === 'mouse') visit(id)
        }} onClick={() => visit(id)}>{node.label}</button>)}
    </div>
    <div className="route-cost"><span>{power} battery</span><span>+{exposure} exposure</span><span>{kit ? 'Kit on route' : 'Kit stays outside'}</span></div>
    <p className="station-hint" aria-live="polite">{hint || (done ? 'Route ready. Check the cost before sending Pip to shelter.' : 'Tap or drag across the marked stops. Tap an earlier stop to undo.')}</p>
    {done && <Projection mission={mission} plan={plan} />}
    {done && overBudget && <p className="station-warning">There’s too little battery for this route. Try the main trail without the kit.</p>}
    <div className="station-actions">
      <button className="primary" disabled={!done || overBudget} onClick={() => {
        onMove({ target: 'shelter', working: true })
        onCommit(plan)
      }}>Drive the route <Icon name="arrow" size={18} /></button>
      <button className="text-button" onClick={() => { setRoute(['start']); setHint('') }}>Clear route</button>
    </div>
  </div>
}

function ShelterStation({ mission, onMove, onCommit }: StationProps) {
  const [slots, setSlots] = useState([false, false])
  const pods = slots.filter(Boolean).length
  const plan: Plan = { kind: 'shield', pods }
  const enoughPower = pods * 2 <= Math.max(0, mission.power - airCost)

  function setPod(index: number, value: boolean) {
    const next = slots.map((placed, position) => position === index ? value : placed)
    setSlots(next)
    onMove({ target: 'shelter', pods: next.filter(Boolean).length, working: false })
  }

  return <div className="workstation">
    <div className="station-heading"><h2>Shield the crew from the storm</h2><p>Drag water pods to cover the two gaps, or tap each gap. Every pod blocks one exposure point and uses 2 power.</p></div>
    <div className="shield-board">
      <div className="particle-front" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <Icon name="down" size={18} key={index} />)}</div>
      <div className="shield-gaps">{slots.map((covered, index) => <button className="station-button shield-gap" key={index} aria-pressed={covered}
        onClick={() => setPod(index, !covered)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, 'application/x-water-pod', () => setPod(index, true))}>{covered && <Icon name="water" size={17} />}Cover gap {index + 1}</button>)}</div>
      <div className="shield-crew"><Icon name="crew" size={23} />Crew shelter</div>
      <button className="station-button pod-supply" draggable disabled={pods === 2}
        onDragStart={(event) => event.dataTransfer.setData('application/x-water-pod', 'water')}
        onClick={() => setPod(slots.indexOf(false), true)}><Icon name="water" size={17} />Load water pod · {2 - pods} left</button>
    </div>
    <Projection mission={mission} plan={plan} />
    {!enoughPower && <p className="station-warning" role="status">The lift cannot raise {pods} pods with the power left. Tap a placed pod to remove it.</p>}
    <button className="primary" disabled={!enoughPower} onClick={() => {
      onMove({ target: 'shelter', working: true, pods })
      onCommit(plan)
    }}>{pods ? 'Raise ' + pods + (pods === 1 ? ' pod' : ' pods') : 'Seal the existing shelter'} <Icon name="arrow" size={18} /></button>
  </div>
}

const earthBearing = 72
const packet = ['air', 'power', 'shelter'] as const
type PacketChannel = typeof packet[number]
const channelNames = { air: 'Crew air', power: 'Battery', shelter: 'Shelter' }

function RadioStation({ mission, onMove, onCommit }: StationProps) {
  const [bearing, setBearing] = useState(40)
  const [channels, setChannels] = useState<PacketChannel[]>([])
  const [hint, setHint] = useState('')
  const signal = Math.max(0, 100 - Math.abs(earthBearing - bearing) * 3)
  const locked = signal >= 88
  const airPowered = mission.power >= airCost
  const canSend = mission.kit || mission.power > airCost

  function tune(value: number) {
    const angle = Math.max(0, Math.min(value, 100))
    setBearing(angle)
    onMove({ target: 'radio', bearing: angle, working: true })
  }

  function add(channel: PacketChannel) {
    if (!packet.includes(channel) || channels.includes(channel)) return
    if (channel !== packet[channels.length]) {
      setHint('Earth reads crew air first, then battery, then shelter. Try the next channel in that order.')
      return
    }
    setChannels([...channels, channel])
    setHint('')
  }

  return <div className="workstation">
    <div className="station-heading"><h2>Send Earth a useful distress call</h2><p>Aim the dish, then build the message in the order Mission Control reads it.</p></div>
    <div className="radio-dial" aria-hidden="true"><span className="radio-dish" style={{ '--dish-turn': bearing - 72 + 'deg' } as CSSProperties}><Icon name="radio" size={31} /></span>
      <div className="signal-bars">{[20, 40, 60, 80, 90].map((level) => <i key={level} className={signal >= level ? 'signal-lit' : ''} style={{ height: level / 2 + 'px' }} />)}</div></div>
    <label className="tuner-label" htmlFor="antenna-tuner">Antenna angle <strong>{bearing}°</strong></label>
    <input className="antenna-tuner" id="antenna-tuner" type="range" min={0} max={100} value={bearing} onChange={(event) => tune(Number(event.target.value))} />
    <p className="station-hint" aria-live="polite">{locked ? 'Earth signal locked' : (signal ? 'Signal ' + signal + '%' : 'No signal') + ' · Sweep to find Earth'}</p>
    <div className="packet-board" onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, 'application/x-radio-channel', (value) => add(value as PacketChannel))}>
      {packet.map((channel, index) => <span className={channels.includes(channel) ? 'filled' : ''} key={channel}>{index + 1}. {channelNames[channel]}{channels.includes(channel) && <strong>{channel === 'air' ? mission.air + ' reserve' : channel === 'power' ? mission.power + ' power' : mission.exposure + ' exposure'}</strong>}</span>)}
    </div>
    <div className="packet-chips">{(['power', 'shelter', 'air'] as const).map((channel) => <button key={channel} className="station-button" draggable
      disabled={channels.includes(channel)} onDragStart={(event) => event.dataTransfer.setData('application/x-radio-channel', channel)} onClick={() => add(channel)}>{channelNames[channel]}</button>)}</div>
    {hint && <p className="station-warning" role="status">{hint}</p>}
    <p className="station-hint">{mission.kit ? 'Pip’s spare cell can power this call.' : canSend ? 'The main battery can power this call.' : airPowered ? 'The air machine needs the remaining battery. You can repair locally.' : 'The battery is too low to run the air machine or radio. Use backup air to get through this turn.'}</p>
    <div className="station-actions">
      <button className="primary" disabled={!locked || channels.length !== packet.length || !canSend} onClick={() => onCommit(0)}>Send to Earth <Icon name="arrow" size={18} /></button>
      <button className="secondary" onClick={() => onCommit(1)}>{airPowered ? 'Repair locally · 2 air' : 'Use backup air this turn'}</button>
    </div>
  </div>
}

export function Workstation(props: StationProps) {
  if ([0, 1, 5].includes(props.mission.turn)) return <PowerStation {...props} />
  if (props.mission.turn === 2) return <RouteStation {...props} />
  if (props.mission.turn === 3) return <ShelterStation {...props} />
  return <RadioStation {...props} />
}
