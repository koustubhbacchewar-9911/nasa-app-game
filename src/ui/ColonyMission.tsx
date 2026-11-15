import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { briefings, capacity, choose, colonyFrame, harvestCount, installationCost, landingSites, modules, options, setupPower, startColony, sunlight, tuneChoice } from '../colony'
import type { Colony, LandingSite, Layout, Reading, StationChoice } from '../colony'
import { radio, storm } from '../science'
import { moduleSites, sectors, sites } from '../world/layout'
import type { SiteId } from '../world/layout'
import type { ShelterPhase, WorkVisual, WorldState } from '../world/runtime'
import photo from '../art/apollo-11.webp'
import { Icon } from './Icon'
import { asset, Avatar } from './Shared'
import { StationLab } from './StationLab'
import type { Draft } from './StationLab'
import './colony.css'

const LunarScene = lazy(() => import('../LunarScene').then((module) => ({ default: module.LunarScene })))
const decisionSites: Record<Colony['node'], SiteId> = {
  budget: 'power', warning: 'radio', shelter: 'shelter', relay: 'rover',
  research: 'kit', repair: 'air', handover: 'radio', report: 'lander',
}
const workSites: Record<string, SiteId> = { hide: 'shelter', walk: 'kit' }
const visuals: Record<string, WorkVisual> = {
  reserve: { light: 0, pulse: 'power' }, 'service-array': { pulse: 'power' },
  hide: { pose: 'rest' }, warn: { bearing: 72 }, pods: { pods: 2 }, stock: { pose: 'rest', pulse: 'oxygen' },
  drive: { roverStops: ['kit', 'shelter'] }, 'ridge-drive': { roverStops: ['ridge', 'kit', 'shelter'] },
  walk: { pose: 'carry' }, sample: { pose: 'sample' }, scan: { pulse: 'power' },
  refill: { pulse: 'oxygen' }, 'top-up': { pulse: 'oxygen' }, 'reserve-air': { pulse: 'oxygen' },
  'one-pod': { pods: 1 }, 'safe-mode': { pose: 'rest' },
}
const completedIds: Record<string, string> = { reserve: 'store', pods: 'shield', 'one-pod': 'shield' }

function workFor(state: Colony, draft: Draft): WorkVisual {
  const choice = tuneChoice(state, draft.choice, draft.settings)
  if (choice.greenhouse) return { light: choice.greenhouse.light, pulse: choice.greenhouse.water ? 'oxygen' : undefined }
  if (choice.harvest) return { light: 0, pulse: 'power' }
  if (choice.transmit) return { bearing: draft.settings.bearing }
  if (choice.id === 'pods') return { pods: draft.settings.level ?? 2 }
  if (choice.id === 'refill') return { pulse: 'oxygen' }
  if (visuals[choice.id]?.roverStops) return { ...visuals[choice.id], roverPower: choice.cost }
  return visuals[choice.id] ?? {}
}

const readings = [
  { key: 'power', label: 'Battery', unit: 'stored power', icon: 'battery', color: 'amber' },
  { key: 'oxygen', label: 'Oxygen', unit: 'backup air', icon: 'air', color: 'blue' },
  { key: 'food', label: 'Food', unit: 'one meal per watch', icon: 'food', color: 'mint' },
  { key: 'exposure', label: 'Exposure', unit: 'lower is safer', icon: 'shield', color: 'coral' },
] as const
type Job = { id: string; title: string; site: SiteId; next: Colony; work: WorkVisual; draft?: Draft; transmit?: boolean }
type Activity = { label: string; work: WorkVisual; sending: boolean }
type Placements = [boolean | null, boolean | null, boolean | null]
const signed = (value: number) => value > 0 ? '+' + value : value < 0 ? '−' + Math.abs(value) : '0'

function Resources({ state, feedback }: { state: Colony; feedback: boolean }) {
  const entry = feedback ? state.log.at(-1) : undefined
  return <div className="colony-resources" aria-label="Crew resources">
    {readings.map(({ key, label, unit, icon, color }) => {
      const delta = entry?.delta[key] ?? 0
      return <div className={'resource-glass glass-panel ' + color} key={key}>
        <Icon name={icon} size={24} />
        <div><strong>{label}</strong><small>{unit}</small></div>
        <div className="resource-value"><b>{state[key]}</b><small> / {capacity[key]}</small></div>
        <div className="resource-bar" role="meter" aria-label={label} aria-valuenow={state[key]} aria-valuemin={0} aria-valuemax={capacity[key]}>
          <span style={{ '--level': state[key] / capacity[key] } as CSSProperties} />
        </div>
        {!!delta && <span key={state.watch} className="resource-pop" data-benefit={key === 'exposure' ? delta < 0 : delta > 0}>{signed(delta)}</span>}
      </div>
    })}
  </div>
}

function Consequences({ before, after }: { before: Colony; after: Colony }) {
  const changes = [
    ...readings.map(({ key, label, icon }) => ({
      icon, value: after[key] - before[key], label, inverted: key === 'exposure',
    })),
    { icon: 'plant', value: after.crop - before.crop, label: 'Crop', inverted: false },
    { icon: 'radio', value: Number(after.contact && !before.contact), label: 'Earth notified', inverted: false },
    { icon: 'target', value: Number(after.research && !before.research), label: 'Sample', inverted: false },
    { icon: 'target', value: Number(after.scanned && !before.scanned), label: 'Scan', inverted: false },
    { icon: 'plant', value: harvestCount(after) - harvestCount(before), label: 'Ready to harvest', inverted: false },
  ] as const
  return <span className="decision-preview">
    {changes.filter((change) => change.value !== 0).map(({ icon, value, label, inverted }) =>
      <span key={label} data-benefit={inverted ? value < 0 : value > 0}><Icon name={icon} size={16} /><b>{signed(value)}</b> {label}</span>)}
    {changes.every((change) => change.value === 0) && <span>No net change</span>}
  </span>
}

function FlightLog({ state, onRetry }: { state: Colony; onRetry: () => void }) {
  const unsafe = state.oxygen === 0 || state.exposure >= capacity.exposure || state.missedMeal
  return <>
    <h2>{unsafe ? 'Mission Control called the crew inside' : state.log.at(-1)?.title === 'End the shift early' ? 'The crew ended the shift early' : 'Shift complete'}</h2>
    <ul className="goal-list">
      <li><Icon name="air" />{state.oxygen ? state.oxygen + ' oxygen ready for the next crew' : 'Oxygen reserve exhausted'}</li>
      <li><Icon name="shield" />{state.exposure < capacity.exposure ? 'Crew below the exposure limit' : 'Exposure limit reached'}</li>
      <li><Icon name="food" />{state.missedMeal ? 'Food ran out before the crew could eat' : `${state.food} food left for the next watch`}</li>
      <li><Icon name="plant" />{harvestCount(state)} of {state.plants.length} lettuce plants ready to harvest</li>
      <li><Icon name="radio" />{state.contact ? 'Earth received your message' : 'Earth is still waiting for an update'}</li>
      <li><Icon name="target" />{state.research ? 'Rock sample collected' : state.scanned ? 'Surface scan recorded' : 'Rock sample left on the surface'}</li>
    </ul>
    <details><summary>Review your decisions</summary><ol>{state.log.map(({ title, detail }, i) => <li key={i}><strong>{title}</strong><p>{detail}</p></li>)}</ol></details>
    <button className="primary" onClick={onRetry}>Land again <Icon name="rewind" /></button>
  </>
}

export function ColonyMission({ onExit, cue, sound, onSound, paused }: { onExit: () => void; cue: (good: boolean) => void; sound: boolean; onSound: () => void; paused: boolean }) {
  const [stage, setStage] = useState<'film' | 'site' | 'landing' | 'build' | 'play'>('film')
  const [site, setSite] = useState<LandingSite>('ridge')
  const [layout, setLayout] = useState<Placements>([null, null, null])
  const [part, setPart] = useState(0)
  const [state, setState] = useState<Colony | null>(null)
  const [feedback, setFeedback] = useState<Colony | null>(null)
  const [setupResult, setSetupResult] = useState('')
  const [queued, setQueued] = useState<Job | null>(null)
  const [activity, setActivity] = useState<Activity | null>(null)
  const [finishedJob, setFinishedJob] = useState<Job | null>(null)
  const [draftWork, setDraftWork] = useState<WorkVisual>({})
  const [inspecting, setInspecting] = useState<SiteId | null>(null)
  const [mount, setMount] = useState<boolean | null>(null)
  const [hoverMount, setHoverMount] = useState<boolean | null>(null)
  const [pendingMount, setPendingMount] = useState<boolean | null>(null)
  const [occupied, setOccupied] = useState(false)
  const [shelterPhase, setShelterPhase] = useState<ShelterPhase | null>(null)
  const [kit, setKit] = useState(false)
  const [overview, setOverview] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [run, setRun] = useState(0)
  const timer = useRef<number | undefined>(undefined)
  const finishWork = useRef<(() => void) | null>(null)
  const world = useRef<HTMLDivElement>(null)
  const station = useRef<HTMLDivElement>(null)
  const lastSite = useRef<SiteId>('lander')
  const alerted = useRef(false)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const displayed = feedback ?? state
  const seed = startColony(site, layout.map(Boolean) as Layout)
  const setupBalance = setupPower(site, layout)
  const frame = colonyFrame(state ?? seed)
  const stormWatch = state?.node === 'warning' || state?.node === 'shelter' || state?.node === 'relay'
  const incoming = displayed?.node === 'warning' && !shelterPhase
  const stormActive = incoming || shelterPhase === 'approach' || shelterPhase === 'inside'
  const stormStatus = shelterPhase ?? (feedback && stormWatch ? 'clear' : incoming ? 'incoming' : null)
  const report = state?.node === 'report'
  const module = modules[part]
  const objective = queued?.site ?? (state ? (report ? lastSite.current : decisionSites[state.node]) : stage === 'build' ? moduleSites[part] : 'lander')
  const previewMount = stage === 'build' && occupied && !activity && !setupResult ? hoverMount ?? mount : null
  const routeOptions = state ? options(state) : []
  const earlyShelter = !occupied && !queued && !unavailable && routeOptions.find((choice) => choice.id === 'hide')
  const stationOptions: StationChoice[] = routeOptions.filter((choice) => {
    if (queued && objective !== 'garden') return choice.id === queued.id
    if (objective === 'garden') return choice.id === 'grow' || choice.harvest
    return (!choice.greenhouse || choice.id === 'grow') && choice.id !== 'one-pod' && choice.id !== 'top-up'
  })
  const title = stage === 'site' ? 'Choose where to land' : stage === 'landing' ? 'Descending to ' + landingSites[site].name
    : stage === 'build' ? 'Build Farpoint' : state ? briefings[state.node].title : 'The Moon, up close'
  const sceneState: WorldState = {
    site: inspecting ?? (activity?.work.shelterRun ? 'shelter' : feedback ? lastSite.current : objective), turn: state?.watch ?? -1,
    light: frame.sunlit, storm: stormActive, crew: 'pip',
    work: activity?.work ?? (feedback && finishedJob && !finishedJob.work.roverStops ? finishedJob.work : draftWork),
    opened: occupied || !!inspecting, locked: stage === 'site' || stage === 'landing' || occupied || !!inspecting || !!activity || !!report || paused,
    completed: feedback && finishedJob ? finishedJob.draft?.choice.greenhouse || finishedJob.id === 'harvest' ? 'garden' : completedIds[finishedJob.id] : undefined,
    kit, garden: displayed?.crop ?? 0, sending: !!activity?.sending, overview,
    expedition: { sector: site, recon: stage === 'site', descent: stage === 'landing', layout,
      sampleCollected: !!displayed?.research, plants: (displayed ?? seed).plants,
      pending: pendingMount === null ? undefined : { part, outer: pendingMount },
      preview: previewMount === null ? undefined : { part, outer: previewMount },
      focusModule: stage === 'build' && occupied ? part : undefined },
  }
  const prompt = setupResult || feedback ? 'Take a look at what changed. I’ll mark the next stop when you’re ready.'
    : inspecting ? 'Take a look at this station, then I’ll point you back to our waypoint.'
    : queued ? occupied ? 'We’re here. Compare the controls and apply the plan when you’re ready.'
      : 'Head to the marked station and operate it to carry out your choice.'
    : stage === 'site' ? 'I’m Pip, your guide. Survey both landing zones. Pick where you want us to touch down.'
    : stage === 'landing' ? 'Landing gear down. Hold tight.'
    : stage === 'build' ? pendingMount === null ? 'Pick a mount for our ' + module.name.toLowerCase() + '.'
      : 'Follow the marker to the mount. Press E or tap Build when you get there.'
    : report ? 'Let’s check what the next crew will inherit.'
    : occupied && state ? briefings[state.node].prompt
    : 'Follow the ground arrows to the ' + sites[objective].name.toLowerCase() + ', then press E or tap Operate.';

  useEffect(() => {
    if (incoming && !alerted.current) cue(false)
    alerted.current = incoming
  }, [incoming, cue])

  function viewport() {
    if (window.matchMedia('(max-width: 760px)').matches) world.current?.scrollIntoView({ block: 'start' })
  }

  function complete() {
    const finish = finishWork.current
    if (!finish) return
    window.clearTimeout(timer.current)
    finishWork.current = null
    setActivity(null)
    finish()
  }

  function animate(activity: Activity, callback: () => void, duration: number) {
    if (finishWork.current) return
    setActivity(activity)
    setOverview(false)
    viewport()
    finishWork.current = callback
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    timer.current = window.setTimeout(complete, !activity.sending && !activity.work.roverStops && !activity.work.shelterRun && reduced ? Math.min(duration, 450) : duration)
  }

  function execute(job: Job) {
    if (!state || finishWork.current) return
    const visual = job.work
    function finish() {
      setDraftWork({})
      setFinishedJob(job)
      setFeedback(job.next)
      setQueued(null)
      setShelterPhase(null)
      if (job.id === 'walk' || visual.roverStops) setKit(true)
      const delta = job.next.log.at(-1)!.delta
      for (const key of Object.keys(delta) as Reading[]) {
        if (delta[key]) cue(key === 'exposure' ? delta[key] < 0 : delta[key] > 0)
      }
    }
    function takeShelter() {
      setShelterPhase('approach')
      lastSite.current = 'shelter'
      animate({ label: 'Taking shelter', work: { shelterRun: true, pods: visual.pods }, sending: false }, finish, 18000)
    }
    if (stormWatch && (job.id === 'hide' || job.id === 'stock' || job.id === 'safe-mode')) takeShelter()
    else animate({ label: job.title, work: { ...visual, working: true }, sending: !!job.transmit }, stormWatch ? takeShelter : finish,
      job.transmit ? radio.roundTripMs : visual.roverStops ? 18000 : 1500)
  }

  function plan(draft?: Draft) {
    if (!state || (!occupied && draft?.choice.id !== 'hide') || feedback || finishWork.current) return
    const choice = draft?.choice
    const id = choice?.id ?? 'safe-mode'
    const next = choose(state, id, draft?.bed, draft?.settings)
    if (next === state) return
    const site = choice?.greenhouse || choice?.harvest ? 'garden' : workSites[id] ?? objective
    const job = { id, site, next, draft, work: draft ? workFor(state, draft) : visuals['safe-mode'],
      title: choice?.title ?? 'End the shift early', transmit: choice?.transmit }
    cue(true)
    if (site === objective) execute(job)
    else {
      setDraftWork({})
      setQueued(job)
      setOccupied(false)
      viewport()
    }
  }

  function interact(id: SiteId) {
    if (occupied || inspecting || report || paused || stage === 'site' || stage === 'landing') return
    if (id !== objective) {
      setInspecting(id)
      setOverview(false)
      return
    }
    lastSite.current = id
    setOccupied(true)
    setOverview(false)
    if (stage === 'build' && pendingMount !== null) {
      install(pendingMount)
      return
    }
    station.current?.focus({ preventScroll: true })
    if (window.matchMedia('(max-width: 760px)').matches) station.current?.scrollIntoView({ block: 'nearest' })
    cue(true)
  }

  function install(outer: boolean) {
    if (finishWork.current) return
    const placed: Placements = [...layout]
    placed[part] = outer
    setLayout(placed)
    setPendingMount(null)
    setHoverMount(null)
    animate({ label: 'Installing ' + module.name.toLowerCase(), work: { working: true, pulse: 'power' }, sending: false }, () => {
      setSetupResult(module.name + ' installed')
      cue(true)
    }, 1600)
  }

  function nextModule() {
    setOccupied(part < modules.length - 1)
    setSetupResult('')
    setMount(null)
    setHoverMount(null)
    if (part === modules.length - 1) {
      setState(startColony(site, layout.map(Boolean) as Layout))
      setStage('play')
    } else setPart(part + 1)
    viewport()
  }

  function nextWatch() {
    if (!feedback) return
    setState(feedback)
    setFeedback(null)
    setDraftWork({})
    setOccupied(false)
    viewport()
  }

  function retry() {
    setStage('site')
    setState(null)
    setFeedback(null)
    setLayout([null, null, null])
    setPart(0)
    setOccupied(false)
    setShelterPhase(null)
    setKit(false)
    setOverview(false)
    setMount(null)
    setPendingMount(null)
    setHoverMount(null)
    setInspecting(null)
    setUnavailable(false)
    setRun((current) => current + 1)
    viewport()
  }

  const frameLabel = frame.sunlit ? 'Sunlight · +' + sunlight(state ?? seed) + ' solar power' : 'Lunar shadow · 0 solar power'

  return <section className="colony game-wrap content-width">
    <div className="colony-heading">
      <button className="text-button" onClick={onExit}><Icon name="back" size={16} />Launch screen</button>
      <p className="eyebrow">{state ? landingSites[site].name + ' / Watch ' + Math.min(state.watch + 1, 5) : 'Farpoint / Arrival'}</p>
      <h1>{title}</h1>
    </div>
    {stage === 'film' ? <div className="landing-film glass-panel">
      <video src={asset('apollo-touchdown.mp4')} poster={photo} muted playsInline controls preload="metadata"
        autoPlay={!window.matchMedia('(prefers-reduced-motion: reduce)').matches} aria-label="Silent Apollo 11 archival descent footage from the Lunar Module window" />
      <div className="film-caption"><p>Apollo 11 landed in 1969. Your crew is approaching Farpoint, a training outpost near the Moon’s South Pole.</p>
        <a href="https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.landmov.html" target="_blank" rel="noreferrer">NASA Apollo 11 film · Digitized by Gary Neff</a></div>
      <div className="colony-actions">
        <button className="primary" onClick={() => { setStage('site'); cue(true) }}>Survey landing sites <Icon name="arrow" /></button>
        <button className="secondary" aria-pressed={sound} onClick={onSound}><Icon name={sound ? 'sound' : 'mute'} />Game sound</button>
      </div>
    </div> : <>
      {(displayed || stage === 'build') && <Resources state={displayed ?? { ...seed, power: setupBalance }} feedback={!!feedback} />}
      <div className="campaign-grid">
        <div>
          <div className="world-stage campaign-world" ref={world}>
            {!unavailable ? <Suspense fallback={<div className="world-placeholder">Loading Farpoint…</div>}>
              <LunarScene key={run} state={sceneState} onInteract={interact} onOverview={() => setOverview(!overview)}
                onUnavailable={() => { setUnavailable(true); complete() }}
                onRoverArrived={() => { if (activity?.work.roverStops) complete() }}
                onShelterPhase={(phase) => { if (phase === 'complete') complete(); else setShelterPhase(phase) }}
                onTouchdown={() => { setStage('build'); setOccupied(true); cue(true) }} />
            </Suspense> : <div className="world-placeholder"><p>This mission needs WebGL 2 to render the outpost.</p><button className="secondary" onClick={() => { setUnavailable(false); setRun(run + 1) }}>Retry 3D view</button></div>}
            {stormStatus && <div className="storm-banner" data-phase={stormStatus} role={incoming ? 'alert' : 'status'}>
              <Icon name={stormStatus === 'clear' ? 'check' : stormStatus === 'inside' ? 'shield' : 'storm'} size={23} />
              <strong>{stormStatus === 'clear' ? 'Storm front passed' : stormStatus === 'inside' ? 'Hatch sealed · Ride it out' : stormStatus === 'approach' ? 'Crew heading to shelter' : 'Storm incoming'}</strong>
            </div>}
            {(activity || setupResult || feedback) && !shelterPhase && <div className="world-action-status" role="status">
              <Icon name={activity?.sending ? 'radio' : activity ? 'bolt' : 'check'} size={19} />
              <span>{activity?.sending ? 'Signal in flight · 2.56 s round trip' : activity?.label || setupResult || 'Task complete'}</span>
              {!activity && <button className="world-button" onClick={() => station.current?.scrollIntoView({ block: 'nearest' })}>View result</button>}
            </div>}
            {previewMount !== null && <div className="world-action-status">
              <Icon name="target" size={19} /><span role="status">Preview · {previewMount ? module.far : module.near}</span>
              <button className="world-button placement-return" onClick={() => station.current?.scrollIntoView({ block: 'nearest' })}>Station controls</button>
            </div>}
          </div>
          <div key={String(frame.sunlit)} className={'world-light-note ' + (frame.sunlit ? 'amber' : 'blue')}>
            <Icon name={frame.sunlit ? 'sun' : 'moon'} size={19} /><strong>{frameLabel}</strong>
            <a href="https://svs.gsfc.nasa.gov/4930/" target="_blank" rel="noreferrer">NASA model · Frame {frame.frame}</a>
          </div>
        </div>
        <div className="glass-panel colony-panel campaign-station" ref={station} tabIndex={-1} role="region" aria-label="Pip’s station controls">
          <div className="pip-guide"><Avatar id="pip" /><div><strong>Pip</strong><p>{activity ? (activity.sending ? 'Hold here. The signal has to travel to Earth and back.' : 'Watch the outpost. We’re carrying out your choice.') : prompt}</p></div></div>
          {inspecting ? <StationLab key={inspecting} state={state ?? seed} site={inspecting} choices={[]}
            onPreview={() => undefined} onCommit={() => undefined}
            extra={<button className="secondary" onClick={() => { setInspecting(null); viewport() }}>Back to waypoint</button>} />
            : report && state ? <FlightLog state={state} onRetry={retry} />
            : activity ? <div role="status"><h2>{activity.label}</h2>{activity.sending && <div className="radio-track"><i /></div>}</div>
            : setupResult ? <><h2>{setupResult}</h2><p className="watch-cost"><Icon name="battery" size={18} /> −{installationCost(part, !!layout[part])} battery</p><button className="primary" onClick={nextModule}>Next waypoint <Icon name="arrow" /></button></>
            : feedback && state ? <>
              <div className="choice-result" role="status"><h2>{feedback.log.at(-1)?.title}</h2><p>{feedback.log.at(-1)?.detail}</p>
                <Consequences before={state} after={feedback} />
                {feedback.node !== 'report' && <p>Next stop <strong>{sites[decisionSites[feedback.node]].name}</strong></p>}
              </div>
              <button className="primary" onClick={nextWatch}>{feedback.node === 'report' ? 'Read flight log' : 'Head to next stop'} <Icon name="arrow" /></button>
            </>
            : stage === 'site' ? <><div className="choice-list">
              {(Object.entries(landingSites) as [LandingSite, typeof landingSites[LandingSite]][]).map(([id, item]) =>
                <button className="decision-card" key={id} aria-pressed={site === id} onClick={() => { setSite(id); cue(true) }}>
                  <Icon name={id === 'ridge' ? 'sun' : 'shield'} /><strong>{item.name}</strong>
                  <span><span className="site-swatch" style={{ background: sectors[id].color }} /> {id === 'ridge' ? 'Northwest ridge' : 'Southeast crater'}</span>
                  <span>{item.description}</span>
                  <small>{item.power} starting battery</small>
                </button>)}
            </div><button className="primary" disabled={unavailable} onClick={() => { setStage('landing'); viewport(); cue(true) }}>
              Land at {landingSites[site].name} <Icon name="arrow" />
            </button></>
            : stage === 'landing' ? <h2 role="status">Landing at {landingSites[site].name}…</h2>
            : pendingMount !== null ? <><h2>{pendingMount ? module.far : module.near}</h2>
              <p className="watch-cost"><Icon name="battery" size={18} /> −{installationCost(part, pendingMount)} battery at installation</p>
              <button className="secondary" onClick={() => { setPendingMount(null); setHoverMount(null); setOccupied(true); setOverview(false) }}>Compare mounts again</button></>
            : !occupied || unavailable ? <><h2>{sites[objective].name}</h2>{queued && <p><strong>Selected task</strong> · {queued.title}</p>}
              {earlyShelter && state && <button className="secondary" disabled={choose(state, earlyShelter.id) === state}
                onClick={() => plan({ choice: earlyShelter, bed: 0, settings: {} })}>
                <Icon name="shield" size={18} /> Head straight to shelter
              </button>}</>
            : stage === 'build' ? <>
              <h2>Install the {module.name.toLowerCase()}</h2>
              <p>Preview both mounts. Choose where to build, then head there to install it.</p>
              <div className="choice-list">
                {[false, true].map((outer) => <button className="decision-card" key={String(outer)} aria-pressed={mount === outer}
                  onMouseEnter={() => setHoverMount(outer)} onMouseLeave={() => setHoverMount(null)}
                  onFocus={() => setHoverMount(outer)} onBlur={() => setHoverMount(null)} onClick={() => { setMount(outer); viewport(); cue(true) }}>
                  <Icon name={module.icon} /><strong>{outer ? module.far : module.near}</strong>
                  {outer && <span>{module.gain}</span>}<small><Icon name="battery" size={16} /> −{installationCost(part, outer)} battery</small>
                </button>)}
              </div>
              {previewMount !== null && <p className="watch-cost"><Icon name="battery" size={18} /> {setupBalance - installationCost(part, previewMount)} battery after installation</p>}
              <button className="primary" disabled={mount === null} onClick={() => {
                if (mount === null) return
                setPendingMount(mount)
                setHoverMount(null)
                setOccupied(false)
                setOverview(false)
                viewport()
              }}>Head to selected mount <Icon name="arrow" /></button>
            </>
            : state && <>
              {state.node === 'warning' && <p><a href={storm.url} target="_blank" rel="noreferrer">Archived DONKI event</a> · Exposure uses game points.</p>}
              <StationLab key={state.watch + ':' + objective} state={state} site={objective} choices={stationOptions} initialDraft={queued?.draft}
                onPreview={(draft) => {
                  const work = workFor(state, draft)
                  setDraftWork({ light: objective === 'garden' ? work.light : undefined, bearing: work.bearing, pods: work.pods })
                }} onCommit={plan}
                extra={queued ? <button className="text-button" onClick={() => { setQueued(null); setOccupied(false); setDraftWork({}); viewport() }}>Change destination</button>
                  : <button className="text-button" onClick={() => plan()}>End the shift early</button>} />
            </>}
        </div>
      </div>
    </>}
  </section>
}
