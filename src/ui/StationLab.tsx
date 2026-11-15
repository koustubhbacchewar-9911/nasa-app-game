import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { beds, capacity, choose, colonyFrame, harvestCount, panelOutput, planControl, plantLimit, signalStrength, sunlight, tuneChoice } from '../colony'
import type { Bed, Colony, PlanSettings, StationChoice } from '../colony'
import type { SiteId } from '../world/layout'
import { Icon } from './Icon'
import type { UiIcon } from './Icon'
import { isRoverRoute, RoverMap } from './RoverMap'
import './station-lab.css'

export type Draft = { choice: StationChoice; bed: Bed; settings: PlanSettings }

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
            <Gauge label="Growth" value={plant.growth} max={plantLimit} color="sage" />
            {(forecast.health !== plant.health || forecast.growth !== plant.growth) && <p className="plant-forecast">
              Preview · {forecast.health}/{plantLimit} health · {forecast.growth}/{plantLimit} growth
            </p>}
          </div>
        })}</div>
      </section>)}
    </div>
  </div>
}

function SolarGrid({ state, bonus }: { state: Colony; bonus?: number }) {
  const [bank, setBank] = useState(0)
  const output = panelOutput(state)
  return <>
    <div className="lab-summary"><Icon name={colonyFrame(state).sunlit ? 'sun' : 'moon'} /><b>{sunlight(state)} battery · NASA frame {colonyFrame(state).frame}</b></div>
    <div className="solar-banks" aria-label="Solar panel banks">
      {output.map((power, index) => <button key={index} className="station-button" aria-pressed={bank === index} onClick={() => setBank(index)}>
        <i aria-hidden="true" /><b>Bank {index + 1}</b><small>{power} power</small>
      </button>)}
    </div>
    <p className="lab-note">Bank {bank + 1} · {output[bank] ? 'Producing power' : 'In shadow'}. {bonus
      ? `Array output after maintenance · +${bonus} per sunlit watch` : 'Life support uses up to 3 battery each watch.'}</p>
  </>
}

const stationNames: Record<SiteId, [UiIcon, string]> = {
  power: ['sun', 'Solar grid'], garden: ['plant', 'Greenhouse'], shelter: ['shield', 'Storm shelter'], rover: ['rover', 'Rover routes'],
  radio: ['radio', 'Earth relay'], air: ['air', 'Oxygen plant'], kit: ['target', 'Field instruments'], lander: ['lander', 'Landing radar'],
}

function StationReadout({ state, after, site, choice, settings, setBearing }: {
  state: Colony; after: Colony; site: SiteId; choice?: StationChoice;
  settings: PlanSettings; setBearing: (value: number) => void
}) {
  if (site === 'power') return <SolarGrid state={state} bonus={choice?.service} />
  if (site === 'shelter') {
    const pods = choice?.id === 'pods' ? settings.level ?? 2 : choice?.id === 'one-pod' ? 1 : 0
    return <div className="lab-diagram">
      <div className="lab-summary"><Icon name="shield" /><b>Shield coverage</b><span>{pods}/2 gaps covered by this plan</span></div>
      <div className="shield-sections">{[0, 1].map((index) => <span data-covered={index < pods} key={index}><Icon name={index < pods ? 'water' : 'storm'} />{index < pods ? 'Pod in place' : 'Open gap'}</span>)}</div>
      <Gauge label="Crew exposure after this watch" color="coral" value={after.exposure} max={capacity.exposure} />
    </div>
  }
  if (site === 'rover') return <p className="lab-note">{choice?.detail ?? 'Pip’s electric rover carries samples and equipment.'}</p>
  if (site === 'radio') {
    const bearing = settings.bearing ?? 44
    const signal = choice?.transmit ? signalStrength(choice, settings) : 0
    return <div className="lab-diagram">
      <div className="lab-summary"><Icon name="radio" /><b>{signal >= 82 ? 'Earth signal locked' : 'Sweep for Earth'}</b></div>
      <Gauge label="Signal strength" color="sage" value={signal} max={100} />
      {choice?.transmit && <><label htmlFor="lab-bearing">Antenna angle · {bearing}°</label>
        <input id="lab-bearing" type="range" min="0" max="100" value={bearing} onChange={(event) => setBearing(Number(event.currentTarget.value))} />
        <button className="station-button" onClick={() => setBearing(72)}>Auto-align dish</button></>}
      <p className="lab-note">Moon to Earth and back · 2.56 seconds. {state.contact ? 'Earth has a previous update.' : 'Earth is waiting for its first update.'}</p>
    </div>
  }
  if (site === 'air') return <div className="lab-diagram">
    <div className="lab-summary"><Icon name="air" /><b>Backup oxygen tanks</b></div>
    <div className="oxygen-cells" aria-hidden="true">{Array.from({ length: capacity.oxygen }, (_, i) => <i key={i} data-fill={i < state.oxygen} data-preview={i < after.oxygen} />)}</div>
    <Gauge label="Projected reserve" color="sage" value={after.oxygen} max={capacity.oxygen} />
  </div>
  if (site === 'kit') return <div className="lab-diagram">
    <div className="lab-summary"><Icon name={choice?.id === 'walk' ? 'radio' : 'target'} /><b>{choice?.id === 'walk' ? 'Relay kit pickup' : 'Surface sample'}</b></div>
    <p className="lab-note">{choice?.id === 'walk' ? 'Lift the kit by hand. Your suit will use oxygen for the return trip.'
      : state.research ? 'Sample stored' : state.scanned ? 'Scan recorded' : 'Sample available · Scan it or spend suit oxygen to collect it.'}</p>
  </div>
  return <div className="lab-summary"><Icon name="lander" /><b>Landing complete · Farpoint</b></div>
}

const planIcons: Record<string, UiIcon> = {
  grow: 'plant', harvest: 'food', reserve: 'battery', 'service-array': 'sun', hide: 'shield', warn: 'radio',
  'short-warning': 'bolt', pods: 'water', stock: 'clock', drive: 'rover', 'ridge-drive': 'moon', walk: 'crew',
  'sample-drive': 'rover', 'sample-ridge': 'moon',
  sample: 'target', scan: 'console', refill: 'air', 'reserve-air': 'battery', earth: 'radio', 'handover-reserve': 'battery',
}

export function StationLab({ state, site, choices, initialDraft, onPreview, onCommit, extra }: {
  state: Colony; site: SiteId; choices: StationChoice[]; initialDraft?: Draft;
  onPreview: (draft: Draft) => void; onCommit: (draft: Draft) => void; extra?: ReactNode
}) {
  const routeMap = site === 'rover' && choices.some(({ id }) => isRoverRoute(id))
  const [id, setId] = useState(initialDraft?.choice.id ?? (routeMap ? undefined : choices[0]?.id))
  const [bed, setBed] = useState<Bed>(initialDraft?.bed ?? 0)
  const [settings, setSettings] = useState<PlanSettings>(initialDraft?.settings ?? { bearing: 44 })
  const original = choices.find((item) => item.id === id) ?? (routeMap ? undefined : choices[0])
  const choice = original && tuneChoice(state, original, settings)
  const control = original && planControl(original)
  const forecast = choice ? choose(state, choice.id, bed, settings) : state
  const [icon, name] = stationNames[site]
  const weakSignal = !!choice?.transmit && !choice.contact
  const healthDelta = forecast.plants.reduce((sum, plant, index) => sum + plant.health - state.plants[index].health, 0)
  const growthDelta = forecast.plants.reduce((sum, plant, index) => sum + plant.growth - state.plants[index].growth, 0)
  function select(option: StationChoice, targetBed: Bed, nextSettings: PlanSettings) {
    setId(option.id)
    setBed(targetBed)
    setSettings(nextSettings)
    onPreview({ choice: option, bed: targetBed, settings: nextSettings })
  }
  function pick(option: StationChoice) {
    select(option, bed, option.id === id ? settings : { bearing: settings.bearing })
  }
  const alternativePlans = choices.filter((option) => !routeMap || !isRoverRoute(option.id))
  const planButtons = alternativePlans.map((option) => <button className="station-button" key={option.id}
    aria-pressed={id === option.id} onClick={() => pick(option)}>
    <Icon name={planIcons[option.id] ?? 'console'} size={17} />{option.title}
  </button>)
  return <section className="station-lab" aria-label={name + ' console'}>
    <h2><Icon name={icon} size={22} />{name}</h2>
    {routeMap && <RoverMap choices={choices} selected={id} onSelect={pick} />}
    {!!planButtons.length && (routeMap ? <details><summary>Other plans</summary><div className="lab-options">{planButtons}</div></details>
      : <div className="lab-options" role="group" aria-label="Compare plans">{planButtons}</div>)}
    {original && control && <div className="lab-control">
      <label htmlFor="lab-level"><Icon name={planIcons[original.id] ?? 'bolt'} size={18} />{control.label}
        <output htmlFor="lab-level">{settings.level ?? control.value} {control.unit}</output>
      </label>
      <input id="lab-level" type="range" min={control.min} max={control.max} value={settings.level ?? control.value}
        onChange={(event) => select(original, bed, { ...settings, level: Number(event.currentTarget.value) })} />
      {site === 'garden' && original.greenhouse && <label className="mist-switch">
        <input type="checkbox" checked={settings.mist ?? !!original.greenhouse.water}
          onChange={(event) => select(original, bed, { ...settings, mist: event.currentTarget.checked })} />
        <Icon name="water" size={17} />Mist roots <span>1 battery</span>
      </label>}
    </div>}
    {site !== 'garden' && (!routeMap || choice) && <StationReadout state={state} after={forecast} site={site} choice={choice} settings={settings}
      setBearing={(value) => { if (original) select(original, bed, { ...settings, bearing: value }) }} />}
    {site === 'garden' && <Greenhouse state={state} next={forecast} bed={bed}
      selectBed={(value) => { if (original) select(original, value, settings); else setBed(value) }} />}
    {choice && original && <div className="lab-forecast">
        <h3><Icon name="bolt" size={18} />After this task <span>{choice.cost} battery cost</span></h3>
        {forecast === state ? <strong>Battery too low. Oxygen gets power first.</strong> : <>
          <div className="lab-deltas" aria-label="Resource changes">
            {forecast.oxygen !== state.oxygen && <Delta icon="air" label="Oxygen" value={forecast.oxygen - state.oxygen} />}
            {forecast.exposure !== state.exposure && <Delta icon="shield" label="Exposure" value={forecast.exposure - state.exposure} inverse />}
            {forecast.food > state.food && <Delta icon="food" label="Meals added" value={forecast.food - state.food} />}
            {harvestCount(forecast) !== harvestCount(state) && <Delta icon="plant" label="Ready to harvest" value={harvestCount(forecast) - harvestCount(state)} />}
            {choice.greenhouse && <Delta icon="sun" label="Bed growth" value={growthDelta} />}
            {!!healthDelta && <Delta icon="water" label="Bed health" value={healthDelta} />}
            {forecast.contact && !state.contact && <span className="lab-delta" data-tone="gain"><Icon name="radio" size={16} />Earth notified</span>}
            {forecast.research && !state.research && <span className="lab-delta" data-tone="gain"><Icon name="target" size={16} />Sample recovered</span>}
          </div>
          <div className="lab-totals"><span>{forecast.power} battery left</span><span>{forecast.food} meals left</span></div>
          {forecast.node !== 'report' && forecast.power + sunlight(forecast) < 3 &&
            <p className="decision-danger">Backup oxygen needed next watch.</p>}
          {forecast.missedMeal ? <p className="decision-danger">No meals left. This ends the shift.</p>
            : forecast.oxygen === 0 || forecast.exposure === capacity.exposure ? <p className="decision-danger">This hits a safety limit and ends the shift.</p>
              : forecast.food === 0 && forecast.node !== 'report' && <p className="decision-danger">
                {harvestCount(forecast) ? 'Harvest at the next stop.' : 'No meals or ripe crops for the next stop.'}
              </p>}
        </>}
        {weakSignal && <p className="decision-danger">Weak signal. Earth will miss this message at this setting.</p>}
        <button className="primary" disabled={forecast === state} onClick={() => onCommit({ choice: original, bed, settings })}>
          {(choice.greenhouse || choice.harvest) && site !== 'garden' ? 'Go to greenhouse' : isRoverRoute(choice.id) ? 'Drive this route' : weakSignal ? 'Send anyway' : 'Apply plan'} <Icon name="arrow" size={18} />
        </button>
        {site !== 'rover' && <details><summary>Plan details</summary><p>{choice.detail} The crew uses one meal each watch.</p></details>}
    </div>}
    {extra}
  </section>
}
