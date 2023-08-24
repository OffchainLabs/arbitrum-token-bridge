import { Dialog as HeadlessUIDialog } from '@headlessui/react'
import { ExclamationCircleIcon } from '@heroicons/react/24/outline'

import { Dialog, UseDialogProps } from '../common/Dialog'
import { ExternalLink } from '../common/ExternalLink'

export function BlockedDialog(props: UseDialogProps & { address: string }) {
  return (
    <Dialog {...props} isCustom>
      <div className="px-8 py-8">
        <HeadlessUIDialog.Title className="flex items-center space-x-2 text-2xl font-medium">
          <ExclamationCircleIcon className="h-8 w-8" />
          <span className="uppercase">This wallet address is blocked</span>
        </HeadlessUIDialog.Title>

        <div className="h-4" />

        <div className="flex flex-col space-y-8 break-words">
          <span className="text-gray-dark">{props.address.toLowerCase()}</span>
          <span>This address is affiliated with a blocked activity.</span>
          <span>
            If you think this was an error, you can request a review by filing a{' '}
            <ExternalLink
              href="https://arbitrumfoundation.zendesk.com/hc/en-us/requests/new"
              className="arb-hover underline"
            >
              support ticket
            </ExternalLink>
            .
          </span>
        </div>
      </div>
    </Dialog>
  )
}
