import { useEffect, useRef } from 'react'
import { capacity, harvestCount, landingSites, modules, rateOutpost } from '../colony'
import type { Colony } from '../colony'
import { Icon } from './Icon'

export function ColonyReport({ state, onRetry, onExit }: { state: Colony; onRetry: () => void; onExit: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    window.scrollTo({ top: 0 })
    heading.current?.focus({ preventScroll: true })
  }, [])
  const safe = state.oxygen > 0 && state.exposure < capacity.exposure && !state.missedMeal
  const endedEarly = state.log.at(-1)?.title === 'End the shift early'
  const handover = safe && !endedEarly
  const provisions = state.food > 0 || harvestCount(state) > 0
  const science = state.research || state.scanned
  const { criteria, score } = rateOutpost(state)
  const note = state.missedMeal
    ? 'The crew ran out of meals. Start the lettuce earlier, then budget a watch to harvest before the last ration.'
    : !safe ? 'Keep a bigger reserve for the crew. Compare the forecast before spending battery in shadow.'
    : !provisions ? 'Plan a harvest before the last meal. Pack a ripe bed while you can still power the greenhouse.'
      : state.power < 6 ? 'Try the direct rover trail or save power before the shadow. A bigger battery reserve gives the next crew more options.'
        : !state.contact ? 'Keep power for the Earth call. Sweep the antenna until the signal locks before you send.'
          : !science ? 'With the crew safe, budget a rover trip to bring back a sample.'
            : 'You left the next crew with supplies and a working link to Earth. Try a different landing site and see which mounts you would change.'

  return <section className="colony-report" aria-labelledby="colony-report-title">
    <div className="content-width colony-report-inner">
      <button className="text-button" onClick={onExit}><Icon name="back" size={17} />Launch screen</button>
      <header className="debrief-lead">
        <div><p className="eyebrow">Mission debrief · {landingSites[state.site].name}</p>
          <h1 id="colony-report-title" ref={heading} tabIndex={-1}>{handover ? 'Farpoint stands.' : 'The crew is back.'}</h1>
          <p>{handover ? 'You’ve handed over the outpost.' : 'This shift ended early. Here’s what your crew brought back.'}</p>
        </div>
        <div className="build-rating" aria-label={`Outpost rating: ${score} out of 10`}>
          <span>Outpost rating</span><strong>{score}<small> / 10</small></strong>
        </div>
      </header>
      <div className="report-readings">
        <span><Icon name="battery" /> <strong>{state.power}</strong> Battery</span>
        <span><Icon name="air" /> <strong>{state.oxygen}</strong> Oxygen</span>
        <span><Icon name="food" /> <strong>{state.food}</strong> Meals</span>
        <span><Icon name="shield" /> <strong>{state.exposure}/{capacity.exposure}</strong> Exposure</span>
      </div>
      <div className="report-outcome">
        <section><h2>Mission Control’s note</h2><p>{note}</p>
          <ul>{modules.map((module, i) => <li key={module.name}><Icon name={module.icon} size={17} /><strong>{module.name}</strong> {state.layout[i] ? module.far : module.near}</li>)}</ul>
        </section>
        <section><h2>How your base scored</h2><ul>{criteria.map((item) => <li key={item.label}>
          {item.label}<strong>{item.points}/{item.max}</strong>
        </li>)}</ul></section>
      </div>
      <details><summary>Review your flight log</summary><ol>{state.log.map(({ title, detail }, i) => <li key={i}><strong>{title}</strong><p>{detail}</p></li>)}</ol></details>
      <button className="primary" onClick={onRetry}><Icon name="rewind" />Fly another shift</button>
    </div>
  </section>
}
