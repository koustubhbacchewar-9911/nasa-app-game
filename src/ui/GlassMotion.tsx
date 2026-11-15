import { useEffect, useRef } from 'react'
import './glass.css'

export function GlassMotion() {
  const halo = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const motion = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    let targetX = 0
    let targetY = 0
    let x = 0
    let y = 0
    let frame = 0
    let entered = false
    function follow() {
      frame = 0
      x += (targetX - x) * .2
      y += (targetY - y) * .2
      halo.current?.style.setProperty('transform', `translate3d(${x}px, ${y}px, 0)`)
      if (Math.abs(targetX - x) + Math.abs(targetY - y) > .6) frame = requestAnimationFrame(follow)
    }
    function move(event: PointerEvent) {
      if (!motion.matches || event.pointerType !== 'mouse') return
      targetX = event.clientX
      targetY = event.clientY
      if (!entered) { x = targetX; y = targetY; entered = true }
      const button = (event.target as Element).closest<HTMLElement>('button:not(:disabled), .wordmark')
      const rect = button?.getBoundingClientRect()
      if (button && rect) {
        button.style.setProperty('--reflect-x', event.clientX - rect.left + 'px')
        button.style.setProperty('--reflect-y', event.clientY - rect.top + 'px')
      }
      if (halo.current) {
        halo.current.dataset.visible = 'true'
        halo.current.dataset.interactive = String(!!button)
      }
      if (!frame) frame = requestAnimationFrame(follow)
    }
    function hide() {
      entered = false
      if (halo.current) halo.current.dataset.visible = 'false'
    }
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', hide)
    window.addEventListener('blur', hide)
    motion.addEventListener('change', hide)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', hide)
      window.removeEventListener('blur', hide)
      motion.removeEventListener('change', hide)
    }
  }, [])
  return <div className="cursor-glass" ref={halo} aria-hidden="true"><i /></div>
}
