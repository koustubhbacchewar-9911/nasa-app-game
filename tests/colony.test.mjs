import assert from 'node:assert/strict'
import { test } from 'node:test'
import { choose, colonyFrame, harvestCount, installationCost, panelOutput, setupPower, startColony, sunlight } from '../src/colony.ts'
import { canWalk, expeditionBarriers, expeditionSites, moduleMount, moduleSites, sectors } from '../src/world/layout.ts'

test('landing time and solar placement change available energy', () => {
  const ridge = startColony('ridge', [true, false, false])
  const rim = startColony('basin', [false, false, false])
  assert.equal(ridge.power, 7)
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
  assert.equal(sunlight(serviced), sunlight(reserve) + 3)
  assert.equal(panelOutput(serviced).reduce((sum, bank) => sum + bank, 0), sunlight(serviced))
  assert.ok(panelOutput(choose(serviced, 'hide')).every((bank) => bank === 0))
})

test('all mounts use battery and the setup meter matches the mission budget', () => {
  const layout = [false, true, false]
  const expected = 14 - installationCost(0, false) - installationCost(1, true) - installationCost(2, false)
  assert.equal(setupPower('ridge', [null, null, null]), 14)
  assert.equal(setupPower('ridge', layout), expected)
  assert.equal(startColony('ridge', layout).power, expected)
  for (let part = 0; part < 3; part++) {
    assert.ok(installationCost(part, false) > 0)
    assert.ok(installationCost(part, true) > installationCost(part, false))
  }
})

test('a high grow-light setting can price the crew out of the next task in shadow', () => {
  const base = startColony('basin', [false, true, true])
  const low = choose(base, 'grow', 0, { level: 1 })
  const high = choose(base, 'grow', 0, { level: 8, mist: true })
  assert.equal(harvestCount(low), 0)
  assert.equal(harvestCount(high), 3)
  assert.ok(low.power > high.power)
  assert.equal(choose(high, 'warn', 0, { level: 5 }), high)
  assert.notEqual(choose(low, 'warn', 0, { level: 5 }), low)
})

test('the crew eats every watch, a harvest replenishes food, and a missed meal ends the shift', () => {
  const base = startColony('ridge', [false, false, false])
  const grown = choose(base, 'grow', 0, { level: 4 })
  assert.equal(grown.food, base.food - 1)
  const shelter = choose(choose(grown, 'hide'), 'pods')
  const harvest = choose(shelter, 'harvest')
  assert.equal(harvest.food, 4)
  assert.equal(harvestCount(harvest), 0)
  assert.equal(choose(harvest, 'handover-reserve').food, 3)
  const hungry = choose({ ...shelter, food: 0 }, 'sample')
  assert.equal(hungry.node, 'report')
  assert.equal(hungry.missedMeal, true)
})

test('radio power, aim, and water pods change mission outcomes', () => {
  const warning = choose(startColony('ridge', [false, false, false]), 'reserve')
  const weak = choose(warning, 'warn', 0, { bearing: 44, level: 1 })
  const strong = choose(warning, 'warn', 0, { bearing: 72, level: 5 })
  assert.equal(weak.contact, false)
  assert.equal(weak.node, 'shelter')
  assert.equal(strong.contact, true)
  assert.equal(strong.node, 'relay')
  assert.ok(strong.power < weak.power)
  const open = choose(weak, 'pods', 0, { level: 0 })
  const sealed = choose(weak, 'pods', 0, { level: 2 })
  assert.ok(sealed.exposure < open.exposure)
  assert.ok(sealed.power < open.power)
})
