import { frames } from './mission.ts'

export const landingSites = {
  ridge: { name: 'High ridge', frame: 0, power: 14, cover: 0, description: 'Catch two sunlit watches before the shadow. The exposed ridge gives the crew less natural cover.' },
  basin: { name: 'Crater rim', frame: 1, power: 16, cover: 1, description: 'Start with more battery and shelter cover. Shadow arrives after the first watch.' },
} as const

export const modules = [
  { name: 'Solar array', icon: 'sun', near: 'At the habitat', far: 'On the exposed ridge', gain: 'Makes 2 extra power in sunlight' },
  { name: 'Storm shelter', icon: 'shield', near: 'North of the habitat', far: 'Behind the crater wall', gain: 'Blocks 1 extra exposure point during the storm' },
  { name: 'Earth relay', icon: 'radio', near: 'South of the habitat', far: 'On the east crater rim', gain: 'Uses its own cell for the warning. Costs 1 less power to call Earth' },
] as const

export type LandingSite = keyof typeof landingSites
export type Layout = [boolean, boolean, boolean]
type Node = 'budget' | 'warning' | 'shelter' | 'relay' | 'research' | 'repair' | 'handover' | 'report'
export type Reading = 'power' | 'oxygen' | 'exposure'
export const capacity = { power: 24, oxygen: 8, exposure: 5 }
export const beds = ['Bed A', 'Bed B'] as const
export type Bed = 0 | 1
export type Plant = { health: number; growth: number }
export const plantLimit = 5
export type Colony = {
  site: LandingSite
  layout: Layout
  watch: number
  node: Node
  power: number
  oxygen: number
  exposure: number
  crop: number
  contact: boolean
  research: boolean
  scanned: boolean
  servicedArray: boolean
  plants: Plant[]
  log: { title: string; detail: string; delta: Record<Reading, number> }[]
}

type Choice = {
  id: string
  title: string
  detail: string
  next: Node
  cost: number
  oxygen?: number
  exposure?: number
  crop?: number
  contact?: boolean
  research?: boolean
  transmit?: boolean
  service?: boolean
  scan?: boolean
  greenhouse?: { light: number; water?: boolean }
}

export const briefings: Record<Node, { title: string; prompt: string }> = {
  budget: { title: 'Charge or grow?', prompt: 'The air machine has first claim on the battery. The lettuce is nearly ready. How much power can you risk before the shadow arrives?' },
  warning: { title: 'Particles from the Sun', prompt: 'A solar particle alert just came in. We can warn Earth from the relay or go straight to shelter. Staying outside increases exposure.' },
  shelter: { title: 'Seal the shelter', prompt: 'Thick shielding helps stop fast particles. Use the battery to move more shielding into place or give up oxygen from a spare tank to keep the crew inside longer.' },
  relay: { title: 'The relay is outside', prompt: 'Your warning reached Earth. The crew can bring the equipment indoors quickly with a powered rover or cross the ridge on foot and take more exposure.' },
  research: { title: 'One chance to collect data', prompt: 'The storm has passed. A short trip could secure a rock sample, but the suit uses oxygen you may need at handover.' },
  repair: { title: 'The air machine needs attention', prompt: 'If you spend battery to refill the reserve now, there will be less for the call home. You can also stretch the reserve with the backup kit.' },
  handover: { title: 'Your last call', prompt: 'The next crew needs your status. Decide whether to use the remaining power on an Earth call or finish growing food for the incoming crew.' },
  report: { title: 'Flight log', prompt: '' },
}

export function startColony(site: LandingSite, layout: Layout): Colony {
  return { site, layout, watch: 0, node: 'budget', power: landingSites[site].power - layout.filter(Boolean).length * 2,
    oxygen: 6, exposure: 0, crop: 0, contact: false, research: false, scanned: false, servicedArray: false,
    plants: [{ health: 5, growth: 3 }, { health: 4, growth: 2 }, { health: 4, growth: 3 },
      { health: 2, growth: 3 }, { health: 3, growth: 4 }, { health: 2, growth: 4 }], log: [] }
}

export function colonyFrame(state: Colony) {
  return frames[Math.min(landingSites[state.site].frame + state.watch, frames.length - 1)]
}

export function sunlight(state: Colony) {
  return colonyFrame(state).sunlit ? (state.layout[0] ? 8 : 6) + Number(state.servicedArray) : 0
}

export function panelOutput(state: Colony) {
  const total = sunlight(state)
  return Array.from({ length: 4 }, (_, index) => Math.floor(total / 4) + Number(index < total % 4))
}

export function harvestCount(state: Colony) {
  return state.plants.filter(({ health, growth }) => health >= 3 && growth === plantLimit).length
}

const greenhouse = (next: Node): Choice[] => [
  { id: 'grow', title: 'Full grow lights', detail: 'Push the selected bed toward harvest. Stressed plants lose health under full light.', cost: 4, crop: 2, greenhouse: { light: 4 }, next },
  { id: 'dim-grow', title: 'Gentle grow lights', detail: 'Advance the selected bed by one growth step. Plant health stays steady.', cost: 2, crop: 1, greenhouse: { light: 2 }, next },
  { id: 'mist', title: 'Mist the roots', detail: 'Give the selected bed two health points. The plants use this watch to recover.', cost: 1, greenhouse: { light: 0, water: true }, next },
  { id: 'balanced', title: 'Light and mist', detail: 'Advance one growth step and give the selected bed two health points.', cost: 3, crop: 1, greenhouse: { light: 2, water: true }, next },
]

export function options(state: Colony): Choice[] {
  const cover = landingSites[state.site].cover + Number(state.layout[1])
  const radioCost = state.layout[2] ? 2 : 3
  switch (state.node) {
    case 'budget': return [
      { id: 'reserve', title: 'Save for shadow', detail: 'Keep today’s power for the air machine. The crop waits.', next: 'warning', cost: 0 },
      { id: 'service-array', title: 'Clean the solar panels', detail: 'Spend 2 battery on maintenance. The array makes one extra battery during each subsequent sunlit watch.', next: 'warning', cost: 2, service: true },
      ...greenhouse('warning'),
    ]
    case 'warning': return [
      { id: 'hide', title: 'Move the crew inside', detail: 'Take cover early. The next job will be reinforcing the shelter.', next: 'shelter', cost: 1, exposure: Math.max(0, 1 - cover) },
      { id: 'warn', title: 'Send a storm warning', detail: 'Warn Earth while you can. Staying outside increases exposure and leaves the relay to recover.', next: 'relay', cost: state.layout[2] ? 0 : 2, exposure: Math.max(1, 3 - cover), contact: true, transmit: true },
      { id: 'short-warning', title: 'Send a short beacon', detail: 'Send an automated warning from cover. It takes one battery and one oxygen to set up.', next: 'shelter', cost: 1, oxygen: -1, exposure: Math.max(0, 1 - cover), contact: true, transmit: true },
    ]
    case 'shelter': return [
      { id: 'pods', title: 'Raise the water wall', detail: 'Spend 3 battery to block this watch’s exposure. You can collect a sample later.', next: 'research', cost: 3 },
      { id: 'one-pod', title: 'Raise one water pod', detail: 'Spend 2 battery to cover one gap. The remaining gap admits up to one training point.', next: 'research', cost: 2, exposure: Math.max(0, 1 - cover) },
      { id: 'stock', title: 'Wait out the storm', detail: 'Use a spare oxygen unit so the crew can wait in cover. Any remaining exposure counts.', next: 'repair', cost: 0, oxygen: -1, exposure: Math.max(0, 2 - cover) },
    ]
    case 'relay': return [
      { id: 'drive', title: 'Retrieve the relay by rover', detail: 'Spend 3 battery for a quicker trip. The crew gets the radio back before the next watch.', next: 'research', cost: 3, exposure: Math.max(0, 1 - cover) },
      { id: 'walk', title: 'Carry the relay back', detail: 'Save battery. A longer trip uses suit oxygen and exposes the crew to more particles.', next: 'repair', cost: 0, oxygen: -1, exposure: Math.max(1, 3 - cover) },
      { id: 'ridge-drive', title: 'Sprint along the ridge', detail: 'Use extra battery on the steep shortcut. The crew completes the recovery without gaining exposure.', next: 'research', cost: 5 },
    ]
    case 'research': return [
      { id: 'sample', title: 'Collect a rock sample', detail: 'Use 2 oxygen and 1 battery to secure a sample for the next crew.', next: 'handover', cost: 1, oxygen: -2, research: true },
      { id: 'scan', title: 'Scan from cover', detail: 'Use 2 battery to record the rock from a distance. Your suit oxygen stays in reserve.', next: 'handover', cost: 2, scan: true },
      ...greenhouse('handover'),
    ]
    case 'repair': return [
      { id: 'refill', title: 'Refill the oxygen tank', detail: 'Use 3 battery to add up to 3 oxygen to the crew’s reserve.', next: 'handover', cost: 3, oxygen: 3 },
      { id: 'top-up', title: 'Run a short refill', detail: 'Use one battery to recover up to two oxygen units. Save the rest for the antenna.', next: 'handover', cost: 1, oxygen: 2 },
      { id: 'reserve-air', title: 'Open the backup canister', detail: 'Recover one oxygen unit using the last disposable canister. The crop stays where it is.', next: 'handover', cost: 0, oxygen: 1 },
    ]
    case 'handover': return [
      { id: 'earth', title: 'Call Mission Control', detail: `Spend ${radioCost} battery. Your crew waits for the signal to reach Earth and return.`, next: 'report', cost: radioCost, contact: true, transmit: true },
      { id: 'handover-reserve', title: 'Keep the battery for the next crew', detail: 'Leave the remaining power in reserve. Earth works with its last update.', next: 'report', cost: 0 },
      ...greenhouse('report'),
    ]
    default: return []
  }
}

export function choose(state: Colony, id: string, bed: Bed = 0): Colony {
  const choice = options(state).find((option) => option.id === id)
  const input = state.power + sunlight(state)
  const airDraw = input >= 3 ? 3 : 0
  if (!choice && (id !== 'safe-mode' || state.node === 'report')) return state
  if (choice && choice.cost > input - airDraw) return state
  const power = Math.min(capacity.power, input - airDraw - (choice?.cost ?? 0))
  const oxygen = Math.min(capacity.oxygen, Math.max(0, state.oxygen - (airDraw ? 0 : 2) + (choice?.oxygen ?? 0)))
  const storm = state.node === 'warning' || state.node === 'shelter' || state.node === 'relay'
  const exposureChange = choice ? (choice.exposure ?? 0) : storm ? 2 : 0
  const exposure = Math.min(capacity.exposure, state.exposure + exposureChange)
  const unsafe = oxygen === 0 || exposure === capacity.exposure
  const treatment = choice?.greenhouse
  const plants = treatment ? state.plants.map((plant, index) => {
    if (Math.floor(index / 3) !== bed) return plant
    const health = Math.max(1, Math.min(plantLimit, plant.health + (treatment.water ? 2 : treatment.light === 4 && plant.health < 4 ? -1 : 0)))
    return { health, growth: Math.min(plantLimit, plant.growth + (health >= 2 ? (choice?.crop ?? 0) : 0)) }
  }) : state.plants
  return { ...state, watch: state.watch + 1, node: unsafe ? 'report' : choice?.next ?? 'report', power, oxygen, exposure, plants,
    scanned: state.scanned || !!choice?.scan, servicedArray: state.servicedArray || !!choice?.service,
    crop: state.crop + (choice?.crop ?? 0), contact: state.contact || !!choice?.contact, research: state.research || !!choice?.research,
    log: [...state.log, { title: choice?.title ?? 'End the shift early',
      detail: `${sunlight(state) ? 'Sunlight added ' + sunlight(state) + ' battery.' : 'The arrays were in shadow.'} ${airDraw ? 'The air machine used 3 battery.' : 'The crew used 2 backup oxygen.'}${treatment ? ' Treatment applied to ' + beds[bed] + '.' : ''}`,
      delta: { power: power - state.power, oxygen: oxygen - state.oxygen, exposure: exposure - state.exposure } }],
  }
}
