import type { ReactNode } from 'react'
import type { IconName } from '../mission'

const paths: Record<IconName | 'orbit' | 'down' | 'back' | 'external' | 'target' | 'expand' | 'collapse' | 'bolt' | 'water' | 'console' | 'clock', ReactNode> = {
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  storm: <path d="M7 16H6a4 4 0 1 1 1-7.9 5.5 5.5 0 0 1 10.5 1.5 3.2 3.2 0 0 1 0 6.4H17m-4-4-3 5h4l-2 5"/>,
  radio: <><path d="M3.5 8.5a12 12 0 0 1 17 0m-14 3a8 8 0 0 1 11 0m-8 3a4 4 0 0 1 5 0"/><circle cx="12" cy="18" r="1"/></>,
  plant: <path d="M12 22V11m0 5C6 17 3 14 3 9c5-1 9 2 9 7Zm0-3c0-6 3-9 9-9 0 6-3 9-9 9Z"/>,
  air: <path d="M3 9h13a2.5 2.5 0 1 0-2.5-2.5M2 13h17a2 2 0 1 1-2 2M5 17h6a2 2 0 1 1-2 2"/>,
  battery: <><rect x="3" y="7" width="16" height="10" rx="2"/><path d="M22 10v4m-15-4v4m4-4v4m4-4v4"/></>,
  rover: <><path d="M3 16v-3l3-2 2-4h7l3 4 3 2v3h-3m-4 0h-4m-4 0H3m9-9V4l4-1"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/></>,
  lander: <><path d="M9 4h6l2 8-2 4H9l-2-4 2-8Zm-1 9-4 6H2m14-6 4 6h2m-12 0-1 2m5-2 1 2"/><path d="M10 9h4"/></>,
  book: <path d="M12 6c-3-3-7-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-2-1-6-2-9 1Zm0 0v14"/>,
  sound: <path d="M3 9h4l5-4v14l-5-4H3V9Zm13 0a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12"/>,
  mute: <path d="M3 9h4l5-4v14l-5-4H3V9Zm13 1 5 5m0-5-5 5"/>,
  play: <path d="m9 5 11 7-11 7V5Z"/>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  rewind: <><path d="M4 11a8 8 0 1 1 2 7M4 5v6h6"/><path d="M12 8v5l3 2"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  moon: <path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z"/>,
  shield: <path d="M12 3 4.5 6v5c0 4 3.4 7.6 7.5 10 4.1-2.4 7.5-6 7.5-10V6L12 3Zm-3 9 2 2 4-4"/>,
  crew: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m0-15a3 3 0 0 1 0 6m3 3a4 4 0 0 1 3 4v2"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5.5 6.5h13m-13 11h13"/></>,
  orbit: <><path d="M17 5.7a8 8 0 0 0-11.3 11.2M7 18.3A8 8 0 0 0 18.3 7.1"/><ellipse cx="12" cy="12" rx="12" ry="4" transform="rotate(-38 12 12)"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></>,
  down: <path d="M12 4v15m-6-6 6 6 6-6"/>,
  back: <path d="M20 12H5m6 6-6-6 6-6"/>,
  external: <path d="M7 17 17 7M7 7h10v10"/>,
  target: <><circle cx="12" cy="12" r="7"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/><circle cx="12" cy="12" r="2"/></>,
  expand: <path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>,
  collapse: <path d="M4 9h5V4m11 5h-5V4M9 20v-5H4m11 5v-5h5"/>,
  bolt: <path d="m13 2-8 12h6l-1 8 9-12h-6l1-8Z"/>,
  water: <path d="M12 3c-1 3-6 6.5-6 11a6 6 0 1 0 12 0c0-4.5-5-8-6-11Z"/>,
  console: <><rect x="3" y="4" width="18" height="14" rx="2"/><path d="m7 8 3 3-3 3m6 0h4m-8 7h6"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
}

export type UiIcon = keyof typeof paths

export function Icon({ name, size = 20 }: { name: UiIcon; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}
