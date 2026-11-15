import type { StationChoice } from '../colony'

const directIds = ['drive', 'sample-drive']
const ridgeIds = ['ridge-drive', 'sample-ridge']
export const isRoverRoute = (id: string) => directIds.includes(id) || ridgeIds.includes(id)

export function RoverMap({ choices, selected, onSelect }: {
  choices: StationChoice[]; selected?: string; onSelect: (choice: StationChoice) => void
}) {
  const direct = choices.find(({ id }) => directIds.includes(id))
  const ridge = choices.find(({ id }) => ridgeIds.includes(id))
  const research = !!direct?.research || !!ridge?.research
  const lines = [
    { name: 'Direct', choice: direct, path: 'M44 104 C108 100 219 109 333 79', className: 'route-direct' },
    { name: 'Ridge', choice: ridge, path: 'M44 104 C88 79 109 39 180 31 S280 36 333 79', className: 'route-ridge' },
  ]
  return <div className="rover-plan">
    <p>Tap a route on the map.</p>
    <div className="rover-map" role="group" aria-label="Choose rover route">
      <svg viewBox="0 0 380 150" aria-hidden="true">
        <path className="rover-contour" d="M97 0C104 58 140 37 153 3M79 0C90 77 151 59 173 2M57 0C65 92 161 79 191 2M291 150C282 108 337 111 380 122M273 150C263 102 328 98 380 107" />
        <path className="rover-return" d="M333 79Q345 111 306 131H247" />
        {lines.map(({ name, choice, path }) => choice && <g key={name} data-selected={selected === choice.id}>
          <path className="rover-line" d={path} />
          <path className="rover-hit" d={path} onClick={() => onSelect(choice)} />
        </g>)}
        <circle cx="44" cy="104" r="4" /><circle cx="333" cy="79" r="4" /><circle cx="247" cy="131" r="3" />
        <text x="44" y="126" textAnchor="middle">Rover</text>
        <text x="361" y="66" textAnchor="end">{research ? 'Sample' : 'Relay kit'}</text>
        <text x="238" y="137" textAnchor="end">Shelter</text>
      </svg>
      {lines.map(({ name, choice, className }) => choice && <button key={name} className={'rover-map-pin ' + className}
        aria-pressed={selected === choice.id} onClick={() => onSelect(choice)}>
        {name} <small>{choice.cost} battery</small>
      </button>)}
    </div>
  </div>
}
