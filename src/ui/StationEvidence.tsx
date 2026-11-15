import { frames } from '../mission'
import { radio, sources, storm } from '../science'
import type { SiteId } from '../world/layout'
import { asset, Modal } from './Shared'

export function stationEvidence(site: SiteId, stormWarning: boolean) {
  if (site === 'lander') return { title: 'Apollo 11 landing footage', source: sources[0], media: 'landing' }
  if (site === 'rover' || site === 'kit') return { title: 'Apollo 17 lunar rover', source: sources[6], media: 'rover' }
  if (site === 'power') return { title: 'Moon South Pole sunlight map', source: sources[0], media: 'sun' }
  if (site === 'shelter' || (site === 'radio' && stormWarning)) return { title: 'May 2024 solar particle alert', source: sources[1], media: 'storm' }
  if (site === 'garden') return { title: 'Growing lettuce on the ISS', source: sources[2], media: 'reference' }
  if (site === 'air') return { title: 'How the ISS makes oxygen', source: sources[3], media: 'reference' }
  return { title: 'Moon–Earth radio travel time', source: sources[4], media: 'radio' }
}

export function StationEvidence({ site, frame, stormWarning, onClose }: { site: SiteId; frame: (typeof frames)[number]; stormWarning: boolean; onClose: () => void }) {
  const { media, source, title } = stationEvidence(site, stormWarning)
  return <Modal label={title} onClose={onClose}>
    <div className="station-evidence">
      {media === 'landing' ? <>
        <video src={asset('apollo-touchdown.mp4')} controls playsInline preload="metadata" aria-label="Silent Apollo 11 descent footage" />
        <p>Watch the view from the lunar module as Apollo 11 approaches its 1969 landing site.</p>
        <a href="https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.landmov.html" target="_blank" rel="noreferrer">NASA Apollo 11 descent film · Digitized by Gary Neff</a>
      </> : media === 'rover' ? <>
        <img src={asset('science/apollo-17-rover.webp')} alt="Gene Cernan driving the Apollo 17 rover on the Moon" />
        <p>The Apollo 17 crew used their rover to reach geology stops in Taurus–Littrow. Here, you compare routes so you can bring back a sample and still have power at the base.</p>
        <a href="https://science.nasa.gov/resource/apollo-17-gene-cernan-in-lunar-roving-vehicle/" target="_blank" rel="noreferrer">NASA Apollo 17 · Photo by Harrison Schmitt</a>
      </> : <>
        {media === 'sun' && <>
          <img src={asset('science/' + frame.filename)} alt={`NASA’s South Pole illumination model, frame ${frame.frame}`} />
          <p><strong>Frame {frame.frame} · {frame.sunlit ? 'Sunlit' : 'In shadow'}</strong> · {new Date(frame.time).toUTCString()}</p>
        </>}
        {media === 'storm' && <p><strong>{storm.displayTime} · {storm.detector}</strong></p>}
        {media === 'radio' && <p><strong>{radio.roundTripMs / 1000} seconds for a round trip</strong></p>}
        <p>{source.detail}</p>
        <a href={source.url} target="_blank" rel="noreferrer">{source.agency} · Open source record</a>
      </>}
    </div>
  </Modal>
}
