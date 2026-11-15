import type { CSSProperties } from 'react'
import { airCost, chapters, frames, limits, solarPower, turns, crew } from '../mission'
import type { CrewId, Mission } from '../mission'
import { storm } from '../science'
import { Icon } from './Icon'
import type { UiIcon } from './Icon'
import { Avatar } from './Shared'

export function MissionProgress({ turn, demo }: { turn: number; demo: boolean }) {
  const chapter = turns[turn].chapter
  return <div className="mission-progress">
    <p className="eyebrow">{demo ? 'Judge demo · ' : ''}Turn {turn + 1} of {turns.length}</p>
    <ol className="phase-list" aria-label="Mission chapters">
      {chapters.map((item, index) => <li key={item.name}
        className={index === chapter ? 'active' : index < chapter ? 'done' : undefined}
        aria-current={index === chapter ? 'step' : undefined}>
        <Icon name={index < chapter ? 'check' : item.icon} size={17} /><span>{['Power', 'Shelter', 'Contact'][index]}</span>
      </li>)}
    </ol>
  </div>
}

export const resourceReadings = [
  { key: 'power', name: 'Battery', icon: 'battery', color: 'amber' },
  { key: 'air', name: 'Backup air', icon: 'air', color: 'sage' },
  { key: 'garden', name: 'Crop progress', icon: 'plant', color: 'mint' },
  { key: 'exposure', name: 'Exposure', icon: 'shield', color: 'coral' },
] as const

export function Meter({ label, icon, value, max, color }: { label: string; icon: UiIcon; value: number; max: number; color: string }) {
  return <div className={'meter ' + color}>
    <div className="meter-label">
      <span><Icon name={icon} size={17} />{label}</span><strong>{value}<small> / {max}</small></strong>
    </div>
    <div className="meter-track" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <span style={{ '--fill': value / max } as CSSProperties} />
    </div>
  </div>
}

export function MissionMeters({ mission, turn, frameIndex }: { mission: Mission; turn: number; frameIndex: number }) {
  const frame = frames[frameIndex]
  const resources = turns[turn].solarAlert ? resourceReadings : resourceReadings.slice(0, 3)
  return <section className="telemetry glass-panel" aria-label="Outpost resources">
    <div className={'solar-status ' + (frame.sunlit ? 'amber' : 'sage')}>
      <Icon name={frame.sunlit ? 'sun' : 'moon'} size={21} />
      <div><strong>{frame.sunlit ? 'Sunlit panels' : 'Panels in shadow'}</strong><small>+{frame.sunlit ? solarPower : 0} power · Air uses {airCost}</small></div>
    </div>
    {resources.map(({ key, name, icon, color }) =>
      <Meter key={key} label={name} icon={icon} color={color} value={mission[key]} max={limits[key]} />)}
  </section>
}

export function CrewBrief({ id, message }: { id: CrewId; message: string }) {
  const member = crew[id]
  return <section className="crew-brief glass-panel" aria-label={member.name + '’s briefing'}>
    <Avatar id={id} />
    <div><p className="speaker"><strong>{member.name}</strong><span>{member.role}</span></p><p className="crew-message">{message}</p></div>
  </section>
}

export function FieldReference({ turn, frameIndex, onOpen }: { turn: number; frameIndex: number; onOpen: () => void }) {
  const chapter = turns[turn].chapter
  const frame = frames[frameIndex]
  const [icon, title, detail] = chapter === 0
    ? [frame.sunlit ? 'sun' : 'moon', 'Real Moon data', 'NASA model · Frame ' + frame.frame] as const
    : chapter === 1
      ? ['storm', 'Solar particle event', storm.displayTime] as const
      : ['radio', 'Signal to Earth', '2.56 s round trip'] as const
  return <button className="field-reference" onClick={onOpen}>
    <span className="reference-icon"><Icon name={icon} size={21} /></span>
    <span><strong>{title}</strong><small>{detail}</small></span>
    <Icon name="external" size={18} />
  </button>
}
