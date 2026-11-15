import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { chapters, crewNeedsHelp, demoStart, frames, isFinished, newMission, step, turns } from './mission'
import type { Plan } from './mission'
import { radio } from './science'
import { Debrief } from './Debrief'
import { createSoundtrack } from './soundtrack'
import { Home } from './ui/Home'
import { ColonyMission } from './ui/ColonyMission'
import { Icon } from './ui/Icon'
import { CrewBrief, FieldReference, MissionMeters, MissionProgress } from './ui/MissionHud'
import { Overlays } from './ui/Overlays'
import type { Overlay } from './ui/Overlays'
import { StationConsole } from './ui/StationConsole'
import { jobSites, sites } from './world/layout'
import type { SiteId } from './world/layout'
import type { WorldState, WorkVisual } from './world/runtime'
import './style.css'
import './ui/relay.css'

const LunarScene = lazy(() => import('./LunarScene').then((module) => ({ default: module.LunarScene })))

type Page = 'home' | 'colony' | 'game' | 'report'
type ViewMode = 'walk' | 'console' | 'unavailable'

function App() {
  const [page, setPage] = useState<Page>('home')
  const [mission, setMission] = useState(newMission)
  const [demo, setDemo] = useState(false)
  const [chosen, setChosen] = useState<Plan | null>(null)
  const [work, setWork] = useState<WorkVisual>({})
  const [atStation, setAtStation] = useState(false)
  const [overview, setOverview] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('walk')
  const [sending, setSending] = useState(false)
  const [driving, setDriving] = useState(false)
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [object, setObject] = useState('solar')
  const [sound, setSound] = useState(false)
  const audioContext = useRef<AudioContext | null>(null)
  const nextCue = useRef(0)
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
    document.fullscreenElement?.scrollTo({ top: 0, behavior: 'instant' })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [page, mission.turn])
  useEffect(() => {
    if (chosen !== null) {
      continueButton.current?.focus({ preventScroll: true })
      continueButton.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [chosen])
  useEffect(() => {
    if ((atStation && !demo) || viewMode === 'console') {
      workstation.current?.focus({ preventScroll: true })
      workstation.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [atStation, demo, viewMode])

  function ping(high = false, force = false) {
    if (!sound && !force) return
    try {
      const ctx = (audioContext.current ??= new AudioContext())
      void ctx.resume().catch(() => undefined)
      const oscillator = ctx.createOscillator()
      const volume = ctx.createGain()
      oscillator.type = 'sine'
      const start = Math.max(ctx.currentTime, nextCue.current)
      nextCue.current = start + .1
      oscillator.frequency.setValueAtTime(high ? 590 : 360, start)
      oscillator.frequency.exponentialRampToValueAtTime(high ? 880 : 165, start + .13)
      volume.gain.setValueAtTime(.048, start)
      volume.gain.exponentialRampToValueAtTime(.001, start + .18)
      oscillator.connect(volume).connect(ctx.destination)
      oscillator.start(start)
      oscillator.stop(start + .19)
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
    setSending(false)
    setDriving(false)
    roverComplete.current = null
    setChosen(null)
    setWork({})
    setAtStation(false)
  }

  function goHome() {
    if (page === 'home') {
      window.scrollTo({ top: 0, behavior: 'instant' })
      return
    }
    resetInteraction()
    setPage('home')
  }

  function launch(showDemo: boolean) {
    resetInteraction()
    setDemo(showDemo)
    setOverview(false)
    setViewMode('walk')
    setAtStation(showDemo)
    setMission(showDemo ? demoStart() : newMission())
    setOverlay(null)
    setPage(showDemo ? 'game' : 'colony')
    ping(true)
  }

  function runPlan(plan: Plan) {
    if (chosen !== null || busyRef.current || roverComplete.current) return
    const next = step(mission, plan)
    const result = next.history.at(-1)
    if (next === mission || !result) return
    const apply = () => {
      busyRef.current = false
      setSending(false)
      setDriving(false)
      setChosen(plan)
      setWork((current) => ({ ...current, working: false, ...(!result.applied ? { pods: 0 } : {}) }))
      ping(true)
    }
    if (mission.turn === 2 && viewMode === 'walk') {
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
      setSending(true)
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

  function useStation(id: SiteId) {
    if (atStation || overlay || chosen !== null || sending) return
    if (id === jobSites[mission.turn]) {
      setAtStation(true)
      setOverview(false)
      ping(true)
    } else {
      setObject(id === 'power' ? 'solar' : id === 'kit' ? 'rover' : id)
      setOverlay('object')
      ping()
    }
  }

  const activeTurn = Math.min(mission.turn, turns.length - 1)
  const turn = turns[activeTurn]
  const site = jobSites[activeTurn]
  const displayMission = chosen === null ? mission : step(mission, chosen)
  const log = chosen === null ? undefined : displayMission.history.at(-1)
  const frameIndex = demo && log ? activeTurn + 1 : activeTurn
  const sunlit = frames[frameIndex].sunlit
  const sceneState: WorldState = {
    turn: activeTurn, site, light: sunlit,
    storm: !!turn.solarAlert, crew: turn.character, work,
    opened: atStation, locked: atStation || !!overlay || sending || !!log,
    completed: log?.applied ? log.choice.id : undefined, kit: displayMission.kit, garden: displayMission.garden,
    sending, overview,
  }
  const passed = mission.turn === turns.length && !crewNeedsHelp(mission)
  const mood = page === 'report' ? (passed || demo ? 'resolved' : 'shadow') : page === 'home' ? 'explore' : turn.solarAlert ? 'storm' : sunlit ? 'explore' : 'shadow'
  useEffect(() => { soundtrack.current?.setMood(mood) }, [mood, sound])

  const storyLine = activeTurn === 3 && mission.kit
    ? 'Pip recovered the kit and its spare radio cell. The crew spent longer outside. Can we afford to raise the water shield now?'
    : activeTurn === 4 && mission.kit
      ? 'Pip brought back the spare radio cell. Use it for the call, and sweep the antenna until you find Earth.'
      : turn.prompt

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="topbar">
      <div className="topbar-inner content-width">
        <a className="wordmark" href="./" onClick={(event) => { event.preventDefault(); goHome() }} aria-label="Lunar Outpost home">
          <span className="brand-icon" aria-hidden="true"><Icon name="moon" size={20} /></span><span>Lunar<span> Outpost</span></span>
        </a>
        <nav aria-label="Game links" className="topnav">
          <button className="nav-link" aria-label="Meet the crew" onClick={() => setOverlay('crew')}><Icon name="crew" size={18} /><span>Meet the crew</span></button>
          <button className="nav-link" aria-label="Explore NASA Moon data" onClick={() => setOverlay('evidence')}><Icon name="moon" size={18} /><span>Moon data</span></button>
          <button className="icon-button sound-button" aria-label={sound ? 'Mute music and effects' : 'Enable music and effects'} aria-pressed={sound} onClick={toggleSound}><Icon name={sound ? 'sound' : 'mute'} size={20} /></button>
        </nav>
      </div>
    </header>

    <main id="main-content" tabIndex={-1}>
      {page === 'home' && <Home onLaunch={launch} onViewMoon={() => setOverlay('evidence')} />}
      {page === 'colony' && <ColonyMission onExit={goHome} cue={ping} sound={sound} onSound={toggleSound} paused={!!overlay} />}

      {page === 'game' && <section className="game-wrap content-width" aria-labelledby="mission-title">
        <header className="mission-masthead">
          <div>
            <button className="text-button back-button" onClick={goHome}><Icon name="back" size={17} />Launch screen</button>
            <h1 id="mission-title" ref={focusHeading} tabIndex={-1}>{chapters[turn.chapter].name}</h1>
          </div>
          <MissionProgress turn={activeTurn} demo={demo} />
        </header>

        <MissionMeters mission={displayMission} turn={activeTurn} frameIndex={frameIndex} />
        <div className={'play-layout' + (viewMode === 'walk' ? '' : ' console-layout')}>
          <div className="play-main">
            {viewMode === 'walk' ?
              <div className="world-stage">
                <Suspense fallback={<div className="world-placeholder" role="status"><Icon name="orbit" size={28} /><strong>Loading Farpoint…</strong></div>}>
                  <LunarScene state={sceneState} demo={demo} onInteract={useStation} onOverview={() => setOverview(!overview)}
                    onRoverArrived={finishDrive} onUnavailable={() => { setViewMode('unavailable'); finishDrive() }} />
                </Suspense>
              </div> :
              <div className="console-scene">
                <div><p className="eyebrow"><Icon name="console" size={17} />Console mode</p><p className="console-site">{sites[site].name}</p></div>
                {viewMode === 'unavailable' ? <p role="status">3D graphics unavailable. Use the station controls to continue.</p> :
                  !sending && !log && <button className="secondary" onClick={() => { setAtStation(false); setViewMode('walk'); focusHeading.current?.focus() }}><Icon name="globe" size={19} />Explore in 3D</button>}
              </div>}
            <CrewBrief id={turn.character} message={storyLine} />
          </div>

          <aside className="side-console" aria-label="Station tools and evidence">
            <div className="decision-zone glass-panel" ref={workstation} tabIndex={-1} role="region" aria-label="Current station controls">
              <StationConsole mission={mission} site={site} driving={driving} sending={sending} log={log}
                ready={atStation || viewMode !== 'walk'} demo={demo} finished={isFinished(displayMission)} continueButton={continueButton}
                onContinue={continueMission} onPreview={(change) => setWork((current) => ({ ...current, ...change }))} onRun={runPlan}
                onStepAway={!demo && viewMode === 'walk' ? () => { setAtStation(false); setWork({}) } : undefined}
                onConsole={() => setViewMode('console')} />
            </div>
            <FieldReference turn={activeTurn} frameIndex={frameIndex} onOpen={() => setOverlay(turn.chapter === 0 ? 'evidence' : 'field-notes')} />
          </aside>
        </div>
      </section>}

      {page === 'report' && <section className="report-wrap content-width" aria-labelledby="report-title">
        <header className={'report-splash ' + (passed ? 'mint' : demo ? 'sage' : 'amber')}>
          <span className="report-icon"><Icon name={demo ? 'rewind' : passed ? 'check' : 'shield'} size={29} /></span>
          <p className="eyebrow">{demo ? 'Judge demo · Decision replay' : 'Farpoint flight log'}</p>
          <h1 id="report-title" ref={focusHeading} tabIndex={-1}>{demo ? 'One shadow, different outcomes' : passed ? 'The crew made it to handover' : 'Farpoint called off the shift'}</h1>
          <p>{demo ? 'Try another greenhouse schedule against the same NASA shadow.' : passed ? 'Check what the next crew will inherit and what still needs work.' : 'Mira brings the crew to safety. Review what happened before your next attempt.'}</p>
        </header>
        <Debrief mission={mission} demo={demo} />
        <div className="report-actions">
          <button className="primary" onClick={() => launch(false)}><Icon name={demo ? 'play' : 'rewind'} />{demo ? 'Play the full mission' : 'Try another plan'}</button>
          <button className="secondary" onClick={() => setOverlay('sources')}><Icon name="book" />Data sources</button>
        </div>
      </section>}
    </main>

    <footer className="footer content-width">
      <div><span className="footer-name">Lunar Outpost</span><p>Made for the 2026 NASA Space Apps Challenge.</p></div>
      <button className="text-button" onClick={() => setOverlay('sources')}><Icon name="book" size={17} />Data sources</button>
      <small>NASA Apollo imagery · AI/SI disclosure: OpenAI Codex assisted with code generation. OpenAI ImageGen assisted with crew artwork.</small>
    </footer>

    {overlay && <Overlays overlay={overlay} object={object} turn={page === 'home' ? 0 : frameIndex}
      onClose={() => setOverlay(null)} onViewMoon={() => setOverlay('evidence')} />}
  </div>
}

export default App
