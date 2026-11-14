import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { airCost, demoBranch, demoStart, frames, isFinished, limits, newMission, replayFrom, solarPower, step, turns } from '../src/mission.ts'
import { radio, storm } from '../src/science.ts'

test('the published frames drive the whole shift and exist in the evidence viewer', async () => {
  assert.deepEqual(frames.map(f => f.frame), [60, 61, 62, 63, 64, 65, 66])
  assert.deepEqual(frames.map(f => f.sunlit), [true, true, false, false, false, true, true])
  for (const frame of frames) {
    const image = await readFile(new URL('../public/science/' + frame.filename, import.meta.url))
    assert.equal(image.readUInt16BE(0), 0xffd8)
  }
  let state = newMission()
  for (let i = 0; i < turns.length; i++) {
    state = step(state, i === 1 ? 1 : 0)
    assert.equal(state.history.at(-1).solar, frames[i].sunlit ? solarPower : 0)
  }
})

test('judge replay exposes a power and crop trade-off that changes later choices', () => {
  const keep = demoBranch(0)
  const pause = demoBranch(1)
  assert.equal(pause.immediate.power - keep.immediate.power, 5)
  assert.equal(keep.immediate.garden - pause.immediate.garden, 2)
  assert.ok(pause.later.air > keep.later.air)
})

test('the air machine has priority over crop lights', () => {
  const state = { ...newMission(), turn: 3, power: airCost, air: 5 }
  const next = step(state, 0)
  assert.equal(next.power, 0)
  assert.equal(next.air, 5)
  assert.equal(next.history[0].applied, false)
  assert.equal(next.history[0].airOn, true)
})

test('the rover repair kit lowers the cost of calling Earth', () => {
  const state = { ...newMission(), turn: 4, power: airCost, air: 5 }
  assert.equal(step(state, 0).history[0].applied, false)
  assert.equal(step({ ...state, kit: true }, 0).history[0].applied, true)
  assert.equal(radio.roundTripMs, radio.oneWayMs * 2)
  assert.equal(storm.id, '30717/1')
})

test('saving battery pays for the kit detour and shielding, then the spare cell transmits', () => {
  const beforeRadio = [0, 1, 1, 0].reduce((state, move) => step(state, move), newMission())
  assert.equal(beforeRadio.turn, 4)
  assert.equal(beforeRadio.kit, true)
  assert.equal(beforeRadio.exposure, 3)
  assert.ok(beforeRadio.power < airCost)
  const afterRadio = step(beforeRadio, 0)
  assert.equal(afterRadio.history.at(-1).applied, true)
  assert.equal(afterRadio.air, beforeRadio.air - 2)
  assert.equal(step(afterRadio, 1).turn, 6)
})

test('partial lighting and a revised schedule rerun the recorded jobs through the real limits', () => {
  const partial = { kind: 'power', light: 3, air: 0 }
  const preview = step(demoStart(), partial)
  assert.equal(preview.power, 13)
  assert.equal(preview.garden, 1)
  const final = [{ kind: 'route', kit: true, rough: false }, { kind: 'shield', pods: 1 }, 0].reduce(step, preview)
  assert.deepEqual(replayFrom(final, 1, partial), final)
  const revised = replayFrom(final, 1, { ...partial, light: 5 })
  assert.equal(revised.turn, 4)
  assert.equal(revised.exposure, limits.exposure)
  assert.strictEqual(step(preview, { kind: 'shield', pods: 2 }), preview)
})

test('the ridge shortcut and each shield pod trade two power for one exposure point', () => {
  const beforeStorm = step(demoStart(), { kind: 'power', light: 0, air: 0 })
  const long = step(beforeStorm, { kind: 'route', kit: true, rough: false })
  const short = step(beforeStorm, { kind: 'route', kit: true, rough: true })
  assert.equal(short.power, long.power - 2)
  assert.equal(short.exposure, long.exposure - 1)
  const onePod = step(long, { kind: 'shield', pods: 1 })
  const twoPods = step(long, { kind: 'shield', pods: 2 })
  assert.equal(twoPods.power, onePod.power - 2)
  assert.equal(twoPods.exposure, onePod.exposure - 1)
})

test('all 64 decision paths stay bounded, end, and include successful and retry outcomes', () => {
  const outcomes = new Set()
  for (let route = 0; route < 64; route++) {
    let state = newMission()
    for (let turn = 0; turn < 6; turn++) state = step(state, (route >> turn) & 1)
    assert.ok(isFinished(state))
    assert.equal(step(state, 0), state)
    for (const [resource, max] of Object.entries(limits)) {
      assert.ok(state[resource] >= 0 && state[resource] <= max)
    }
    outcomes.add(state.air > 0 && state.exposure < limits.exposure && state.turn === turns.length)
  }
  assert.deepEqual(outcomes, new Set([true, false]))
})
