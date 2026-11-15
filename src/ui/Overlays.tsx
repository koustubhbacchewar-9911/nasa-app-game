import { useState } from 'react'
import { crew, frames, samplePoint, solarPower, turns } from '../mission'
import type { CrewId } from '../mission'
import { radio, sources, storm } from '../science'
import { Icon } from './Icon'
import type { UiIcon } from './Icon'
import { asset, Avatar, Modal } from './Shared'

export type Overlay = 'sources' | 'crew' | 'field-notes' | 'evidence' | 'object'

const mapObjects: Record<string, { title: string; icon: UiIcon; note: string }> = {
  solar: { title: 'Solar array', icon: 'sun', note: 'These panels turn sunlight into electricity. In shade, the outpost runs on its battery.' },
  air: { title: 'Air machine', icon: 'air', note: 'The air machine uses electricity. If it stops, the crew switches to the backup air supply.' },
  garden: { title: 'Greenhouse', icon: 'plant', note: 'The crew grows lettuce under LEDs. The lights share a battery with the rest of the base.' },
  rover: { title: 'Pip’s rover', icon: 'rover', note: 'Pip pilots the electric rover. The repair kit is outside and the crew must help load it.' },
  shelter: { title: 'Shielded room', icon: 'shield', note: 'Thicker walls and water containers can help block particles from the Sun.' },
  radio: { title: 'Earth antenna', icon: 'radio', note: 'A radio signal needs about 1.28 seconds to travel one way between here and Earth.' },
  lander: { title: 'Farpoint lander', icon: 'lander', note: 'The lander brought the crew, batteries and starter plants to the outpost.' },
}
const frameTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })

function Evidence({ index }: { index: number }) {
  const [frameIndex, setFrameIndex] = useState(index)
  const frame = frames[frameIndex]
  const condition = frame.sunlit ? 'Sunlit' : 'In shadow'
  const time = frameTime.format(new Date(frame.time)) + ' UTC'
  return <div className="evidence">
    <p className="modal-intro">Find the target on NASA’s lunar terrain model. It marks the point we use to decide when Farpoint’s solar panels have sunlight.</p>
    <div className="evidence-map">
      <img width={940} height={460} src={asset('science/' + frame.filename)} alt={'NASA terrain illumination model, frame ' + frame.frame} />
      <span className="site-reticle" aria-hidden="true" style={{ left: samplePoint.x + '%', top: samplePoint.y + '%' }}><Icon name="target" size={31} /></span>
    </div>
    <div className="evidence-slider">
      <label htmlFor="frame-slider">Explore model frames</label>
      <span className="eyebrow">Frame {frame.frame}</span>
      <input id="frame-slider" type="range" min={0} max={frames.length - 1} value={frameIndex}
        aria-valuetext={'Frame ' + frame.frame + ', ' + condition + ', ' + time}
        onChange={(event) => setFrameIndex(Number(event.target.value))} />
    </div>
    <div className={'evidence-reading ' + (frame.sunlit ? 'amber' : 'sage')}>
      <Icon name={frame.sunlit ? 'sun' : 'moon'} size={24} />
      <div><strong>{condition} · +{frame.sunlit ? solarPower : 0} power in the game</strong><p>{time}. The model advances two Earth hours per frame.</p></div>
    </div>
    <a className="source-link" href={sources[0].url} target="_blank" rel="noreferrer">View the original NASA model <Icon name="external" size={16} /></a>
  </div>
}

type OverlaysProps = {
  overlay: Overlay
  object: string
  turn: number
  onClose: () => void
  onViewMoon: () => void
}

export function Overlays({ overlay, object, turn, onClose, onViewMoon }: OverlaysProps) {
  if (overlay === 'crew') return <Modal label="Meet the crew" onClose={onClose}>
    <div className="crew-modal-grid">{(Object.keys(crew) as CrewId[]).map((id) => <article key={id} data-crew={id}>
      <Avatar id={id} /><div><h3>{crew[id].name}</h3><small>{crew[id].role}</small><p>{crew[id].line}</p></div>
    </article>)}</div>
  </Modal>

  if (overlay === 'sources') return <Modal label="Data sources" onClose={onClose}>
    <p className="modal-intro">Farpoint and its crew are fictional. Equipment loads, crop steps, exposure and mission outcomes use simplified game values.</p>
    <div className="source-grid">{sources.map((source) => <article key={source.title}>
      <p className="eyebrow">{source.agency}</p>
      <h3><a href={source.url} target="_blank" rel="noreferrer">{source.title} <Icon name="external" size={15} /></a></h3>
      <p>{source.detail}</p>
    </article>)}</div>
    <p className="modal-intro credit">Terrain model imagery by NASA Scientific Visualization Studio and Ernie Wright. Outpost and crew artwork was generated for this game.</p>
  </Modal>

  if (overlay === 'evidence') return <Modal label="How sunlight reaches Farpoint" onClose={onClose}><Evidence index={turn} /></Modal>

  if (overlay === 'object') {
    const info = mapObjects[object]
    return <Modal label={info.title} onClose={onClose}>
      <div className="object-info"><span className="chapter-icon"><Icon name={info.icon} size={28} /></span><p>{info.note}</p></div>
      {object === 'solar' && <button className="secondary" onClick={onViewMoon}>See the NASA shadow model <Icon name="arrow" size={18} /></button>}
    </Modal>
  }

  const isStorm = !!turns[turn].solarAlert
  return <Modal label={isStorm ? 'Solar particle alert' : 'How long does a signal take?'} onClose={onClose}>
    <div className="object-info"><span className="chapter-icon"><Icon name={isStorm ? 'storm' : 'radio'} size={28} /></span>
      {isStorm ? <div>
        <strong>{storm.displayTime} · {storm.detector}</strong>
        <p>NASA’s DONKI archive recorded fast particles from the Sun. Farpoint replays this event for training. The exposure meter uses game points.</p>
        <a className="source-link" href={storm.url} target="_blank" rel="noreferrer">NASA archive record {storm.id} <Icon name="external" size={16} /></a>
      </div> : <div>
        <strong>{radio.roundTripMs / 1000} seconds round trip</strong>
        <p>Radio waves travel about 1.28 seconds each way between Earth and the Moon. Your training radio waits the full trip.</p>
        <a className="source-link" href={sources[4].url} target="_blank" rel="noreferrer">NASA Lunar Prospector documentation <Icon name="external" size={16} /></a>
      </div>}
    </div>
  </Modal>
}
