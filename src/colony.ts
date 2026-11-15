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
export type Reading = 'power' | 'oxygen' | 'exposure' | 'food'
export const capacity = { power: 24, oxygen: 8, exposure: 5, food: 8 }
const installationBase = [2, 2, 1]
export const installationCost = (part: number, outer: boolean) => installationBase[part] + (outer ? 2 : 0)
export const setupPower = (site: LandingSite, layout: readonly (boolean | null)[]) =>
  landingSites[site].power - layout.reduce((cost, outer, part) => cost + (outer == null ? 0 : installationCost(part, outer)), 0)
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
  food: number
  missedMeal: boolean
  crop: number
  contact: boolean
  research: boolean
  scanned: boolean
  arrayBonus: number
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
  service?: number
  scan?: boolean
  greenhouse?: { light: number; water?: boolean }
  harvest?: boolean
}
export type PlanSettings = { level?: number; mist?: boolean; bearing?: number }
export type StationChoice = Choice

export const briefings: Record<Node, { title: string; prompt: string }> = {
  budget: { title: 'Charge or grow?', prompt: 'The air machine has first claim on the battery. The lettuce is nearly ready. How much power can you risk before the shadow arrives?' },
  warning: { title: 'Storm incoming', prompt: 'Solar particles are on the way. Warn Earth or head straight to shelter. Every second outside adds exposure.' },
  shelter: { title: 'Seal the shelter', prompt: 'The first wave passed. Raise water pods or spend spare oxygen waiting out the remaining radiation.' },
  relay: { title: 'The relay is outside', prompt: 'Earth got your warning. Recover the relay before the next wave. A faster rover uses more power.' },
  research: { title: 'One chance to collect data', prompt: 'The storm has passed. A short trip could secure a rock sample, but the suit uses oxygen you may need at handover.' },
  repair: { title: 'The air machine needs attention', prompt: 'If you spend battery to refill the reserve now, there will be less for the call home. You can also stretch the reserve with the backup kit.' },
  handover: { title: 'Your last call', prompt: 'The next crew needs your status. Decide whether to use the remaining power on an Earth call or finish growing food for the incoming crew.' },
  report: { title: 'Flight log', prompt: '' },
}

export function startColony(site: LandingSite, layout: Layout): Colony {
  return { site, layout, watch: 0, node: 'budget', power: setupPower(site, layout),
    oxygen: 6, exposure: 0, food: 4, missedMeal: false, crop: 0, contact: false, research: false, scanned: false, arrayBonus: 0,
    plants: [{ health: 5, growth: 3 }, { health: 4, growth: 2 }, { health: 4, growth: 3 },
      { health: 2, growth: 3 }, { health: 3, growth: 4 }, { health: 2, growth: 4 }], log: [] }
}

export function colonyFrame(state: Colony) {
  return frames[Math.min(landingSites[state.site].frame + state.watch, frames.length - 1)]
}

export function sunlight(state: Colony) {
  return colonyFrame(state).sunlit ? (state.layout[0] ? 8 : 6) + state.arrayBonus : 0
}

export function panelOutput(state: Colony) {
  const total = sunlight(state)
  return Array.from({ length: 4 }, (_, index) => Math.floor(total / 4) + Number(index < total % 4))
}

export function harvestCount(state: Colony) {
  return state.plants.filter(({ health, growth }) => health >= 3 && growth === plantLimit).length
}

const greenhouse = (state: Colony, next: Node): Choice[] => [
  { id: 'grow', title: 'Set grow lights', detail: 'Spend battery on light. Weak light stalls growth. Strong light can stress dry plants.', cost: 4, crop: 2, greenhouse: { light: 4 }, next },
  { id: 'dim-grow', title: 'Gentle grow lights', detail: 'Advance the selected bed by one growth step. Plant health stays steady.', cost: 2, crop: 1, greenhouse: { light: 2 }, next },
  { id: 'mist', title: 'Mist the roots', detail: 'Give the selected bed two health points. The plants use this watch to recover.', cost: 1, greenhouse: { light: 0, water: true }, next },
  { id: 'balanced', title: 'Light and mist', detail: 'Advance one growth step and give the selected bed two health points.', cost: 3, crop: 1, greenhouse: { light: 2, water: true }, next },
  ...(harvestCount(state) ? [{ id: 'harvest', title: 'Harvest lettuce', detail: 'Use one battery to pack the harvest. Each ready plant adds two food units.', cost: 1, harvest: true, next }] : []),
]

export function options(state: Colony): Choice[] {
  const cover = landingSites[state.site].cover + Number(state.layout[1])
  const radioCost = state.layout[2] ? 2 : 3
  switch (state.node) {
    case 'budget': return [
      { id: 'reserve', title: 'Save for shadow', detail: 'Keep today’s power for the air machine. The crop waits.', next: 'warning', cost: 0 },
      { id: 'service-array', title: 'Service the solar array', detail: 'Spend idle power on maintenance for the next sunlit watch.', next: 'warning', cost: 2, service: 1 },
      ...greenhouse(state, 'warning'),
    ]
    case 'warning': return [
      { id: 'hide', title: 'Move the crew inside', detail: 'Take cover early. The next job will be reinforcing the shelter.', next: 'shelter', cost: 1, exposure: Math.max(0, 1 - cover) },
      { id: 'warn', title: 'Send a storm warning', detail: 'Warn Earth while you can. Staying outside increases exposure and leaves the relay to recover.', next: 'relay', cost: state.layout[2] ? 0 : 2, exposure: Math.max(1, 3 - cover), contact: true, transmit: true },
      { id: 'short-warning', title: 'Send a short beacon', detail: 'Send a short automated warning and retreat quickly. Setting up uses one oxygen.', next: 'shelter', cost: 1, oxygen: -1, exposure: Math.max(0, 1 - cover), contact: true, transmit: true },
    ]
    case 'shelter': return [
      { id: 'pods', title: 'Raise the water wall', detail: 'Spend 3 battery to block this watch’s exposure. You can collect a sample later.', next: 'research', cost: 3 },
      { id: 'one-pod', title: 'Raise one water pod', detail: 'Spend 2 battery to cover one gap. The remaining gap admits up to one training point.', next: 'research', cost: 2, exposure: Math.max(0, 1 - cover) },
      { id: 'stock', title: 'Wait out the storm', detail: 'Use a spare oxygen unit so the crew can wait in cover. Any remaining exposure counts.', next: 'repair', cost: 0, oxygen: -1, exposure: Math.max(0, 2 - cover) },
    ]
    case 'relay': return [
      { id: 'drive', title: 'Retrieve the relay by rover', detail: 'Spend 3 battery for a quicker trip. The crew gets the radio back before the next watch.', next: 'research', cost: 3, exposure: Math.max(0, 1 - cover) },
      { id: 'walk', title: 'Carry the relay back', detail: 'Save battery. A longer trip uses suit oxygen and exposes the crew to more particles.', next: 'repair', cost: 0, oxygen: -1, exposure: Math.max(1, 3 - cover) },
      { id: 'ridge-drive', title: 'Cross the ridge by rover', detail: 'The ridge route uses extra power. At full throttle the crew gains no exposure on the trip.', next: 'research', cost: 5 },
    ]
    case 'research': return [
      { id: 'sample', title: 'Collect a rock sample', detail: 'Use 2 oxygen and 1 battery to secure a sample for the next crew.', next: 'handover', cost: 1, oxygen: -2, research: true },
      { id: 'scan', title: 'Scan from cover', detail: 'Use 2 battery to record the rock from a distance. Your suit oxygen stays in reserve.', next: 'handover', cost: 2, scan: true },
      ...greenhouse(state, 'handover'),
    ]
    case 'repair': return [
      { id: 'refill', title: 'Refill the oxygen tank', detail: 'Use 3 battery to add up to 3 oxygen to the crew’s reserve.', next: 'handover', cost: 3, oxygen: 3 },
      { id: 'top-up', title: 'Run a short refill', detail: 'Use one battery to recover one oxygen. Save the rest for the antenna.', next: 'handover', cost: 1, oxygen: 1 },
      { id: 'reserve-air', title: 'Open the backup canister', detail: 'Recover one oxygen unit using the last disposable canister. The crop stays where it is.', next: 'handover', cost: 0, oxygen: 1 },
    ]
    case 'handover': return [
      { id: 'earth', title: 'Call Mission Control', detail: `Spend ${radioCost} battery. Your crew waits for the signal to reach Earth and return.`, next: 'report', cost: radioCost, contact: true, transmit: true },
      { id: 'handover-reserve', title: 'Keep the battery for the next crew', detail: 'Leave the remaining power in reserve. Earth works with its last update.', next: 'report', cost: 0 },
      ...greenhouse(state, 'report'),
    ]
    default: return []
  }
}

export function planControl(choice: Choice) {
  if (choice.greenhouse) return { label: 'Grow-light power', min: 0, max: 8, value: choice.greenhouse.light, unit: 'battery' }
  if (choice.transmit) return { label: 'Transmit power', min: 1, max: 5, value: 3, unit: 'level' }
  if (choice.service) return { label: 'Maintenance power', min: 1, max: 3, value: choice.cost, unit: 'battery' }
  if (choice.id === 'pods') return { label: 'Water pods to raise', min: 0, max: 2, value: 2, unit: 'pods' }
  if (choice.id === 'drive' || choice.id === 'ridge-drive') return { label: 'Rover drive power', min: choice.id === 'drive' ? 1 : 3, max: choice.id === 'drive' ? 3 : 5, value: choice.cost, unit: 'battery' }
  if (choice.id === 'refill') return { label: 'Refill power', min: 1, max: 5, value: choice.cost, unit: 'battery' }
}

export function signalStrength(choice: Choice, settings: PlanSettings = {}) {
  const level = settings.level ?? 3
  const angleError = Math.abs((settings.bearing ?? 72) - 72)
  return Math.max(0, Math.min(100, 42 + level * (choice.id === 'short-warning' ? 17 : 15) - angleError * 3))
}

export function tuneChoice(state: Colony, choice: Choice, settings: PlanSettings = {}): Choice {
  const control = planControl(choice)
  if (!control) return choice
  const desired = settings.level
  const level = typeof desired === 'number' && Number.isFinite(desired)
    ? Math.max(control.min, Math.min(control.max, Math.round(desired))) : control.value
  const cover = landingSites[state.site].cover + Number(state.layout[1])
  if (choice.greenhouse) {
    const water = settings.mist ?? !!choice.greenhouse.water
    return { ...choice, greenhouse: { light: level, water }, cost: level + Number(water),
      crop: level >= 7 ? 3 : level >= 4 ? 2 : level >= 2 ? 1 : 0 }
  }
  if (choice.transmit) {
    const contact = signalStrength(choice, { ...settings, level }) >= 82
    return { ...choice, contact, cost: Math.max(0, choice.cost + level - 3),
      exposure: choice.exposure === undefined ? undefined : choice.exposure + Number(level < 3),
      next: choice.id === 'warn' && !contact ? 'shelter' : choice.next }
  }
  if (choice.service) return { ...choice, cost: level, service: level + 1 }
  if (choice.id === 'pods') return { ...choice, cost: [0, 2, 3][level],
    oxygen: level === 0 ? -1 : 0, exposure: Math.max(0, 2 - level - cover) }
  if (choice.id === 'refill') return { ...choice, cost: level, oxygen: level }
  return { ...choice, cost: level, exposure: Math.max(0, (choice.id === 'ridge-drive' ? 5 : 4) - level - cover),
    next: level < 3 ? 'repair' : choice.next }
}

export function choose(state: Colony, id: string, bed: Bed = 0, settings?: PlanSettings): Colony {
  const option = options(state).find((candidate) => candidate.id === id)
  const choice = option && tuneChoice(state, option, settings)
  const input = state.power + sunlight(state)
  const airDraw = input >= 3 ? 3 : 0
  if (!choice && (id !== 'safe-mode' || state.node === 'report')) return state
  if (choice && choice.cost > input - airDraw) return state
  const power = Math.min(capacity.power, input - airDraw - (choice?.cost ?? 0))
  const oxygen = Math.min(capacity.oxygen, Math.max(0, state.oxygen - (airDraw ? 0 : 2) + (choice?.oxygen ?? 0)))
  const storm = state.node === 'warning' || state.node === 'shelter' || state.node === 'relay'
  const exposureChange = choice ? (choice.exposure ?? 0) : storm ? 2 : 0
  const exposure = Math.min(capacity.exposure, state.exposure + exposureChange)
  const treatment = choice?.greenhouse
  const harvest = choice?.harvest ? harvestCount(state) : 0
  const meals = Math.min(capacity.food, state.food + harvest * 2)
  const missedMeal = meals === 0
  const food = Math.max(0, meals - 1)
  const unsafe = oxygen === 0 || exposure === capacity.exposure || missedMeal
  const plants = harvest ? state.plants.map((plant) => plant.health >= 3 && plant.growth === plantLimit ? { ...plant, growth: 0 } : plant)
    : treatment ? state.plants.map((plant, index) => {
    if (Math.floor(index / 3) !== bed) return plant
    const heatStress = treatment.light >= 4 && plant.health < 4 ? (treatment.light >= 7 ? 2 : 1) : 0
    const health = Math.max(1, Math.min(plantLimit, plant.health + (treatment.water ? 2 : 0) - (treatment.water ? 0 : heatStress)))
    return { health, growth: Math.min(plantLimit, plant.growth + (health >= 2 ? (choice?.crop ?? 0) : 0)) }
  }) : state.plants
  return { ...state, watch: state.watch + 1, node: unsafe ? 'report' : choice?.next ?? 'report', power, oxygen, exposure, food, missedMeal, plants,
    scanned: state.scanned || !!choice?.scan, arrayBonus: Math.max(state.arrayBonus, choice?.service ?? 0),
    crop: state.crop + (choice?.crop ?? 0), contact: state.contact || !!choice?.contact, research: state.research || !!choice?.research,
    log: [...state.log, { title: choice?.title ?? 'End the shift early',
      detail: `${sunlight(state) ? 'Sunlight added ' + sunlight(state) + ' battery.' : 'The arrays were in shadow.'} ${airDraw ? 'The air machine used 3 battery.' : 'The crew used 2 backup oxygen.'}${treatment ? ' Treatment applied to ' + beds[bed] + '.' : ''}${harvest ? ' Harvest packed.' : ''} ${missedMeal ? 'Food ran out and the crew ended the shift.' : 'Crew ate one meal.'}${choice?.transmit && !choice.contact ? ' Signal too weak. Earth received no update.' : ''}`,
      delta: { power: power - state.power, oxygen: oxygen - state.oxygen, exposure: exposure - state.exposure, food: food - state.food } }],
  }
}
