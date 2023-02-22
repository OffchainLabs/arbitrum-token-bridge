import { useRef } from 'react'
import { ExclamationCircleIcon } from '@heroicons/react/outline'

import { Dialog, UseDialogProps } from '../common/Dialog'
import { ExternalLink } from '../common/ExternalLink'

export function BlockedDialog(props: UseDialogProps & { address: string }) {
  const confirmButtonRef = useRef(null)

  return (
    <Dialog
      {...props}
      initialFocus={confirmButtonRef}
      cancelButtonProps={{ className: 'hidden' }}
      actionButtonProps={{ className: 'font-medium' }}
      actionButtonTitle="Close"
      title={
        <div className="flex items-center space-x-2">
          <ExclamationCircleIcon className="h-8 w-8" />
          <span className="uppercase">This wallet address is blocked</span>
        </div>
      }
    >
      <div className="flex flex-col space-y-8 break-words">
        <span className="text-gray-10">{props.address.toLowerCase()}</span>
        <span>This address is affiliated with a blocked activity.</span>
        <span>
          If you think this was an error, you can request a review with{' '}
          <ExternalLink href="mailto:support@arbitrum.io">
            support@arbitrum.io
          </ExternalLink>
        </span>
      </div>
    </Dialog>
  )
}
