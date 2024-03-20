import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

import { Dialog, DialogProps } from '../common/Dialog'
import { ExternalLink } from '../common/ExternalLink'
import { GET_HELP_LINK } from '../../constants'

export function BlockedDialog(props: DialogProps & { address: string }) {
  return (
    <Dialog
      {...props}
      title={
        <div className="flex flex-row items-center space-x-2">
          <ExclamationTriangleIcon height={25} width={25} />
          <span>This wallet address is blocked</span>
        </div>
      }
      isFooterHidden={true}
    >
      <div className="flex flex-col space-y-4 break-words py-4 text-gray-3">
        <span>{props.address.toLowerCase()}</span>
        <span>This address is affiliated with a blocked activity.</span>
        <span>
          If you think this was an error, you can request a review by filing a{' '}
          <ExternalLink
            href={GET_HELP_LINK}
            className="arb-hover text-white underline"
          >
            support ticket
          </ExternalLink>
          .
        </span>
      </div>
    </Dialog>
  )
}
