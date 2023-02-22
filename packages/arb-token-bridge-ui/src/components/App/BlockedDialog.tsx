import { useRef } from 'react'
import { Dialog as HeadlessUIDialog } from '@headlessui/react'

import { Dialog, UseDialogProps } from '../common/Dialog'

export function BlockedDialog(props: UseDialogProps & { address: string }) {
  const confirmButtonRef = useRef(null)

  return (
    <Dialog {...props} initialFocus={confirmButtonRef} isCustom>
      <div className="px-8 py-4">
        <HeadlessUIDialog.Title className="text-2xl font-medium">
          This wallet address is blocked
        </HeadlessUIDialog.Title>

        {props.address}
      </div>
    </Dialog>
  )
}
