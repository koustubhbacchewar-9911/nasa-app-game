import { useState } from 'react'
import { chapters, crew } from '../mission'
import type { CrewId } from '../mission'
import apollo from '../art/apollo-11.webp'
import { Icon } from './Icon'
import { Avatar } from './Shared'
import './home.css'

type HomeProps = {
  onLaunch: (demo: boolean) => void
  onViewMoon: () => void
}

export function Home({ onLaunch, onViewMoon }: HomeProps) {
  const [selected, setSelected] = useState<CrewId>('mira')
  return <>
    <section className="hero" aria-labelledby="title">
      <div className="hero-copy">
        <p className="hero-kicker"><span />Junior astronaut mission trainer</p>
        <h1 id="title">Lunar <em>Outpost<span>.</span></em></h1>
        <p className="hero-lead">A shadow is coming.<br />Your crew is counting on you.</p>
        <div className="hero-actions">
          <button className="primary" onClick={() => onLaunch(false)}><Icon name="play" size={20} />Start mission<Icon name="arrow" size={18} /></button>
          <button className="secondary" onClick={() => onLaunch(true)}><Icon name="rewind" size={18} />Judge demo</button>
        </div>
        <div className="hero-footer">
          <Icon name="moon" size={16} /><strong>Farpoint Outpost</strong><span>Lunar South Pole</span>
        </div>
      </div>
      <figure className="hero-photo">
        <div className="hero-photo-frame">
          <img className="hero-art" src={apollo} alt="Buzz Aldrin standing on the Moon during Apollo 11" fetchPriority="high" width={1700} height={1660} />
        </div>
        <figcaption><strong>Apollo 11 · July 1969</strong><span>Neil Armstrong / NASA</span></figcaption>
      </figure>
    </section>

    <section id="briefing" className="home-brief content-width" aria-labelledby="briefing-title">
      <div className="brief-heading">
        <div>
          <p className="eyebrow">The briefing</p>
          <h2 id="briefing-title">Your mission</h2>
        </div>
        <button className="text-button" onClick={onViewMoon}><Icon name="moon" size={17} />Moon data</button>
      </div>
      <ol className="chapter-list" aria-label={chapters.length + ' mission chapters'}>
        {chapters.map((chapter, index) => <li className={chapter.color} key={chapter.name}>
          <div className="chapter-top"><span className="chapter-icon"><Icon name={chapter.icon} size={23} /></span>
            <span>Chapter 0{index + 1}</span></div>
          <h3>{chapter.name}</h3><p>{chapter.summary}</p>
        </li>)}
      </ol>
    </section>
    <section className="crew-quarters content-width" id="crew" aria-labelledby="crew-title">
      <div className="brief-heading"><div><p className="eyebrow">Farpoint personnel</p><h2 id="crew-title">Meet the crew</h2></div></div>
      <div className="crew-roster">
        {(Object.keys(crew) as CrewId[]).map((id) => <button key={id} type="button"
          className="crew-card" data-crew={id} aria-pressed={selected === id} onClick={() => setSelected(id)}>
          <Avatar id={id} /><span><strong>{crew[id].name}</strong><small>{crew[id].role}</small></span>
        </button>)}
      </div>
      <p className="crew-description" key={selected} data-crew={selected} aria-live="polite">{crew[selected].line}</p>
    </section>
  </>
}
