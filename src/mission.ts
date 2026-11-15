import lunar from './lunar.json' with { type: 'json' }
import { storm } from './science.ts'

export const frames = lunar.frames.map((frame) => ({ ...frame, sunlit: frame.sample >= 40 }))
export const samplePoint = { x: (lunar.x - lunar.crop.x) / lunar.crop.width * 100, y: (lunar.y - lunar.crop.y) / lunar.crop.height * 100 }

export const crew = {
  mira: { name: 'Mira', role: 'Power engineer', line: 'Keeps the solar panels and air machine running.', color: '#d0b4ff' },
  jo: { name: 'Dr. Jo', role: 'Plant scientist', line: 'Grows the crew’s first Moon salad.', color: '#aee8b3' },
  ren: { name: 'Ren', role: 'Radio operator', line: 'Sends messages between the Moon and Earth.', color: '#a9dffc' },
  pip: { name: 'Pip', role: 'Rover pilot', line: 'Drives the rover and spots problems outside.', color: '#ffc46b' },
}

export type CrewId = keyof typeof crew
export type IconName = 'sun' | 'storm' | 'radio' | 'plant' | 'air' | 'battery' | 'rover' | 'lander' | 'book' | 'sound' | 'mute' | 'play' | 'arrow' | 'rewind' | 'close' | 'check' | 'menu' | 'chevron' | 'moon' | 'shield' | 'crew' | 'globe'
type Effect = {
  power: number
  air?: number
  garden?: number
  exposure?: number
  repair?: boolean
}
export type Choice = {
  id: string
  title: string
  trade: string
  icon: IconName
  effect: Effect
  result: string
}
export type Plan =
  | number
  | { kind: 'power'; light: number; air: number }
  | { kind: 'route'; kit: boolean; rough: boolean }
  | { kind: 'shield'; pods: number }
type Turn = {
  chapter: number
  character: CrewId
  prompt: string
  choices: [Choice, Choice]
  solarAlert?: typeof storm
}
export const chapters: { name: string; summary: string; icon: IconName; color: string; object: string }[] = [
  { name: 'When the lights go out', summary: 'Share the battery between air and the garden.', icon: 'sun', color: 'amber', object: 'Solar array' },
  { name: 'Storm at the ridge', summary: 'Use the shelter while particles from the Sun pass by.', icon: 'storm', color: 'coral', object: 'Shielded shelter' },
  { name: 'Earth, do you copy?', summary: 'Send a message and bring the base back online.', icon: 'radio', color: 'sage', object: 'Earth antenna' },
]

export const turns: Turn[] = [
  { chapter: 0, character: 'mira', prompt: 'Cadet, the next crew is on its way. We promised them a working base and our first Moon salad. The ridge will block our sunlight in two turns. Help me get the power ready.', choices: [
    { id: 'store', title: 'Charge the battery', trade: 'Save 4 more power for the shadow', icon: 'battery', effect: { power: 0 }, result: 'The battery has extra power saved for the shadow.' },
    { id: 'prep-garden', title: 'Light the garden now', trade: 'Spend 4 power · gain 2 crop steps', icon: 'plant', effect: { power: 4, garden: 2 }, result: 'The lettuce is closer to harvest. You have less power saved for the shadow.' },
  ] },
  { chapter: 0, character: 'jo', prompt: 'This is our last sunlit turn. My lettuce needs one more stretch under the lights, and the air machine will run through the shadow. Check how long the battery could last either way.', choices: [
    { id: 'garden', title: 'Keep the grow lights on', trade: 'Spend 5 power · gain 2 crop steps', icon: 'plant', effect: { power: 5, garden: 2 }, result: 'Grow lights advance the crop and draw from the same grid as life support.' },
    { id: 'pause', title: 'Pause the grow lights', trade: 'Save 5 power · delay the crop', icon: 'air', effect: { power: 0 }, result: 'The lettuce can wait. Saving this power gives the air machine more time.' },
  ] },
  { chapter: 1, character: 'pip', solarAlert: storm, prompt: 'Particle alert! The Sun sent tiny, fast particles. The shelter helps block them. Do we use the powered rover to recover the repair kit, or head straight inside?', choices: [
    { id: 'shelter', title: 'Head straight to shelter', trade: 'Low exposure · repair kit stays outside', icon: 'shield', effect: { power: 0, exposure: 1 }, result: 'The crew gets behind thicker walls sooner. The repair kit stays outside.' },
    { id: 'rover', title: 'Recover the kit with Pip', trade: 'Spend 3 power · some extra exposure', icon: 'rover', effect: { power: 3, exposure: 3, repair: true }, result: 'The rover recovered the repair kit, while the loading crew spent longer outside the shield.' },
  ] },
  { chapter: 1, character: 'mira', solarAlert: storm, prompt: 'We can move spare water containers against the shelter wall. Extra material helps shield us, but the lift uses power. What can we spare?', choices: [
    { id: 'shield', title: 'Add water shielding', trade: 'Spend 4 power · lower exposure', icon: 'shield', effect: { power: 4, exposure: 0 }, result: 'Moving water cost energy. More shielding lowered the training exposure for this turn.' },
    { id: 'hold', title: 'Use the existing shelter', trade: 'Save 4 power · a little more exposure', icon: 'battery', effect: { power: 0, exposure: 2 }, result: 'The shelter still protects the team. The battery keeps the extra power for air and radio.' },
  ] },
  { chapter: 2, character: 'ren', prompt: 'The ground antenna needs a tune-up. Earth can send a more efficient plan. The signal has to cross all the way there and back.', choices: [
    { id: 'call', title: 'Ask Mission Control', trade: 'Spend up to 1 power · wait 2.56 s', icon: 'radio', effect: { power: 1, repair: true }, result: 'Earth sent a repair plan. Radio waves took 1.28 seconds each way.' },
    { id: 'local', title: 'Repair with our checklist', trade: 'Act now · use more air reserve', icon: 'book', effect: { power: 0, air: -2 }, result: 'The crew worked immediately and used two extra air reserves while checking the backup equipment.' },
  ] },
  { chapter: 2, character: 'jo', prompt: 'The sunlight is back. One last decision, Cadet. Do we finish the lettuce cycle now, or refill our backup air before the next shadow?', choices: [
    { id: 'harvest', title: 'Finish the light cycle', trade: 'Spend 4 power · gain 3 crop steps', icon: 'plant', effect: { power: 4, garden: 3 }, result: 'A full light cycle moved the plants closer to a fresh-food harvest.' },
    { id: 'refill', title: 'Refill the backup air', trade: 'Spend 3 power · store 3 air reserves', icon: 'air', effect: { power: 3, air: 3 }, result: 'You used the returning sunlight to top up the backup air supply.' },
  ] },
]

export const limits = { power: 24, air: 8, garden: 7, exposure: 5 }
export const solarPower = 8
export const airCost = 4
export type Mission = {
  turn: number
  power: number
  air: number
  garden: number
  exposure: number
  kit: boolean
  history: LogEntry[]
}
export type LogEntry = {
  plan: Plan
  choice: Choice
  applied: boolean
  airOn: boolean
  solar: number
  remaining: { power: number; air: number; garden: number; exposure: number }
  diff: { power: number; air: number; garden: number; exposure: number }
}

export function newMission(): Mission {
  return { turn: 0, power: 8, air: 5, garden: 0, exposure: 0, kit: false, history: [] }
}

const bound = (value: number, max: number) => Math.min(max, Math.max(0, value))

export function crewNeedsHelp(mission: Mission) {
  return mission.air === 0 || mission.exposure >= limits.exposure
}

export function isFinished(mission: Mission) {
  return mission.turn >= turns.length || crewNeedsHelp(mission)
}

export function planChoice(index: number, plan: Plan): Choice | undefined {
  if (!turns[index]) return
  const [first, second] = turns[index].choices
  if (typeof plan === 'number') return turns[index].choices[plan]
  if (plan.kind === 'power' && (index === 0 || index === 1 || index === 5)) {
    const maxLight = index === 0 || index === 5 ? 4 : 5
    if (!Number.isInteger(plan.light) || plan.light < 0 || plan.light > maxLight || ![0, 3].includes(plan.air) || (index !== 5 && plan.air)) return
    const cropSteps = Math.floor(plan.light * (index === 5 ? 3 : 2) / maxLight)
    const baseline = index === 0 ? (plan.light ? second : first) : (plan.light ? first : second)
    const title = plan.light ? `${plan.light} power to grow lights` : index === 5 ? 'Leave the grow lights off' : 'Store power in the battery'
    const result = plan.light
      ? `The grow lights used ${plan.light} power and advanced the crop by ${cropSteps} ${cropSteps === 1 ? 'step' : 'steps'}.`
      : 'The grow lights stayed off and the crop waited.'
    return { ...baseline, title: plan.air ? `${title} + refill air` : title, effect: { power: plan.light + plan.air, garden: cropSteps, air: plan.air }, result: plan.air ? `${result} The air plant also refilled the backup tanks.` : result }
  }
  if (plan.kind === 'route' && index === 2 && typeof plan.kit === 'boolean' && typeof plan.rough === 'boolean') {
    const baseline = plan.kit ? second : first
    return plan.rough ? { ...baseline, title: plan.kit ? 'Recover the kit via the ridge shortcut' : 'Take the ridge shortcut to shelter', effect: { ...baseline.effect, power: baseline.effect.power + 2, exposure: (baseline.effect.exposure ?? 0) - 1 }, result: `${baseline.result} The rough shortcut cost 2 extra power and cut exposure by 1 point compared with the main trail.` } : baseline
  }
  if (plan.kind === 'shield' && index === 3) {
    if (plan.pods === 0) return second
    if (plan.pods === 2) return first
    if (plan.pods === 1) return { ...first, title: 'Raise one water pod', effect: { power: 2, exposure: 1 }, result: 'One pod blocked part of the incoming particles. A second pod would cost 2 more battery and block the rest of this turn’s training exposure.' }
  }
}

export function step(mission: Mission, plan: Plan): Mission {
  if (isFinished(mission)) return mission
  const turn = turns[mission.turn]
  const choice = planChoice(mission.turn, plan)
  if (!choice) return mission
  const solar = frames[mission.turn].sunlit ? solarPower : 0
  const supply = mission.power + solar
  const airOn = supply >= airCost
  const onSpareRadioCell = mission.kit && choice.id === 'call'
  const draw = onSpareRadioCell ? 0 : choice.effect.power
  const applied = onSpareRadioCell || (draw === 0 && !!turn.solarAlert) || (airOn && supply - airCost >= draw)
  const fallbackExposure = turn.solarAlert ? turn.choices.find((option) => option.effect.power === 0)?.effect.exposure ?? 0 : 0
  const exposure = bound(mission.exposure + (applied ? choice.effect.exposure ?? 0 : fallbackExposure), limits.exposure)
  const power = bound(supply - (airOn ? airCost : 0) - (applied ? draw : 0), limits.power)
  const air = bound(mission.air + (airOn ? 0 : -2) + (applied ? choice.effect.air ?? 0 : 0), limits.air)
  const garden = bound(mission.garden + (applied ? choice.effect.garden ?? 0 : 0), limits.garden)
  const kit = mission.kit || (applied && !!choice.effect.repair)
  return {
    turn: mission.turn + 1, power, air, garden, kit, exposure,
    history: [...mission.history, {
      plan, choice, applied, airOn, solar, remaining: { power, air, garden, exposure },
      diff: { power: power - mission.power, air: air - mission.air, garden: garden - mission.garden, exposure: exposure - mission.exposure },
    }],
  }
}

export function demoStart() {
  return step(newMission(), 0)
}

export function demoBranch(plan: Plan) {
  const immediate = step(demoStart(), plan)
  const later = [0, 1, 0, 0].reduce((mission, choice) => step(mission, choice), immediate)
  return { immediate, later }
}

export function replayFrom(mission: Mission, turn: number, plan: Plan) {
  const initial = newMission()
  return mission.history.reduce((state, entry, index) => step(state, index === turn ? plan : entry.plan), initial)
}

