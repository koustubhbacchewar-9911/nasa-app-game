export type SiteId = 'power' | 'garden' | 'rover' | 'kit' | 'shelter' | 'radio' | 'air' | 'lander'

export const sites: Record<SiteId, { name: string; x: number; z: number; color: string }> = {
  power: { name: 'Solar yard', x: -11, z: 3, color: '#ffd28a' },
  garden: { name: 'Greenhouse', x: 8, z: 0, color: '#9af9cb' },
  rover: { name: 'Pip’s rover', x: 10, z: 9, color: '#ffc88c' },
  kit: { name: 'Repair kit', x: 18, z: 1, color: '#ffb683' },
  shelter: { name: 'Shielded shelter', x: -10, z: -11, color: '#c7b1ff' },
  radio: { name: 'Earth antenna', x: 9, z: -15, color: '#a0dfff' },
  air: { name: 'Air plant', x: -1, z: -7, color: '#a5e5fc' },
  lander: { name: 'Landing pad', x: -16, z: 13, color: '#b1c0ee' },
}

export const jobSites: SiteId[] = ['power', 'garden', 'rover', 'shelter', 'radio', 'air']
export const spawn = { x: 0, z: 10 }
export const reach = 2.35

export const barriers = [
  { x: -12.3, z: -.5, r: 2.7 },
  { x: 10, z: -4, r: 3.7 },
  { x: -11, z: -15, r: 3 },
  { x: 10, z: -18.7, r: 2.3 },
  { x: -1, z: -10.7, r: 2.45 },
  { x: -18.5, z: 16.6, r: 3 },
]

export function canWalk(x: number, z: number) {
  return Math.abs(x) < 22 && Math.abs(z) < 22 && barriers.every((obstacle) => Math.hypot(x - obstacle.x, z - obstacle.z) > obstacle.r + .42)
}
