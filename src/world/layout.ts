export type SiteId = 'power' | 'garden' | 'rover' | 'kit' | 'shelter' | 'radio' | 'air' | 'lander'

export const sites: Record<SiteId, { name: string; x: number; z: number; color: string }> = {
  power: { name: 'Solar yard', x: -11, z: 3, color: '#ffd28a' },
  garden: { name: 'Greenhouse', x: 8, z: 0, color: '#9af9cb' },
  rover: { name: 'Pip’s rover', x: 10, z: 9, color: '#ffc88c' },
  kit: { name: 'Repair kit', x: 18, z: 1, color: '#ffb683' },
  shelter: { name: 'Shielded shelter', x: -10, z: -11, color: '#92e4d2' },
  radio: { name: 'Earth antenna', x: 9, z: -15, color: '#a0dfff' },
  air: { name: 'Air plant', x: -1, z: -7, color: '#a5e5fc' },
  lander: { name: 'Landing pad', x: -16, z: 13, color: '#b1c0ee' },
}

export const jobSites: SiteId[] = ['power', 'garden', 'rover', 'shelter', 'radio', 'air']
export const spawn = { x: 0, z: 10 }
export const reach = 2.35

export const sectors = {
  ridge: { x: -17, z: -11, access: { x: -12.5, z: -11 }, color: '#ffd28a' },
  basin: { x: 11, z: 12, access: { x: 7, z: 10 }, color: '#9cdfff' },
} as const
export type Sector = keyof typeof sectors
export const habitat = { name: 'Crew habitat', x: -2, z: 3, color: '#b7ebcd' }
export const moduleSites = ['power', 'shelter', 'radio'] as const
const mounts = [
  [{ x: 4, z: 3, approach: { x: 4, z: 7 } }, { x: -17, z: -3, approach: { x: -17, z: 1 } }],
  [{ x: -3, z: -4, approach: { x: -3, z: 0 } }, { x: 5, z: 19, approach: { x: 4, z: 15 } }],
  [{ x: -3, z: 9, approach: { x: -2, z: 12 } }, { x: 19, z: 18, approach: { x: 18, z: 14.5 } }],
] as const
export const moduleMount = (part: number, outer: boolean) => mounts[part][Number(outer)]
export const expeditionFoundations = [
  ...Object.values(sectors).map((center) => ({ ...center, radius: 3.3 })),
  ...mounts.flatMap((pair, part) => pair.map((center) => ({ ...center, radius: [3.7, 3.6, 2.4][part] }))),
]

export function expeditionSites(sector: Sector, layout: readonly (boolean | null)[], pending?: { part: number; outer: boolean }) {
  const result = { ...sites, lander: { ...sites.lander, ...sectors[sector].access } }
  moduleSites.forEach((id, part) => {
    const slot = pending?.part === part ? pending.outer : layout[part]
    if (slot != null) result[id] = { ...sites[id], ...moduleMount(part, slot).approach }
  })
  return result
}

export function expeditionBarriers(sector: Sector, layout: readonly (boolean | null)[]) {
  return [
    barriers[1], barriers[4], { ...habitat, r: 2.3 }, { ...sectors[sector], r: 2.7 },
    ...layout.flatMap((slot, part) => slot == null ? [] : [{ ...moduleMount(part, slot), r: part === 2 ? 1.9 : 2.65 }]),
  ]
}

export const barriers = [
  { x: -12.3, z: -.5, r: 2.7 },
  { x: 10, z: -4, r: 3.7 },
  { x: -11, z: -15, r: 3 },
  { x: 10, z: -18.7, r: 2.3 },
  { x: -1, z: -10.7, r: 2.45 },
  { x: -18.5, z: 16.6, r: 3 },
]

export function canWalk(x: number, z: number, obstacles: readonly { x: number; z: number; r: number }[] = barriers) {
  return Math.abs(x) < 22 && Math.abs(z) < 22 && obstacles.every((obstacle) => Math.hypot(x - obstacle.x, z - obstacle.z) > obstacle.r + .42)
}
