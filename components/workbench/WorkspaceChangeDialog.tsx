'use client'

import { useRef } from 'react'
import Modal from '@/components/ui/Modal'

interface WorkspaceChangeDialogProps {
  isOpen: boolean
  action: 'clear' | 'replace'
  onCancel: () => void
  onConfirm: () => void
}

export default function WorkspaceChangeDialog({
  isOpen,
  action,
  onCancel,
  onConfirm,
}: WorkspaceChangeDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const isReplacing = action === 'replace'
  const title = isReplacing ? 'Replace This Photo?' : 'Clear This Workspace?'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      role="alertdialog"
      size="sm"
      ariaLabelledBy="workspace-change-title"
      ariaDescribedBy="workspace-change-description"
      initialFocusRef={cancelRef}
    >
      <Modal.Header>
        <div>
          <p className="workspace-change-kicker">Protect Current Work</p>
          <h2 id="workspace-change-title">{title}</h2>
        </div>
        <Modal.Close label="Keep current workspace" />
      </Modal.Header>
      <Modal.Body>
        <p id="workspace-change-description">
          Your current samples, pins, measurements, overlays, or unsaved paint choices may be lost.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <button ref={cancelRef} type="button" className="workspace-change-cancel" onClick={onCancel}>
          Keep Working
        </button>
        <button type="button" className="workspace-change-confirm" onClick={onConfirm}>
          {isReplacing ? 'Replace Photo' : 'Clear Workspace'}
        </button>
      </Modal.Footer>
    </Modal>
  )
}
