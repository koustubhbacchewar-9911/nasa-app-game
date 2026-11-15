import assert from 'node:assert/strict'
import { test } from 'node:test'
import { choose, colonyFrame, harvestCount, panelOutput, startColony, sunlight } from '../src/colony.ts'
import { canWalk, expeditionBarriers, expeditionSites, moduleMount, moduleSites, sectors } from '../src/world/layout.ts'

test('landing time and solar placement change available energy', () => {
  const ridge = startColony('ridge', [true, false, false])
  const rim = startColony('basin', [false, false, false])
  assert.equal(ridge.power, 12)
  assert.equal(sunlight(ridge), 8)
  assert.equal(sunlight(choose(ridge, 'reserve')), 8)
  assert.equal(colonyFrame(rim).frame, 61)
  assert.equal(sunlight(choose(rim, 'reserve')), 0)
})

test('the chosen landing zone and each installed mount have distinct, accessible waypoints', () => {
  const ridge = expeditionSites('ridge', [null, null, null])
  const rim = expeditionSites('basin', [null, null, null])
  assert.ok(Math.hypot(ridge.lander.x - rim.lander.x, ridge.lander.z - rim.lander.z) > 20)
  for (const sector of Object.keys(sectors)) {
    for (let combo = 0; combo < 8; combo++) {
      const layout = moduleSites.map((_, part) => !!(combo & (1 << part)))
      const destinations = expeditionSites(sector, layout)
      const obstacles = expeditionBarriers(sector, layout)
      assert.ok(canWalk(destinations.lander.x, destinations.lander.z, obstacles))
      for (const [part, site] of moduleSites.entries()) {
        const mount = moduleMount(part, layout[part])
        const other = moduleMount(part, !layout[part])
        assert.ok(Math.hypot(mount.x - other.x, mount.z - other.z) > 15)
        const pending = expeditionSites(sector, [null, null, null], { part, outer: layout[part] })
        const { x, z } = destinations[site]
        assert.deepEqual({ x, z }, mount.approach)
        assert.deepEqual(pending[site], destinations[site])
        assert.ok(canWalk(x, z, obstacles))
        assert.equal(canWalk(mount.x, mount.z, obstacles), false)
      }
    }
  }
})

test('sheltering unlocks shielding choices and an oxygen-funded sample', () => {
  const first = startColony('ridge', [true, false, false])
  const sheltered = ['reserve', 'hide'].reduce(choose, first)
  assert.equal(sheltered.node, 'shelter')
  const research = choose(sheltered, 'pods')
  assert.equal(research.node, 'research')
  assert.equal(research.exposure, sheltered.exposure)
  assert.equal(research.log.at(-1).delta.exposure, 0)
  const sample = choose(research, 'sample')
  assert.equal(sample.oxygen, research.oxygen - 2)
  assert.equal(sample.research, true)
  assert.equal(choose(sample, 'earth').contact, true)
})

test('early contact creates a relay rescue, and a longer return trades safety for power', () => {
  const start = startColony('basin', [false, true, true])
  const relay = ['reserve', 'warn'].reduce(choose, start)
  assert.equal(relay.node, 'relay')
  assert.equal(relay.contact, true)
  const walking = choose(relay, 'walk')
  const driving = choose(relay, 'drive')
  assert.equal(walking.node, 'repair')
  assert.equal(driving.node, 'research')
  assert.ok(walking.power > driving.power)
  assert.ok(walking.oxygen < driving.oxygen)
  assert.ok(walking.exposure > driving.exposure)
})

test('power starvation uses oxygen and the crew can end a shift early', () => {
  const stranded = { ...startColony('basin', [false, false, false]), node: 'handover', watch: 2, power: 0 }
  assert.equal(choose(stranded, 'earth'), stranded)
  const report = choose(stranded, 'safe-mode')
  assert.equal(report.node, 'report')
  assert.equal(report.oxygen, stranded.oxygen - 2)
  assert.equal(choose(report, 'safe-mode'), report)
})

test('grow-light and irrigation plans affect only the selected bed', () => {
  const colony = startColony('ridge', [false, false, false])
  const stressed = choose(colony, 'grow', 1)
  const misted = choose(colony, 'balanced', 1)
  assert.deepEqual(stressed.plants.slice(0, 3), colony.plants.slice(0, 3))
  assert.deepEqual(misted.plants.slice(3), [{ health: 4, growth: 4 }, { health: 5, growth: 5 }, { health: 4, growth: 5 }])
  assert.ok(harvestCount(misted) > harvestCount(stressed))
  assert.equal(colony.plants[3].health, 2)
})

test('solar maintenance spends battery now and improves subsequent sunlit output', () => {
  const colony = startColony('ridge', [true, false, false])
  const reserve = choose(colony, 'reserve')
  const serviced = choose(colony, 'service-array')
  assert.equal(serviced.power, reserve.power - 2)
  assert.equal(sunlight(serviced), sunlight(reserve) + 1)
  assert.equal(panelOutput(serviced).reduce((sum, bank) => sum + bank, 0), sunlight(serviced))
  assert.ok(panelOutput(choose(serviced, 'hide')).every((bank) => bank === 0))
})
