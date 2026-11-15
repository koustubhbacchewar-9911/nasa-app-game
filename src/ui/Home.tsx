import { chapters, frames, samplePoint } from '../mission'
import farpoint from '../art/apollo-11.webp'
import { Icon } from './Icon'
import { asset } from './Shared'
import './home.css'

type HomeProps = {
  onLaunch: (demo: boolean) => void
  onExplore: () => void
  onViewMoon: () => void
}

export function Home({ onLaunch, onExplore, onViewMoon }: HomeProps) {
  return <>
    <section className="hero" aria-labelledby="title" data-enter>
      <img className="hero-art" src={farpoint} alt="" fetchPriority="high" />
      <div className="hero-scrim" aria-hidden="true" />
      <div className="hero-inner content-width">
        <div className="hero-copy">
          <p className="hero-kicker"><span />Junior astronaut mission trainer</p>
          <h1 id="title" aria-label="Shadow Shift"><span>Shadow</span>{' '}<span>Shift</span></h1>
          <p className="hero-lead">Land on the Moon. Build your base. Every decision changes what your crew can do next.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => onLaunch(false)}><Icon name="play" size={20} />Start mission<Icon name="arrow" size={18} /></button>
            <button className="secondary" onClick={() => onLaunch(true)}><Icon name="rewind" size={18} />Judge demo</button>
          </div>
        </div>
        <div className="hero-footer">
          <a href="#briefing" className="brief-link"><Icon name="down" size={17} />Mission brief</a>
          <div className="hero-location">
            <Icon name="target" size={21} />
            <span><strong>Apollo 11 · July 1969</strong><small>Photo by Neil Armstrong, NASA</small></span>
          </div>
        </div>
      </div>
    </section>

    <section id="briefing" className="home-brief content-width" aria-labelledby="briefing-title">
      <div className="brief-heading">
        <div>
          <p className="eyebrow">Mission brief</p>
          <h2 id="briefing-title">Keep Farpoint running</h2>
        </div>
        <p>One battery powers your air machine, grow lights and equipment. What you save now affects the jobs ahead.</p>
      </div>
      <div className="brief-layout">
        <button className="brief-map" onClick={onViewMoon}>
          <img src={asset('science/' + frames[0].filename)} alt="" loading="lazy" width={940} height={460} />
          <span className="brief-crosshair" aria-hidden="true" style={{ left: samplePoint.x + '%', top: samplePoint.y + '%' }}><Icon name="target" size={38} /></span>
          <span className="brief-map-label"><span><strong>Explore Moon data</strong><small>NASA lunar illumination model</small></span><Icon name="external" size={22} /></span>
        </button>
        <ol className="chapter-list" aria-label={chapters.length + ' mission chapters'}>
          {chapters.map((chapter, index) => <li className={chapter.color} key={chapter.name}>
            <span className="chapter-number" aria-hidden="true">0{index + 1}</span>
            <span className="chapter-icon"><Icon name={chapter.icon} size={23} /></span>
            <div><h3>{chapter.name}</h3><p>{chapter.summary}</p></div>
          </li>)}
        </ol>
      </div>
      <div className="brief-launch">
        <button className="secondary" onClick={onExplore}><Icon name="globe" size={18} />Explore the 3D outpost</button>
        <button className="primary" onClick={() => onLaunch(false)}>Start mission<Icon name="arrow" size={18} /></button>
      </div>
    </section>
  </>
}
