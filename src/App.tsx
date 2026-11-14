import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { chapters, crew, crewNeedsHelp, demoStart, frames, isFinished, limits, newMission, samplePoint, step, turns } from './mission.ts'
import type { CrewId, IconName, Mission, Plan } from './mission.ts'
import { radio, sources, storm } from './science.ts'
import { Workstation } from './Workstation'
import { Debrief } from './Debrief'
import { createSoundtrack } from './soundtrack'
import { jobSites, sites } from './world/layout'
import type { SiteId } from './world/layout'
import type { WorldState, WorkVisual } from './world/runtime'
import './style.css'

const LunarScene = lazy(() => import('./LunarScene').then((module) => ({ default: module.LunarScene })))
const introState: WorldState = { site: 'power', turn: 0, light: true, storm: false, crew: 'mira', work: {}, opened: false, locked: true, kit: false, garden: 1, sending: false, overview: true }

const asset = (path: string) => import.meta.env.BASE_URL + path
const frameTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })
const paths: Record<IconName, ReactNode> = {
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  storm: <path d="M7 16H6a4 4 0 1 1 1-7.9 5.5 5.5 0 0 1 10.5 1.5 3.2 3.2 0 0 1 0 6.4H17m-4-4-3 5h4l-2 5"/>,
  radio: <><path d="M3.5 8.5a12 12 0 0 1 17 0m-14 3a8 8 0 0 1 11 0m-8 3a4 4 0 0 1 5 0"/><circle cx="12" cy="18" r="1"/></>,
  plant: <path d="M12 22V11m0 5C6 17 3 14 3 9c5-1 9 2 9 7Zm0-3c0-6 3-9 9-9 0 6-3 9-9 9Z"/>,
  air: <path d="M3 9h13a2.5 2.5 0 1 0-2.5-2.5M2 13h17a2 2 0 1 1-2 2M5 17h6a2 2 0 1 1-2 2"/>,
  battery: <><rect x="3" y="7" width="16" height="10" rx="2"/><path d="M22 10v4m-15-4v4m4-4v4m4-4v4"/></>,
  rover: <><path d="M3 16v-3l3-2 2-4h7l3 4 3 2v3h-3m-4 0h-4m-4 0H3m9-9V4l4-1"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/></>,
  lander: <><path d="M9 4h6l2 8-2 4H9l-2-4 2-8Zm-1 9-4 6H2m14-6 4 6h2m-12 0-1 2m5-2 1 2"/><path d="M10 9h4"/></>,
  book: <path d="M12 6c-3-3-7-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-2-1-6-2-9 1Zm0 0v14"/>,
  sound: <path d="M3 9h4l5-4v14l-5-4H3V9Zm13 0a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12"/>,
  mute: <path d="M3 9h4l5-4v14l-5-4H3V9Zm13 1 5 5m0-5-5 5"/>,
  play: <path d="m9 5 11 7-11 7V5Z"/>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  rewind: <><path d="M4 11a8 8 0 1 1 2 7M4 5v6h6"/><path d="M12 8v5l3 2"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  moon: <path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z"/>,
  shield: <path d="M12 3 4.5 6v5c0 4 3.4 7.6 7.5 10 4.1-2.4 7.5-6 7.5-10V6L12 3Zm-3 9 2 2 4-4"/>,
  crew: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m0-15a3 3 0 0 1 0 6m3 3a4 4 0 0 1 3 4v2"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5.5 6.5h13m-13 11h13"/></>,
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function Avatar({ id, size = 'small' }: { id: CrewId; size?: 'small' | 'story' }) {
  return <span className={ 'avatar avatar-' + id + ' avatar-' + size } aria-hidden="true" style={{ '--portrait-color': crew[id].color } as CSSProperties} />
}

function Modal({ label, children, onClose }: { label: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  return <dialog ref={dialog} aria-label={label} className="modal" onCancel={onClose}>
    <div className="modal-head">
      <h2>{label}</h2>
      <button className="icon-button" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
    </div>
    {children}
  </dialog>
}

const mapObjects: Record<string, { id: string; title: string; icon: IconName; note: string }> = {
  solar: { id: 'solar', title: 'Solar array', icon: 'sun', note: 'These flat panels turn sunlight into electricity. In shade, the outpost runs on its battery.' },
  air: { id: 'air', title: 'Air machine', icon: 'air', note: 'The air machine uses electricity. If it stops, the crew switches to the backup air supply.' },
  garden: { id: 'garden', title: 'Greenhouse', icon: 'plant', note: 'The crew grows lettuce under LEDs. The lights share a battery with the rest of the base.' },
  rover: { id: 'rover', title: 'Pip’s rover', icon: 'rover', note: 'Pip pilots the electric rover. The repair kit is outside and the crew must help load it.' },
  shelter: { id: 'shelter', title: 'Shielded room', icon: 'shield', note: 'Thicker walls and water containers can help block particles from the Sun.' },
  radio: { id: 'radio', title: 'Earth antenna', icon: 'radio', note: 'A radio signal needs about 1.28 seconds to travel one way between here and Earth.' },
  lander: { id: 'lander', title: 'Farpoint lander', icon: 'lander', note: 'The lander brought the crew, batteries and starter plants to the outpost.' },
}

function StarField() {
  return <div className="star-field" aria-hidden="true">
    {Array.from({ length: 22 }, (_, i) => <span key={i} style={{
      left: ((i * 137.3 + 22) % 100) + '%', top: ((i * 23.7 + 5) % 68) + '%',
      animationDelay: -(i % 8) * .7 + 's', opacity: .2 + i % 4 / 5,
    }} />)}
  </div>
}

function Meter({ label, icon, value, max, color }: { label: string; icon: IconName; value: number; max: number; color: string }) {
  return <div className={'meter ' + color}>
    <div className="meter-label"><span><Icon name={icon} size={18} />{label}</span><strong>{value}<small> / {max}</small></strong></div>
    <div className="meter-track" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <span style={{ width: (100 * value / max) + '%' }} />
    </div>
  </div>
}

function MissionMeters({ mission }: { mission: Mission }) {
  return <div className="meters">
    <Meter label="Battery" icon="battery" value={mission.power} max={limits.power} color="amber" />
    <Meter label="Backup air" icon="air" value={mission.air} max={limits.air} color="blue" />
    <Meter label="Crop progress" icon="plant" value={mission.garden} max={limits.garden} color="mint" />
  </div>
}

function Evidence({ index }: { index: number }) {
  const [frameIndex, setFrameIndex] = useState(index)
  const frame = frames[frameIndex]
  return <div className="evidence">
    <div className="evidence-map">
      <img src={asset('science/' + frame.filename)} alt={'NASA satellite terrain model, 2026 lunar illumination frame ' + frame.frame} />
      <span className="site-reticle" style={{ left: samplePoint.x + '%', top: samplePoint.y + '%' }} />
    </div>
    <div className="evidence-slider">
      <label htmlFor="frame-slider">Explore model frames</label>
      <input id="frame-slider" type="range" min={0} max={frames.length - 1} value={frameIndex} onChange={(event) => setFrameIndex(Number(event.target.value))} />
    </div>
    <p><strong>Frame {frame.frame} · {frame.sunlit ? 'Sunlit' : 'Shaded'}</strong> at the marked panel location. The model shows {frameTime.format(new Date(frame.time))} UTC. Frames are two hours apart.</p>
    <a href={sources[0].url} target="_blank" rel="noreferrer">Explore the source at NASA ↗</a>
  </div>
}

type Page = 'home' | 'game' | 'report'
type Overlay = 'sources' | 'crew' | 'field-notes' | 'evidence' | 'object' | null

function App() {
  const [page, setPage] = useState<Page>('home')
  const [mission, setMission] = useState(newMission)
  const [demo, setDemo] = useState(false)
  const [chosen, setChosen] = useState<Plan | null>(null)
  const [work, setWork] = useState<WorkVisual>({})
  const [atStation, setAtStation] = useState(false)
  const [overview, setOverview] = useState(false)
  const [graphicsError, setGraphicsError] = useState(false)
  const [radioStart, setRadioStart] = useState(0)
  const [driving, setDriving] = useState(false)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [object, setObject] = useState('solar')
  const [sound, setSound] = useState(false)
  const [homeCrew, setHomeCrew] = useState<CrewId>('mira')
  const audioContext = useRef<AudioContext | null>(null)
  const soundtrack = useRef<ReturnType<typeof createSoundtrack> | null>(null)
  const radioTimer = useRef<number | undefined>(undefined)
  const busyRef = useRef(false)
  const roverComplete = useRef<(() => void) | null>(null)
  const focusHeading = useRef<HTMLHeadingElement>(null)
  const continueButton = useRef<HTMLButtonElement>(null)
  const workstation = useRef<HTMLDivElement>(null)

  useEffect(() => () => window.clearTimeout(radioTimer.current), [])
  useEffect(() => () => {
    soundtrack.current?.dispose()
    void audioContext.current?.close().catch(() => undefined)
  }, [])
  useEffect(() => {
    if (page !== 'home') focusHeading.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [page, mission.turn])
  useEffect(() => {
    if (chosen !== null) continueButton.current?.focus({ preventScroll: true })
  }, [chosen])
  useEffect(() => {
    if (atStation) workstation.current?.focus({ preventScroll: true })
  }, [atStation])

  function ping(high = false, force = false) {
    if (!sound && !force) return
    try {
      const ctx = (audioContext.current ??= new AudioContext())
      void ctx.resume().catch(() => undefined)
      const oscillator = ctx.createOscillator()
      const volume = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(high ? 590 : 340, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(high ? 880 : 520, ctx.currentTime + .13)
      volume.gain.setValueAtTime(.048, ctx.currentTime)
      volume.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .18)
      oscillator.connect(volume).connect(ctx.destination)
      oscillator.start()
      oscillator.stop(ctx.currentTime + .19)
    } catch {
      // Controls remain usable on devices without Web Audio.
    }
  }

  function toggleSound() {
    if (sound) {
      soundtrack.current?.setEnabled(false)
      setSound(false)
      return
    }
    try {
      const context = (audioContext.current ??= new AudioContext())
      soundtrack.current ??= createSoundtrack(context)
      soundtrack.current.setEnabled(true)
      void context.resume().catch(() => {
        soundtrack.current?.setEnabled(false)
        setSound(false)
      })
      setSound(true)
      ping(true, true)
    } catch {
      setSound(false)
    }
  }

  function resetInteraction() {
    window.clearTimeout(radioTimer.current)
    busyRef.current = false
    setRadioStart(0)
    setDriving(false)
    roverComplete.current = null
    setChosen(null)
    setWork({})
    setAtStation(false)
  }

  function goHome() {
    resetInteraction()
    setPage('home')
  }

  function launch(showDemo: boolean) {
    resetInteraction()
    setDemo(showDemo)
    setOverview(false)
    setGraphicsError(false)
    setAtStation(showDemo)
    setMission(showDemo ? demoStart() : newMission())
    setOverlay(null)
    setPage('game')
    window.scrollTo({ top: 0, behavior: 'instant' })
    ping(true)
  }

  function runPlan(plan: Plan) {
    if (chosen !== null || busyRef.current || roverComplete.current) return
    const next = step(mission, plan)
    const result = next.history.at(-1)
    if (next === mission || !result) return
    const apply = () => {
      busyRef.current = false
      setRadioStart(0)
      setDriving(false)
      setChosen(plan)
      setWork((current) => ({ ...current, working: false, ...(!result.applied ? { pods: 0 } : {}) }))
      ping(true)
    }
    if (mission.turn === 2 && !graphicsError) {
      const stops: NonNullable<WorkVisual['roverStops']> = []
      if (result.applied && typeof plan === 'object' && plan.kind === 'route' && plan.rough) stops.push('ridge')
      if (result.applied && result.choice.effect.repair) stops.push('kit')
      stops.push('shelter')
      roverComplete.current = apply
      setDriving(true)
      setWork((current) => ({ ...current, roverStops: stops }))
      return
    }
    if (result.choice.id === 'call' && result.applied) {
      busyRef.current = true
      setRadioStart(Date.now())
      ping()
      radioTimer.current = window.setTimeout(apply, radio.roundTripMs)
      return
    }
    apply()
  }

  function continueMission() {
    if (chosen === null) return
    const next = step(mission, chosen)
    resetInteraction()
    setMission(next)
    if (demo || isFinished(next)) setPage('report')
  }

  function finishDrive() {
    const finish = roverComplete.current
    roverComplete.current = null
    finish?.()
  }

  function inspect(id: string) {
    setObject(id)
    setOverlay('object')
    ping()
  }

  function useStation(id: SiteId) {
    if (atStation || overlay || chosen !== null || radioStart) return
    if (id === jobSites[mission.turn]) {
      setAtStation(true)
      setOverview(false)
      if (window.matchMedia('(max-width: 850px)').matches) {
        window.requestAnimationFrame(() => workstation.current?.scrollIntoView({ block: 'end', behavior: 'instant' }))
      }
      ping(true)
      return
    }
    const key = id === 'power' ? 'solar' : id === 'kit' ? 'rover' : id
    inspect(key)
  }

  const activeTurn = Math.min(mission.turn, turns.length - 1)
  const turn = turns[activeTurn]
  const chapter = chapters[turn.chapter]
  const displayMission = chosen === null ? mission : step(mission, chosen)
  const log = chosen === null ? null : displayMission.history.at(-1)
  const currentFrame = frames[activeTurn]
  const activeSite = sites[jobSites[activeTurn]]
  const sceneState: WorldState = {
    turn: activeTurn, site: jobSites[activeTurn], light: frames[demo && log ? activeTurn + 1 : activeTurn].sunlit,
    storm: !!turn.solarAlert, crew: turn.character, work,
    opened: atStation, locked: atStation || !!overlay || !!radioStart || !!log,
    completed: log?.applied ? log.choice.id : undefined, kit: displayMission.kit, garden: displayMission.garden,
    sending: radioStart > 0, overview,
  }
  const objectInfo = mapObjects[object]
  const passed = mission.turn === turns.length && !crewNeedsHelp(mission)
  const mood = page === 'report' ? (passed || demo ? 'resolved' : 'shadow') : page === 'home' ? 'explore' : turn.solarAlert ? 'storm' : currentFrame.sunlit ? 'explore' : 'shadow'
  useEffect(() => { soundtrack.current?.setMood(mood) }, [mood, sound])
  const storyLine = activeTurn === 3 && mission.kit
    ? 'Pip saved the repair kit. That bought us a cheaper radio call later, but the crew spent longer outside. Can we afford to raise the water shield now?'
    : activeTurn === 4 && mission.kit
      ? 'Pip brought back the spare radio cell, so a call can use that instead of our main battery. Sweep the antenna until you find Earth.'
      : turn.prompt

  return <div className="app-shell">
    <header className="topbar">
      <button className="wordmark" onClick={goHome} aria-label="Shadow Shift home">
        <span className="brand-icon"><Icon name="moon" size={21} /></span><span>SHADOW<span>SHIFT</span></span>
      </button>
      <nav aria-label="Game links" className="topnav">
        <button aria-label="Meet the crew" onClick={() => setOverlay('crew')}><Icon name="crew" size={18} /><span>Meet the crew</span></button>
        <button aria-label="Data sources" onClick={() => setOverlay('sources')}><Icon name="book" size={18} /><span>Data sources</span></button>
        <button className="icon-button sound-button" aria-label={sound ? 'Mute music and effects' : 'Enable music and effects'} aria-pressed={sound} onClick={toggleSound}><Icon name={sound ? 'sound' : 'mute'} size={20} /></button>
      </nav>
    </header>

    <main>
      {page === 'home' && <>
        <section className="hero" aria-labelledby="title">
          <Suspense fallback={<div className="hero-background" />}><LunarScene state={introState} intro /></Suspense>
          <StarField />
          <div className="hero-content">
            <div className="eyebrow"><i /> JUNIOR ASTRONAUT MISSION TRAINER</div>
            <h1 id="title">SHADOW<br /><em>SHIFT<span>.</span></em></h1>
            <p>A shadow is coming.<br />Your crew is counting on you.</p>
            <div className="hero-actions flex flex-wrap items-center gap-3">
              <button className="primary" onClick={() => launch(false)}><Icon name="play" size={19} /> Start mission <Icon name="arrow" size={18} /></button>
              <button className="secondary" onClick={() => launch(true)}><Icon name="rewind" size={18} /> Judge demo</button>
            </div>
          </div>
          <button className="hero-crew" onClick={() => setOverlay('crew')} aria-label="Meet Mira, the Farpoint power engineer">
            <Avatar id="mira" size="story" /><span><strong>MIRA</strong><br />“Ready, Cadet?”</span>
          </button>
          <div className="hero-location"><Icon name="moon" size={16} /><span>FARPOINT OUTPOST</span><b>·</b> LUNAR SOUTH POLE</div>
        </section>

        <section className="home-section" aria-labelledby="chapters">
          <div className="section-heading"><div><span className="eyebrow">THE BRIEFING</span><h2 id="chapters">Your mission</h2></div><span className="section-meta">3 chapters <b>·</b> 6 jobs</span></div>
          <div className="chapter-grid">
            {chapters.map((item, index) => <article className={'chapter-card ' + item.color} key={item.name}>
              <div className="chapter-top"><span className="chapter-icon"><Icon name={item.icon} size={26} /></span><span>CHAPTER 0{index + 1}</span></div>
              <h3>{item.name}</h3><p>{item.summary}</p>
            </article>)}
          </div>
        </section>

        <section className="home-section crew-strip" aria-labelledby="crew-home">
          <div className="section-heading"><div><span className="eyebrow">FARPOINT PERSONNEL</span><h2 id="crew-home">Meet your crew</h2></div></div>
          <div className="home-crew-grid">
            {(Object.keys(crew) as CrewId[]).map((id) => <button key={id} onClick={() => setHomeCrew(id)} aria-pressed={id === homeCrew}><Avatar id={id} /><span><strong>{crew[id].name}</strong><small>{crew[id].role}</small></span></button>)}
          </div>
          <p className="casual-copy" aria-live="polite">{crew[homeCrew].line}</p>
        </section>
      </>}

      {page === 'game' && <section className="game-wrap">
        <div className="game-top">
          <button className="text-button" onClick={goHome}>← Outpost home</button>
          <span>{demo ? 'JUDGE DEMO' : 'TURN ' + (activeTurn + 1) + ' OF ' + turns.length}</span>
        </div>
        <div className="chapter-progress" aria-label="Mission chapters">
          {chapters.map((item, index) => <div key={item.name} className={index === turn.chapter ? 'active' : index < turn.chapter ? 'done' : ''} aria-current={index === turn.chapter ? 'step' : undefined}>
            <Icon name={index < turn.chapter ? 'check' : item.icon} size={18} /><span>{item.name}</span>
          </div>)}
        </div>
        <div className="play-layout lunar-play">
          <div className="play-main">
            <div className="world-stage">
              <Suspense fallback={<div className="world-error">Loading Farpoint…</div>}>
                <LunarScene state={sceneState} demo={demo} onInteract={useStation} onOverview={() => setOverview(!overview)} onRoverArrived={finishDrive} onUnavailable={() => { setGraphicsError(true); finishDrive() }} />
              </Suspense>
            </div>
            <div className="dialogue" key={activeTurn}>
              <Avatar id={turn.character} size="story" />
              <div><div className="speaker" style={{ color: crew[turn.character].color }}>{crew[turn.character].name}<small>{crew[turn.character].role}</small></div>
                <h1 ref={focusHeading} tabIndex={-1}>{chapter.name}</h1><p>{storyLine}</p>
              </div>
            </div>
          </div>
          <aside className="control-panel">
            <MissionMeters mission={displayMission} />
            {turn.chapter === 1 && <div className="exposure"><Icon name="shield" size={18} /><span>Exposure <small>(training)</small></span><strong>{displayMission.exposure} / {limits.exposure}</strong></div>}
            <div className="field-evidence">
              {turn.chapter === 0 && <button onClick={() => setOverlay('evidence')}><Icon name={currentFrame.sunlit ? 'sun' : 'moon'} /><span><strong>Real Moon data</strong><small>NASA model · frame {currentFrame.frame}</small></span><Icon name="chevron" size={16} /></button>}
              {turn.chapter === 1 && <button onClick={() => setOverlay('field-notes')}><Icon name="storm" /><span><strong>Archived particle event</strong><small>{storm.displayTime}</small></span><Icon name="chevron" size={16} /></button>}
              {turn.chapter === 2 && <button onClick={() => setOverlay('field-notes')}><Icon name="radio" /><span><strong>Signal to Earth</strong><small>2.56 s round trip</small></span><Icon name="chevron" size={16} /></button>}
            </div>
            <div className="power-note">Air machine draws 4 power per turn. {currentFrame.sunlit ? 'Sunlight adds 8 power.' : 'Panels add 0 while shaded.'}</div>
          </aside>
          <div className="decision-zone world-work" ref={workstation} tabIndex={-1} aria-label="Current station controls">
          {driving ? <div className="feedback" role="status"><span className="chapter-icon"><Icon name="rover" /></span><div><strong>Pip is driving the route</strong><p>Watch the rover lead the crew to the shelter.</p></div></div> : radioStart > 0 ? <div className="feedback radio-feedback" role="status">
            <span className="chapter-icon"><Icon name="radio" size={25} /></span><div><strong>Waiting for Earth…</strong><div className="radio-journey"><span>Farpoint</span><span><i />Earth</span><span>Farpoint</span></div><p>1.28 seconds there and 1.28 seconds back.</p><div className="radio-track"><i /></div></div>
          </div> : log ? <div className="feedback" role="status">
            <span className="chapter-icon"><Icon name={log.applied ? 'check' : 'battery'} size={25} /></span>
            <div><strong>{log.applied ? log.choice.title : 'The base used its backup plan'}</strong>
              <p>{log.applied ? log.choice.result : log.airOn ? 'The air machine ran first. There was too little power left for your extra task.' : 'The battery couldn’t run the air machine. The crew used backup air while the extra task waited.'}</p>
              {log.applied && !log.airOn && <p>The crew used backup air while the air machine was off.</p>}
              <div className="deltas">{Object.entries(log.diff).filter(([, value]) => value !== 0).map(([name, value]) => <span key={name}>{value > 0 ? '+' : ''}{value} {name === 'garden' ? 'crop steps' : name === 'power' ? 'battery' : name}</span>)}</div>
            </div>
            <button ref={continueButton} className="primary" onClick={continueMission}>{demo ? 'Compare schedules' : isFinished(displayMission) ? 'View mission report' : 'Next turn'} <Icon name="arrow" size={18} /></button>
          </div> : atStation || graphicsError ? <div className="scene-task-open">
            <Workstation key={activeTurn} mission={mission} onMove={(change) => setWork((current) => ({ ...current, ...change }))} onCommit={runPlan} />
            {!demo && !graphicsError && <button className="text-button" onClick={() => { setAtStation(false); setWork({}) }}>← Step away from station</button>}
          </div> : <div className="station-context">
            <span className="eyebrow"><i className="site-color" style={{ background: activeSite.color }} />CURRENT JOB</span>
            <h2>{activeSite.name}</h2>
            <p>Walk the cadet to the glowing marker, then press <strong>E</strong> or tap <strong>Operate</strong>.</p>
          </div>}
          </div>
        </div>
      </section>}

      {page === 'report' && <section className="report-wrap">
        <div className="report-splash"><StarField /><span className="report-icon"><Icon name={demo ? 'rewind' : passed ? 'check' : 'shield'} size={31} /></span>
          <span className="eyebrow">{demo ? 'JUDGE DEMO · DECISION REPLAY' : 'FARPOINT FLIGHT LOG'}</span>
          <h1 ref={focusHeading} tabIndex={-1}>{demo ? 'One shadow, different outcomes' : passed ? 'Farpoint is ready for handover' : 'Farpoint called off the shift'}</h1>
          <p>{demo ? 'Try another greenhouse schedule against the same NASA shadow.' : passed ? 'The next crew is on its way to the landing pad. Here’s what they’ll find.' : 'Mira brings the crew to safety. Review what happened before your next attempt.'}</p>
        </div>
        <Debrief mission={mission} demo={demo} />
        <div className="report-actions"><button className="primary" onClick={() => launch(false)}><Icon name={demo ? 'play' : 'rewind'} />{demo ? 'Play the full mission' : 'Try another plan'}</button>
          <button className="secondary" onClick={() => setOverlay('sources')}><Icon name="book" /> Data sources</button></div>
      </section>}
    </main>

    <footer className="footer"><span>Shadow Shift · Junior Astronaut Mission Trainer</span><button onClick={() => setOverlay('sources')}>Data Sources</button><span>AI/SI Disclosure: OpenAI Codex assisted with code generation.</span></footer>

    {overlay === 'crew' && <Modal label="Meet your crew" onClose={() => setOverlay(null)}>
      <div className="crew-modal-grid">{(Object.keys(crew) as CrewId[]).map((id) => <article key={id}><Avatar id={id} size="story" /><div><h3>{crew[id].name}</h3><small>{crew[id].role}</small><p>{crew[id].line}</p></div></article>)}</div>
    </Modal>}
    {overlay === 'sources' && <Modal label="Data Sources" onClose={() => setOverlay(null)}>
      <p className="modal-intro">Farpoint and its crew are fictional. Equipment loads, crop steps, shelter exposure and mission outcomes use simplified game values.</p>
      <div className="source-grid">{sources.map((source) => <article key={source.title}><small>{source.agency}</small><h3><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></h3><p>{source.detail}</p></article>)}</div>
      <p className="modal-intro credit">Terrain model imagery credit: NASA Scientific Visualization Studio / Ernie Wright. Outpost and crew artwork are original generated illustrations.</p>
    </Modal>}
    {overlay === 'evidence' && <Modal label="See the real shadow" onClose={() => setOverlay(null)}><Evidence index={activeTurn} /></Modal>}
    {overlay === 'object' && <Modal label={objectInfo.title} onClose={() => setOverlay(null)}>
      <div className="object-info"><span className="chapter-icon"><Icon name={objectInfo.icon} size={32} /></span><p>{objectInfo.note}</p></div>
      {object === 'solar' && <button className="secondary" onClick={() => setOverlay('evidence')}>See the NASA shadow model <Icon name="arrow" size={18} /></button>}
    </Modal>}
    {overlay === 'field-notes' && <Modal label={turn.chapter === 1 ? 'Solar particle alert' : 'How long does a signal take?'} onClose={() => setOverlay(null)}>
      <div className="object-info"><span className="chapter-icon"><Icon name={turn.chapter === 1 ? 'storm' : 'radio'} size={31} /></span>
        {turn.chapter === 1 ? <div><strong>{storm.displayTime} · {storm.detector}</strong><p>NASA’s DONKI archive recorded fast particles from the Sun. Farpoint replays this event for training. The exposure meter uses game points.</p><a href={storm.url} target="_blank" rel="noreferrer">NASA DONKI record {storm.id} ↗</a></div> : <div><strong>1.28 seconds each way</strong><p>Radio waves take about 2.56 seconds to reach Earth and return. Your training radio waits the full trip.</p><a href={sources[4].url} target="_blank" rel="noreferrer">NASA Lunar Prospector documentation ↗</a></div>}
      </div>
    </Modal>}
  </div>
}

export default App


