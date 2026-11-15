import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import type { CrewId } from '../mission'
import { Icon } from './Icon'

export const asset = (path: string) => import.meta.env.BASE_URL + path

export function Avatar({ id }: { id: CrewId }) {
  return <span className={'avatar avatar-' + id} aria-hidden="true" />
}

export function Modal({ label, children, onClose }: { label: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useId()
  const content = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  useEffect(() => {
    content.current?.scrollTo({ top: 0 })
  }, [label])

  function close() {
    dialog.current?.close()
    onClose()
  }

  return <dialog ref={dialog} aria-labelledby={title} className="modal" onCancel={(event) => { event.preventDefault(); close() }}>
    <div className="modal-head">
      <h2 id={title}>{label}</h2>
      <button type="button" className="icon-button" aria-label="Close" onClick={close}><Icon name="close" /></button>
    </div>
    <div className="modal-body" ref={content}>{children}</div>
  </dialog>
}
