import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { beds, briefings, capacity, choose, colonyFrame, harvestCount, options, panelOutput, plantLimit, sunlight } from '../colony'
import type { Bed, Colony } from '../colony'
import type { SiteId } from '../world/layout'
import { Icon } from './Icon'
import type { UiIcon } from './Icon'
import './station-lab.css'

export type StationChoice = ReturnType<typeof options>[number]
export type Draft = { choice: StationChoice; bed: Bed; bearing: number }

export function Delta({ icon, label, value, inverse = false }: { icon: UiIcon; label: string; value: number; inverse?: boolean }) {
  const tone = !value ? 'same' : (inverse ? value < 0 : value > 0) ? 'gain' : 'loss'
  return <span className="lab-delta" data-tone={tone}><Icon name={icon} size={16} /><b>{value > 0 ? '+' : value < 0 ? '−' : ''}{Math.abs(value)}</b> {label}</span>
}

function Gauge({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return <div className={'lab-gauge ' + color}>
    <span>{label}</span><b>{value}/{max}</b>
    <i aria-hidden="true"><span style={{ '--level': value / max } as CSSProperties} /></i>
  </div>
}

function Greenhouse({ state, next, bed, selectBed }: { state: Colony; next: Colony; bed: Bed; selectBed: (bed: Bed) => void }) {
  return <div className="lab-greenhouse">
    <div className="lab-summary"><Icon name="plant" /><b>{harvestCount(state)} ready to harvest</b></div>
    <div className="lab-beds">
      {beds.map((name, index) => <section key={name} className="lab-bed" data-active={bed === index}>
        <button className="station-button" aria-pressed={bed === index} onClick={() => selectBed(index as Bed)}>{name}</button>
        <div className="lab-plants">{state.plants.slice(index * 3, index * 3 + 3).map((plant, offset) => {
          const forecast = next.plants[index * 3 + offset]
          const ready = plant.growth === plantLimit && plant.health >= 3
          return <div key={offset} className="lab-plant" data-stressed={plant.health < 3}>
            <Icon name="plant" size={26} />
            <strong>Lettuce {index * 3 + offset + 1}</strong>
            <small>{ready ? 'Ready' : plant.health < 3 ? 'Stressed' : 'Growing'}</small>
            <Gauge label="Health" value={plant.health} max={plantLimit} color="mint" />
            <Gauge label="Growth" value={plant.growth} max={plantLimit} color="blue" />
            {(forecast.health !== plant.health || forecast.growth !== plant.growth) && <p className="plant-forecast">
              Preview · {forecast.health}/{plantLimit} health · {forecast.growth}/{plantLimit} growth
            </p>}
          </div>
        })}</div>
      </section>)}
    </div>
  </div>
}

function SolarGrid({ state, serviced }: { state: Colony; serviced: boolean }) {
  const [bank, setBank] = useState(0)
  const output = panelOutput(state)
  const changedOutput = panelOutput({ ...state, servicedArray: serviced || state.servicedArray })
  return <>
    <div className="lab-summary"><Icon name={colonyFrame(state).sunlit ? 'sun' : 'moon'} /><b>{sunlight(state)} battery · NASA frame {colonyFrame(state).frame}</b></div>
    <div className="solar-banks" aria-label="Solar panel banks">
      {output.map((power, index) => <button key={index} className="station-button" aria-pressed={bank === index} onClick={() => setBank(index)}>
        <i aria-hidden="true" /><b>Bank {index + 1}</b><small>{power} power</small>
      </button>)}
    </div>
    <p className="lab-note">Bank {bank + 1} · {output[bank] ? 'Producing power' : 'In shadow'}. {serviced && !state.servicedArray
      ? 'After cleaning, this bank produces ' + changedOutput[bank] + ' power under the same light.' : 'Air gets the first 3 battery each watch.'}</p>
  </>
}

const stationNames: Record<SiteId, [UiIcon, string]> = {
  power: ['sun', 'Solar grid'], garden: ['plant', 'Greenhouse'], shelter: ['shield', 'Storm shelter'], rover: ['rover', 'Rover routes'],
  radio: ['radio', 'Earth relay'], air: ['air', 'Oxygen plant'], kit: ['target', 'Field instruments'], lander: ['lander', 'Landing radar'],
}

function StationReadout({ state, after, site, choice, bed, setBed, bearing, setBearing }: {
  state: Colony; after: Colony; site: SiteId; choice?: StationChoice; bed: Bed; setBed: (bed: Bed) => void;
  bearing: number; setBearing: (value: number) => void
}) {
  if (site === 'garden') return <Greenhouse state={state} next={after} bed={bed} selectBed={setBed} />
  if (site === 'power') return <SolarGrid state={state} serviced={!!choice?.service} />
  if (site === 'shelter') {
    const pods = choice?.id === 'pods' ? 2 : choice?.id === 'one-pod' ? 1 : 0
    return <div className="lab-diagram">
      <div className="lab-summary"><Icon name="shield" /><b>Shield coverage</b><span>{pods}/2 gaps covered by this plan</span></div>
      <div className="shield-sections">{[0, 1].map((index) => <span data-covered={index < pods} key={index}><Icon name={index < pods ? 'water' : 'storm'} />{index < pods ? 'Pod in place' : 'Open gap'}</span>)}</div>
      <Gauge label="Crew exposure after this watch" color="coral" value={after.exposure} max={capacity.exposure} />
    </div>
  }
  if (site === 'rover') {
    const route = choice?.id === 'ridge-drive' ? 'Ridge shortcut' : choice?.id === 'walk' ? 'Foot trail' : 'Marked rover trail'
    return <div className="lab-diagram">
      <div className="lab-summary"><Icon name="rover" /><b>{route}</b></div>
      <div className="route-readout"><span><Icon name={choice?.id === 'walk' ? 'crew' : 'rover'} />Rover bay</span><i />
        {choice?.id === 'ridge-drive' && <><span><Icon name="moon" />Ridge</span><i /></>}
        <span><Icon name="target" />Relay kit</span><i /><span><Icon name="shield" />Shelter</span></div>
    </div>
  }
  if (site === 'radio') {
    const signal = Math.max(0, 100 - Math.abs(bearing - 72) * 3)
    return <div className="lab-diagram">
      <div className="lab-summary"><Icon name="radio" /><b>{signal >= 88 ? 'Earth signal locked' : 'Sweep for Earth'}</b></div>
      <Gauge label="Signal strength" color="blue" value={signal} max={100} />
      {choice?.transmit && <><label htmlFor="lab-bearing">Antenna angle · {bearing}°</label>
        <input id="lab-bearing" type="range" min="0" max="100" value={bearing} onChange={(event) => setBearing(Number(event.currentTarget.value))} />
        <button className="station-button" onClick={() => setBearing(72)}>Auto-align dish</button></>}
      <p className="lab-note">Moon to Earth and back · 2.56 seconds. {state.contact ? 'Earth has a previous update.' : 'Earth is waiting for its first update.'}</p>
    </div>
  }
  if (site === 'air') return <div className="lab-diagram">
    <div className="lab-summary"><Icon name="air" /><b>Backup oxygen tanks</b></div>
    <div className="oxygen-cells" aria-hidden="true">{Array.from({ length: capacity.oxygen }, (_, i) => <i key={i} data-fill={i < state.oxygen} data-preview={i < after.oxygen} />)}</div>
    <Gauge label="Projected reserve" color="blue" value={after.oxygen} max={capacity.oxygen} />
  </div>
  if (site === 'kit') return <div className="lab-diagram">
    <div className="lab-summary"><Icon name={choice?.id === 'walk' ? 'radio' : 'target'} /><b>{choice?.id === 'walk' ? 'Relay kit pickup' : 'Surface sample'}</b></div>
    <p className="lab-note">{choice?.id === 'walk' ? 'Lift the kit by hand. Your suit will use oxygen for the return trip.'
      : state.research ? 'Sample stored' : state.scanned ? 'Scan recorded' : 'Sample available · Scan it or spend suit oxygen to collect it.'}</p>
  </div>
  return <div className="lab-summary"><Icon name="lander" /><b>Landing complete · Farpoint</b></div>
}

export function StationLab({ state, site, choices, initialChoice, onPreview, onCommit, extra }: {
  state: Colony; site: SiteId; choices: StationChoice[]; initialChoice?: string;
  onPreview: (draft: Draft) => void; onCommit: (draft: Draft) => void; extra?: ReactNode
}) {
  const [id, setId] = useState(initialChoice ?? choices[0]?.id)
  const [bed, setBed] = useState<Bed>(0)
  const [bearing, setBearing] = useState(44)
  const choice = choices.find((item) => item.id === id) ?? choices[0]
  const forecast = choice ? choose(state, choice.id, bed) : state
  const [icon, name] = stationNames[site]
  const needsSignal = !!choice?.transmit && Math.abs(bearing - 72) > 4
  const healthDelta = forecast.plants.reduce((sum, plant, index) => sum + plant.health - state.plants[index].health, 0)
  function select(option: StationChoice, targetBed = bed, angle = bearing) {
    setId(option.id)
    onPreview({ choice: option, bed: targetBed, bearing: angle })
  }
  return <section className="station-lab" aria-label={name + ' console'}>
    <h2><Icon name={icon} size={22} />{name}</h2>
    {!!choices.length && <div className="lab-options" role="group" aria-label="Compare plans">
      {choices.map((option) => <button className="station-button" key={option.id} aria-pressed={choice?.id === option.id}
        onClick={() => select(option)}>{option.title}</button>)}
    </div>}
    <StationReadout state={state} after={forecast} site={site} choice={choice} bed={bed}
      setBed={(value) => { setBed(value); if (choice) select(choice, value) }} bearing={bearing}
      setBearing={(value) => { setBearing(value); if (choice) select(choice, bed, value) }} />
    {choice && <div className="lab-forecast">
        <h3>What happens this watch</h3><p>{choice.detail}</p>
        <p className="lab-note">{choice.cost ? choice.cost + ' battery goes to this plan.' : 'This plan uses no extra battery.'} The totals below include sunlight and life support.</p>
        {forecast === state ? <strong>More battery needed. Life support gets power first.</strong> : <>
          <div className="lab-deltas" aria-label="Resource changes">
            <Delta icon="battery" label="Battery" value={forecast.power - state.power} />
            <Delta icon="air" label="Oxygen" value={forecast.oxygen - state.oxygen} />
            <Delta icon="shield" label="Exposure" value={forecast.exposure - state.exposure} inverse />
            {harvestCount(forecast) !== harvestCount(state) && <Delta icon="plant" label="Ready to harvest" value={harvestCount(forecast) - harvestCount(state)} />}
            {!!healthDelta && <Delta icon="water" label="Bed health" value={healthDelta} />}
            {forecast.contact && !state.contact && <span className="lab-delta" data-tone="gain"><Icon name="radio" size={16} />Earth notified</span>}
            {forecast.research && !state.research && <span className="lab-delta" data-tone="gain"><Icon name="target" size={16} />Sample recovered</span>}
          </div>
          <p className="lab-note">Afterward · {forecast.power} battery · {forecast.oxygen} oxygen · {forecast.exposure}/{capacity.exposure} exposure</p>
          <p className="lab-note">Next · {briefings[forecast.node].title}</p>
          {(forecast.oxygen === 0 || forecast.exposure === capacity.exposure) && <p className="decision-danger">This plan reaches a crew safety limit and ends the shift.</p>}
        </>}
        {needsSignal && <p className="lab-note">Align the antenna before sending.</p>}
        <button className="primary" disabled={forecast === state || needsSignal} onClick={() => onCommit({ choice, bed, bearing })}>
          {choice.greenhouse && site !== 'garden' ? 'Go to greenhouse' : 'Apply plan'} <Icon name="arrow" size={18} />
        </button>
    </div>}
    {extra}
  </section>
}
