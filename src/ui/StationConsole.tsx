import type { RefObject } from 'react'
import type { LogEntry, Mission, Plan } from '../mission'
import type { SiteId } from '../world/layout'
import { sites } from '../world/layout'
import type { WorkVisual } from '../world/runtime'
import { Workstation } from '../Workstation'
import { Icon } from './Icon'

type StationConsoleProps = {
  mission: Mission
  site: SiteId
  driving: boolean
  sending: boolean
  log?: LogEntry
  ready: boolean
  demo: boolean
  finished: boolean
  continueButton: RefObject<HTMLButtonElement | null>
  onContinue: () => void
  onPreview: (change: WorkVisual) => void
  onRun: (plan: Plan) => void
  onStepAway?: () => void
  onConsole: () => void
}

const deltaLabels = { power: 'battery', air: 'backup air', garden: 'crop steps', exposure: 'exposure' }

export function StationConsole({
  mission, site, driving, sending, log, ready, demo, finished, continueButton,
  onContinue, onPreview, onRun, onStepAway, onConsole,
}: StationConsoleProps) {
  if (driving) return <div className="task-feedback" role="status">
    <span className="chapter-icon amber"><Icon name="rover" size={23} /></span>
    <h2>Pip is driving the route</h2>
    <p>Watch the rover lead the crew to the shelter.</p>
  </div>

  if (sending) return <div className="task-feedback" role="status">
    <span className="chapter-icon blue"><Icon name="radio" size={23} /></span>
    <h2>Waiting for Earth…</h2>
    <p>1.28 seconds there and 1.28 seconds back.</p>
    <div className="radio-journey" aria-hidden="true"><span>Farpoint</span><span>Earth</span><span>Farpoint</span></div>
    <div className="radio-track" aria-hidden="true"><i /></div>
  </div>

  if (log) {
    const changes = (Object.keys(deltaLabels) as (keyof typeof deltaLabels)[]).filter((key) => log.diff[key] !== 0)
    return <div className="task-feedback">
      <div role="status">
        <span className={'chapter-icon ' + (log.applied ? 'mint' : 'amber')}><Icon name={log.applied ? 'check' : 'battery'} size={23} /></span>
        <p className="eyebrow">Turn complete</p>
        <h2>{log.applied ? log.choice.title : 'The base used its backup plan'}</h2>
        <p>{log.applied ? log.choice.result : log.airOn ? 'The air machine ran first. There was too little power left for your extra task.' : 'The battery couldn’t run the air machine. The crew used backup air while the extra task waited.'}</p>
        {log.applied && !log.airOn && <p>The crew used backup air while the air machine was off.</p>}
        {!!changes.length && <ul className="deltas" aria-label="Resource changes">
          {changes.map((key) => <li key={key}>{log.diff[key] > 0 ? '+' : ''}{log.diff[key]} {deltaLabels[key]}</li>)}
        </ul>}
      </div>
      <button ref={continueButton} className="primary" onClick={onContinue}>
        {demo ? 'Compare schedules' : finished ? 'View mission report' : 'Next turn'} <Icon name="arrow" size={18} />
      </button>
    </div>
  }

  if (ready) return <div className="scene-task-open">
    <Workstation key={mission.turn} mission={mission} onMove={onPreview} onCommit={onRun} />
    {onStepAway && <button className="text-button" onClick={onStepAway}><Icon name="back" size={17} />Step away from station</button>}
  </div>

  return <div className="station-context">
    <span className="chapter-icon blue"><Icon name="target" size={24} /></span>
    <p className="eyebrow">Current objective</p>
    <h2>{sites[site].name}</h2>
    <p>Follow the marker in the outpost. When you’re close, tap <strong>Operate</strong> or press <kbd>E</kbd>.</p>
    <div className="console-option">
      <button className="secondary" onClick={onConsole}><Icon name="console" size={18} />Use console mode</button>
      <small>Go straight to the tools.</small>
    </div>
  </div>
}
