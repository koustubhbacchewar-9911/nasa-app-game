import { useState } from 'react'
import { crewNeedsHelp, demoBranch, frames, limits, newMission, replayFrom, turns } from './mission'
import type { Mission, Plan } from './mission'
import { Icon } from './ui/Icon'
import { Meter, resourceReadings } from './ui/MissionHud'
import './debrief.css'

function Readings({ mission }: { mission: Pick<Mission, 'power' | 'air' | 'garden' | 'exposure'> }) {
  return <div className="debrief-readings">
    {resourceReadings.map(({ key, name, icon, color }) =>
      <Meter key={key} label={name} icon={icon} color={color} value={mission[key]} max={limits[key]} />)}
  </div>
}

export function Debrief({ mission, demo }: { mission: Mission; demo: boolean }) {
  const [selected, setSelected] = useState(mission.history.length - 1)
  const recorded = mission.history[1]?.plan
  const [light, setLight] = useState(recorded === 1 || (typeof recorded === 'object' && recorded.kind === 'power' && recorded.light === 0) ? 5 : 0)
  const first = newMission()
  const entry = mission.history[selected]
  const chosen = mission.history[1]?.plan
  const original = demo && chosen !== undefined ? demoBranch(chosen) : null
  const alternativePlan: Plan = { kind: 'power', light, air: 0 }
  const alternateDemo = demo ? demoBranch(alternativePlan) : null
  const alternate = alternateDemo?.later ?? replayFrom(mission, 1, alternativePlan)
  const originalEnd = original?.later ?? mission
  const outcome = (run: Mission) => crewNeedsHelp(run) ? 'Crew called off the shift' : run.turn >= turns.length ? 'Shift completed' : 'At the last recorded job'
  const doseLimit = mission.exposure >= limits.exposure
  const outOfAir = mission.air === 0
  const received = mission.history.some((job) => job.choice.id === 'call' && job.applied)
  const localRepair = mission.history.some((job) => job.choice.id === 'local' && job.applied)
  const selectedTurn = mission.history[1]
  const canReplay = !!selectedTurn
  return <div className="debrief">
    <section className="debrief-summary glass-panel">
      <h2>{demo ? 'The result of your schedule' : 'What the next crew inherits'}</h2>
      <Readings mission={originalEnd} />
      {!demo && <ul className="debrief-summary-line">
        <li><Icon name="shield" size={17} />{doseLimit ? 'Shelter exposure limit reached' : outOfAir ? 'Backup air exhausted' : 'Crew completed the shift'}</li>
        <li><Icon name="plant" size={17} />{mission.garden >= 5 ? 'Lettuce ready to harvest' : 'Lettuce needs another light cycle'}</li>
        <li><Icon name="radio" size={17} />{received ? 'Earth replied in 2.56 seconds' : localRepair ? 'Radio repaired locally using backup air' : 'Earth call unconfirmed'}</li>
      </ul>}
    </section>
    <section className="debrief-timeline glass-panel">
      <h2>Turn by turn</h2>
      <div className="turn-tabs" role="group" aria-label="Review a mission turn">{frames.slice(0, turns.length).map((frame, index) => <button
        className={frame.sunlit ? 'lit-turn' : ''} key={frame.frame} aria-pressed={index === selected} disabled={index >= mission.history.length}
        aria-label={'Turn ' + (index + 1) + (frame.sunlit ? ', sunlight' : ', shadow')}
        onClick={() => setSelected(index)}><Icon name={frame.sunlit ? 'sun' : 'moon'} size={17} />{index + 1}</button>)}</div>
      {entry && <div className="timeline-entry" aria-live="polite">
        <strong>{entry.choice.title}</strong>
        <p>{entry.applied ? entry.choice.result : 'The equipment needed more power. The base used its backup plan.'}</p>
        <p>{entry.solar ? entry.solar + ' power came from sunlight.' : 'The solar array was in shadow.'} {entry.airOn ? 'The air machine stayed powered.' : 'The crew used backup air.'}</p>
        <div className="timeline-change">
          {resourceReadings.map(({ key, name }) => <span key={key}>{name} <b>{(mission.history[selected - 1]?.remaining ?? first)[key]} → {entry.remaining[key]}</b></span>)}
        </div>
      </div>}
    </section>
    {canReplay && <section className="debrief-replay glass-panel">
      <h2>What if you changed the grow lights?</h2>
      <p>Change the power you send to the greenhouse just before the shadow. {demo ? 'Both runs use the same follow-up jobs.' : 'Your other recorded jobs stay the same.'}</p>
      <div className="replay-control amber">
        <label htmlFor="replay-light">New greenhouse setting <strong>{light} / 5 power</strong></label>
        <input id="replay-light" type="range" value={light} min={0} max={5} onChange={(event) => setLight(Number(event.target.value))} />
      </div>
      <div className="replay-comparison" aria-live="polite">
        <div><h3>Your flight log</h3><Readings mission={originalEnd} /><p><strong>{outcome(originalEnd)}</strong> · {selectedTurn.remaining.power} battery before shadow.</p></div>
        <div><h3>Revised schedule</h3><Readings mission={alternate} /><p><strong>{outcome(alternate)}</strong> · {alternateDemo?.immediate.power ?? replayFrom({ ...mission, history: mission.history.slice(0, 2) }, 1, alternativePlan).power} battery before shadow.</p></div>
      </div>
      <p>{!demo && mission.history.length < 6 ? 'This replay ends at the last recorded job. Continue in a new mission to see what happens next.' : 'Extra battery can run the air machine longer. More light grows more food.'}</p>
    </section>}
  </div>
}
