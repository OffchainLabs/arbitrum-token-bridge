import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

import { Dialog, DialogProps } from '../common/Dialog'
import { ExternalLink } from '../common/ExternalLink'
import { GET_HELP_LINK } from '../../constants'

interface ErrorDialogProps extends DialogProps {
  title: string
  children: React.ReactNode
}

function ErrorDialog({ title, children, ...props }: ErrorDialogProps) {
  return (
    <Dialog
      {...props}
      title={
        <div className="flex flex-row items-center space-x-2">
          <ExclamationTriangleIcon height={25} width={25} />
          <span>{title}</span>
        </div>
      }
      isFooterHidden={true}
    >
      <div className="flex flex-col space-y-4 break-words py-4 text-gray-3">
        {children}
      </div>
    </Dialog>
  )
}

export function BlockedDialog(props: DialogProps & { address: string }) {
  return (
    <ErrorDialog {...props} title="This wallet address is blocked">
      <span>{props.address.toLowerCase()}</span>
      <span>This address is affiliated with a blocked activity.</span>
      <span>
        If you think this was an error, you can request a review with{' '}
        <ExternalLink
          href={GET_HELP_LINK}
          className="arb-hover text-white underline"
        >
          support@arbitrum.io
        </ExternalLink>
      </span>
    </ErrorDialog>
  )
}

export function ConnectionErrorDialog(
  props: DialogProps & { address: string }
) {
  return (
    <ErrorDialog {...props} title="Connection error">
      <span>There was an error when connecting to:</span>
      <span>{props.address.toLowerCase()}</span>
      <span>
        Try refreshing the page. If the issue continues, you can contact{' '}
        <a
          href="mailto:support@arbitrum.io"
          className="arb-hover text-white underline"
        >
          support@arbitrum.io
        </a>
      </span>
    </ErrorDialog>
  )
}
