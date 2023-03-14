import { Dialog as HeadlessUIDialog } from '@headlessui/react'
import { ExclamationCircleIcon } from '@heroicons/react/outline'

import { Dialog, UseDialogProps } from '../common/Dialog'
import { ExternalLink } from '../common/ExternalLink'

export function BlockedDialog(props: UseDialogProps & { address: string }) {
  return (
    <Dialog {...props} isCustom>
      <div className="px-8 py-4">
        <HeadlessUIDialog.Title className="flex items-center space-x-2 text-2xl font-medium">
          <ExclamationCircleIcon className="h-8 w-8" />
          <span className="uppercase">This wallet address is blocked</span>
        </HeadlessUIDialog.Title>

        <div className="h-4" />

        <div className="flex flex-col space-y-8 break-words">
          <span className="text-gray-10">{props.address.toLowerCase()}</span>
          <span>This address is affiliated with a blocked activity.</span>
          <span>
            If you think this was an error, you can request a review with{' '}
            <ExternalLink
              href="mailto:support@arbitrum.io"
              className="arb-hover underline"
            >
              support@arbitrum.io
            </ExternalLink>
          </span>
        </div>
      </div>
    </Dialog>
  )
}
